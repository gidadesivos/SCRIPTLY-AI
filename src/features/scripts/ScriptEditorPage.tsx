import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { AlertTriangle, ArrowLeft, Clock, Copy, Plus, PanelRight } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FormField } from '@/components/FormField'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SceneCard } from '@/features/scripts/components/SceneCard'
import { SaveIndicator } from '@/features/scripts/components/SaveIndicator'
import { CopilotPanel, type CopilotTarget } from '@/features/scripts/components/CopilotPanel'
import { VersionsPanel } from '@/features/scripts/components/VersionsPanel'
import { VariationsPanel } from '@/features/scripts/components/VariationsPanel'
import { useAutosave } from '@/features/scripts/hooks/useAutosave'
import {
  addScene,
  deleteScene,
  duplicateScene,
  getScriptWithScenes,
  reorderScenes,
  updateScene,
  updateScript,
  updateScriptStatus,
  type Scene,
  type ScenePatch,
  type Script,
  type ScriptWithBrand,
} from '@/features/scripts/api'
import { duplicateScript } from '@/features/scripts/versions-api'
import { AiError, rewriteSection } from '@/lib/ai'
import { estimateDuration, formatSeconds } from '@/lib/duration'
import { SCRIPT_STATUSES } from '@/config/options'
import { strings } from '@/i18n/pt-BR'

export function ScriptEditorPage() {
  const { scriptId } = useParams<{ scriptId: string }>()
  const queryClient = useQueryClient()
  const queryKey = ['scripts', 'detail', scriptId]

  const { data, isPending, isError } = useQuery({
    queryKey,
    queryFn: () => getScriptWithScenes(scriptId as string),
    enabled: Boolean(scriptId),
  })

  // Cópias locais: a UI responde na hora e o autosave persiste depois.
  const [script, setScript] = useState<ScriptWithBrand | null>(null)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [busySceneId, setBusySceneId] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    setScript(data.script)
    setScenes(data.scenes)
  }, [data])

  const scriptSave = useAutosave(async (patch) => {
    await updateScript(scriptId as string, patch)
    queryClient.invalidateQueries({ queryKey })
  })

  const sceneSave = useAutosave(async (patch) => {
    // patch é { [sceneId]: ScenePatch } — agrupado para uma escrita por cena.
    await Promise.all(
      Object.entries(patch).map(([id, values]) => updateScene(id, values as ScenePatch)),
    )
    queryClient.invalidateQueries({ queryKey })
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const duplicate = useMutation({
    mutationFn: () => duplicateScript(scriptId as string),
    onSuccess: (id) => {
      toast.success('Roteiro duplicado.')
      window.location.assign(`/scripts/${id}`)
    },
    onError: () => toast.error(strings.errors.unexpected),
  })

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (isError || !script) {
    return (
      <EmptyState
        title={strings.errors.notFound}
        description="Esse roteiro não existe ou você não tem acesso a ele."
        action={
          <Button asChild variant="outline" className="h-11">
            <Link to="/create">Criar um roteiro</Link>
          </Button>
        }
      />
    )
  }

  const contextRef = {
    workspaceId: script.workspace_id,
    brandId: script.brand_id,
    productId: script.product_id,
  }

  const estimate = estimateDuration(
    scenes.map((scene) => scene.voiceover ?? ''),
    script.duration_seconds,
    script.tone,
  )

  function patchScript(patch: Partial<Script>) {
    setScript((current) => (current ? { ...current, ...patch } : current))
    scriptSave.schedule(patch)
  }

  function patchScene(id: string, patch: ScenePatch) {
    setScenes((current) =>
      current.map((scene) => (scene.id === id ? { ...scene, ...patch } : scene)),
    )
    sceneSave.schedule({ [id]: patch })
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!script || !over || active.id === over.id) return

    const oldIndex = scenes.findIndex((s) => s.id === active.id)
    const newIndex = scenes.findIndex((s) => s.id === over.id)
    const previous = scenes
    const reordered = arrayMove(scenes, oldIndex, newIndex).map((scene, index) => ({
      ...scene,
      order_index: index,
    }))

    // Optimistic: reordenar é trivial de reverter (§9).
    setScenes(reordered)
    try {
      await reorderScenes(script.id, reordered.map((s) => s.id))
      queryClient.invalidateQueries({ queryKey })
    } catch {
      setScenes(previous)
      toast.error('Não foi possível reordenar. A ordem anterior foi restaurada.')
    }
  }

  async function handleDeleteScene(scene: Scene) {
    const previous = scenes
    setScenes((current) => current.filter((s) => s.id !== scene.id))
    try {
      await deleteScene(scene.id)
      queryClient.invalidateQueries({ queryKey })
      toast.success('Cena excluída.')
    } catch {
      setScenes(previous)
      toast.error(strings.errors.unexpected)
    }
  }

  async function handleDuplicateScene(scene: Scene) {
    if (!script) return
    try {
      await duplicateScene(script.id, scene, scenes)
      queryClient.invalidateQueries({ queryKey })
      toast.success('Cena duplicada.')
    } catch {
      toast.error(strings.errors.unexpected)
    }
  }

  async function handleAddScene() {
    if (!script) return
    try {
      await addScene(script.workspace_id, script.id, scenes.length, { purpose: '', voiceover: '' })
      queryClient.invalidateQueries({ queryKey })
      toast.success('Cena adicionada.')
    } catch {
      toast.error(strings.errors.unexpected)
    }
  }

  /** Regenera SÓ a locução desta cena — nunca o roteiro inteiro (§7.3). */
  async function handleRegenerateScene(scene: Scene, index: number) {
    if (!script) return
    setBusySceneId(scene.id)
    try {
      const result = await rewriteSection(
        contextRef,
        'Reescreva esta cena mantendo a mesma função narrativa, com outra abordagem.',
        { label: `Locução da cena ${index + 1}`, current: scene.voiceover ?? '' },
        scenes.map((s, i) => `${i + 1}. ${s.voiceover ?? ''}`).join('\n'),
      )
      patchScene(scene.id, { voiceover: result.content })
      await sceneSave.flush()
      toast.success(`Cena ${index + 1} regenerada.`)
    } catch (error) {
      toast.error(error instanceof AiError ? error.message : strings.errors.unexpected)
    } finally {
      setBusySceneId(null)
    }
  }

  async function applyCopilot(target: CopilotTarget, content: string) {
    if (target.kind === 'script') {
      patchScript({ [target.field]: content } as Partial<Script>)
      await scriptSave.flush()
    } else {
      patchScene(target.sceneId, { [target.field]: content })
      await sceneSave.flush()
    }
  }

  const sidePanel = (
    <Tabs defaultValue="copilot" className="flex flex-col gap-4">
      <TabsList className="w-full">
        <TabsTrigger value="copilot" className="flex-1">
          Copilot
        </TabsTrigger>
        <TabsTrigger value="versions" className="flex-1">
          Versões
        </TabsTrigger>
        <TabsTrigger value="variations" className="flex-1">
          Variações
        </TabsTrigger>
      </TabsList>
      <TabsContent value="copilot">
        <CopilotPanel
          script={script}
          scenes={scenes}
          contextRef={contextRef}
          onApply={applyCopilot}
        />
      </TabsContent>
      <TabsContent value="versions">
        <VersionsPanel scriptId={script.id} />
      </TabsContent>
      <TabsContent value="variations">
        <VariationsPanel script={script} scenes={scenes} contextRef={contextRef} />
      </TabsContent>
    </Tabs>
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 h-9">
          <Link to="/create">
            <ArrowLeft className="h-4 w-4" />
            {strings.create.title}
          </Link>
        </Button>

        <PageHeader
          title={script.title}
          description={script.brand?.name}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <SaveIndicator state={scriptSave.state} onRetry={scriptSave.retry} />
              <Select
                value={script.status}
                onValueChange={async (value) => {
                  const status = value as Script['status']
                  patchScript({ status })
                  try {
                    await updateScriptStatus(script.id, status)
                    queryClient.invalidateQueries({ queryKey })
                  } catch {
                    toast.error(strings.errors.unexpected)
                  }
                }}
              >
                <SelectTrigger className="w-40" aria-label="Status do roteiro">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCRIPT_STATUSES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="h-11"
                onClick={() => duplicate.mutate()}
                disabled={duplicate.isPending}
              >
                <Copy className="h-4 w-4" />
                {strings.common.duplicate}
              </Button>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="h-11 lg:hidden">
                    <PanelRight className="h-4 w-4" />
                    Copilot
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full overflow-y-auto p-4 sm:max-w-md">
                  <SheetTitle className="sr-only">Painel do roteiro</SheetTitle>
                  <div className="mt-6">{sidePanel}</div>
                </SheetContent>
              </Sheet>
            </div>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="flex flex-col gap-4 p-4">
            <FormField label="Título">
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  value={script.title}
                  onChange={(event) => patchScript({ title: event.target.value })}
                  onBlur={() => void scriptSave.flush()}
                />
              )}
            </FormField>
            <FormField label="Hook">
              {(fieldProps) => (
                <Textarea
                  {...fieldProps}
                  rows={2}
                  value={script.hook_text ?? ''}
                  onChange={(event) => patchScript({ hook_text: event.target.value })}
                  onBlur={() => void scriptSave.flush()}
                />
              )}
            </FormField>
            <FormField label="CTA">
              {(fieldProps) => (
                <Textarea
                  {...fieldProps}
                  rows={2}
                  value={script.cta ?? ''}
                  onChange={(event) => patchScript({ cta: event.target.value })}
                  onBlur={() => void scriptSave.flush()}
                />
              )}
            </FormField>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {strings.create.estimatedVoiceover}: {formatSeconds(estimate.estimatedSeconds)} (
                {strings.create.target}: {script.duration_seconds} s)
              </span>
            </div>

            {estimate.isOverTarget && (
              <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                <span>
                  {strings.create.overTarget} São {estimate.totalWords} palavras. Use o Copilot para
                  encurtar a locução preservando hook e CTA.
                </span>
              </div>
            )}
          </Card>

          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Cenas</h2>
            <SaveIndicator state={sceneSave.state} onRetry={sceneSave.retry} />
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={scenes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-3">
                {scenes.map((scene, index) => (
                  <li key={scene.id}>
                    <SceneCard
                      scene={scene}
                      index={index}
                      isBusy={busySceneId === scene.id}
                      onChange={(patch) => patchScene(scene.id, patch)}
                      onBlur={() => void sceneSave.flush()}
                      onDuplicate={() => void handleDuplicateScene(scene)}
                      onDelete={() => void handleDeleteScene(scene)}
                      onRegenerate={() => void handleRegenerateScene(scene, index)}
                    />
                  </li>
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          <Button variant="outline" className="h-11" onClick={handleAddScene}>
            <Plus className="h-4 w-4" />
            Adicionar cena
          </Button>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-6">{sidePanel}</div>
        </aside>
      </div>
    </div>
  )
}
