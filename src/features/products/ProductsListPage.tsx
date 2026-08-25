import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, ArchiveRestore, Copy, MoreVertical, Package, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { useBrands } from '@/features/brands/hooks/useBrands'
import {
  useDuplicateProduct,
  useProducts,
  useSetProductStatus,
} from '@/features/products/hooks/useProducts'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import type { ResourceStatus } from '@/types/database'
import { dbErrorMessage } from '@/lib/db-errors'
import { strings } from '@/i18n/pt-BR'

export function ProductsListPage() {
  const { activeWorkspace } = useActiveWorkspace()
  const workspaceId = activeWorkspace?.id ?? ''
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ResourceStatus | 'all'>('active')
  const [brandId, setBrandId] = useState<string>('all')
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data: brands = [] } = useBrands({ workspaceId, status: 'all' })
  const {
    data: products,
    isPending,
    isError,
    error,
    refetch,
  } = useProducts({ workspaceId, search: debouncedSearch, status, brandId })

  const duplicate = useDuplicateProduct()
  const setProductStatus = useSetProductStatus()

  const hasFilters = debouncedSearch.trim() !== '' || status !== 'active' || brandId !== 'all'
  const hasNoBrands = brands.length === 0

  async function handleDuplicate(id: string) {
    try {
      await duplicate.mutateAsync(id)
      toast.success(strings.products.duplicated)
    } catch {
      toast.error(strings.errors.unexpected)
    }
  }

  async function handleToggleArchive(id: string, current: ResourceStatus) {
    const next = current === 'active' ? 'archived' : 'active'
    try {
      await setProductStatus.mutateAsync({ id, status: next })
      toast.success(next === 'archived' ? 'Produto arquivado.' : 'Produto reativado.')
    } catch {
      toast.error(strings.errors.unexpected)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.products.title}
        description={strings.products.subtitle}
        action={
          !hasNoBrands && (
            <Button asChild className="h-11">
              <Link to="/products/new">
                <Plus className="h-4 w-4" />
                {strings.products.newProduct}
              </Link>
            </Button>
          )
        }
      />

      {hasNoBrands ? (
        <EmptyState
          icon={Package}
          title={strings.products.needsBrandTitle}
          description={strings.products.needsBrandDescription}
          action={
            <Button asChild className="h-11">
              <Link to="/brands/new">
                <Plus className="h-4 w-4" />
                {strings.brands.newBrand}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={strings.products.searchPlaceholder}
                aria-label={strings.products.searchPlaceholder}
                className="pl-9"
              />
            </div>

            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger className="sm:w-52" aria-label="Filtrar por marca">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{strings.products.allBrands}</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(value) => setStatus(value as ResourceStatus | 'all')}
            >
              <SelectTrigger className="sm:w-44" aria-label="Filtrar por status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="archived">Arquivados</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isPending && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-32" />
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

          {products && products.length === 0 && (
            <EmptyState
              icon={Package}
              title={hasFilters ? strings.products.noResultsTitle : strings.products.emptyTitle}
              description={
                hasFilters
                  ? strings.products.noResultsDescription
                  : strings.products.emptyDescription
              }
              action={
                hasFilters ? (
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() => {
                      setSearch('')
                      setStatus('active')
                      setBrandId('all')
                    }}
                  >
                    {strings.common.clearFilters}
                  </Button>
                ) : (
                  <Button asChild className="h-11">
                    <Link to="/products/new">
                      <Plus className="h-4 w-4" />
                      {strings.products.newProduct}
                    </Link>
                  </Button>
                )
              }
            />
          )}

          {products && products.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <li key={product.id}>
                  <Card className="flex h-full flex-col">
                    <div className="flex items-start justify-between gap-2 p-4 pb-2">
                      <Link
                        to={`/products/${product.id}`}
                        className="min-w-0 flex-1 font-medium leading-tight hover:underline"
                      >
                        {product.name}
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 shrink-0"
                            aria-label={`Ações de ${product.name}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleDuplicate(product.id)}>
                            <Copy className="h-4 w-4" />
                            {strings.common.duplicate}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleToggleArchive(product.id, product.status)}
                          >
                            {product.status === 'active' ? (
                              <Archive className="h-4 w-4" />
                            ) : (
                              <ArchiveRestore className="h-4 w-4" />
                            )}
                            {product.status === 'active'
                              ? strings.common.archive
                              : strings.common.restore}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-1 flex-col gap-2 px-4 pb-4">
                      {product.description && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {product.description}
                        </p>
                      )}
                      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                        <StatusBadge status={product.status} />
                        {product.brand && (
                          <span className="text-xs text-muted-foreground">
                            {product.brand.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
