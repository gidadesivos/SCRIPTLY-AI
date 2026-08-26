import { z } from 'zod'

export const signInSchema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail.').email('E-mail inválido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Informe seu nome.')
    .max(80, 'O nome pode ter no máximo 80 caracteres.'),
  email: z.string().trim().min(1, 'Informe seu e-mail.').email('E-mail inválido.'),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
})

export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
