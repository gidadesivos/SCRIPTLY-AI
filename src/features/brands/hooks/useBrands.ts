import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBrand,
  getBrand,
  listBrands,
  setBrandLogo,
  setBrandStatus,
  updateBrand,
  type BrandFilters,
} from '@/features/brands/api'
import type { ResourceStatus } from '@/types/database'
import type { BrandFormValues } from '@/schemas/brand'

export const brandKeys = {
  all: ['brands'] as const,
  list: (filters: BrandFilters) => ['brands', 'list', filters] as const,
  detail: (id: string) => ['brands', 'detail', id] as const,
}

export function useBrands(filters: BrandFilters) {
  return useQuery({
    queryKey: brandKeys.list(filters),
    queryFn: () => listBrands(filters),
    enabled: Boolean(filters.workspaceId),
  })
}

export function useBrand(id: string | undefined) {
  return useQuery({
    queryKey: brandKeys.detail(id ?? ''),
    queryFn: () => getBrand(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateBrand(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: BrandFormValues) => createBrand(workspaceId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKeys.all }),
  })
}

export function useUpdateBrand(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: BrandFormValues) => updateBrand(id, values),
    onSuccess: (brand) => {
      queryClient.setQueryData(brandKeys.detail(id), brand)
      queryClient.invalidateQueries({ queryKey: brandKeys.all })
    },
  })
}

export function useSetBrandStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ResourceStatus }) =>
      setBrandStatus(id, status),
    onSuccess: (brand) => {
      queryClient.setQueryData(brandKeys.detail(brand.id), brand)
      queryClient.invalidateQueries({ queryKey: brandKeys.all })
    },
  })
}

export function useSetBrandLogo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, logoUrl }: { id: string; logoUrl: string | null }) =>
      setBrandLogo(id, logoUrl),
    onSuccess: (brand) => {
      queryClient.setQueryData(brandKeys.detail(brand.id), brand)
      queryClient.invalidateQueries({ queryKey: brandKeys.all })
    },
  })
}
