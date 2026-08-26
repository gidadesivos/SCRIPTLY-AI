import { ExternalLink, Image as ImageIcon, Video } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/FormField'
import { guessKind, resolveMedia } from '@/features/campaigns/media'
import type { MediaKind } from '@/features/campaigns/types'
import { cn } from '@/lib/utils'

interface MediaFieldProps {
  url: string
  kind: MediaKind
  onChange: (patch: { media_url?: string; media_kind?: MediaKind }) => void
}

/**
 * Link do criativo pronto, com previsualização.
 *
 * O caso real: o vídeo já foi gravado e editado, está no Drive, e quem revisa
 * o plano precisa VER antes de aprovar. Sair do plano, abrir o Drive, achar o
 * arquivo e voltar é o atrito que faz a revisão não acontecer.
 */
export function MediaField({ url, kind, onChange }: MediaFieldProps) {
  const media = resolveMedia(url, kind)

  return (
    <div className="flex flex-col gap-2">
      <FormField
        label="Criativo pronto"
        hint="Cole o link do Google Drive (compartilhado) ou a URL direta do arquivo."
      >
        {(props) => (
          <Input
            {...props}
            value={url}
            placeholder="https://drive.google.com/file/d/..."
            onChange={(event) => {
              const next = event.target.value
              const guessed = guessKind(next)
              onChange({
                media_url: next,
                // Só sobrescreve o tipo quando o link entrega a resposta; senão
                // apagaria a escolha manual de quem colou um link do Drive.
                ...(guessed ? { media_kind: guessed } : {}),
              })
            }}
          />
        )}
      </FormField>

      {url.trim() !== '' && (
        <>
          <div className="flex items-center gap-1">
            <KindButton
              active={kind === 'video'}
              icon={Video}
              label="Vídeo"
              onClick={() => onChange({ media_kind: 'video' })}
            />
            <KindButton
              active={kind === 'image'}
              icon={ImageIcon}
              label="Imagem"
              onClick={() => onChange({ media_kind: 'image' })}
            />
            <Button asChild variant="ghost" size="sm" className="ml-auto h-8 px-2 text-xs">
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir
              </a>
            </Button>
          </div>

          <MediaPreview media={media} />
        </>
      )}
    </div>
  )
}

function KindButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: typeof Video
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="sm"
      className="h-8 px-2 text-xs"
      aria-pressed={active}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Button>
  )
}

function MediaPreview({ media }: { media: ReturnType<typeof resolveMedia> }) {
  if (!media.embedUrl) {
    return (
      <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        Não reconheci esse link. Use um link do Google Drive ou uma URL que termine no arquivo
        (.mp4, .jpg…).
      </p>
    )
  }

  if (media.source === 'drive') {
    return (
      <div className={cn('overflow-hidden rounded-md border border-border')}>
        {/*
          O Drive não serve o arquivo direto — o link compartilhado é uma página,
          e usá-lo em <img> ou <video> devolveria HTML. O /preview num iframe é o
          caminho que funciona para vídeo e imagem, e respeita a permissão do
          arquivo: se não estiver compartilhado, o próprio Google avisa aqui
          dentro, que é exatamente a mensagem que a pessoa precisa ver.
        */}
        <iframe
          src={media.embedUrl}
          title="Previsualização do criativo"
          className="aspect-video w-full"
          allow="autoplay"
          referrerPolicy="no-referrer"
        />
      </div>
    )
  }

  if (media.kind === 'image') {
    return (
      <img
        src={media.embedUrl}
        alt="Previsualização do criativo"
        className="w-full rounded-md border border-border object-contain"
      />
    )
  }

  return (
    <video
      src={media.embedUrl}
      controls
      preload="metadata"
      className="w-full rounded-md border border-border"
    />
  )
}
