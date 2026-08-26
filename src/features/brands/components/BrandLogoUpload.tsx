import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  ACCEPTED_IMAGE_TYPES,
  getBrandLogoUrl,
  uploadBrandLogo,
  validateImageFile,
} from '@/lib/storage'
import { useSetBrandLogo } from '@/features/brands/hooks/useBrands'
import { strings } from '@/i18n/pt-BR'

interface BrandLogoUploadProps {
  workspaceId: string
  brandId: string
  logoPath: string | null
}

export function BrandLogoUpload({ workspaceId, brandId, logoPath }: BrandLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const setLogo = useSetBrandLogo()

  useEffect(() => {
    let cancelled = false
    if (!logoPath) {
      setPreviewUrl(null)
      return
    }
    getBrandLogoUrl(logoPath).then((url) => {
      if (!cancelled) setPreviewUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [logoPath])

  async function handleFile(file: File) {
    const validationError = validateImageFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setIsUploading(true)
    try {
      const path = await uploadBrandLogo(workspaceId, brandId, file)
      await setLogo.mutateAsync({ id: brandId, logoUrl: path })
      toast.success('Logo atualizado.')
    } catch {
      toast.error(strings.errors.unexpected)
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemove() {
    try {
      await setLogo.mutateAsync({ id: brandId, logoUrl: null })
      toast.success('Logo removido.')
    } catch {
      toast.error(strings.errors.unexpected)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
        {previewUrl ? (
          <img src={previewUrl} alt="Logo da marca" className="h-full w-full object-contain" />
        ) : (
          <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
            {logoPath ? 'Trocar logo' : 'Enviar logo'}
          </Button>

          {logoPath && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11"
              disabled={isUploading || setLogo.isPending}
              onClick={handleRemove}
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">PNG, JPG, WEBP ou SVG. Até 5 MB.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="sr-only"
        aria-label="Arquivo do logo da marca"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />
    </div>
  )
}
