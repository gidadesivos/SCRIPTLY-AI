import { useState } from 'react'
import { Loader2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { strings } from '@/i18n/pt-BR'

const t = strings.quickCreate

/**
 * Ajustes prontos + comando livre.
 *
 * As instruções ficam em português e no imperativo porque vão LITERALMENTE
 * para o prompt: são a mesma coisa que o usuário digitaria no comando livre,
 * só que sem ele precisar digitar.
 */
const QUICK_ACTIONS: Array<{ label: string; instruction: string }> = [
  { label: 'Mais direto', instruction: 'Deixe o roteiro mais direto: corte rodeio e vá ao ponto.' },
  {
    label: 'Encurtar',
    instruction: 'Encurte a locução mantendo a mensagem central e o mesmo número de cenas.',
  },
  { label: 'Hook mais forte', instruction: 'Reescreva a abertura para prender mais nos primeiros segundos.' },
  { label: 'Mais natural', instruction: 'Deixe a locução mais natural, como uma pessoa falando.' },
  { label: 'Mais vendedor', instruction: 'Aumente o apelo comercial sem prometer nada que não foi informado.' },
  { label: 'Mais educativo', instruction: 'Dê mais peso à explicação e menos ao apelo comercial.' },
]

export function AiQuickActions({
  onApply,
  isBusy,
  disabled,
}: {
  onApply: (instruction: string) => void
  isBusy: boolean
  disabled: boolean
}) {
  const [comando, setComando] = useState('')

  function aplicarComando() {
    const limpo = comando.trim()
    if (!limpo) return
    onApply(limpo)
    setComando('')
  }

  return (
    <section className="rounded-xl border border-[#1E1E28] bg-[#0E0E14] p-4">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#5E5E75]">
        {t.quickActions}
      </h2>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.label}
            type="button"
            variant="outline"
            size="sm"
            // isBusy desabilita TODOS: duas refinações concorrentes disputariam
            // qual resposta sobrescreve o roteiro, e a última a chegar venceria
            // sem relação com a ordem em que foram pedidas.
            disabled={disabled || isBusy}
            onClick={() => onApply(action.instruction)}
            className="rounded-full border-[#1E1E28] bg-[#14141C] text-[12px] text-[#8C8CA0] hover:text-[#EDEDF2]"
          >
            {action.label}
          </Button>
        ))}
      </div>

      <label htmlFor="quick-command" className="mb-1.5 block text-[12px] font-medium text-[#8C8CA0]">
        {t.freeCommand}
      </label>
      <Textarea
        id="quick-command"
        rows={2}
        disabled={disabled || isBusy}
        placeholder={t.freeCommandPlaceholder}
        value={comando}
        maxLength={1000}
        onChange={(e) => setComando(e.target.value)}
        onKeyDown={(event) => {
          // Enter sozinho quebra linha; com Ctrl/Cmd envia, como no resto do app.
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            aplicarComando()
          }
        }}
      />
      <Button
        type="button"
        className="mt-2 w-full sm:w-auto"
        disabled={disabled || isBusy || !comando.trim()}
        onClick={aplicarComando}
      >
        {isBusy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t.applying}
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4" aria-hidden />
            {t.apply}
          </>
        )}
      </Button>
    </section>
  )
}
