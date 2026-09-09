import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AUTOMATIC, type QuickOption } from '@/features/quick-create/schemas/quickScript'

/**
 * Chips de escolha única.
 *
 * Chips e não <select> porque estas listas são curtas e a escolha é parte da
 * conversa: num select o usuário precisa abrir para lembrar o que existe, e a
 * proposta da tela é ele bater o olho e decidir.
 *
 * Radiogroup de verdade, com setas do teclado, porque um punhado de <button>
 * soltos é lido pelo leitor de tela como botões independentes — sem dizer que
 * são alternativas de um mesmo campo nem qual está escolhida.
 */
export function ChoiceChips({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string
  options: QuickOption[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  function aoTeclar(event: React.KeyboardEvent, index: number) {
    const passo =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0
    if (passo === 0) return

    event.preventDefault()
    const proximo = (index + passo + options.length) % options.length
    onChange(options[proximo].value)
  }

  return (
    <div>
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[#5E5E75]">
        {label}
      </span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option, index) => {
          const ativo = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={ativo}
              // Só o selecionado entra na ordem do Tab: dentro de um radiogroup
              // a navegação é por setas, não por Tab item a item.
              tabIndex={ativo ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => aoTeclar(event, index)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D4AFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B10]',
                'disabled:cursor-not-allowed disabled:opacity-50',
                ativo
                  ? 'border-[#6D4AFF]/60 bg-[#6D4AFF]/15 text-[#B9A6FF]'
                  : 'border-[#1E1E28] bg-[#14141C] text-[#8C8CA0] hover:border-[#2A2A38] hover:text-[#EDEDF2]',
              )}
            >
              {option.value === AUTOMATIC && <Sparkles className="h-3.5 w-3.5" aria-hidden />}
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
