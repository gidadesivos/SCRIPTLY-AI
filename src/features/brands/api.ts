import { supabase } from '@/lib/supabase'
import { slugify } from '@/lib/slug'
import type { Database, ResourceStatus } from '@/types/database'
import type { BrandFormValues } from '@/schemas/brand'

export type Brand = Database['public']['Tables']['brands']['Row']

export interface BrandFilters {
  workspaceId: string
  search?: string
  status?: ResourceStatus | 'all'
}

/** Campos vazios viram null: string vazia no banco atrapalha a montagem de contexto da IA. */
function emptyToNull(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function toRow(values: BrandFormValues) {
  return {
    name: values.name.trim(),
    description: emptyToNull(values.description),
    industry: emptyToNull(values.industry),
    website: emptyToNull(values.website),
    instagram: emptyToNull(values.instagram),
    country: emptyToNull(values.country),
    language: values.language,
    tone: emptyToNull(values.tone),
    personality: emptyToNull(values.personality),
    value_proposition: emptyToNull(values.value_proposition),
    positioning: emptyToNull(values.positioning),
    ai_instructions: emptyToNull(values.ai_instructions),
    target_audiences: values.target_audiences,
    pains: values.pains,
    desires: values.desires,
    objections: values.objections,
    differentiators: values.differentiators,
    benefits: values.benefits,
    proofs: values.proofs,
    preferred_words: values.preferred_words,
    forbidden_words: values.forbidden_words,
    preferred_ctas: values.preferred_ctas,
    competitors: values.competitors,
  }
}

export async function listBrands({ workspaceId, search, status }: BrandFilters): Promise<Brand[]> {
  let query = supabase
    .from('brands')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (search?.trim()) query = query.ilike('name', `%${search.trim()}%`)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getBrand(id: string): Promise<Brand> {
  const { data, error } = await supabase.from('brands').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createBrand(workspaceId: string, values: BrandFormValues): Promise<Brand> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('not authenticated')

  const { data, error } = await supabase
    .from('brands')
    .insert({
      ...toRow(values),
      workspace_id: workspaceId,
      slug: slugify(values.name),
      created_by: userData.user.id,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateBrand(id: string, values: BrandFormValues): Promise<Brand> {
  const { data, error } = await supabase
    .from('brands')
    .update(toRow(values))
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function setBrandStatus(id: string, status: ResourceStatus): Promise<Brand> {
  const { data, error } = await supabase
    .from('brands')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function setBrandLogo(id: string, logoUrl: string | null): Promise<Brand> {
  const { data, error } = await supabase
    .from('brands')
    .update({ logo_url: logoUrl })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
