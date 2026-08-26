import { supabase } from '@/lib/supabase'
import { slugify } from '@/lib/slug'
import type { Database, ResourceStatus } from '@/types/database'
import type { ProductFormValues } from '@/schemas/product'

export type Product = Database['public']['Tables']['products']['Row']
export type ProductWithBrand = Product & { brand: { id: string; name: string } | null }

export interface ProductFilters {
  workspaceId: string
  search?: string
  status?: ResourceStatus | 'all'
  brandId?: string | 'all'
}

function emptyToNull(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function toRow(values: ProductFormValues) {
  return {
    brand_id: values.brand_id,
    name: values.name.trim(),
    category: emptyToNull(values.category),
    description: emptyToNull(values.description),
    target_audience: emptyToNull(values.target_audience),
    offer: emptyToNull(values.offer),
    price_range: emptyToNull(values.price_range),
    guarantee: emptyToNull(values.guarantee),
    default_cta: emptyToNull(values.default_cta),
    notes: emptyToNull(values.notes),
    benefits: values.benefits,
    differentiators: values.differentiators,
    problems_solved: values.problems_solved,
    desires: values.desires,
    objections: values.objections,
    faq: values.faq,
    links: values.links,
  }
}

export async function listProducts({
  workspaceId,
  search,
  status,
  brandId,
}: ProductFilters): Promise<ProductWithBrand[]> {
  // Join explícito evita N+1 para exibir o nome da marca na lista.
  let query = supabase
    .from('products')
    .select('*, brand:brands(id, name)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (brandId && brandId !== 'all') query = query.eq('brand_id', brandId)
  if (search?.trim()) query = query.ilike('name', `%${search.trim()}%`)

  const { data, error } = await query
  if (error) throw error
  return data as unknown as ProductWithBrand[]
}

export async function getProduct(id: string): Promise<Product> {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('not authenticated')
  return data.user.id
}

export async function createProduct(
  workspaceId: string,
  values: ProductFormValues,
): Promise<Product> {
  const userId = await currentUserId()

  const { data, error } = await supabase
    .from('products')
    .insert({
      ...toRow(values),
      workspace_id: workspaceId,
      slug: slugify(values.name),
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProduct(id: string, values: ProductFormValues): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(toRow(values))
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function setProductStatus(id: string, status: ResourceStatus): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/** Duplica gerando novo id e slug; a cópia nasce ativa, sem tocar no original. */
export async function duplicateProduct(id: string): Promise<Product> {
  const source = await getProduct(id)
  const userId = await currentUserId()
  const name = `${source.name} (cópia)`

  const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...rest } = source

  const { data, error } = await supabase
    .from('products')
    .insert({
      ...rest,
      name,
      slug: slugify(name),
      status: 'active',
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
