import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { useBrands } from '@/features/brands/hooks/useBrands'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import type { ResourceStatus } from '@/types/database'
import { dbErrorMessage } from '@/lib/db-errors'
import { strings } from '@/i18n/pt-BR'

export function BrandsListPage() {
  const { activeWorkspace } = useActiveWorkspace()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ResourceStatus | 'all'>('active')
  const debouncedSearch = useDebouncedValue(search, 300)

  const {
    data: brands,
    isPending,
    isError,
    error,
    refetch,
  } = useBrands({
    workspaceId: activeWorkspace?.id ?? '',
    search: debouncedSearch,
    status,
  })

  const hasFilters = debouncedSearch.trim() !== '' || status !== 'active'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.brands.title}
        description={strings.brands.subtitle}
        action={
          <Button asChild className="h-11">
            <Link to="/brands/new">
              <Plus className="h-4 w-4" />
              {strings.brands.newBrand}
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={strings.brands.searchPlaceholder}
            aria-label={strings.brands.searchPlaceholder}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as ResourceStatus | 'all')}>
          <SelectTrigger className="sm:w-44" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="archived">Arquivadas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isPending && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState
          title={strings.errors.unexpected}
          description={dbErrorMessage(error)}
          action={
            <Button variant="outline" className="h-11" onClick={() => refetch()}>
              {strings.common.tryAgain}
            </Button>
          }
        />
      )}

      {brands && brands.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title={hasFilters ? strings.brands.noResultsTitle : strings.brands.emptyTitle}
          description={
            hasFilters ? strings.brands.noResultsDescription : strings.brands.emptyDescription
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                className="h-11"
                onClick={() => {
                  setSearch('')
                  setStatus('active')
                }}
              >
                {strings.common.clearFilters}
              </Button>
            ) : (
              <Button asChild className="h-11">
                <Link to="/brands/new">
                  <Plus className="h-4 w-4" />
                  {strings.brands.newBrand}
                </Link>
              </Button>
            )
          }
        />
      )}

      {brands && brands.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <li key={brand.id}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <Link to={`/brands/${brand.id}`} className="flex h-full flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium leading-tight">{brand.name}</span>
                    <StatusBadge status={brand.status} />
                  </div>
                  {brand.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {brand.description}
                    </p>
                  )}
                  {brand.industry && (
                    <p className="mt-auto pt-2 text-xs text-muted-foreground">{brand.industry}</p>
                  )}
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
