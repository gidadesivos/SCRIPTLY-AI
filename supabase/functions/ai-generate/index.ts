import { z } from 'npm:zod@3.23.8'
import { AI_MODEL } from '../_shared/ai-config.ts'
import { authenticate, AuthError, ConfigError } from '../_shared/auth.ts'
import { buildContext } from '../_shared/context.ts'
import { GeminiError } from '../_shared/gemini.ts'
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

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

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

  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY não configurada nos secrets da function.')
    return errorResponse('ai_unavailable', 503, 'Chave da IA não configurada.')
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
            apiKey: GEMINI_API_KEY,
            operation: 'parseFreeformIdea',
            userPrompt: parseFreeformIdeaPrompt(body.idea),
            geminiSchema: briefGeminiSchema,
            zodSchema: briefZodSchema,
          })
        case 'completeBrief':
          return runOperation({
            apiKey: GEMINI_API_KEY,
            operation: 'completeBrief',
            userPrompt: completeBriefPrompt(body.brief, blocks),
            geminiSchema: briefGeminiSchema,
            zodSchema: briefZodSchema,
          })
        case 'generateAngles':
          return runOperation({
            apiKey: GEMINI_API_KEY,
            operation: 'generateAngles',
            userPrompt: generateAnglesPrompt(body.brief, blocks),
            geminiSchema: anglesGeminiSchema,
            zodSchema: anglesZodSchema,
          })
        case 'generateHooks':
          return runOperation({
            apiKey: GEMINI_API_KEY,
            operation: 'generateHooks',
            userPrompt: generateHooksPrompt(body.brief, body.angle, blocks),
            geminiSchema: hooksGeminiSchema,
            zodSchema: hooksZodSchema,
          })
        case 'generateScript':
          return runOperation({
            apiKey: GEMINI_API_KEY,
            operation: 'generateScript',
            userPrompt: generateScriptPrompt(body.brief, body.angle, body.hook, blocks),
            geminiSchema: scriptGeminiSchema,
            zodSchema: scriptZodSchema,
          })
        case 'rewriteSection':
          return runOperation({
            apiKey: GEMINI_API_KEY,
            operation: 'rewriteSection',
            userPrompt: rewriteSectionPrompt(
              body.instruction,
              body.target,
              body.surrounding,
              blocks,
            ),
            geminiSchema: rewriteGeminiSchema,
            zodSchema: rewriteZodSchema,
          })
        case 'generateVariations':
          return runOperation({
            apiKey: GEMINI_API_KEY,
            operation: 'generateVariations',
            userPrompt: generateVariationsPrompt(body.script, body.count, blocks),
            geminiSchema: variationsGeminiSchema,
            zodSchema: variationsZodSchema,
          })
        case 'generateAdCopy':
          return runOperation({
            apiKey: GEMINI_API_KEY,
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
          })
      }
    })()

    inBackground(
      recordGeneration(admin, {
        workspaceId,
        userId,
        generationType: body.operation,
        promptVersion,
        model: AI_MODEL,
        status: 'success',
        latencyMs: Date.now() - startedAt,
        inputTokens: outcome.inputTokens,
        outputTokens: outcome.outputTokens,
      }),
    )

    return jsonResponse({ data: outcome.data })
  } catch (error) {
    const isInvalidOutput = error instanceof InvalidAiOutputError
    const isGeminiDown = error instanceof GeminiError

    inBackground(
      recordGeneration(admin, {
        workspaceId,
        userId,
        generationType: body.operation,
        promptVersion,
        model: AI_MODEL,
        status: isInvalidOutput ? 'invalid_output' : 'error',
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
    if (isGeminiDown) {
      console.error('[ai-generate] Gemini falhou:', (error as Error).message)
      return errorResponse('ai_unavailable', 503, (error as Error).message)
    }

    console.error('Erro inesperado em ai-generate:', (error as Error).message)
    return errorResponse('unexpected', 500)
  }
})
