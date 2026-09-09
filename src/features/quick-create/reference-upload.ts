import { supabase } from '@/lib/supabase'
import { extensionFor } from '@/features/quick-create/reference-rules'

/**
 * Upload da referência em vídeo (a parte que fala com a rede).
 *
 * O arquivo vai do navegador DIRETO para o Storage e nunca passa dentro de um
 * JSON: em base64 um vídeo de 50 MB vira ~67 MB de texto, atravessa o corpo da
 * requisição e é reparseado na memória da Edge Function. O que a function
 * recebe depois é só o caminho.
 *
 * As regras (formatos, teto, validação) ficam em reference-rules.ts.
 */

const BUCKET = 'reference-uploads'

export interface ReferenceUploadResult {
  /** Caminho no bucket. É isto que vai para a Edge Function. */
  path: string
}

/**
 * Sobe o arquivo. O path segue {workspace_id}/references/{user_id}/... porque é
 * o primeiro segmento que a policy do bucket lê para checar o workspace.
 */
export async function uploadReferenceVideo(
  workspaceId: string,
  file: File,
  signal?: AbortSignal,
): Promise<ReferenceUploadResult> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('not authenticated')

  const path = `${workspaceId}/references/${userData.user.id}/${Date.now()}.${extensionFor(file)}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'video/mp4',
    upsert: false,
  })

  if (error) throw error

  // Cancelado enquanto subia: o arquivo já está lá, e deixá-lo seria lixo que
  // ninguém mais referencia.
  if (signal?.aborted) {
    await removeReferenceVideo(path)
    throw new DOMException('Upload cancelado.', 'AbortError')
  }

  return { path }
}

/** Best-effort: falhar a faxina não pode derrubar a tela do usuário. */
export async function removeReferenceVideo(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.error('Falha ao remover referência:', error.message)
}
