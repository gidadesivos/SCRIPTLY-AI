import { useCallback, useEffect, useRef, useState } from 'react'
import {
  EMPTY_QUICK_DRAFT,
  quickDraftSchema,
  type QuickDraft,
} from '@/features/quick-create/schemas/quickScript'

/**
 * Rascunho da Criação (Beta).
 *
 * Mesma ideia do useCreateDraft do fluxo guiado, com chave própria: os dois
 * formatos não têm nada em comum, e compartilhar a chave faria um sobrescrever
 * o outro. Hook separado também é o que permite apagar a Beta sem tocar no
 * rascunho do fluxo antigo.
 *
 * O VÍDEO NÃO ENTRA AQUI. localStorage tem alguns megabytes no total; um vídeo
 * estouraria a cota e derrubaria o salvamento de tudo o mais.
 */

const VERSION = 1
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const SAVE_DEBOUNCE_MS = 600

/** Por marca: o pedido conversa com um Brand Brain específico. */
function storageKey(workspaceId: string, brandId: string) {
  return `scriptly:quick-draft:${workspaceId}:${brandId}`
}

interface Envelope {
  version: number
  savedAt: number
  draft: QuickDraft
}

function load(workspaceId: string, brandId: string): QuickDraft | null {
  try {
    const raw = localStorage.getItem(storageKey(workspaceId, brandId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as Envelope
    if (parsed.version !== VERSION) return null
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null

    const result = quickDraftSchema.safeParse(parsed.draft)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function useQuickCreateDraft({
  workspaceId,
  brandId,
  draft,
  onRestore,
}: {
  workspaceId: string
  brandId: string
  draft: QuickDraft
  onRestore: (draft: QuickDraft) => void
}) {
  const [restoredAt, setRestoredAt] = useState<number | null>(null)
  const jaRestaurou = useRef(false)

  useEffect(() => {
    if (!workspaceId || !brandId || jaRestaurou.current) return
    jaRestaurou.current = true

    const salvo = load(workspaceId, brandId)
    // Rascunho vazio não vale interromper ninguém com "restauramos seu texto".
    if (salvo && salvo.request.trim()) {
      onRestore(salvo)
      setRestoredAt(Date.now())
    }
  }, [workspaceId, brandId, onRestore])

  useEffect(() => {
    if (!workspaceId || !brandId || !jaRestaurou.current) return

    // Debounce: salvar a cada tecla escreveria no localStorage dezenas de vezes
    // por frase, de forma síncrona, no meio da digitação.
    const timer = setTimeout(() => {
      try {
        const envelope: Envelope = { version: VERSION, savedAt: Date.now(), draft }
        localStorage.setItem(storageKey(workspaceId, brandId), JSON.stringify(envelope))
      } catch {
        // Cota estourada ou modo privado: perder o rascunho é ruim, derrubar a
        // tela de criação por causa disso é pior.
      }
    }, SAVE_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [workspaceId, brandId, draft])

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey(workspaceId, brandId))
    } catch {
      /* idem */
    }
    setRestoredAt(null)
  }, [workspaceId, brandId])

  return { restoredAt, clear, empty: EMPTY_QUICK_DRAFT }
}
