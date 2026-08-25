import { z } from 'zod'

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome precisa ter pelo menos 2 caracteres.')
    .max(60, 'O nome pode ter no máximo 60 caracteres.'),
})

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>
