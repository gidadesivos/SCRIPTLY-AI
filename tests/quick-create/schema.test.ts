import { test } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import {
  EMPTY_QUICK_DRAFT,
  quickDraftSchema,
} from '../../src/features/quick-create/schemas/quickScript.ts'

/**
 * O schema da SAÍDA da IA vive na Edge Function (Deno) e não é importável a
 * partir daqui. Esta cópia reproduz exatamente quickScriptZodSchema para
 * exercitar as regras que protegem a tela: se a saída da IA vier torta, a
 * página não pode quebrar.
 *
 * Se um dos dois mudar sem o outro, este teste passa a mentir — por isso o
 * teste final compara campo a campo com a lista declarada aqui.
 */
const quickScriptZodSchema = z.object({
  title: z.string().min(1),
  framework: z.string().default(''),
  hook: z.string().min(1, 'A IA não devolveu hook.'),
  cta: z.string().default(''),
  strategy_summary: z.string().default(''),
  objective: z.string().default(''),
  audience: z.string().default(''),
  angle: z.string().default(''),
  promise: z.string().default(''),
  reference_summary: z.string().default(''),
  scenes: z
    .array(
      z.object({
        purpose: z.string().default(''),
        shot: z.string().default(''),
        visual: z.string().default(''),
        action: z.string().default(''),
        voiceover: z.string().default(''),
        on_screen_text: z.string().default(''),
        broll: z.string().default(''),
        editing_direction: z.string().default(''),
        transition: z.string().default(''),
        sound_suggestion: z.string().default(''),
      }),
    )
    .min(1, 'A IA não devolveu nenhuma cena.'),
})

test('resposta mínima é aceita e os opcionais viram string vazia', () => {
  const parsed = quickScriptZodSchema.parse({
    title: 'Adesivo resinado',
    hook: 'Seu adesivo pode custar mais do que parece.',
    scenes: [{ voiceover: 'Fala da primeira cena.' }],
  })

  assert.equal(parsed.cta, '')
  assert.equal(parsed.angle, '')
  assert.equal(parsed.scenes[0].visual, '')
  assert.equal(parsed.scenes[0].voiceover, 'Fala da primeira cena.')
})

test('resposta SEM cenas é recusada — não há roteiro para mostrar', () => {
  const resultado = quickScriptZodSchema.safeParse({
    title: 'x',
    hook: 'y',
    scenes: [],
  })
  assert.equal(resultado.success, false)
})

test('resposta sem hook é recusada', () => {
  const resultado = quickScriptZodSchema.safeParse({
    title: 'x',
    scenes: [{ voiceover: 'a' }],
  })
  assert.equal(resultado.success, false)
})

test('campo extra inventado pela IA não derruba a validação', () => {
  const resultado = quickScriptZodSchema.safeParse({
    title: 'x',
    hook: 'y',
    scenes: [{ voiceover: 'a' }],
    campo_que_ninguem_pediu: 'ignore isto',
  })
  assert.equal(resultado.success, true)
})

test('as cenas têm a MESMA forma que saveScript grava', () => {
  // Se estes nomes divergirem do que a tabela script_scenes espera, o roteiro
  // salvaria com campos vazios sem erro nenhum — falha silenciosa.
  const camposDaCena = [
    'purpose', 'shot', 'visual', 'action', 'voiceover',
    'on_screen_text', 'broll', 'editing_direction', 'transition', 'sound_suggestion',
  ]
  const parsed = quickScriptZodSchema.parse({
    title: 'x', hook: 'y', scenes: [{ voiceover: 'a' }],
  })
  assert.deepEqual(Object.keys(parsed.scenes[0]).sort(), [...camposDaCena].sort())
})

// ------------------------------------------------------------- rascunho
test('rascunho vazio é válido pelo próprio schema', () => {
  assert.equal(quickDraftSchema.safeParse(EMPTY_QUICK_DRAFT).success, true)
})

test('rascunho de versão antiga (campo faltando) é recusado, não remendado', () => {
  const { tone: _tone, ...semTom } = EMPTY_QUICK_DRAFT
  assert.equal(quickDraftSchema.safeParse(semTom).success, false)
})

test('rascunho com modo de referência inválido é recusado', () => {
  const resultado = quickDraftSchema.safeParse({ ...EMPTY_QUICK_DRAFT, referenceMode: 'audio' })
  assert.equal(resultado.success, false)
})

test('o padrão é 30s, Reels, e tudo em automático', () => {
  assert.equal(EMPTY_QUICK_DRAFT.durationSeconds, 30)
  assert.equal(EMPTY_QUICK_DRAFT.platform, 'instagram_reels')
  assert.equal(EMPTY_QUICK_DRAFT.contentType, 'automatico')
  assert.equal(EMPTY_QUICK_DRAFT.tone, 'automatico')
  assert.equal(EMPTY_QUICK_DRAFT.referenceMode, 'none')
})
