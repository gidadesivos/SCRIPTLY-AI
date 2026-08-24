import type { MediaKind } from '@/features/campaigns/types'

export interface ResolvedMedia {
  kind: MediaKind
  /** URL para exibir. Vazio quando o link não é reconhecido. */
  embedUrl: string
  /** Como o link foi entendido, para a tela dizer o que vai mostrar. */
  source: 'drive' | 'direct' | 'unknown'
}

const DRIVE_PATTERNS = [
  // https://drive.google.com/file/d/<id>/view?usp=sharing
  /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/,
  // https://drive.google.com/open?id=<id>  e  ...uc?id=<id>
  /drive\.google\.com\/(?:open|uc)\?(?:[^&]*&)*id=([A-Za-z0-9_-]+)/,
]

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i

/**
 * Entende o link do criativo e devolve o que dá para exibir.
 *
 * O Drive não serve o arquivo direto: o link que a pessoa copia é uma página
 * de visualização, e usá-lo em <img> ou <video> devolve HTML, não mídia. O
 * caminho que funciona é o /preview num iframe — vale para vídeo e imagem, e
 * respeita a permissão do arquivo. Se o arquivo não estiver compartilhado, o
 * próprio iframe mostra o aviso do Google, que é a mensagem certa.
 */
export function resolveMedia(url: string, declaredKind: MediaKind): ResolvedMedia {
  const trimmed = url.trim()
  if (!trimmed) return { kind: '', embedUrl: '', source: 'unknown' }

  for (const pattern of DRIVE_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) {
      return {
        // O Drive não diz pelo link se é vídeo ou imagem; o iframe resolve os
        // dois, e o tipo declarado só serve para rotular.
        kind: declaredKind,
        embedUrl: `https://drive.google.com/file/d/${match[1]}/preview`,
        source: 'drive',
      }
    }
  }

  if (/^https?:\/\//i.test(trimmed)) {
    if (VIDEO_EXT.test(trimmed)) return { kind: 'video', embedUrl: trimmed, source: 'direct' }
    if (IMAGE_EXT.test(trimmed)) return { kind: 'image', embedUrl: trimmed, source: 'direct' }
    return { kind: declaredKind, embedUrl: trimmed, source: 'direct' }
  }

  return { kind: declaredKind, embedUrl: '', source: 'unknown' }
}

/** Dedução para preencher o seletor sozinho quando o link já entrega o tipo. */
export function guessKind(url: string): MediaKind {
  if (VIDEO_EXT.test(url)) return 'video'
  if (IMAGE_EXT.test(url)) return 'image'
  return ''
}
