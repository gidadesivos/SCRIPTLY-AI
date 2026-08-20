import { useCallback, useEffect, useRef, useState } from 'react'

export type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved'; at: Date }
  | { status: 'error' }

const DEBOUNCE_MS = 1200

/**
 * Autosave do §9: debounce de 1200ms + save no blur.
 * Não cria versão — versão só em marcos, e isso é decisão de quem chama.
 */
export function useAutosave(save: (payload: Record<string, unknown>) => Promise<void>) {
  const [state, setState] = useState<SaveState>({ status: 'idle' })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<Record<string, unknown>>({})
  const saveRef = useRef(save)

  // Mantém a referência atual sem reinstalar o timer a cada render.
  useEffect(() => {
    saveRef.current = save
  }, [save])

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const payload = pendingRef.current
    if (Object.keys(payload).length === 0) return

    pendingRef.current = {}
    setState({ status: 'saving' })
    try {
      await saveRef.current(payload)
      setState({ status: 'saved', at: new Date() })
    } catch {
      // Devolve o payload à fila para não perder a edição do usuário.
      pendingRef.current = { ...payload, ...pendingRef.current }
      setState({ status: 'error' })
    }
  }, [])

  const schedule = useCallback(
    (patch: Record<string, unknown>) => {
      pendingRef.current = { ...pendingRef.current, ...patch }
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => void flush(), DEBOUNCE_MS)
    },
    [flush],
  )

  // Salva o que estiver pendente ao desmontar (sair da tela não pode perder).
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (Object.keys(pendingRef.current).length > 0) void saveRef.current(pendingRef.current)
    }
  }, [])

  const hasPending = () => Object.keys(pendingRef.current).length > 0

  return { state, schedule, flush, hasPending, retry: flush }
}
