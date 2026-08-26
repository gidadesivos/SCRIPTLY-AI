import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, ArchiveRestore, ArrowLeft, Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductForm } from '@/features/products/components/ProductForm'
import {
  useCreateProduct,
  useDuplicateProduct,
  useProduct,
  useSetProductStatus,
  useUpdateProduct,
} from '@/features/products/hooks/useProducts'
import { useBrands } from '@/features/brands/hooks/useBrands'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import type { ProductFormValues } from '@/schemas/product'
import { strings } from '@/i18n/pt-BR'

export function ProductEditorPage() {
  const { productId } = useParams<{ productId: string }>()
  const isNew = !productId
  const navigate = useNavigate()
  const { activeWorkspace } = useActiveWorkspace()
  const workspaceId = activeWorkspace?.id ?? ''

  // 'all' e não 'active': um produto pode pertencer a uma marca já arquivada, e
  // filtrar aqui deixaria o select vazio ao editá-lo.
  const { data: brands = [], isPending: brandsPending } = useBrands({
    workspaceId,
    status: 'all',
  })
  const { data: product, isPending, isError } = useProduct(productId)

  const createProduct = useCreateProduct(workspaceId)
  const updateProduct = useUpdateProduct(productId ?? '')
  const setStatus = useSetProductStatus()
  const duplicate = useDuplicateProduct()

  async function handleSubmit(values: ProductFormValues) {
    try {
      if (isNew) {
        const created = await createProduct.mutateAsync(values)
        toast.success('Produto criado.')
        navigate(`/products/${created.id}`, { replace: true })
      } else {
        await updateProduct.mutateAsync(values)
        toast.success('Produto salvo.')
      }
    } catch {
      toast.error(strings.errors.unexpected)
    }
  }

  async function handleToggleArchive() {
    if (!product) return
    const next = product.status === 'active' ? 'archived' : 'active'
    try {
      await setStatus.mutateAsync({ id: product.id, status: next })
      toast.success(next === 'archived' ? 'Produto arquivado.' : 'Produto reativado.')
    } catch {
      toast.error(strings.errors.unexpected)
    }
  }

  async function handleDuplicate() {
    if (!product) return
    try {
      const copy = await duplicate.mutateAsync(product.id)
      toast.success(strings.products.duplicated)
      navigate(`/products/${copy.id}`)
    } catch {
      toast.error(strings.errors.unexpected)
    }
  }

  if ((!isNew && isPending) || brandsPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!isNew && (isError || !product)) {
    return (
      <EmptyState
        title={strings.errors.notFound}
        description="Esse produto não existe ou você não tem acesso a ele."
        action={
          <Button asChild variant="outline" className="h-11">
            <Link to="/products">Voltar para produtos</Link>
          </Button>
        }
      />
    )
  }

  if (isNew && brands.length === 0) {
    return (
      <EmptyState
        title={strings.products.needsBrandTitle}
        description={strings.products.needsBrandDescription}
        action={
          <Button asChild className="h-11">
            <Link to="/brands/new">{strings.brands.newBrand}</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 h-9">
          <Link to="/products">
            <ArrowLeft className="h-4 w-4" />
            Produtos
          </Link>
        </Button>

        <PageHeader
          title={isNew ? strings.products.newProduct : (product?.name ?? '')}
          description={isNew ? strings.products.newProductSubtitle : undefined}
          action={
            product && (
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={product.status} />
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={handleDuplicate}
                  disabled={duplicate.isPending}
                >
                  {duplicate.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {strings.common.duplicate}
                </Button>
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={handleToggleArchive}
                  disabled={setStatus.isPending}
                >
                  {product.status === 'active' ? (
                    <Archive className="h-4 w-4" />
                  ) : (
                    <ArchiveRestore className="h-4 w-4" />
                  )}
                  {product.status === 'active' ? strings.common.archive : strings.common.restore}
                </Button>
              </div>
            )
          }
        />
      </div>

      <ProductForm
        product={product}
        brands={brands}
        isSaving={createProduct.isPending || updateProduct.isPending}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
