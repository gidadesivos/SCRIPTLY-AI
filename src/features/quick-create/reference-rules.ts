/**
 * Regras da referência em vídeo: limites, formatos e validação.
 *
 * Separado de reference-upload.ts porque decidir SE um arquivo serve não
 * depende de rede nem do cliente Supabase — e enquanto as duas coisas moravam
 * juntas, testar a regra exigia carregar o Supabase inteiro.
 */

/**
 * 50 MB. Não é limite do Google (a Files API aceita 2 GiB) — é o tempo de a
 * Edge Function baixar do Storage e reenviar dentro de uma invocação. Precisa
 * bater com o file_size_limit do bucket na migration 0017.
 */
export const MAX_REFERENCE_VIDEO_BYTES = 52_428_800

/**
 * Só formatos com suporte confiável ponta a ponta.
 *
 * A lista é curta de propósito: .m4v e .avi ficaram de fora porque o navegador
 * reporta o MIME deles de forma inconsistente, e prometer um formato que falha
 * na hora da análise é pior do que não oferecer.
 */
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
export const ACCEPTED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm']

/** Para o atributo accept do input. */
export const VIDEO_ACCEPT_ATTR = [...ACCEPTED_VIDEO_TYPES, ...ACCEPTED_VIDEO_EXTENSIONS].join(',')

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

/**
 * Recusa antes de gastar a banda do usuário.
 *
 * Confere extensão OU tipo, e não os dois obrigatoriamente: extensão sozinha é
 * renomeável por qualquer um, e alguns navegadores entregam type vazio para
 * .mov — exigir ambos travaria usuário legítimo. A defesa real contra arquivo
 * forjado é o allowed_mime_types do bucket, que o navegador não controla.
 */
export function validateReferenceVideo(file: File): string | null {
  if (file.size === 0) {
    return 'O arquivo está vazio.'
  }
  if (file.size > MAX_REFERENCE_VIDEO_BYTES) {
    return `Vídeo muito grande (${formatBytes(file.size)}). O limite é ${formatBytes(
      MAX_REFERENCE_VIDEO_BYTES,
    )}.`
  }

  const nome = file.name.toLowerCase()
  const extensaoOk = ACCEPTED_VIDEO_EXTENSIONS.some((ext) => nome.endsWith(ext))
  const tipoOk = ACCEPTED_VIDEO_TYPES.includes(file.type)

  if (!extensaoOk && !tipoOk) {
    return 'Formato não suportado. Envie MP4, MOV ou WEBM.'
  }
  return null
}

export function extensionFor(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName
  return file.type.split('/')[1] ?? 'mp4'
}
