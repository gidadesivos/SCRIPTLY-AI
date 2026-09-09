import { useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { strings } from '@/i18n/pt-BR'
import type { GeneratedScene } from '@/lib/ai'

const t = strings.quickCreate

/**
 * Roteiro editável, com a aba "Somente locução".
 *
 * A aba existe porque na hora de gravar o que se lê é a fala: as direções
 * visuais no meio atrapalham quem está diante da câmera. É a mesma informação
 * em duas leituras, não dois conteúdos.
 */
export function ScriptScenes({
  scenes,
  onChangeScene,
  disabled,
}: {
  scenes: GeneratedScene[]
  onChangeScene: (index: number, patch: Partial<GeneratedScene>) => void
  disabled: boolean
}) {
  const [aba, setAba] = useState('roteiro')

  const locucao = scenes
    .map((scene) => scene.voiceover.trim())
    .filter(Boolean)
    .join('\n\n')

  async function copiar() {
    try {
      await navigator.clipboard.writeText(locucao)
      toast.success(t.copied)
    } catch {
      toast.error(strings.errors.unexpected)
    }
  }

  return (
    <section className="rounded-xl border border-[#1E1E28] bg-[#0E0E14]">
      <Tabs value={aba} onValueChange={setAba}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E1E28] px-4 py-2">
          <TabsList>
            <TabsTrigger value="roteiro">{t.script}</TabsTrigger>
            <TabsTrigger value="locucao">{t.voiceoverOnlyTab}</TabsTrigger>
          </TabsList>
          {aba === 'locucao' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={copiar}
              className="text-[12px] text-[#8C8CA0] hover:text-[#EDEDF2]"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              {t.copyVoiceover}
            </Button>
          )}
        </div>

        <TabsContent value="roteiro" className="m-0 flex flex-col gap-4 p-4">
          {scenes.map((scene, index) => (
            <article key={index} className="rounded-lg border border-[#1E1E28] bg-[#14141C] p-3">
              <header className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-[#6D4AFF]/15 px-2 py-0.5 font-mono text-[11px] text-[#B9A6FF]">
                  {t.scene} {index + 1}
                </span>
                {scene.purpose && (
                  <span className="text-[11px] text-[#5E5E75]">{scene.purpose}</span>
                )}
              </header>

              <label className="mb-1 block text-[11px] uppercase tracking-wide text-[#5E5E75]">
                {t.voiceoverOnlyTab}
              </label>
              <Textarea
                rows={2}
                disabled={disabled}
                value={scene.voiceover}
                aria-label={`${t.scene} ${index + 1} — ${t.voiceoverOnlyTab}`}
                onChange={(e) => onChangeScene(index, { voiceover: e.target.value })}
              />

              {(scene.visual || scene.on_screen_text) && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {scene.visual && (
                    <div>
                      <span className="mb-1 block text-[11px] uppercase tracking-wide text-[#5E5E75]">
                        {t.visual}
                      </span>
                      <p className="text-[12px] leading-relaxed text-[#8C8CA0]">{scene.visual}</p>
                    </div>
                  )}
                  {scene.on_screen_text && (
                    <div>
                      <span className="mb-1 block text-[11px] uppercase tracking-wide text-[#5E5E75]">
                        Texto em tela
                      </span>
                      <p className="text-[12px] leading-relaxed text-[#8C8CA0]">
                        {scene.on_screen_text}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </TabsContent>

        <TabsContent value="locucao" className="m-0 p-4">
          {locucao ? (
            <div className="flex flex-col gap-3">
              {scenes
                .filter((scene) => scene.voiceover.trim())
                .map((scene, index) => (
                  <p key={index} className="text-[14px] leading-relaxed text-[#EDEDF2]">
                    {scene.voiceover}
                  </p>
                ))}
            </div>
          ) : (
            <p className="text-[13px] text-[#5E5E75]">Nenhuma locução escrita ainda.</p>
          )}
        </TabsContent>
      </Tabs>
    </section>
  )
}
