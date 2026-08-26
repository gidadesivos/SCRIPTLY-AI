import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Sparkles, MoreVertical } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
    <div className="flex h-full flex-col bg-[#0B0B10] text-[#EDEDF2]">
      {/* Topbar */}
      <div className="flex h-[52px] shrink-0 items-center gap-[12px] border-b border-[#1E1E28] bg-[#0E0E14] px-4">
        <div className="flex h-8 max-w-[360px] flex-1 items-center gap-2 rounded-lg border border-[#23232F] bg-[#14141C] px-2.5">
          <Search className="h-3.5 w-3.5 text-[#5E5E75]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar marcas…"
            className="h-full flex-1 border-0 bg-transparent px-0 font-sans text-[13px] text-[#EDEDF2] placeholder:text-[#5E5E75] focus-visible:ring-0"
          />
          <span className="rounded-[4px] bg-[#1C1C27] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#8C8CA0]">
            ⌘K
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <Button
            className="h-8 gap-1.5 bg-[#6D4AFF] px-3 font-sans text-[13px] font-medium text-white hover:bg-[#6D4AFF]/90"
            asChild
          >
            <Link to="/brands/new">
              <Plus className="h-3.5 w-3.5" />
              Nova marca
              <span className="font-mono text-[10px] font-medium opacity-65">⌘N</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="m-0 font-sans text-[24px] font-semibold tracking-[-0.03em] leading-tight text-[#EDEDF2]">
              Marcas no workspace
            </h1>
            <p className="mt-1.5 font-sans text-[14px] text-[#8C8CA0]">
              {brands?.length ?? 0} {brands?.length === 1 ? 'marca ativa' : 'marcas ativas'}.
            </p>
          </div>
        </div>

        {/* Tabs Filter */}
        <div className="mb-4 flex items-center gap-4 border-b border-[#1E1E28]">
          {[
            { value: 'active', label: 'Ativas' },
            { value: 'archived', label: 'Arquivadas' },
            { value: 'all', label: 'Todas' },
          ].map((tab) => {
            const isActive = status === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => setStatus(tab.value as ResourceStatus | 'all')}
                className={`relative pb-3 font-sans text-[13px] font-medium transition-colors ${
                  isActive ? 'text-[#B9A6FF]' : 'text-[#8C8CA0] hover:text-[#EDEDF2]'
                }`}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#6D4AFF]" />
                )}
              </button>
            )
          })}
        </div>

        {/* List Content */}
        {isPending ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[60px] w-full rounded-xl bg-[#14141C]" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title={strings.errors.unexpected}
            description={dbErrorMessage(error)}
            action={
              <Button variant="outline" onClick={() => refetch()}>
                {strings.common.tryAgain}
              </Button>
            }
          />
        ) : brands?.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={hasFilters ? strings.brands.noResultsTitle : strings.brands.emptyTitle}
            description={hasFilters ? strings.brands.noResultsDescription : strings.brands.emptyDescription}
            action={
              hasFilters ? (
                <Button variant="outline" onClick={() => { setSearch(''); setStatus('active') }}>
                  {strings.common.clearFilters}
                </Button>
              ) : (
                <Button asChild className="h-11">
                  <Link to="/brands/new">
                    <Plus className="mr-2 h-4 w-4" />
                    {strings.brands.newBrand}
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <div className="flex flex-col">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_160px_100px_40px] items-center gap-4 border-b border-[#1E1E28] pb-3 text-left">
              <div className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border border-[#3A3A4A]" />
              <span className="font-sans text-[11px] font-medium text-[#8C8CA0]">Marca e descrição</span>
              <span className="font-sans text-[11px] font-medium text-[#8C8CA0]">Setor</span>
              <span className="font-sans text-[11px] font-medium text-[#8C8CA0]">Estado</span>
              <span />
            </div>

            <div className="flex flex-col">
              {brands?.map((brand) => (
                <div
                  key={brand.id}
                  className="group grid grid-cols-[auto_minmax(0,1fr)_160px_100px_40px] items-center gap-4 border-b border-[#1E1E28] py-3 transition-colors hover:bg-[#14141C]"
                >
                  <div className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border border-[#3A3A4A]" />
                  <div className="flex min-w-0 flex-col">
                    <Link
                      to={`/brands/${brand.id}`}
                      className="truncate font-sans text-[13px] font-medium text-[#EDEDF2] hover:text-[#B9A6FF]"
                    >
                      {brand.name}
                    </Link>
                    <span className="truncate font-sans text-[11px] text-[#8C8CA0]">
                      {brand.description || '—'}
                    </span>
                  </div>
                  <span className="font-sans text-[12px] text-[#8C8CA0]">{brand.industry || '—'}</span>
                  <div>
                    <span className={`inline-flex rounded-[5px] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.05em] ${
                      brand.status === 'active' ? 'bg-[#3DDC97]/15 text-[#3DDC97]' : 'bg-[#1C1C27] text-[#8C8CA0]'
                    }`}>
                      {brand.status}
                    </span>
                  </div>
                  <button className="flex h-6 w-6 items-center justify-center rounded-md text-[#5E5E75] opacity-0 transition-opacity hover:bg-[#23232F] hover:text-[#EDEDF2] group-hover:opacity-100">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
