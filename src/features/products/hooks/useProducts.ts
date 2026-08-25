import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createProduct,
  duplicateProduct,
  getProduct,
  listProducts,
  setProductStatus,
  updateProduct,
  type ProductFilters,
} from '@/features/products/api'
import type { ResourceStatus } from '@/types/database'
import type { ProductFormValues } from '@/schemas/product'

export const productKeys = {
  all: ['products'] as const,
  list: (filters: ProductFilters) => ['products', 'list', filters] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
}

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => listProducts(filters),
    enabled: Boolean(filters.workspaceId),
  })
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: productKeys.detail(id ?? ''),
    queryFn: () => getProduct(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateProduct(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ProductFormValues) => createProduct(workspaceId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ProductFormValues) => updateProduct(id, values),
    onSuccess: (product) => {
      queryClient.setQueryData(productKeys.detail(id), product)
      queryClient.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}

export function useSetProductStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ResourceStatus }) =>
      setProductStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export function useDuplicateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => duplicateProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}
