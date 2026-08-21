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
  generateVariationsPrompt,
  parseFreeformIdeaPrompt,
  rewriteSectionPrompt,
} from '../_shared/prompts.ts'
import {
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

  const verdict = await checkRateLimit(admin, userId, workspaceId)
  if (!verdict.allowed) {
    await recordGeneration(admin, {
      workspaceId,
      userId,
      generationType: body.operation,
      promptVersion,
      model: AI_MODEL,
      status: 'rate_limited',
    })
    return jsonResponse(
      {
        error: {
          code: 'rate_limited',
          detail:
            verdict.scope === 'user'
              ? 'Você atingiu o limite de gerações por minuto. Aguarde um instante.'
              : 'O workspace atingiu o limite de gerações por minuto. Aguarde um instante.',
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
      }
    })()

    await recordGeneration(admin, {
      workspaceId,
      userId,
      generationType: body.operation,
      promptVersion,
      model: AI_MODEL,
      status: 'success',
      latencyMs: Date.now() - startedAt,
      inputTokens: outcome.inputTokens,
      outputTokens: outcome.outputTokens,
    })

    return jsonResponse({ data: outcome.data })
  } catch (error) {
    const isInvalidOutput = error instanceof InvalidAiOutputError
    const isGeminiDown = error instanceof GeminiError

    await recordGeneration(admin, {
      workspaceId,
      userId,
      generationType: body.operation,
      promptVersion,
      model: AI_MODEL,
      status: isInvalidOutput ? 'invalid_output' : 'error',
      latencyMs: Date.now() - startedAt,
      errorMessage: (error as Error).message,
    })

    if (isInvalidOutput) return errorResponse('invalid_ai_output', 502)
    if (isGeminiDown) return errorResponse('ai_unavailable', 503)

    console.error('Erro inesperado em ai-generate:', (error as Error).message)
    return errorResponse('unexpected', 500)
  }
})
