import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowDown, Check, Loader2, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchDailyUsage, fetchProviderUsage, type ProviderUsageRow } from '@/features/settings/api'
import { UsageChart } from '@/features/settings/components/UsageChart'
import { ModelPicker } from '@/features/settings/components/ModelPicker'
import { fetchProviderStatus } from '@/lib/ai'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { cn } from '@/lib/utils'

const LABELS: Record<string, string> = {
  gemini: 'Google Gemini',
  openrouter: 'OpenRouter',
}

/**
 * Consumo de IA por provedor, com o saldo real de quem expõe.
 *
 * Dois dados diferentes, e a distinção importa: a tabela conta o que ESTE app
 * gastou (vem de ai_generations, sempre existe); o saldo vem do provedor e só o
 * OpenRouter oferece. O Gemini não diz quanto resta — lá você só descobre
 * quando o 429 chega.
 */
export function ProvidersCard() {
  const { activeWorkspace } = useActiveWorkspace()
  const workspaceId = activeWorkspace?.id ?? ''

  const usage = useQuery({
    queryKey: ['provider-usage', workspaceId],
    queryFn: () => fetchProviderUsage(workspaceId, 30),
    enabled: Boolean(workspaceId),
  })

  const daily = useQuery({
    queryKey: ['daily-usage', workspaceId],
    queryFn: () => fetchDailyUsage(workspaceId, 30),
    enabled: Boolean(workspaceId),
  })

  const status = useQuery({
    queryKey: ['provider-status', workspaceId],
    queryFn: () => fetchProviderStatus(workspaceId),
    enabled: Boolean(workspaceId),
    // A chamada sai da Edge Function e consulta o OpenRouter: não vale refazer
    // a cada foco de janela.
    staleTime: 60_000,
    retry: false,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provedores de IA</CardTitle>
        <CardDescription>
          Consumo dos últimos 30 dias. Quando o primeiro provedor falha ou fica sem cota, a
          geração cai para o próximo automaticamente.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <Chain status={status.data} isLoading={status.isPending} error={status.error} />

        {status.data?.openRouter && <OpenRouterBalance quota={status.data.openRouter} />}

        {status.data?.openRouterError && (
          <p className="flex items-start gap-1.5 text-xs text-warning">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            Não consegui ler o saldo do OpenRouter: {status.data.openRouterError}
          </p>
        )}

        {daily.data && <UsageChart rows={daily.data} days={30} />}

        <Usage rows={usage.data} isLoading={usage.isPending} />

        <div className="border-t border-border pt-4">
          <ModelPicker />
        </div>
      </CardContent>
    </Card>
  )
}

function Chain({
  status,
  isLoading,
  error,
}: {
  status: { providers: string[] } | undefined
  isLoading: boolean
  error: unknown
}) {
  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verificando provedores…
      </p>
    )
  }

  if (error || !status) {
    return (
      <p className="text-sm text-muted-foreground">
        Não consegui falar com a função de IA para listar os provedores.
      </p>
    )
  }

  if (status.providers.length === 0) {
    return (
      <p className="flex items-start gap-1.5 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        Nenhum provedor configurado. A geração não vai funcionar.
      </p>
    )
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">Ordem de tentativa</p>
      <ol className="flex flex-col gap-1">
        {status.providers.map((provider, index) => (
          <li key={provider} className="flex items-center gap-2 text-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums">
              {index + 1}
            </span>
            {LABELS[provider] ?? provider}
            {index === 0 ? (
              <span className="text-xs text-muted-foreground">principal</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowDown className="h-3 w-3" />
                reserva
              </span>
            )}
            <Check className="ml-auto h-4 w-4 text-success" />
          </li>
        ))}
      </ol>
    </div>
  )
}

function OpenRouterBalance({
  quota,
}: {
  quota: { limit: number | null; limitRemaining: number | null; usage: number | null; isFreeTier: boolean }
}) {
  const money = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' })

  // Sem teto definido a barra não faz sentido; mostra só o consumo acumulado.
  if (quota.limit === null || quota.limitRemaining === null) {
    return (
      <div className="rounded-md border border-border p-3">
        <p className="text-xs text-muted-foreground">Saldo do OpenRouter</p>
        <p className="mt-1 text-sm">
          Sem teto definido na chave
          {quota.usage !== null && ` · ${money(quota.usage)} usados até agora`}
        </p>
        {quota.isFreeTier && (
          <p className="mt-1 text-xs text-warning">
            Chave em free tier — os limites são baixos e por minuto.
          </p>
        )}
      </div>
    )
  }

  const used = quota.limit - quota.limitRemaining
  const ratio = quota.limit > 0 ? Math.min(1, used / quota.limit) : 0
  const tone = ratio >= 0.9 ? 'bg-destructive' : ratio >= 0.7 ? 'bg-warning' : 'bg-primary'

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs text-muted-foreground">Saldo do OpenRouter</p>
        <p className="text-sm font-semibold tabular-nums">{money(quota.limitRemaining)}</p>
      </div>

      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={quota.limit}
        aria-label="Crédito usado no OpenRouter"
      >
        <div className={cn('h-full', tone)} style={{ width: `${ratio * 100}%` }} />
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">
        {money(used)} de {money(quota.limit)} usados
      </p>
    </div>
  )
}

function Usage({ rows, isLoading }: { rows: ProviderUsageRow[] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando consumo…
      </p>
    )
  }

  if (!rows || rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma geração nos últimos 30 dias.</p>
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[30rem] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="pb-1.5 font-medium">Provedor</th>
            <th className="pb-1.5 text-right font-medium">Gerações</th>
            <th className="pb-1.5 text-right font-medium">Sucesso</th>
            <th className="pb-1.5 text-right font-medium">Sem cota</th>
            <th className="pb-1.5 text-right font-medium">Erros</th>
            <th className="pb-1.5 text-right font-medium">Tokens</th>
            <th className="pb-1.5 text-right font-medium">Média</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rate = row.total > 0 ? Math.round((row.sucessos / row.total) * 100) : 0
            return (
              <tr key={row.provider} className="border-b border-border/50 last:border-0">
                <td className="py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                    {LABELS[row.provider] ?? row.provider}
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums">{row.total}</td>
                <td
                  className={cn(
                    'py-2 text-right tabular-nums',
                    rate < 80 && 'font-medium text-warning',
                  )}
                >
                  {rate}%
                </td>
                <td
                  className={cn(
                    'py-2 text-right tabular-nums',
                    row.quota > 0 && 'font-medium text-destructive',
                  )}
                >
                  {row.quota}
                </td>
                <td className="py-2 text-right tabular-nums">{row.erros}</td>
                <td className="py-2 text-right tabular-nums text-muted-foreground">
                  {(row.input_tokens + row.output_tokens).toLocaleString('pt-BR')}
                </td>
                <td className="py-2 text-right tabular-nums text-muted-foreground">
                  {(row.media_ms / 1000).toFixed(1)}s
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
