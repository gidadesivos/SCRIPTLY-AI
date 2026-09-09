import { z } from 'npm:zod@3.23.8'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { AI_MODEL } from '../_shared/ai-config.ts'
import { authenticate, AuthError, ConfigError } from '../_shared/auth.ts'
import { buildContext } from '../_shared/context.ts'
import {
  ProviderError,
  fetchOpenRouterCatalog,
  fetchOpenRouterQuota,
  fetchGroqCatalog,
  fetchGeminiCatalog,
  configuredProviders,
} from '../_shared/providers/index.ts'
import type { ProviderName } from '../_shared/providers/types.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/http.ts'
import { InvalidAiOutputError, runOperation } from '../_shared/pipeline.ts'
import {
  GeminiFileError,
  deleteGeminiFile,
  uploadVideoToGemini,
} from '../_shared/gemini-files.ts'
import {
  GEMINI_VIDEO_MODEL,
  MAX_REFERENCE_VIDEO_BYTES,
  REFERENCE_BUCKET,
} from '../_shared/ai-config.ts'
import {
  QUICK_PROMPT_VERSIONS,
  QUICK_SYSTEM_V1,
  REFERENCE_SYSTEM_V1,
  analyzeReferencePrompt,
  quickHookOptionsPrompt,
  quickScriptPrompt,
  refineQuickScriptPrompt,
} from '../_shared/quick-prompts.ts'
import {
  hookOptionsGeminiSchema,
  hookOptionsZodSchema,
  quickScriptGeminiSchema,
  quickScriptZodSchema,
  referenceInsightsGeminiSchema,
  referenceInsightsZodSchema,
  refineQuickScriptGeminiSchema,
  refineQuickScriptZodSchema,
} from '../_shared/quick-schemas.ts'
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
  MINIMAL_SYSTEM_PROMPT_V1,
  EDITOR_SYSTEM_PROMPT_V1,
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

/**
 * Baixa a referência do Storage, entrega ao Gemini e devolve o que ele entendeu.
 *
 * A checagem do caminho NÃO é redundante com a RLS do bucket. A RLS protege o
 * navegador; aqui o cliente admin (service role) IGNORA RLS por definição. Sem
 * esta trava, mandar `storagePath` de outro workspace faria a própria function
 * buscar e revelar o arquivo alheio — o clássico IDOR.
 */
async function analisarReferencia(
  admin: SupabaseClient,
  workspaceId: string,
  storagePath: string,
  pedidoDoUsuario: string,
) {
  const prefixoEsperado = `${workspaceId}/references/`
  // startsWith sozinho aceitaria "../" no meio; o Storage trata a chave como
  // texto, então travessia precisa ser recusada explicitamente.
  if (!storagePath.startsWith(prefixoEsperado) || storagePath.includes('..')) {
    throw new AuthError('Este arquivo não pertence ao workspace.', 'forbidden')
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    throw new ConfigError('A análise de vídeo exige GEMINI_API_KEY na function.')
  }

  const { data: arquivo, error } = await admin.storage
    .from(REFERENCE_BUCKET)
    .download(storagePath)

  if (error || !arquivo) {
    throw new GeminiFileError('Não foi possível ler o vídeo enviado.', false)
  }
  if (arquivo.size === 0) {
    throw new GeminiFileError('O vídeo enviado está vazio.', false)
  }
  // Teto conferido de novo no servidor: o bucket já limita, mas o custo de
  // descobrir isso DEPOIS de subir para o Google é alto demais.
  if (arquivo.size > MAX_REFERENCE_VIDEO_BYTES) {
    throw new GeminiFileError('O vídeo passou do tamanho máximo permitido.', false)
  }

  const referencia = await uploadVideoToGemini(
    apiKey,
    await arquivo.arrayBuffer(),
    arquivo.type || 'video/mp4',
  )

  try {
    return await runOperation({
      operation: 'analyzeReference',
      systemPrompt: REFERENCE_SYSTEM_V1,
      userPrompt: analyzeReferencePrompt(pedidoDoUsuario),
      geminiSchema: referenceInsightsGeminiSchema,
      zodSchema: referenceInsightsZodSchema,
      /*
       * Modelo fixo e SEM cascata, de propósito: só o Gemini recebe vídeo, e
       * cair para OpenRouter aqui produziria uma "análise" de um vídeo que
       * aquele modelo nunca viu — pior que falhar.
       */
      explicitModel: { provider: 'gemini', modelId: GEMINI_VIDEO_MODEL },
      mediaParts: [{ fileUri: referencia.uri, mimeType: referencia.mimeType }],
    })
  } finally {
    // Faxina depois de responder: a cópia no Google não precisa sobreviver à
    // análise, e segurar o usuário para apagar arquivo seria trocar tempo dele
    // por limpeza nossa.
    inBackground(deleteGeminiFile(apiKey, referencia.name))
  }
}

const angleSchema = z.object({ type: z.string(), description: z.string() })
const briefSchema = z.record(z.unknown())

/** Modelo explícito escolhido pelo usuário na top bar. */
const modelSchema = z.object({
  provider: z.enum(['gemini', 'openrouter', 'groq']),
  modelId: z.string().min(1),
}).optional()

const requestSchema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('parseFreeformIdea'),
    workspaceId: z.string().uuid(),
    idea: z.string().min(3).max(2000),
    model: modelSchema,
  }),
  z.object({
    operation: z.literal('completeBrief'),
    workspaceId: z.string().uuid(),
    brandId: z.string().uuid(),
    productId: z.string().uuid().nullish(),
    brief: briefSchema,
    model: modelSchema,
  }),
  z.object({
    operation: z.literal('generateAngles'),
    workspaceId: z.string().uuid(),
    brandId: z.string().uuid(),
    productId: z.string().uuid().nullish(),
    brief: briefSchema,
    model: modelSchema,
  }),
  z.object({
    operation: z.literal('generateHooks'),
    workspaceId: z.string().uuid(),
    brandId: z.string().uuid(),
    productId: z.string().uuid().nullish(),
    brief: briefSchema,
    angle: angleSchema,
    model: modelSchema,
  }),
  z.object({
    operation: z.literal('generateScript'),
    workspaceId: z.string().uuid(),
    brandId: z.string().uuid(),
    productId: z.string().uuid().nullish(),
    brief: briefSchema,
    angle: angleSchema,
    hook: z.string().min(1),
    model: modelSchema,
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
    model: modelSchema,
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
    model: modelSchema,
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
    provider: z.enum(['openrouter', 'groq', 'gemini']).default('openrouter'),
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
    model: modelSchema,
  }),

  // ------------------------------------------------------ Criação (Beta)
  /**
   * UMA geração: interpreta o pedido, decide estratégia e escreve o roteiro.
   *
   * O fluxo guiado gasta quatro idas ao servidor para chegar aqui. Repetir
   * aquela sequência por dentro destruiria a única coisa que a Beta promete,
   * que é velocidade.
   */
  z.object({
    operation: z.literal('quickScript'),
    workspaceId: z.string().uuid(),
    brandId: z.string().uuid(),
    productId: z.string().uuid().nullish(),
    request: z.string().min(3).max(4000),
    contentType: z.string().max(40).default('automatico'),
    platform: z.string().max(40).default('instagram_reels'),
    durationSeconds: z.number().int().min(5).max(180).default(30),
    tone: z.string().max(40).default('automatico'),
    audience: z.string().max(300).default(''),
    cta: z.string().max(300).default(''),
    funnelStage: z.string().max(40).default(''),
    extraInstructions: z.string().max(1000).default(''),
    withoutCta: z.boolean().default(false),
    voiceoverOnly: z.boolean().default(false),
    /** Transcrição colada ou lida de .txt/.srt/.vtt, já normalizada no cliente. */
    transcript: z.string().max(40_000).default(''),
    /** Resultado de analyzeReference, quando houve vídeo. */
    insights: z
      .object({
        summary: z.string(),
        topics: z.array(z.string()).default([]),
        hook_style: z.string().default(''),
        structure: z.array(z.string()).default([]),
        tone: z.string().default(''),
        cta: z.string().default(''),
        arguments_used: z.array(z.string()).default([]),
      })
      .nullish(),
    model: modelSchema,
  }),

  /**
   * Análise do vídeo. Operação separada por uma razão técnica, não estética:
   * baixar do Storage, subir para o Google, esperar o processamento e ainda
   * gerar o roteiro não cabe numa invocação só.
   *
   * Recebe o CAMINHO no Storage, nunca o arquivo: bytes de vídeo dentro de um
   * JSON estouram memória, payload e custo.
   */
  z.object({
    operation: z.literal('analyzeReference'),
    workspaceId: z.string().uuid(),
    storagePath: z.string().min(1).max(500),
    request: z.string().max(4000).default(''),
  }),

  z.object({
    operation: z.literal('refineQuickScript'),
    workspaceId: z.string().uuid(),
    brandId: z.string().uuid(),
    productId: z.string().uuid().nullish(),
    script: z.record(z.unknown()),
    instruction: z.string().min(1).max(1000),
    platform: z.string().max(40).default('instagram_reels'),
    durationSeconds: z.number().int().min(5).max(180).default(30),
    model: modelSchema,
  }),

  z.object({
    operation: z.literal('quickHookOptions'),
    workspaceId: z.string().uuid(),
    brandId: z.string().uuid(),
    productId: z.string().uuid().nullish(),
    script: z.object({
      title: z.string().default(''),
      hook: z.string().default(''),
      angle: z.string().default(''),
      voiceovers: z.array(z.string()).default([]),
    }),
    count: z.number().int().min(1).max(5).default(3),
    model: modelSchema,
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
      let models
      if (body.provider === 'groq') {
        models = await fetchGroqCatalog()
      } else if (body.provider === 'gemini') {
        models = await fetchGeminiCatalog()
      } else {
        models = await fetchOpenRouterCatalog()
      }
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
    .select('provider, model_id')
    .eq('workspace_id', workspaceId)
    .eq('enabled', true)
    .order('position', { ascending: true })

  const openRouterModels = (chosenModels ?? [])
    .filter((row: { provider: string }) => row.provider === 'openrouter')
    .map((row: { model_id: string }) => row.model_id)

  const groqModels = (chosenModels ?? [])
    .filter((row: { provider: string }) => row.provider === 'groq')
    .map((row: { model_id: string }) => row.model_id)

  const geminiModels = (chosenModels ?? [])
    .filter((row: { provider: string }) => row.provider === 'gemini')
    .map((row: { model_id: string }) => row.model_id)

  // Modelo explícito escolhido pelo usuário na top bar.
  // Quando presente, o pipeline chama APENAS este provedor/modelo sem fallback.
  const explicitModel = 'model' in body && body.model
    ? { provider: body.model.provider as ProviderName, modelId: body.model.modelId }
    : undefined

  /*
   * As versões da Beta ficam num mapa próprio (quick-prompts.ts) porque seus
   * prompts evoluem sozinhos. Unir aqui, e não lá, mantém prompts.ts intocado —
   * é o que faz remover a Beta ser apagar arquivos, não desfiar o fluxo antigo.
   */
  const promptVersion = { ...PROMPT_VERSIONS, ...QUICK_PROMPT_VERSIONS }[body.operation]

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
    /*
     * analyzeReference entra aqui junto do parseFreeformIdea: descrever COMO um
     * vídeo de terceiro funciona não depende do Brand Brain, e mandar a marca
     * junto só contaminaria a leitura com o que queremos escrever depois.
     */
    const blocks =
      body.operation === 'parseFreeformIdea' || body.operation === 'analyzeReference'
        ? { brandBlock: '', productBlock: '', avoidBlock: '' }
        : await buildContext(admin, workspaceId, body.brandId, body.productId ?? null)

    const outcome = await (async () => {
      switch (body.operation) {
        case 'parseFreeformIdea':
          return runOperation({
            operation: 'parseFreeformIdea',
            systemPrompt: MINIMAL_SYSTEM_PROMPT_V1,
            userPrompt: parseFreeformIdeaPrompt(body.idea),
            geminiSchema: briefGeminiSchema,
            zodSchema: briefZodSchema,
            openRouterModels,
            groqModels,
            geminiModels,
            explicitModel,
          })
        case 'completeBrief':
          return runOperation({
            operation: 'completeBrief',
            userPrompt: completeBriefPrompt(body.brief, blocks),
            geminiSchema: briefGeminiSchema,
            zodSchema: briefZodSchema,
            openRouterModels,
            groqModels,
            geminiModels,
            explicitModel,
          })
        case 'generateAngles':
          return runOperation({
            operation: 'generateAngles',
            userPrompt: generateAnglesPrompt(body.brief, blocks),
            geminiSchema: anglesGeminiSchema,
            zodSchema: anglesZodSchema,
            openRouterModels,
            groqModels,
            geminiModels,
            explicitModel,
          })
        case 'generateHooks':
          return runOperation({
            operation: 'generateHooks',
            userPrompt: generateHooksPrompt(body.brief, body.angle, blocks),
            geminiSchema: hooksGeminiSchema,
            zodSchema: hooksZodSchema,
            openRouterModels,
            groqModels,
            geminiModels,
            explicitModel,
          })
        case 'generateScript':
          return runOperation({
            operation: 'generateScript',
            userPrompt: generateScriptPrompt(body.brief, body.angle, body.hook, blocks),
            geminiSchema: scriptGeminiSchema,
            zodSchema: scriptZodSchema,
            openRouterModels,
            groqModels,
            geminiModels,
            explicitModel,
          })
        case 'rewriteSection':
          return runOperation({
            operation: 'rewriteSection',
            systemPrompt: EDITOR_SYSTEM_PROMPT_V1,
            userPrompt: rewriteSectionPrompt(
              body.instruction,
              body.target,
              body.surrounding,
              blocks,
            ),
            geminiSchema: rewriteGeminiSchema,
            zodSchema: rewriteZodSchema,
            openRouterModels,
            groqModels,
            geminiModels,
            explicitModel,
          })
        case 'generateVariations':
          return runOperation({
            operation: 'generateVariations',
            systemPrompt: EDITOR_SYSTEM_PROMPT_V1,
            userPrompt: generateVariationsPrompt(body.script, body.count, blocks),
            geminiSchema: variationsGeminiSchema,
            zodSchema: variationsZodSchema,
            openRouterModels,
            groqModels,
            geminiModels,
            explicitModel,
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
            groqModels,
            geminiModels,
            explicitModel,
          })

        // -------------------------------------------------- Criação (Beta)
        case 'quickScript':
          return runOperation({
            operation: 'quickScript',
            systemPrompt: QUICK_SYSTEM_V1,
            userPrompt: quickScriptPrompt(
              {
                request: body.request,
                contentType: body.contentType,
                platform: body.platform,
                durationSeconds: body.durationSeconds,
                tone: body.tone,
                audience: body.audience,
                cta: body.cta,
                funnelStage: body.funnelStage,
                extraInstructions: body.extraInstructions,
                withoutCta: body.withoutCta,
                voiceoverOnly: body.voiceoverOnly,
                transcript: body.transcript,
                insights: body.insights ?? null,
              },
              blocks,
            ),
            geminiSchema: quickScriptGeminiSchema,
            zodSchema: quickScriptZodSchema,
            openRouterModels,
            groqModels,
            geminiModels,
            explicitModel,
          })

        case 'analyzeReference':
          return analisarReferencia(admin, workspaceId, body.storagePath, body.request)

        case 'refineQuickScript':
          return runOperation({
            operation: 'refineQuickScript',
            systemPrompt: QUICK_SYSTEM_V1,
            userPrompt: refineQuickScriptPrompt(
              body.script,
              body.instruction,
              { durationSeconds: body.durationSeconds, platform: body.platform },
              blocks,
            ),
            geminiSchema: refineQuickScriptGeminiSchema,
            zodSchema: refineQuickScriptZodSchema,
            openRouterModels,
            groqModels,
            geminiModels,
            explicitModel,
          })

        case 'quickHookOptions':
          return runOperation({
            operation: 'quickHookOptions',
            systemPrompt: QUICK_SYSTEM_V1,
            userPrompt: quickHookOptionsPrompt(body.script, body.count, blocks),
            geminiSchema: hookOptionsGeminiSchema,
            zodSchema: hookOptionsZodSchema,
            openRouterModels,
            groqModels,
            geminiModels,
            explicitModel,
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
        /*
         * O modelo que de fato falhou, não o padrão.
         *
         * Gravar AI_MODEL aqui fazia toda falha aparecer como se fosse do
         * Gemini padrão — inclusive as do OpenRouter e do Groq. O painel de
         * consumo por modelo ficava certo no sucesso e mentiroso no erro,
         * que é exatamente onde importa saber qual modelo derrubou.
         */
        model: explicitModel?.modelId ?? AI_MODEL,
        provider: providerError?.provider ?? explicitModel?.provider ?? 'gemini',
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
    /*
     * Falhas próprias da referência ganham resposta própria.
     *
     * Cair no 'unexpected' genérico faria "seu vídeo tem 300 MB" e "o Gemini
     * está fora do ar" chegarem ao usuário com a mesma frase inútil — e a
     * primeira ele resolve sozinho em dez segundos, se souber.
     */
    if (error instanceof AuthError) {
      return errorResponse(error.code, error.code === 'unauthorized' ? 401 : 403, error.message)
    }
    if (error instanceof ConfigError) {
      console.error('[ai-generate] configuração ausente:', error.message)
      return errorResponse('ai_unavailable', 503, error.message)
    }
    if (error instanceof GeminiFileError) {
      console.error('[ai-generate] referência de vídeo:', error.message)
      return errorResponse('reference_failed', error.retryable ? 503 : 422, error.message)
    }

    if (isInvalidOutput) {
      console.error('[ai-generate] saída inválida:', (error as Error).message)
      return errorResponse('invalid_ai_output', 502)
    }
    if (providerError) {
      console.error(
        `[ai-generate] cadeia esgotada (${providerError.provider}/${providerError.kind}):`,
        providerError.message,
      )
      /*
       * Modelo escolhido à mão não tem rede de segurança: callExplicit não cai
       * para o próximo provedor de propósito. Então quando a falha é de
       * configuração — modelo que não existe, chave sem acesso a ele — o
       * usuário fica travado até trocar a escolha, e a mensagem precisa dizer
       * isso. Sem esta linha ele via só o erro cru do fornecedor.
       */
      const detail =
        providerError.kind === 'quota'
          ? 'A cota da IA acabou em todos os provedores configurados.'
          : explicitModel && providerError.kind === 'config'
            ? `O modelo "${explicitModel.modelId}" não respondeu: ${providerError.message}. Escolha outro modelo no seletor, ou volte para Automático.`
            : providerError.message

      return errorResponse('ai_unavailable', 503, detail)
    }

    console.error('Erro inesperado em ai-generate:', (error as Error).message)
    return errorResponse('unexpected', 500)
  }
})
