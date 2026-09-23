import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronDown, Loader2, Settings, Sparkles } from 'lucide-react'
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
 * compact: versão para o rail de 72px do desktop.
 *
 * É variante do MESMO componente, e não um seletor paralelo: a lista, o estado
 * do provedor e o ponto de status são os mesmos. O rail mostra o nome do
 * modelo truncado pelo CSS — o nome inteiro fica no title, porque saber QUAL
 * modelo está ativo é o motivo de este widget existir.
 */
export function ModelSelector({ compact = false }: { compact?: boolean } = {}) {
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

  const grouped = useMemo(() => {
    const map = new Map<string, typeof availableModels>()
    for (const model of availableModels) {
      const list = map.get(model.provider) ?? []
      list.push(model)
      map.set(model.provider, list)
    }
    return map
  }, [availableModels])

  /**
   * Estado do provedor ativo.
   *
   * 'desconhecido' existe separado de 'verificando' de propósito: a consulta
   * roda com retry desligado, então quando ela falha o resultado nunca chega.
   * Tratar isso como "ainda verificando" deixava o ponto amarelo e a legenda
   * "Verificando disponibilidade" na tela para sempre — o app afirmando que
   * está checando algo que já desistiu de checar.
   */
  const providerState = useMemo<'ok' | 'fora' | 'verificando' | 'desconhecido'>(() => {
    if (!activeModel) return 'ok' // Automático: a cascata decide, não há o que furar.
    if (status.isError) return 'desconhecido'
    if (!status.data) return 'verificando'
    return status.data.providers.includes(activeModel.provider) ? 'ok' : 'fora'
  }, [activeModel, status.data, status.isError])

  // Tokens do tema, não cores cruas da paleta: o resto do app inteiro usa
  // token, e bg-emerald-400 não acompanha claro/escuro.
  const DOT: Record<typeof providerState, { color: string; label: string }> = {
    ok: { color: 'bg-success', label: 'Modelo disponível' },
    fora: { color: 'bg-destructive', label: 'Modelo indisponível' },
    verificando: { color: 'bg-warning', label: 'Verificando disponibilidade' },
    desconhecido: {
      color: 'bg-muted-foreground',
      label: 'Não foi possível verificar a disponibilidade',
    },
  }
  const dot = DOT[providerState]

  const displayLabel = activeModel?.label || 'Automático'
  const shortLabel = displayLabel.length > 20 ? displayLabel.slice(0, 18) + '…' : displayLabel

  function selectModel(choice: ActiveModelChoice | null) {
    setActiveModel(choice)
    setOpen(false)
  }

  if (isLoading) {
    return compact ? (
      <span className="flex w-[60px] items-center justify-center py-2 text-[#5E5E75]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#23232F] bg-[#14141C] px-2.5 py-1.5 font-mono text-[11px] font-medium text-[#8C8CA0]">
        <Loader2 className="h-3 w-3 animate-spin" />
      </span>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {compact ? (
          <button
            id="model-selector"
            title={`${displayLabel} — ${dot.label}`}
            aria-label={`Modelo de IA: ${displayLabel}. ${dot.label}`}
            className="flex w-[60px] flex-col items-center gap-1 rounded-[10px] pb-1.5 pt-2 text-[#6E6E85] outline-none transition-colors hover:bg-[#6D4AFF]/10 hover:text-[#B9A6FF] focus-visible:ring-2 focus-visible:ring-[#6D4AFF]"
          >
            <span className="relative">
              <Sparkles className="h-[17px] w-[17px]" aria-hidden />
              <span
                className={cn(
                  'absolute -right-1 -top-0.5 h-[6px] w-[6px] rounded-full ring-2 ring-[#0A0A0E]',
                  dot.color,
                )}
                aria-hidden
              />
            </span>
            <span className="w-full truncate px-0.5 text-center font-mono text-[9px] font-medium leading-none tracking-[0.02em]">
              {displayLabel}
            </span>
          </button>
        ) : (
          <button
            id="model-selector"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#23232F] bg-[#14141C] px-2.5 py-1.5 font-mono text-[11px] font-medium text-[#8C8CA0] transition-colors hover:bg-[#1E1E28] hover:text-[#EDEDF2] outline-none"
          >
            <span
              className={cn('h-2 w-2 shrink-0 rounded-full', dot.color)}
              title={dot.label}
              aria-label={dot.label}
            />
            <span className="truncate max-w-[120px]">{shortLabel}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        align={compact ? 'start' : 'end'}
        side={compact ? 'right' : 'bottom'}
        className="w-64 border-[#1E1E28] bg-[#0E0E14] p-0 text-[#EDEDF2] rounded-xl shadow-xl shadow-black/50">
        <div className="p-1">
          <button
            className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[12px] font-sans transition-colors hover:bg-[#14141C] ${
              !activeModel ? 'bg-[#6D4AFF]/10 text-[#B9A6FF]' : 'text-[#EDEDF2]'
            }`}
            onClick={() => selectModel(null)}
          >
            <Sparkles className={`h-3.5 w-3.5 shrink-0 ${!activeModel ? 'text-[#B9A6FF]' : 'text-[#6E6E85]'}`} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Automático</p>
            </div>
            {!activeModel && <Check className="h-3.5 w-3.5 shrink-0 text-[#B9A6FF]" />}
          </button>

          {availableModels.length === 0 ? (
            <p className="px-3 py-4 text-center font-sans text-[11px] text-[#8C8CA0]">
              Nenhum modelo configurado.
            </p>
          ) : (
            <div className="mt-1 max-h-64 overflow-y-auto">
              {Array.from(grouped.entries()).map(([provider, models]) => (
                <div key={provider}>
                  <p className="mt-2 px-2 pb-1 font-mono text-[9px] font-medium uppercase tracking-[0.06em] text-[#5E5E75]">
                    {PROVIDER_LABELS[provider] ?? provider}
                  </p>
                  {models.map((model) => {
                    const isActive =
                      activeModel?.provider === model.provider &&
                      activeModel?.modelId === model.model_id
                    return (
                      <button
                        key={`${model.provider}:${model.model_id}`}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left font-sans text-[12px] transition-colors hover:bg-[#14141C] ${
                          isActive ? 'bg-[#6D4AFF]/10 text-[#B9A6FF]' : 'text-[#EDEDF2]'
                        }`}
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
                        {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-[#B9A6FF]" />}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[#1E1E28] p-1">
          <button
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 font-sans text-[11px] text-[#8C8CA0] transition-colors hover:bg-[#14141C] hover:text-[#EDEDF2]"
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
