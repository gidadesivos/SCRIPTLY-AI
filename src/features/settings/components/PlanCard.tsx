import { Infinity as InfinityIcon, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePlanUsage } from '@/features/settings/hooks/usePlanUsage'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'

/**
 * Plano do workspace e consumo real do mês.
 *
 * Sem botão de upgrade: não existe cobrança implementada, e um botão que não
 * cobra nada é exatamente a UI falsa que o N4 proíbe. Quando houver billing,
 * o botão entra aqui.
 */
export function PlanCard() {
  const { activeWorkspace } = useActiveWorkspace()
  const { data, isLoading, error } = usePlanUsage(activeWorkspace?.id ?? '')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plano e limites</CardTitle>
        <CardDescription>
          Os limites valem para o workspace inteiro, não por pessoa.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando plano…
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">
            Não foi possível ler o plano deste workspace.
          </p>
        )}

        {data && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-lg font-semibold">{data.label}</span>
              <span className="text-sm text-muted-foreground">{data.description}</span>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <Limit label="Gerações por minuto" value={data.generationsPerMinute} />
              <Limit
                label="Gerações neste mês"
                value={data.generationsPerMonth}
                used={data.usedThisMonth}
              />
            </dl>

            {data.generationsPerMonth !== null && (
              <UsageBar used={data.usedThisMonth} limit={data.generationsPerMonth} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Limit({
  label,
  value,
  used,
}: {
  label: string
  /** null = ilimitado. */
  value: number | null
  used?: number
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium">
        {value === null ? (
          <>
            <InfinityIcon className="h-4 w-4" />
            Ilimitado
            {used !== undefined && (
              <span className="font-normal text-muted-foreground">({used} usadas)</span>
            )}
          </>
        ) : used === undefined ? (
          value
        ) : (
          <>
            {used} <span className="font-normal text-muted-foreground">de {value}</span>
          </>
        )}
      </dd>
    </div>
  )
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const ratio = Math.min(1, used / limit)
  // Muda de cor só quando falta pouco: barra vermelha desde o começo vira
  // ruído e o usuário para de olhar.
  const tone =
    ratio >= 1 ? 'bg-destructive' : ratio >= 0.8 ? 'bg-warning' : 'bg-primary'

  return (
    <div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label="Gerações usadas neste mês"
      >
        <div className={`h-full ${tone}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {used >= limit
          ? 'Cota do mês esgotada. Ela renova no dia 1º.'
          : `Restam ${limit - used} gerações neste mês.`}
      </p>
    </div>
  )
}
