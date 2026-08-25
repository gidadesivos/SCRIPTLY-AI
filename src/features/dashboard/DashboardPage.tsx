import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileText, Package, Plus, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { getDashboardData } from '@/features/dashboard/api'
import { labelFor, SCRIPT_STATUSES } from '@/config/options'
import { strings } from '@/i18n/pt-BR'

function MetricCard({
  label,
  value,
  icon: Icon,
  to,
}: {
  label: string
  value: number
  icon: typeof FileText
  to: string
}) {
  return (
    <Card className="transition-colors hover:border-primary/40">
      <Link to={to} className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-2xl font-semibold leading-none tabular-nums">{value}</span>
          <span className="block truncate text-sm text-muted-foreground">{label}</span>
        </span>
      </Link>
    </Card>
  )
}

export function DashboardPage() {
  const { activeWorkspace } = useActiveWorkspace()
  const workspaceId = activeWorkspace?.id ?? ''

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', workspaceId],
    queryFn: () => getDashboardData(workspaceId),
    enabled: Boolean(workspaceId),
  })

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={strings.dashboard.title} />
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={strings.dashboard.title} />
        <EmptyState
          title={strings.errors.unexpected}
          description="Não foi possível carregar os números."
          action={
            <Button variant="outline" className="h-11" onClick={() => refetch()}>
              {strings.common.tryAgain}
            </Button>
          }
        />
      </div>
    )
  }

  const isEmpty = data.totalScripts === 0 && data.totalBrands === 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.dashboard.title}
        description={activeWorkspace?.name}
        action={
          <Button asChild className="h-11">
            <Link to="/create">
              <Plus className="h-4 w-4" />
              {strings.create.title}
            </Link>
          </Button>
        }
      />

      {isEmpty ? (
        <EmptyState
          icon={Sparkles}
          title={strings.dashboard.emptyTitle}
          description={strings.dashboard.emptyDescription}
          action={
            <Button asChild className="h-11">
              <Link to="/brands/new">{strings.brands.newBrand}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              label={data.totalScripts === 1 ? 'roteiro' : 'roteiros'}
              value={data.totalScripts}
              icon={FileText}
              to="/scripts"
            />
            <MetricCard
              label={data.totalBrands === 1 ? 'marca ativa' : 'marcas ativas'}
              value={data.totalBrands}
              icon={Sparkles}
              to="/brands"
            />
            <MetricCard
              label={data.totalProducts === 1 ? 'produto ativo' : 'produtos ativos'}
              value={data.totalProducts}
              icon={Package}
              to="/products"
            />
          </div>

          {Object.keys(data.scriptsByStatus).length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium">Roteiros por status</h2>
              <ul className="flex flex-wrap gap-2">
                {SCRIPT_STATUSES.filter((option) => data.scriptsByStatus[option.value]).map(
                  (option) => (
                    <li key={option.value}>
                      <Link
                        to={`/scripts?status=${option.value}`}
                        className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:border-primary/40"
                      >
                        <span className="text-muted-foreground">{option.label}</span>
                        <span className="font-medium tabular-nums">
                          {data.scriptsByStatus[option.value]}
                        </span>
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Roteiros recentes</h2>
              <Button asChild variant="link" size="sm" className="h-auto p-0">
                <Link to="/scripts">Ver todos</Link>
              </Button>
            </div>

            {data.recentScripts.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                Nenhum roteiro ainda.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.recentScripts.map((script) => (
                  <li key={script.id}>
                    <Card className="transition-colors hover:border-primary/40">
                      <Link
                        to={`/scripts/${script.id}`}
                        className="flex items-center justify-between gap-3 p-3"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{script.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {script.brand?.name ?? '—'}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {labelFor(SCRIPT_STATUSES, script.status)}
                        </span>
                      </Link>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
