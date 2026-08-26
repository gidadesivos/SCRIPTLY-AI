import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagInputProps {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  /** Rótulo usado nos aria-labels dos botões de remover. */
  label: string
  /** Id do campo — vem do FormField para o <label htmlFor> funcionar. */
  id?: string
  disabled?: boolean
  className?: string
  'aria-describedby'?: string
}

/**
 * Entrada de lista (campos text[] do Brand Brain e de produtos).
 * Confirma com Enter ou vírgula; Backspace em campo vazio remove o último.
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  label,
  id,
  disabled,
  className,
  'aria-describedby': describedBy,
}: TagInputProps) {
  const [draft, setDraft] = useState('')

  function commit(raw: string) {
    const entry = raw.trim()
    if (!entry) return
    // Duplicata silenciosa confundiria: só ignora e limpa o campo.
    if (!value.includes(entry)) onChange([...value, entry])
    setDraft('')
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      // Enter aqui não pode submeter o formulário inteiro.
      event.preventDefault()
      commit(draft)
      return
    }
    if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-muted py-1 pl-2.5 pr-1 text-sm"
            >
              <span className="break-all">{tag}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                disabled={disabled}
                aria-label={`Remover ${tag} de ${label}`}
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        id={id}
        aria-describedby={describedBy}
        value={draft}
        disabled={disabled}
        placeholder={placeholder ?? 'Digite e pressione Enter'}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        // Sem blur-commit o usuário perderia o que digitou ao clicar em Salvar.
        onBlur={() => commit(draft)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  )
}
