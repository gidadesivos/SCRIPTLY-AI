import { z } from 'zod'

// Ver comentário em brand.ts: sem .default() para manter z.input === z.output.
const tagList = z.array(z.string().trim().min(1))
const optionalText = z
  .string()
  .trim()
  .max(2000, 'Texto longo demais (máximo 2000 caracteres).')
  .optional()
  .or(z.literal(''))

export const faqItemSchema = z.object({
  question: z.string().trim().min(1, 'Escreva a pergunta.'),
  answer: z.string().trim().min(1, 'Escreva a resposta.'),
})

export const linkItemSchema = z.object({
  label: z.string().trim().min(1, 'Dê um nome ao link.'),
  url: z.string().trim().url('Informe uma URL válida.'),
})

export const productFormSchema = z.object({
  brand_id: z.string().uuid('Escolha uma marca.'),
  name: z
    .string()
    .trim()
    .min(2, 'O nome do produto precisa ter pelo menos 2 caracteres.')
    .max(80, 'O nome pode ter no máximo 80 caracteres.'),
  category: optionalText,
  description: optionalText,
  target_audience: optionalText,

  benefits: tagList,
  differentiators: tagList,
  problems_solved: tagList,
  desires: tagList,
  objections: tagList,

  offer: optionalText,
  price_range: optionalText,
  guarantee: optionalText,
  default_cta: optionalText,
  notes: optionalText,

  faq: z.array(faqItemSchema),
  links: z.array(linkItemSchema),
})

export type FaqItem = z.infer<typeof faqItemSchema>
export type LinkItem = z.infer<typeof linkItemSchema>
export type ProductFormInput = z.input<typeof productFormSchema>
export type ProductFormValues = z.output<typeof productFormSchema>
