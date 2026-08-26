import { supabase } from '@/lib/supabase'

const BRAND_ASSETS_BUCKET = 'brand-assets'
/** Buckets são privados: a leitura sempre passa por signed URL. */
const SIGNED_URL_TTL_SECONDS = 60 * 60

export const MAX_LOGO_BYTES = 5 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Formato não suportado. Envie PNG, JPG, WEBP ou SVG.'
  }
  if (file.size > MAX_LOGO_BYTES) {
    return 'Arquivo muito grande. O limite é 5 MB.'
  }
  return null
}

function extensionFor(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName
  return file.type.split('/')[1] ?? 'bin'
}

/**
 * Path segue a convenção {workspace_id}/brands/{brand_id}/{arquivo} — a policy
 * de storage lê a primeira pasta para checar o workspace.
 */
export async function uploadBrandLogo(
  workspaceId: string,
  brandId: string,
  file: File,
): Promise<string> {
  const path = `${workspaceId}/brands/${brandId}/logo-${Date.now()}.${extensionFor(file)}`

  const { error } = await supabase.storage.from(BRAND_ASSETS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (error) throw error

  return path
}

export async function getBrandLogoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BRAND_ASSETS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (error) return null
  return data.signedUrl
}

export async function removeBrandLogo(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BRAND_ASSETS_BUCKET).remove([path])
  if (error) throw error
}
