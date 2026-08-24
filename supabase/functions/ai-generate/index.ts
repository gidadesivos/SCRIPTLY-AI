import { z } from 'npm:zod@3.23.8'
import { AI_MODEL } from '../_shared/ai-config.ts'
import { authenticate, AuthError, ConfigError } from '../_shared/auth.ts'
import { buildContext } from '../_shared/context.ts'
import {
  ProviderError,
  fetchOpenRouterCatalog,
  fetchOpenRouterQuota,
  configuredProviders,
} from '../_shared/providers/index.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/http.ts'
import { InvalidAiOutputError, runOperation } from '../_shared/pipeline.ts'
import { checkRateLimit, recordGeneration } from '../_shared/rate-limit.ts'
import {
  PROMPT_VERSIONS,
  completeBriefPrompt,
  generateAnglesPrompt,
  generateHooksPrompt,
  generateScriptPrompt,
  generateAdCopyPrompt,
  generateVariationsPrompt,
  parseFreeformIdeaPrompt,
  rewriteSectionPrompt,
} from '../_shared/prompts.ts'
import {
  adCopyGeminiSchema,
  adCopyZodSchema,
  anglesGeminiSchema,
  anglesZodSchema,
  briefGeminiSchema,
  briefZodSchema,
  hooksGeminiSchema,
  hooksZodSchema,
  rewriteGeminiSchema,
  rewriteZodSchema,
  scriptGeminiSchema,
  scriptZodSchema,
  variationsGeminiSchema,
  variationsZodSchema,
} from '../_shared/schemas.ts'

/**
 * Roda a promessa depois de responder, sem segurar o usuário.
 *
 * A telemetria é um insert no banco: esperar por ela adicionava um ida-e-volta
 * ao fim de toda geração, para gravar algo que ninguém está lendo naquele
 * instante. waitUntil mantém a function viva até terminar, então o registro
 * continua sendo gravado — só deixa de bloquear a resposta.
 *
 * Declarado aqui porque o tipo não vem do Deno: é do runtime do Supabase.
 */
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined

function inBackground(promise: Promise<unknown>) {
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime) {
    EdgeRuntime.waitUntil(promise)
    return
  }
  // Sem waitUntil (execução local, runtime antigo): não deixar a promessa
  // rejeitar sozinha e derrubar o processo.
  promise.catch((error) => console.error('Falha em tarefa de fundo:', error))
}

const angleSchema = z.object({ type: z.string(), description: z.string() })
const briefSchema = z.record(z.unknown())

const requestSchema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('parseFreeformIdea'),
    workspaceId: z.string().uuid(),
    idea: z.string().min(3).max(2000),
  }),
  z.object({
    operation: z.literal('completeBrief'),
    workspaceId: z.string().uuid(),
    brandId: z.string().uuid(),
    productId: z.string().uuid().nullish(),
    brief: briefSchema,
  }),
  z.object({
    operation: z.literal('generateAngles'),
    workspaceId: z.string().uuid(),
    brandId: z.string().uuid(),
    productId: z.string().uuid().nullish(),
    brief: briefSchema,
  }),
  z.object({
    operation: z.literal('generateHooks'),
    workspaceId: z.string().uuid(),
    brandId: z.string().uuid(),
    productId: z.string().uuid().nullish(),
    brief: briefSchema,
    angle: angleSchema,
  }),
  z.object({
    operation: z.literal('generateScript'),
    workspaceId: z.string().uuid(),
    brandId: z.string().uuid(),
    productId: z.string().uuid().nullish(),
    brief: briefSchema,
    angle: angleSchema,
    hook: z.string().min(1),
  }),
  z.object({
    operation: z.literal('rewriteSection'),
    workspaceId: z.string().uuid(),
    brandId: z.string().uuid(),
    productId: z.string().uuid().nullish(),
    instruction: z.string().min(1).max(500),
    target: z.object({
      label: z.string().min(1),
      current: z.string(),
    }),
    surrounding: z.string().max(8000).default(''),
  }),
  z.object({
    operation: z.literal('generateVariations'),
    workspaceId: z.string().uuid(),
    brandId: z.string().uuid(),
    productId: z.string().uuid().nullish(),
    script: z.object({
      title: z.string(),
      hook: z.string(),
      cta: z.string(),
      scenes: z.array(z.string()),
    }),
    count: z.number().int().min(1).max(3).default(2),
  }),
  /**
   * Não gera nada: devolve o estado dos provedores.
   *
   * Mora nesta function, e não numa nova, porque precisa exatamente da mesma
   * autenticação e da mesma checagem de workspace — e porque a chave do
   * OpenRouter não pode sair do servidor (N2). É tratada antes do rate limit:
   * consultar saldo não consome cota de geração.
   */
  z.object({
    operation: z.literal('providerStatus'),
    workspaceId: z.string().uuid(),
  }),
  /**
   * Catálogo de modelos do OpenRouter, para a tela de escolha.
   *
   * Passa por aqui pelo mesmo motivo do providerStatus: a chave não sai do
   * servidor. Também não consome cota — listar não é gerar.
   */
  z.object({
    operation: z.literal('listModels'),
    workspaceId: z.string().uuid(),
  }),
  z.object({
    operation: z.literal('generateAdCopy'),
    workspaceId: z.string().uuid(),
    brandId: z.string().uuid(),
    productId: z.string().uuid().nullish(),
    briefing: z.string().min(3).max(1000),
    format: z.string().max(50).default(''),
    cta: z.string().max(50).default(''),
    // Locução do roteiro vinculado, quando houver. Truncada no cliente.
    scriptContext: z.string().max(4000).default(''),
  }),
])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse('invalid_request', 405)

  // Basta UM provedor configurado. Antes isto exigia especificamente o Gemini,
  // o que impediria rodar só com OpenRouter.
  if (configuredProviders().length === 0) {
    console.error('Nenhum provedor de IA configurado nos secrets da function.')
    return errorResponse(
      'ai_unavailable',
      503,
      'Nenhuma chave de IA configurada. Falta GEMINI_API_KEY ou OPENROUTER_API_KEY.',
    )
  }

  let body: z.infer<typeof requestSchema>
  try {
    body = requestSchema.parse(await req.json())
  } catch {
    return errorResponse('invalid_request', 400)
  }

  // Auth + membership antes de qualquer coisa: workspaceId do body não é confiável.
  let auth
  try {
    auth = await authenticate(req, body.workspaceId)
  } catch (error) {
    if (error instanceof AuthError) {
      return errorResponse(error.code, error.code === 'unauthorized' ? 401 : 403, error.message)
    }
    if (error instanceof ConfigError) {
      // Erro de instalação, não do usuário: precisa aparecer nomeado.
      console.error('[ai-generate] configuração ausente:', error.message)
      return errorResponse('ai_unavailable', 503, error.message)
    }
    console.error('[ai-generate] falha na autenticação:', (error as Error).message)
    return errorResponse('unexpected', 500)
  }

  const { userId, workspaceId, admin } = auth

  if (body.operation === 'providerStatus') {
    let quota = null
    let quotaError: string | null = null
    try {
      quota = await fetchOpenRouterQuota()
    } catch (error) {
      // Não derruba a resposta: o painel ainda mostra a telemetria própria, que
      // é a parte que sempre existe.
      quotaError = (error as Error).message
    }

    return jsonResponse({
      data: {
        providers: configuredProviders().map((provider) => provider.name),
        openRouter: quota,
        openRouterError: quotaError,
      },
    })
  }

  if (body.operation === 'listModels') {
    try {
      const models = await fetchOpenRouterCatalog()
      return jsonResponse({ data: { models } })
    } catch (error) {
      console.error('[ai-generate] falha ao listar modelos:', (error as Error).message)
      return errorResponse('ai_unavailable', 503, (error as Error).message)
    }
  }

  /**
   * Modelos que o workspace escolheu, em ordem.
   *
   * Consulta barata e feita uma vez por requisição. Lista vazia deixa o
   * provedor cair no padrão da variável de ambiente — é o que mantém quem
   * nunca configurou nada funcionando igual.
   */
  const { data: chosenModels } = await admin
    .from('workspace_ai_models')
    .select('model_id')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'openrouter')
    .eq('enabled', true)
    .order('position', { ascending: true })

  const openRouterModels = (chosenModels ?? []).map((row: { model_id: string }) => row.model_id)

  const promptVersion = PROMPT_VERSIONS[body.operation]

  let verdict
  try {
    verdict = await checkRateLimit(admin, workspaceId)
  } catch (error) {
    // Plano ilegível é erro de instalação, não do usuário: não dá para decidir
    // se ele pode gerar, e liberar por padrão seria abrir a cota de todo mundo.
    console.error('[ai-generate] falha ao ler o plano:', (error as Error).message)
    return errorResponse('unexpected', 500)
  }

  if (!verdict.allowed) {
    inBackground(
      recordGeneration(admin, {
        workspaceId,
        userId,
        generationType: body.operation,
        promptVersion,
        model: AI_MODEL,
        status: 'rate_limited',
      }),
    )
    // A mensagem nomeia o plano e os números: sem isso o usuário só via
    // "aguarde um instante" e não tinha como saber o que mudaria isso.
    return jsonResponse(
      {
        error: {
          code: 'rate_limited',
          detail:
            verdict.scope === 'month'
              ? `Você usou as ${verdict.limit} gerações do mês no plano ${verdict.plan.label}. A cota renova no dia 1º.`
              : `Você atingiu o limite de ${verdict.limit} gerações por minuto do plano ${verdict.plan.label}. Aguarde um instante.`,
          plan: verdict.plan.plan,
          planLabel: verdict.plan.label,
          used: verdict.used,
          limit: verdict.limit,
          retryAfterSeconds: verdict.retryAfterSeconds,
        },
      },
      429,
    )
  }

  const startedAt = Date.now()

  try {
    // parseFreeformIdea é o único que não precisa de marca: ainda não há contexto.
    const blocks =
      body.operation === 'parseFreeformIdea'
        ? { brandBlock: '', productBlock: '', avoidBlock: '' }
        : await buildContext(admin, workspaceId, body.brandId, body.productId ?? null)

    const outcome = await (async () => {
      switch (body.operation) {
        case 'parseFreeformIdea':
          return runOperation({
            operation: 'parseFreeformIdea',
            userPrompt: parseFreeformIdeaPrompt(body.idea),
            geminiSchema: briefGeminiSchema,
            zodSchema: briefZodSchema,
            openRouterModels,
          })
        case 'completeBrief':
          return runOperation({
            operation: 'completeBrief',
            userPrompt: completeBriefPrompt(body.brief, blocks),
            geminiSchema: briefGeminiSchema,
            zodSchema: briefZodSchema,
            openRouterModels,
          })
        case 'generateAngles':
          return runOperation({
            operation: 'generateAngles',
            userPrompt: generateAnglesPrompt(body.brief, blocks),
            geminiSchema: anglesGeminiSchema,
            zodSchema: anglesZodSchema,
            openRouterModels,
          })
        case 'generateHooks':
          return runOperation({
            operation: 'generateHooks',
            userPrompt: generateHooksPrompt(body.brief, body.angle, blocks),
            geminiSchema: hooksGeminiSchema,
            zodSchema: hooksZodSchema,
            openRouterModels,
          })
        case 'generateScript':
          return runOperation({
            operation: 'generateScript',
            userPrompt: generateScriptPrompt(body.brief, body.angle, body.hook, blocks),
            geminiSchema: scriptGeminiSchema,
            zodSchema: scriptZodSchema,
            openRouterModels,
          })
        case 'rewriteSection':
          return runOperation({
            operation: 'rewriteSection',
            userPrompt: rewriteSectionPrompt(
              body.instruction,
              body.target,
              body.surrounding,
              blocks,
            ),
            geminiSchema: rewriteGeminiSchema,
            zodSchema: rewriteZodSchema,
            openRouterModels,
          })
        case 'generateVariations':
          return runOperation({
            operation: 'generateVariations',
            userPrompt: generateVariationsPrompt(body.script, body.count, blocks),
            geminiSchema: variationsGeminiSchema,
            zodSchema: variationsZodSchema,
            openRouterModels,
          })
        case 'generateAdCopy':
          return runOperation({
            operation: 'generateAdCopy',
            userPrompt: generateAdCopyPrompt(
              body.briefing,
              body.format,
              body.cta,
              body.scriptContext,
              blocks,
            ),
            geminiSchema: adCopyGeminiSchema,
            zodSchema: adCopyZodSchema,
            openRouterModels,
          })
      }
    })()

    inBackground(
      recordGeneration(admin, {
        workspaceId,
        userId,
        generationType: body.operation,
        promptVersion,
        // Modelo e provedor de quem DE FATO respondeu — pode não ser o primeiro
        // da cadeia. Gravar AI_MODEL aqui esconderia toda troca de provedor.
        model: outcome.model,
        provider: outcome.provider,
        status: 'success',
        latencyMs: Date.now() - startedAt,
        inputTokens: outcome.inputTokens,
        outputTokens: outcome.outputTokens,
      }),
    )

    return jsonResponse({ data: outcome.data })
  } catch (error) {
    const isInvalidOutput = error instanceof InvalidAiOutputError
    const providerError = error instanceof ProviderError ? error : null

    inBackground(
      recordGeneration(admin, {
        workspaceId,
        userId,
        generationType: body.operation,
        promptVersion,
        model: AI_MODEL,
        provider: providerError?.provider ?? 'gemini',
        // Cota esgotada ganha status próprio: no painel ela precisa aparecer
        // separada de JSON inválido e de modelo fora do ar.
        status: isInvalidOutput
          ? 'invalid_output'
          : providerError?.kind === 'quota'
            ? 'quota_exceeded'
            : 'error',
        latencyMs: Date.now() - startedAt,
        errorMessage: (error as Error).message,
      }),
    )

    // Sem este log, uma falha do Gemini só aparecia em ai_generations. O erro
    // que derrubou o primeiro deploy ("modelo descontinuado") ficou invisível
    // nos logs por causa disso.
    if (isInvalidOutput) {
      console.error('[ai-generate] saída inválida:', (error as Error).message)
      return errorResponse('invalid_ai_output', 502)
    }
    if (providerError) {
      console.error(
        `[ai-generate] cadeia esgotada (${providerError.provider}/${providerError.kind}):`,
        providerError.message,
      )
      return errorResponse(
        'ai_unavailable',
        503,
        providerError.kind === 'quota'
          ? 'A cota da IA acabou em todos os provedores configurados.'
          : providerError.message,
      )
    }

    console.error('Erro inesperado em ai-generate:', (error as Error).message)
    return errorResponse('unexpected', 500)
  }
})
