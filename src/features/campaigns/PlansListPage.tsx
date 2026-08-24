import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Network, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { useActiveBrand } from '@/features/brands/hooks/useActiveBrand'
import { useCreatePlan, useDeletePlan, usePlans } from '@/features/campaigns/hooks/usePlan'
import { canDeleteScripts } from '@/lib/permissions'
import { dbErrorMessage } from '@/lib/db-errors'

export function PlansListPage() {
  const { activeWorkspace } = useActiveWorkspace()
  const { activeBrand, brands, isLoading: brandsLoading } = useActiveBrand()
  const workspaceId = activeWorkspace?.id ?? ''
  const brandId = activeBrand?.id ?? ''

  const { data: plans, isPending, isError, error } = usePlans(workspaceId, brandId)
  const create = useCreatePlan(workspaceId, brandId)
  const remove = useDeletePlan(workspaceId, brandId)
  const canDelete = canDeleteScripts(activeWorkspace?.role)

  const [name, setName] = useState('')

  if (!brandsLoading && brands.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <EmptyState
          icon={Sparkles}
          title="Crie uma marca primeiro"
          description="Um plano de campanha pertence a uma marca — é dela que vem o contexto do que anunciar."
          action={
            <Button asChild className="h-11">
              <Link to="/brands/new">Nova marca</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Planos de campanha</h1>
        <p className="text-sm text-muted-foreground">
          {activeBrand ? `Marca: ${activeBrand.name}` : 'Escolha uma marca'}
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = name.trim()
          if (!trimmed) return
          create.mutate(trimmed, { onSuccess: () => setName('') })
        }}
      >
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex: Black Friday - Adesivos"
          aria-label="Nome do plano"
        />
        <Button type="submit" className="h-11 shrink-0" disabled={!name.trim() || create.isPending}>
          <Plus className="h-4 w-4" />
          Novo plano
        </Button>
      </form>

      {isPending && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">{dbErrorMessage(error)}</p>}

      {plans && plans.length === 0 && (
        <EmptyState
          icon={Network}
          title="Nenhum plano ainda"
          description="Um plano é o mapa da campanha: campanha, conjuntos e anúncios, com os campos que o Meta pede."
        />
      )}

      {plans && plans.length > 0 && (
        <ul className="flex flex-col gap-2">
          {plans.map((plan) => (
            <li key={plan.id}>
              <Card className="relative transition-colors hover:border-primary/40">
                <Link to={`/campanhas/${plan.id}`} className="block p-4 pr-14">
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Atualizado em {new Date(plan.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </Link>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-destructive"
                    aria-label={`Excluir ${plan.name}`}
                    onClick={() => remove.mutate(plan.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
