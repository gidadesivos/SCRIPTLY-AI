import { useState } from 'react'
import { Minus, Plus, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatTimecode, sceneTimings } from '@/lib/duration'
import type { Scene } from '@/features/scripts/api'
import { cn } from '@/lib/utils'

const SIZES = [
  { label: 'P', className: 'text-xl leading-relaxed' },
  { label: 'M', className: 'text-2xl leading-relaxed' },
  { label: 'G', className: 'text-3xl leading-snug' },
  { label: 'GG', className: 'text-4xl leading-snug' },
]

const STORAGE_KEY = 'scriptly:teleprompter-size'
/** M: grande o bastante para ler a um braço de distância, sem virar cartaz. */
const DEFAULT_SIZE_INDEX = 1

/**
 * Modo de gravação: só a locução, em corpo grande.
 * Tudo que é direção técnica sai da frente — quem está lendo para a câmera não
 * precisa de plano nem de b-roll na tela.
 */
export function Teleprompter({ scenes, tone }: { scenes: Scene[]; tone: string | null }) {
  const [sizeIndex, setSizeIndex] = useState(() => {
    // Number(null) é 0, então ler direto faria a ausência de preferência cair
    // no menor tamanho em vez do padrão. Checa a string antes de converter.
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return DEFAULT_SIZE_INDEX
    const stored = Number(raw)
    return Number.isInteger(stored) && stored >= 0 && stored < SIZES.length
      ? stored
      : DEFAULT_SIZE_INDEX
  })

  function changeSize(delta: number) {
    const next = Math.min(SIZES.length - 1, Math.max(0, sizeIndex + delta))
    setSizeIndex(next)
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // Sem localStorage (aba anônima) o tamanho só não persiste — não é erro.
    }
  }

  const timings = sceneTimings(
    scenes.map((scene) => scene.voiceover ?? ''),
    tone,
  )

  const withText = scenes
    .map((scene, index) => ({ scene, index, timing: timings[index] }))
    .filter((item) => item.scene.voiceover?.trim())

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <p className="text-sm text-muted-foreground">
          Só a locução, para ler enquanto grava.
        </p>
        <div className="flex items-center gap-1">
          <Type className="mr-1 h-4 w-4 text-muted-foreground" aria-hidden />
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11"
            onClick={() => changeSize(-1)}
            disabled={sizeIndex === 0}
            aria-label="Diminuir a fonte"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center text-sm tabular-nums">{SIZES[sizeIndex].label}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11"
            onClick={() => changeSize(1)}
            disabled={sizeIndex === SIZES.length - 1}
            aria-label="Aumentar a fonte"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {withText.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma cena tem locução ainda.
        </p>
      ) : (
        <ol className="flex flex-col gap-8">
          {withText.map(({ scene, index, timing }) => (
            <li key={scene.id} className="flex flex-col gap-2">
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {formatTimecode(timing.startSeconds)} · Cena {index + 1}
                {scene.purpose ? ` · ${scene.purpose}` : ''}
              </span>
              <p className={cn('max-w-[46ch] font-medium', SIZES[sizeIndex].className)}>
                {scene.voiceover}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
