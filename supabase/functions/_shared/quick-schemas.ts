import { z } from 'npm:zod@3.23.8'
import type { GeminiSchema } from './gemini.ts'

/**
 * Schemas da Criação (Beta).
 *
 * A forma das CENAS é deliberadamente idêntica à do fluxo guiado
 * (scriptZodSchema em schemas.ts): é ela que permite salvar com o mesmo
 * saveScript, abrir no mesmo editor e aparecer na mesma biblioteca. Um roteiro
 * da Beta não pode ser um cidadão de segunda classe no produto.
 *
 * O que a Beta acrescenta é o bloco de ESTRATÉGIA — as decisões que no fluxo
 * guiado o usuário tomava a mão (objetivo, público, ângulo) e que aqui a IA
 * toma sozinha. Sem isso o usuário receberia um roteiro sem saber por quê.
 */

const str = (description?: string): GeminiSchema => ({ type: 'STRING', description })

// ------------------------------------------------------------ quickScript
const cenaGemini: GeminiSchema = {
  type: 'OBJECT',
  properties: {
    purpose: str('Função narrativa da cena'),
    shot: str('Enquadramento sugerido'),
    visual: str('O que aparece na tela'),
    action: str('O que acontece'),
    voiceover: str('Locução, exatamente como será falada'),
    on_screen_text: str('Texto em tela, curto, NÃO repete a locução'),
    broll: str(),
    editing_direction: str(),
    transition: str(),
    sound_suggestion: str(),
  },
  required: ['voiceover'],
}

export const quickScriptGeminiSchema: GeminiSchema = {
  type: 'OBJECT',
  properties: {
    title: str('Título curto e descritivo do roteiro, não um hook'),
    framework: str('Estrutura narrativa usada'),
    hook: str('A primeira frase falada, que precisa segurar o espectador'),
    cta: str('Chamada para ação'),
    strategy_summary: str('Uma frase sobre a decisão criativa tomada'),
    objective: str('Objetivo estratégico escolhido'),
    audience: str('Público a que este roteiro se dirige'),
    angle: str('O ângulo escolhido, em uma frase'),
    promise: str('A promessa central'),
    reference_summary: str(
      'O que foi aproveitado da referência. Vazio quando não houve referência.',
    ),
    scenes: { type: 'ARRAY', items: cenaGemini },
  },
  required: ['title', 'hook', 'scenes'],
}

/**
 * Zod é quem valida de verdade. O schema do Gemini é uma dica; esta é a trava.
 *
 * Quase tudo tem default('') porque campo ausente NÃO deve derrubar um roteiro
 * inteiro que veio bom — só `title`, `hook` e ao menos uma cena são
 * inegociáveis, porque sem eles não há roteiro nenhum para mostrar.
 */
export const quickScriptZodSchema = z.object({
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

export type QuickScriptOutput = z.infer<typeof quickScriptZodSchema>

// ------------------------------------------------------- analyzeReference
/**
 * A análise do vídeo devolve TEXTO ESTRUTURADO, não o roteiro.
 *
 * É essa separação que permite escrever o roteiro com o modelo escolhido pelo
 * usuário, mesmo que ele não entenda vídeo: o que chega na geração é o que a
 * análise entendeu, em palavras.
 */
export const referenceInsightsGeminiSchema: GeminiSchema = {
  type: 'OBJECT',
  properties: {
    summary: str('Do que trata o conteúdo, em 2 a 3 frases'),
    topics: { type: 'ARRAY', items: str('Assunto abordado') },
    hook_style: str('Como a abertura prende a atenção'),
    structure: { type: 'ARRAY', items: str('Etapa da narrativa, na ordem') },
    tone: str('Tom e ritmo percebidos'),
    cta: str('Chamada para ação, se houver'),
    arguments_used: { type: 'ARRAY', items: str('Argumento usado para convencer') },
  },
  required: ['summary'],
}

export const referenceInsightsZodSchema = z.object({
  summary: z.string().min(1, 'A análise voltou vazia.'),
  topics: z.array(z.string()).default([]),
  hook_style: z.string().default(''),
  structure: z.array(z.string()).default([]),
  tone: z.string().default(''),
  cta: z.string().default(''),
  arguments_used: z.array(z.string()).default([]),
})

export type ReferenceInsights = z.infer<typeof referenceInsightsZodSchema>

// --------------------------------------------------------- refineQuickScript
/**
 * Refinar devolve o roteiro INTEIRO, e não um patch.
 *
 * Um patch parece mais econômico, mas "deixe menos comercial" costuma mexer no
 * hook, no CTA e em várias cenas ao mesmo tempo — costurar isso no cliente
 * daria um roteiro internamente incoerente. Devolver tudo mantém a peça
 * consistente, que é o ponto de refinar.
 */
export const refineQuickScriptGeminiSchema = quickScriptGeminiSchema
export const refineQuickScriptZodSchema = quickScriptZodSchema

// ------------------------------------------------------------ hookOptions
export const hookOptionsGeminiSchema: GeminiSchema = {
  type: 'OBJECT',
  properties: {
    hooks: { type: 'ARRAY', items: str('Uma primeira frase alternativa') },
  },
  required: ['hooks'],
}

export const hookOptionsZodSchema = z.object({
  hooks: z.array(z.string().min(1)).min(1, 'A IA não devolveu nenhum hook.'),
})
