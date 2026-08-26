import { z } from 'zod'

// Sem .default(): o formulário sempre fornece todos os campos, e defaults aqui
// fariam z.input divergir de z.output, quebrando a tipagem do react-hook-form.
const tagList = z.array(z.string().trim().min(1))
const optionalText = z
  .string()
  .trim()
  .max(2000, 'Texto longo demais (máximo 2000 caracteres).')
  .optional()
  .or(z.literal(''))

export const brandFormSchema = z.object({
  // Identidade
  name: z
    .string()
    .trim()
    .min(2, 'O nome da marca precisa ter pelo menos 2 caracteres.')
    .max(80, 'O nome pode ter no máximo 80 caracteres.'),
  description: optionalText,
  industry: optionalText,
  website: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(''))
    .refine(
      (value) => !value || /^https?:\/\/.+\..+/.test(value),
      'Informe uma URL completa, começando com https://',
    ),
  instagram: optionalText,
  country: optionalText,
  language: z.string().trim().min(1, 'Informe o idioma.'),

  // Posicionamento
  value_proposition: optionalText,
  positioning: optionalText,
  differentiators: tagList,
  benefits: tagList,

  // Público
  target_audiences: tagList,
  pains: tagList,
  desires: tagList,
  objections: tagList,

  // Voz
  tone: optionalText,
  personality: optionalText,
  preferred_words: tagList,
  forbidden_words: tagList,
  preferred_ctas: tagList,

  // Provas
  proofs: tagList,
  competitors: tagList,

  // IA
  ai_instructions: z
    .string()
    .trim()
    .max(4000, 'As instruções podem ter no máximo 4000 caracteres.')
    .optional()
    .or(z.literal('')),
})

export type BrandFormInput = z.input<typeof brandFormSchema>
export type BrandFormValues = z.output<typeof brandFormSchema>
