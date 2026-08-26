import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Mensagens sequenciais reais. Proibido barra de progresso percentual falsa (§9):
 * não sabemos quanto falta, então não fingimos que sabemos.
 */
export function AiLoading({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
    if (messages.length <= 1) return
    const interval = setInterval(() => {
      // Trava na última: nunca voltar ao começo dando impressão de loop infinito.
      setIndex((current) => (current < messages.length - 1 ? current + 1 : current))
    }, 2500)
    return () => clearInterval(interval)
  }, [messages])

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{messages[index]}</p>
    </div>
  )
}
