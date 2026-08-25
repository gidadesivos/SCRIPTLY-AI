import { useState } from 'react'
import { Check, Loader2, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { AiError, rewriteSection, type ModelRef } from '@/lib/ai'
import { useActiveWorkspaceOptional } from '@/features/workspaces/hooks/useActiveWorkspace'
import { useActiveBrandOptional } from '@/features/brands/hooks/useActiveBrand'
import { useActiveModelOptional } from '@/hooks/useActiveModel'
import { strings } from '@/i18n/pt-BR'

interface AiFillButtonProps {
  /** Nome do campo, como aparece para o usuário — vai no prompt como alvo. */
  label: string
  /** Conteúdo atual. Vazio significa "escreva do zero". */
  value: string
  onAccept: (value: string) => void
  /** Contexto vizinho: dá coerência sem autorizar reescrita de outros campos. */
  surrounding?: string
  disabled?: boolean
}

/**
 * Preenche ou reescreve UM campo com IA, em qualquer formulário do app.
 *
 * Reusa a operação cirúrgica (rewriteSection): o modelo recebe só este alvo e
 * devolve só este fragmento. Nada é aplicado sem o usuário aceitar.
 */
export function AiFillButton({
  label,
  value,
  onAccept,
  surrounding = '',
  disabled,
}: AiFillButtonProps) {
  // Opcional de propósito: se este botão for usado fora do shell autenticado,
  // ele se desabilita em vez de derrubar o formulário inteiro.
  const activeWorkspace = useActiveWorkspaceOptional()?.activeWorkspace ?? null
  const activeBrand = useActiveBrandOptional()?.activeBrand ?? null
  const activeModelCtx = useActiveModelOptional()

  const modelRef: ModelRef | undefined = activeModelCtx?.activeModel
    ? { provider: activeModelCtx.activeModel.provider, modelId: activeModelCtx.activeModel.modelId }
    : undefined

  const [isOpen, setIsOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [suggestion, setSuggestion] = useState<string | null>(null)

  const isEmpty = !value.trim()
  // Sem marca não há contexto: a operação cirúrgica exige brandId.
  const canRun = Boolean(activeWorkspace && activeBrand)

  async function run(instruction: string) {
    if (!activeWorkspace || !activeBrand) return
    setIsRunning(true)
    try {
      const result = await rewriteSection(
        {
          workspaceId: activeWorkspace.id,
          brandId: activeBrand.id,
          productId: null,
        },
        instruction,
        { label, current: value },
        surrounding,
        modelRef,
      )
      setSuggestion(result.content)
    } catch (error) {
      toast.error(error instanceof AiError ? error.message : strings.errors.unexpected)
      setIsOpen(false)
    } finally {
      setIsRunning(false)
    }
  }

  function accept() {
    if (!suggestion) return
    onAccept(suggestion)
    setSuggestion(null)
    setIsOpen(false)
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) setSuggestion(null)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-primary"
          disabled={disabled || !canRun}
          title={canRun ? undefined : 'Escolha uma marca ativa para usar a IA.'}
          aria-label={`${isEmpty ? 'Preencher' : 'Melhorar'} ${label} com IA`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          IA
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80">
        {suggestion === null ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              {isEmpty
                ? `A IA vai escrever "${label}" com base na marca ${activeBrand?.name ?? ''}.`
                : `A IA vai reescrever "${label}". Você aprova antes de aplicar.`}
            </p>

            {isEmpty ? (
              <Button
                size="sm"
                className="h-11"
                disabled={isRunning}
                onClick={() => run(`Escreva o conteúdo deste campo do zero, com base na marca.`)}
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Preencher com IA
              </Button>
            ) : (
              <div className="flex flex-col gap-1.5">
                <QuickAction
                  label="Melhorar"
                  instruction="Melhore este conteúdo, deixando mais claro e específico."
                  onRun={run}
                  disabled={isRunning}
                />
                <QuickAction
                  label="Encurtar"
                  instruction="Reduza este conteúdo pela metade, preservando o sentido."
                  onRun={run}
                  disabled={isRunning}
                />
                <QuickAction
                  label="Deixar mais específico"
                  instruction="Torne este conteúdo mais concreto e específico, trocando generalidades por detalhes."
                  onRun={run}
                  disabled={isRunning}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Sugestão</p>
              <p className="max-h-48 overflow-y-auto rounded-md border border-success/40 bg-success/5 p-2 text-sm">
                {suggestion}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-11 flex-1" onClick={accept}>
                <Check className="h-4 w-4" />
                Usar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-11"
                onClick={() => setSuggestion(null)}
              >
                <X className="h-4 w-4" />
                Descartar
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function QuickAction({
  label,
  instruction,
  onRun,
  disabled,
}: {
  label: string
  instruction: string
  onRun: (instruction: string) => void
  disabled: boolean
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-10 justify-start"
      disabled={disabled}
      onClick={() => onRun(instruction)}
    >
      {label}
    </Button>
  )
}
