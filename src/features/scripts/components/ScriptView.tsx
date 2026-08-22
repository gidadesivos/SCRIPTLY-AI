import { useState } from 'react'
import { Check, Copy, Download, FileText, Presentation, Printer, Table2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScriptTable } from '@/features/scripts/components/ScriptTable'
import { Teleprompter } from '@/features/scripts/components/Teleprompter'
import {
  copyToClipboard,
  downloadText,
  onScreenTextToText,
  safeFilename,
  scriptToText,
  voiceoverToText,
} from '@/lib/script-export'
import { estimateDuration, formatSeconds } from '@/lib/duration'
import { labelFor, PLATFORMS } from '@/config/options'
import type { Scene, ScriptWithBrand } from '@/features/scripts/api'
import { cn } from '@/lib/utils'

type ViewMode = 'table' | 'teleprompter'

const MODE_STORAGE_KEY = 'scriptly:script-view-mode'

export function ScriptView({ script, scenes }: { script: ScriptWithBrand; scenes: Scene[] }) {
  const [mode, setMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(MODE_STORAGE_KEY)
    return stored === 'teleprompter' ? 'teleprompter' : 'table'
  })

  function changeMode(next: ViewMode) {
    setMode(next)
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next)
    } catch {
      // Sem localStorage o modo só não persiste entre sessões.
    }
  }

  const estimate = estimateDuration(
    scenes.map((scene) => scene.voiceover ?? ''),
    script.duration_seconds,
    script.tone,
  )

  async function copy(text: string, what: string) {
    if (!text.trim()) {
      toast.error(`Não há ${what} para copiar.`)
      return
    }
    const ok = await copyToClipboard(text)
    toast[ok ? 'success' : 'error'](
      ok ? `${what} copiada.` : 'O navegador bloqueou a cópia. Selecione e copie manualmente.',
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de ações — sai da impressão, senão vira lixo no PDF. */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="inline-flex rounded-md border border-border p-0.5">
          <Button
            variant={mode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-10"
            onClick={() => changeMode('table')}
            aria-pressed={mode === 'table'}
          >
            <Table2 className="h-4 w-4" />
            Áudio / Vídeo
          </Button>
          <Button
            variant={mode === 'teleprompter' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-10"
            onClick={() => changeMode('teleprompter')}
            aria-pressed={mode === 'teleprompter'}
          >
            <Presentation className="h-4 w-4" />
            Teleprompter
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-11"
            onClick={() => copy(voiceoverToText(scenes), 'Locução')}
          >
            <Copy className="h-4 w-4" />
            Copiar locução
          </Button>

          <Button variant="outline" size="sm" className="h-11" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            PDF
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-11">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Baixar</DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={() =>
                  downloadText(
                    safeFilename(script.title, 'txt'),
                    scriptToText(script, scenes),
                  )
                }
              >
                <FileText className="h-4 w-4" />
                Roteiro completo (.txt)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  downloadText(
                    safeFilename(`${script.title}-locucao`, 'txt'),
                    voiceoverToText(scenes),
                  )
                }
              >
                <FileText className="h-4 w-4" />
                Só a locução (.txt)
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Copiar</DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={() => copy(scriptToText(script, scenes), 'Roteiro completo')}
              >
                <Check className="h-4 w-4" />
                Roteiro completo
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => copy(onScreenTextToText(scenes), 'Textos em tela')}
              >
                <Check className="h-4 w-4" />
                Textos em tela
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Cabeçalho do documento: discreto na tela, vira capa na impressão. */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">{script.title}</h1>
        <p className="mt-1 text-sm">
          {script.brand?.name ? `${script.brand.name} · ` : ''}
          {labelFor(PLATFORMS, script.platform)} · alvo {script.duration_seconds}s · locução
          estimada {formatSeconds(estimate.estimatedSeconds)}
        </p>
        {script.hook_text && (
          <p className="mt-3">
            <strong>Hook:</strong> {script.hook_text}
          </p>
        )}
      </div>

      <div className={cn(mode === 'teleprompter' && 'print:hidden')}>
        {mode === 'table' ? (
          <ScriptTable scenes={scenes} tone={script.tone} />
        ) : (
          <Teleprompter scenes={scenes} tone={script.tone} />
        )}
      </div>

      {/* No PDF a tabela sai sempre, mesmo lendo em teleprompter. */}
      {mode === 'teleprompter' && (
        <div className="hidden print:block">
          <ScriptTable scenes={scenes} tone={script.tone} />
        </div>
      )}

      {script.cta && (
        <div className="rounded-lg border border-border p-4 print:border-0 print:px-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">CTA</p>
          <p className="mt-1 text-sm">{script.cta}</p>
        </div>
      )}
    </div>
  )
}
