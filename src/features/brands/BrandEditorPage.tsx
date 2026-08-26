import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArchiveRestore, ArrowLeft, Archive, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BrandForm } from '@/features/brands/components/BrandForm'
import { BrandLogoUpload } from '@/features/brands/components/BrandLogoUpload'
import {
  useBrand,
  useCreateBrand,
  useSetBrandStatus,
  useUpdateBrand,
} from '@/features/brands/hooks/useBrands'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import type { BrandFormValues } from '@/schemas/brand'
import { strings } from '@/i18n/pt-BR'

export function BrandEditorPage() {
  const { brandId } = useParams<{ brandId: string }>()
  const isNew = !brandId
  const navigate = useNavigate()
  const { activeWorkspace } = useActiveWorkspace()

  const { data: brand, isPending, isError } = useBrand(brandId)
  const createBrand = useCreateBrand(activeWorkspace?.id ?? '')
  const updateBrand = useUpdateBrand(brandId ?? '')
  const setStatus = useSetBrandStatus()

  async function handleSubmit(values: BrandFormValues) {
    try {
      if (isNew) {
        const created = await createBrand.mutateAsync(values)
        toast.success('Marca criada.')
        navigate(`/brands/${created.id}`, { replace: true })
      } else {
        await updateBrand.mutateAsync(values)
        toast.success('Marca salva.')
      }
    } catch {
      toast.error(strings.errors.unexpected)
    }
  }

  async function handleToggleArchive() {
    if (!brand) return
    const next = brand.status === 'active' ? 'archived' : 'active'
    try {
      await setStatus.mutateAsync({ id: brand.id, status: next })
      toast.success(next === 'archived' ? 'Marca arquivada.' : 'Marca reativada.')
    } catch {
      toast.error(strings.errors.unexpected)
    }
  }

  if (!isNew && isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!isNew && (isError || !brand)) {
    return (
      <EmptyState
        title={strings.errors.notFound}
        description="Essa marca não existe ou você não tem acesso a ela."
        action={
          <Button asChild variant="outline" className="h-11">
            <Link to="/brands">Voltar para marcas</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 h-9">
          <Link to="/brands">
            <ArrowLeft className="h-4 w-4" />
            Marcas
          </Link>
        </Button>

        <PageHeader
          title={isNew ? strings.brands.newBrand : (brand?.name ?? '')}
          description={isNew ? strings.brands.newBrandSubtitle : undefined}
          action={
            brand && (
              <div className="flex items-center gap-3">
                <StatusBadge status={brand.status} />
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={handleToggleArchive}
                  disabled={setStatus.isPending}
                >
                  {setStatus.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : brand.status === 'active' ? (
                    <Archive className="h-4 w-4" />
                  ) : (
                    <ArchiveRestore className="h-4 w-4" />
                  )}
                  {brand.status === 'active' ? 'Arquivar' : 'Reativar'}
                </Button>
              </div>
            )
          }
        />
      </div>

      <BrandForm
        brand={brand}
        isSaving={createBrand.isPending || updateBrand.isPending}
        onSubmit={handleSubmit}
        logoSlot={
          brand && activeWorkspace ? (
            <BrandLogoUpload
              workspaceId={activeWorkspace.id}
              brandId={brand.id}
              logoPath={brand.logo_url}
            />
          ) : (
            <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
              {strings.brands.logoAfterSave}
            </p>
          )
        }
      />
    </div>
  )
}
