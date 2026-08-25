import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronDown, Cpu, Loader2, Settings, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useActiveModel, type ActiveModelChoice } from '@/hooks/useActiveModel'
import { fetchProviderStatus } from '@/lib/ai'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Google Gemini',
  openrouter: 'OpenRouter',
  groq: 'Groq',
}

/**
 * Seletor de modelo na top bar.
 *
 * Mostra o modelo ativo com um dot de status. Ao clicar abre um dropdown
 * com os modelos configurados agrupados por provedor.
 */
export function ModelSelector() {
  const { activeModel, setActiveModel, availableModels, isLoading } = useActiveModel()
  const { activeWorkspace } = useActiveWorkspace()
  const workspaceId = activeWorkspace?.id ?? ''
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const status = useQuery({
    queryKey: ['provider-status', workspaceId],
    queryFn: () => fetchProviderStatus(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
    retry: false,
  })

  // Agrupar modelos por provedor
  const grouped = useMemo(() => {
    const map = new Map<string, typeof availableModels>()
    for (const model of availableModels) {
      const list = map.get(model.provider) ?? []
      list.push(model)
      map.set(model.provider, list)
    }
    return map
  }, [availableModels])

  // Determinar status do provedor ativo
  const activeProviderOk = useMemo(() => {
    if (!activeModel) return true // Automático sempre "ok"
    if (!status.data) return null // Ainda verificando
    return status.data.providers.includes(activeModel.provider)
  }, [activeModel, status.data])

  // Dot colorido
  const dotColor =
    activeProviderOk === null
      ? 'bg-yellow-400' // Verificando
      : activeProviderOk
        ? 'bg-emerald-400' // Disponível
        : 'bg-red-400' // Indisponível

  // Label curta para o botão
  const displayLabel = activeModel?.label || 'Automático'
  // Truncar se muito longo
  const shortLabel = displayLabel.length > 20 ? displayLabel.slice(0, 18) + '…' : displayLabel

  function selectModel(choice: ActiveModelChoice | null) {
    setActiveModel(choice)
    setOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="model-selector"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs font-medium"
        >
          <span
            className={cn('h-2 w-2 shrink-0 rounded-full', dotColor)}
            aria-label={
              activeProviderOk === null
                ? 'Verificando disponibilidade'
                : activeProviderOk
                  ? 'Modelo disponível'
                  : 'Modelo indisponível'
            }
          />
          <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">{shortLabel}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-0">
        <div className="p-2">
          <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">Modelo de IA</p>

          {/* Opção automática */}
          <button
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted',
              !activeModel && 'bg-primary/10 text-primary',
            )}
            onClick={() => selectModel(null)}
          >
            <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Automático</p>
              <p className="text-[11px] text-muted-foreground">Cascata entre provedores</p>
            </div>
            {!activeModel && <Check className="h-4 w-4 shrink-0 text-primary" />}
          </button>

          {/* Modelos agrupados por provedor */}
          {availableModels.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              Nenhum modelo configurado. Adicione modelos nas Configurações.
            </p>
          ) : (
            <div className="mt-1 max-h-64 overflow-y-auto">
              {Array.from(grouped.entries()).map(([provider, models]) => (
                <div key={provider}>
                  <p className="mt-2 px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {PROVIDER_LABELS[provider] ?? provider}
                  </p>
                  {models.map((model) => {
                    const isActive =
                      activeModel?.provider === model.provider &&
                      activeModel?.modelId === model.model_id
                    return (
                      <button
                        key={`${model.provider}:${model.model_id}`}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                          isActive && 'bg-primary/10 text-primary',
                        )}
                        onClick={() =>
                          selectModel({
                            provider: model.provider as ActiveModelChoice['provider'],
                            modelId: model.model_id,
                            label: model.label || model.model_id,
                          })
                        }
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {model.label || model.model_id}
                        </span>
                        {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé — link para configurações */}
        <div className="border-t border-border p-2">
          <button
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => {
              setOpen(false)
              navigate('/settings')
            }}
          >
            <Settings className="h-3.5 w-3.5" />
            Gerenciar modelos
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
