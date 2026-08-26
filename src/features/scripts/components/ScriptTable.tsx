import { formatTimecode, sceneTimings } from '@/lib/duration'
import type { Scene } from '@/features/scripts/api'
import { cn } from '@/lib/utils'

/**
 * Tabela ÁUDIO | VÍDEO — o formato clássico de roteiro audiovisual.
 *
 * Substitui a lista de rótulo/valor que existia antes: ali cada cena virava
 * nove linhas soltas, sem hierarquia. Aqui a locução tem peso tipográfico, a
 * direção técnica fica ao lado (não abaixo), e o timecode ancora a leitura.
 */
export function ScriptTable({
  scenes,
  tone,
  className,
}: {
  scenes: Scene[]
  tone: string | null
  className?: string
}) {
  const timings = sceneTimings(
    scenes.map((scene) => scene.voiceover ?? ''),
    tone,
  )

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="w-20 py-2 pr-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tempo
            </th>
            <th className="w-[45%] py-2 pr-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Áudio
            </th>
            <th className="py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Vídeo
            </th>
          </tr>
        </thead>
        <tbody>
          {scenes.map((scene, index) => {
            const timing = timings[index]
            return (
              <tr
                key={scene.id}
                className="border-b border-border align-top last:border-b-0"
              >
                <td className="py-4 pr-3">
                  <span className="block font-mono text-sm tabular-nums">
                    {formatTimecode(timing.startSeconds)}
                  </span>
                  <span className="block font-mono text-xs tabular-nums text-muted-foreground">
                    {formatTimecode(timing.endSeconds)}
                  </span>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    Cena {index + 1}
                  </span>
                  {scene.purpose && (
                    <span className="mt-1 block text-xs font-medium text-primary">
                      {scene.purpose}
                    </span>
                  )}
                </td>

                <td className="py-4 pr-4">
                  {scene.voiceover ? (
                    <p className="text-[15px] leading-relaxed">{scene.voiceover}</p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">Sem locução</p>
                  )}
                  {scene.sound_suggestion && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      ♪ {scene.sound_suggestion}
                    </p>
                  )}
                  {timing.words > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {timing.words} palavras · {timing.seconds.toFixed(1).replace('.', ',')}s
                    </p>
                  )}
                </td>

                <td className="py-4">
                  <dl className="flex flex-col gap-1.5">
                    <VideoLine label="Visual" value={scene.visual} />
                    <VideoLine label="Ação" value={scene.action} />
                    <VideoLine label="Plano" value={scene.shot} />
                    <VideoLine label="B-roll" value={scene.broll} />
                    <VideoLine label="Edição" value={scene.editing_direction} />
                    <VideoLine label="Transição" value={scene.transition} />
                  </dl>

                  {scene.on_screen_text && (
                    <p className="mt-3 rounded-md border border-border bg-muted/60 px-2.5 py-1.5 text-xs font-medium">
                      Texto em tela: {scene.on_screen_text}
                    </p>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function VideoLine({ label, value }: { label: string; value: string | null }) {
  if (!value?.trim()) return null
  return (
    <div className="flex gap-2">
      <dt className="w-16 shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground/90">{value}</dd>
    </div>
  )
}
