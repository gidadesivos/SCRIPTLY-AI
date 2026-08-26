import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Copy,
  Eye,
  Pencil,
  Plus,
  PanelRight,
  Trash2,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { FormField } from '@/components/FormField'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SceneCard } from '@/features/scripts/components/SceneCard'
import { SaveIndicator } from '@/features/scripts/components/SaveIndicator'
import { CopilotPanel, type CopilotTarget } from '@/features/scripts/components/CopilotPanel'
import { VersionsPanel } from '@/features/scripts/components/VersionsPanel'
import { VariationsPanel } from '@/features/scripts/components/VariationsPanel'
import { ScriptView } from '@/features/scripts/components/ScriptView'
import { DeleteScriptDialog } from '@/features/scripts/components/DeleteScriptDialog'
import { useDeleteScript } from '@/features/scripts/hooks/useScriptActions'
import { canDeleteScripts } from '@/lib/permissions'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const queryKey = ['scripts', 'detail', scriptId]

  const { activeWorkspace } = useActiveWorkspace()
  const canDelete = canDeleteScripts(activeWorkspace?.role)
  const remove = useDeleteScript()

  const { data, isPending, isError } = useQuery({
    queryKey,
    queryFn: () => getScriptWithScenes(scriptId as string),
    enabled: Boolean(scriptId),
  })

  const [script, setScript] = useState<ScriptWithBrand | null>(null)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [busySceneId, setBusySceneId] = useState<string | null>(null)
  const [isViewing, setIsViewing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

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
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-10 w-64 bg-[#1E1E28]" />
        <Skeleton className="h-96 bg-[#1E1E28]" />
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
    <Tabs defaultValue="copilot" className="flex h-full flex-col">
      <div className="border-b border-[#1E1E28] p-4 pb-0">
        <TabsList className="w-full bg-[#14141C]">
          <TabsTrigger value="copilot" className="flex-1 data-[state=active]:bg-[#1E1E28]">
            Copilot
          </TabsTrigger>
          <TabsTrigger value="versions" className="flex-1 data-[state=active]:bg-[#1E1E28]">
            Versões
          </TabsTrigger>
          <TabsTrigger value="variations" className="flex-1 data-[state=active]:bg-[#1E1E28]">
            Variações
          </TabsTrigger>
        </TabsList>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <TabsContent value="copilot" className="m-0 h-full">
          <CopilotPanel
            script={script}
            scenes={scenes}
            contextRef={contextRef}
            onApply={applyCopilot}
          />
        </TabsContent>
        <TabsContent value="versions" className="m-0 h-full">
          <VersionsPanel scriptId={script.id} />
        </TabsContent>
        <TabsContent value="variations" className="m-0 h-full">
          <VariationsPanel script={script} scenes={scenes} contextRef={contextRef} />
        </TabsContent>
      </div>
    </Tabs>
  )

  const currentStatusOption = SCRIPT_STATUSES.find(s => s.value === script.status)

  return (
    <div className="flex h-full flex-col bg-[#0B0B10]">
      {/* TopBar */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#1E1E28] bg-[#0E0E14] px-4">
        <div className="flex items-center gap-[12px]">
          <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-[#8C8CA0] hover:text-[#EDEDF2]">
            <Link to="/scripts"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <span className="font-sans text-[13px] font-medium text-[#B9A6FF]">
            {script.brand?.name ?? 'Sem marca'}
          </span>
          <span className="h-[12px] w-[1px] bg-[#23232F]"></span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex cursor-pointer items-center gap-[6px] rounded-[6px] border border-[#23232F] bg-[#14141C] px-2 py-1 font-sans text-[11px] font-medium text-[#EDEDF2] outline-none transition-colors hover:bg-[#1E1E28]">
                {currentStatusOption?.label ?? script.status}
                <ChevronDown className="h-3 w-3 text-[#6E6E85]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="border-[#1E1E28] bg-[#14141C] text-[#EDEDF2]">
              {SCRIPT_STATUSES.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  className="focus:bg-[#1E1E28] focus:text-[#EDEDF2]"
                  onClick={async () => {
                    const status = option.value as Script['status']
                    patchScript({ status })
                    try {
                      await updateScriptStatus(script.id, status)
                      queryClient.invalidateQueries({ queryKey })
                    } catch {
                      toast.error(strings.errors.unexpected)
                    }
                  }}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View toggle */}
          <div className="ml-2 inline-flex items-center rounded-md border border-[#23232F] p-0.5">
            <button
              onClick={() => setIsViewing(false)}
              className={`inline-flex h-6 items-center gap-1.5 rounded-[4px] px-2 font-sans text-[11px] font-medium transition-colors ${
                !isViewing ? 'bg-[#1E1E28] text-[#EDEDF2]' : 'text-[#8C8CA0] hover:text-[#EDEDF2]'
              }`}
            >
              <Pencil className="h-3 w-3" />
              Editar
            </button>
            <button
              onClick={() => {
                void scriptSave.flush()
                void sceneSave.flush()
                setIsViewing(true)
              }}
              className={`inline-flex h-6 items-center gap-1.5 rounded-[4px] px-2 font-sans text-[11px] font-medium transition-colors ${
                isViewing ? 'bg-[#1E1E28] text-[#EDEDF2]' : 'text-[#8C8CA0] hover:text-[#EDEDF2]'
              }`}
            >
              <Eye className="h-3 w-3" />
              Visualizar
            </button>
          </div>
        </div>

        <div className="flex items-center gap-[10px]">
          <span className="font-mono text-[11px] font-medium text-[#5E5E75]">
            <SaveIndicator state={scriptSave.state} onRetry={scriptSave.retry} />
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#8C8CA0] outline-none transition-colors hover:bg-[#1E1E28] hover:text-[#EDEDF2]">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-[#1E1E28] bg-[#14141C] text-[#EDEDF2]">
              <DropdownMenuItem
                onClick={() => duplicate.mutate()}
                disabled={duplicate.isPending}
                className="focus:bg-[#1E1E28] focus:text-[#EDEDF2]"
              >
                <Copy className="mr-2 h-4 w-4" />
                {strings.common.duplicate}
              </DropdownMenuItem>
              {canDelete && (
                <DropdownMenuItem
                  onClick={() => setIsConfirmingDelete(true)}
                  className="text-red-400 focus:bg-[#1E1E28] focus:text-red-400"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden h-7 w-7 text-[#8C8CA0] hover:bg-[#1E1E28] hover:text-[#EDEDF2]">
                <PanelRight className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full border-l border-[#1E1E28] bg-[#0E0E14] p-0 sm:max-w-md">
              <SheetTitle className="sr-only">Painel do roteiro</SheetTitle>
              {sidePanel}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1">
        {isViewing ? (
          <div className="flex-1 overflow-y-auto p-5 text-[#EDEDF2]">
            <ScriptView script={script} scenes={scenes} />
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-6 text-[#EDEDF2]">
            <div className="mx-auto w-full max-w-4xl space-y-6">
              {/* Top fields */}
              <div className="flex flex-col gap-4 rounded-xl border border-[#1E1E28] bg-[#12121A] p-5">
                <FormField label="Título">
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      value={script.title}
                      onChange={(event) => patchScript({ title: event.target.value })}
                      onBlur={() => void scriptSave.flush()}
                      className="border-[#23232F] bg-[#14141C]"
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
                      className="border-[#23232F] bg-[#14141C]"
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
                      className="border-[#23232F] bg-[#14141C]"
                    />
                  )}
                </FormField>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-[#1C1C27] px-2 py-1 text-[#8C8CA0]">
                    <Clock className="h-3.5 w-3.5" />
                    {strings.create.estimatedVoiceover}: {formatSeconds(estimate.estimatedSeconds)} (
                    {strings.create.target}: {script.duration_seconds} s)
                  </span>
                </div>

                {estimate.isOverTarget && (
                  <div className="flex items-start gap-2 rounded-md border border-[#FFB84D]/40 bg-[#FFB84D]/10 p-3 text-sm text-[#EDEDF2]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB84D]" aria-hidden />
                    <span>
                      {strings.create.overTarget} São {estimate.totalWords} palavras. Use o Copilot para
                      encurtar a locução preservando hook e CTA.
                    </span>
                  </div>
                )}
              </div>

              {/* Scenes */}
              <div className="flex items-center justify-between">
                <h2 className="font-sans text-[16px] font-semibold tracking-[-0.01em]">Cenas</h2>
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

              <Button
                variant="outline"
                className="h-11 w-full border-dashed border-[#3A3A4A] bg-transparent text-[#8C8CA0] hover:border-[#6D4AFF] hover:bg-[#6D4AFF]/10 hover:text-[#B9A6FF]"
                onClick={handleAddScene}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar cena
              </Button>
            </div>
          </div>
        )}

        <aside className="hidden w-[360px] shrink-0 border-l border-[#1E1E28] bg-[#0E0E14] lg:flex lg:flex-col">
          {sidePanel}
        </aside>
      </div>

      <DeleteScriptDialog
        scriptId={isConfirmingDelete ? script.id : null}
        title={script.title}
        isDeleting={remove.isPending}
        onCancel={() => setIsConfirmingDelete(false)}
        onConfirm={() => {
          remove.mutate(script.id, {
            onSuccess: () => navigate('/scripts'),
            onError: () => setIsConfirmingDelete(false),
          })
        }}
      />
    </div>
  )
}
