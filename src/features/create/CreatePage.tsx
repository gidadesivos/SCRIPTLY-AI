import { useMemo, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles, Wand2, X, ChevronRight, Check, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/FormField'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ModelSelector } from '@/components/ModelSelector'
import { AiLoading } from '@/features/create/components/AiLoading'
import { BriefStep, type BriefState } from '@/features/create/components/BriefStep'
import { AngleStep } from '@/features/create/components/AngleStep'
import { HookStep } from '@/features/create/components/HookStep'
import { ScriptStep } from '@/features/create/components/ScriptStep'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { useActiveBrand } from '@/features/brands/hooks/useActiveBrand'
import { useProducts } from '@/features/products/hooks/useProducts'
import {
  useCreateDraft,
  type CreateDraft,
  type StepKey,
} from '@/features/create/hooks/useCreateDraft'
import { saveScript } from '@/features/scripts/api'
import {
  AiError,
  generateAngles,
  generateHooks,
  generateScript,
  parseFreeformIdea,
  type Angle,
  type GeneratedScript,
  type Hook,
  type ModelRef,
} from '@/lib/ai'
import { useActiveModel } from '@/hooks/useActiveModel'
import { strings } from '@/i18n/pt-BR'

const STEPS = [
  { key: 'idea', label: 'Ideia' },
  { key: 'brief', label: 'Briefing' },
  { key: 'angle', label: 'Ângulo' },
  { key: 'hook', label: 'Hook' },
  { key: 'script', label: 'Roteiro' },
]

const EMPTY_BRIEF: BriefState = {
  title: '',
  description: '',
  target_audience: '',
  pain: '',
  desire: '',
  promise: '',
  objective: '',
  tone: '',
  platform: 'instagram_reels',
  funnel_stage: '',
  duration_seconds: 30,
}

export function CreatePage() {
  const navigate = useNavigate()
  const { activeWorkspace } = useActiveWorkspace()
  const { activeBrand, brands } = useActiveBrand()
  const workspaceId = activeWorkspace?.id ?? ''
  const { activeModel } = useActiveModel()

  const modelRef: ModelRef | undefined = activeModel
    ? { provider: activeModel.provider, modelId: activeModel.modelId }
    : undefined

  const { data: products = [] } = useProducts({ workspaceId, status: 'active' })

  const [step, setStep] = useState<StepKey>('idea')
  const [idea, setIdea] = useState('')
  const [productId, setProductId] = useState<string>('none')
  const [brief, setBrief] = useState<BriefState>(EMPTY_BRIEF)
  const [angles, setAngles] = useState<Angle[]>([])
  const [selectedAngle, setSelectedAngle] = useState<Angle | null>(null)
  const [hooks, setHooks] = useState<Hook[]>([])
  const [selectedHook, setSelectedHook] = useState<Hook | null>(null)
  const [script, setScript] = useState<GeneratedScript | null>(null)

  const [loadingMessages, setLoadingMessages] = useState<string[] | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const anglesCache = useRef(new Map<string, Angle[]>())
  const hooksCache = useRef(new Map<string, Hook[]>())
  const scriptCache = useRef(new Map<string, GeneratedScript>())

  const draft: CreateDraft = useMemo(
    () => ({ step, idea, productId, brief, angles, selectedAngle, hooks, selectedHook, script }),
    [step, idea, productId, brief, angles, selectedAngle, hooks, selectedHook, script],
  )

  function applyDraft(next: CreateDraft) {
    setStep(next.step)
    setIdea(next.idea)
    setProductId(next.productId)
    setBrief(next.brief)
    setAngles(next.angles)
    setSelectedAngle(next.selectedAngle)
    setHooks(next.hooks)
    setSelectedHook(next.selectedHook)
    setScript(next.script)
  }

  const { restoredAt, clear: clearDraft } = useCreateDraft({
    workspaceId,
    brandId: activeBrand?.id ?? '',
    draft,
    onRestore: applyDraft,
  })

  function startOver() {
    applyDraft({
      step: 'idea',
      idea: '',
      productId: 'none',
      brief: EMPTY_BRIEF,
      angles: [],
      selectedAngle: null,
      hooks: [],
      selectedHook: null,
      script: null,
    })
    anglesCache.current.clear()
    hooksCache.current.clear()
    scriptCache.current.clear()
    clearDraft()
  }

  const briefKey = useMemo(
    () => `${JSON.stringify(brief)}|${productId}`,
    [brief, productId],
  )

  const brandProducts = products.filter((p) => p.brand_id === activeBrand?.id)
  const contextRef = {
    workspaceId,
    brandId: activeBrand?.id ?? '',
    productId: productId === 'none' ? null : productId,
  }

  function handleAiError(error: unknown) {
    toast.error(error instanceof AiError ? error.message : strings.errors.unexpected)
  }

  async function handleAnalyzeIdea() {
    if (idea.trim().length < 3) {
      toast.error(strings.create.ideaRequired)
      return
    }
    setLoadingMessages([strings.create.loading.brief])
    try {
      const parsed = await parseFreeformIdea(workspaceId, idea, modelRef)
      setBrief({ ...EMPTY_BRIEF, ...parsed })
      setStep('brief')
    } catch (error) {
      handleAiError(error)
    } finally {
      setLoadingMessages(null)
    }
  }

  async function loadAngles({ force = false } = {}) {
    const cacheKey = briefKey
    const cached = force ? undefined : anglesCache.current.get(cacheKey)
    if (cached) {
      showAngles(cached)
      return
    }

    setLoadingMessages([strings.create.loading.angles])
    try {
      const result = await generateAngles(contextRef, brief, modelRef)
      anglesCache.current.set(cacheKey, result.angles)
      showAngles(result.angles)
    } catch (error) {
      handleAiError(error)
    } finally {
      setLoadingMessages(null)
    }
  }

  function showAngles(next: Angle[]) {
    setAngles(next)
    setSelectedAngle((current) =>
      next.find((a) => a.type === current?.type && a.title === current?.title) ?? null,
    )
    setStep('angle')
  }

  async function loadHooks({ force = false } = {}) {
    if (!selectedAngle) return
    const cacheKey = `${briefKey}|${angleKey(selectedAngle)}`
    const cached = force ? undefined : hooksCache.current.get(cacheKey)
    if (cached) {
      showHooks(cached)
      return
    }

    setLoadingMessages([strings.create.loading.hooks])
    try {
      const result = await generateHooks(contextRef, brief, {
        type: selectedAngle.type,
        description: selectedAngle.description,
      }, modelRef)
      hooksCache.current.set(cacheKey, result.hooks)
      showHooks(result.hooks)
    } catch (error) {
      handleAiError(error)
    } finally {
      setLoadingMessages(null)
    }
  }

  function showHooks(next: Hook[]) {
    setHooks(next)
    setSelectedHook((current) => next.find((h) => h.text === current?.text) ?? null)
    setStep('hook')
  }

  async function loadScript() {
    if (!selectedAngle || !selectedHook) return
    const cacheKey = `${briefKey}|${angleKey(selectedAngle)}|${selectedHook.text}`
    const cached = scriptCache.current.get(cacheKey)
    if (cached) {
      setScript(cached)
      setStep('script')
      return
    }

    setLoadingMessages([
      strings.create.loading.script,
      strings.create.loading.scenes,
    ])
    try {
      const result = await generateScript(
        contextRef,
        brief,
        { type: selectedAngle.type, description: selectedAngle.description },
        selectedHook.text,
        modelRef,
      )
      scriptCache.current.set(cacheKey, result)
      setScript(result)
      setStep('script')
    } catch (error) {
      handleAiError(error)
    } finally {
      setLoadingMessages(null)
    }
  }

  async function handleSave() {
    if (!script || !activeBrand) return
    setIsSaving(true)
    try {
      const id = await saveScript({
        workspaceId,
        brandId: activeBrand.id,
        productId: contextRef.productId,
        title: script.title || brief.title,
        description: brief.description,
        platform: brief.platform,
        objective: brief.objective,
        funnelStage: brief.funnel_stage || null,
        durationSeconds: brief.duration_seconds,
        tone: brief.tone,
        targetAudience: brief.target_audience,
        pain: brief.pain,
        desire: brief.desire,
        promise: brief.promise,
        angleType: selectedAngle?.type ?? '',
        angleDescription: selectedAngle?.description ?? '',
        hookText: selectedHook?.text ?? '',
        hookCategory: selectedHook?.category ?? '',
        hookScore: selectedHook?.score ?? null,
        framework: script.framework,
        cta: script.cta,
        strategySummary: script.strategy_summary,
        scenes: script.scenes,
      })
      clearDraft()
      toast.success('Roteiro salvo.')
      navigate(`/scripts/${id}`)
    } catch {
      toast.error(strings.errors.unexpected)
    } finally {
      setIsSaving(false)
    }
  }

  if (brands.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title={strings.products.needsBrandTitle}
        description="A IA precisa do Brand Brain para não escrever no genérico. Comece criando uma marca."
        action={
          <Button asChild className="h-11">
            <Link to="/brands/new">{strings.brands.newBrand}</Link>
          </Button>
        }
      />
    )
  }

  const currentIndex = STEPS.findIndex((s) => s.key === step)

  return (
    <div className="flex h-full flex-col bg-[#0B0B10]">
      {/* Topbar */}
      <div className="flex h-[52px] shrink-0 items-center gap-[14px] border-b border-[#1E1E28] bg-[#0E0E14] px-4">
        <span className="inline-flex items-center gap-1.5 font-sans text-[12px] font-medium text-[#B9A6FF]">
          <span className="h-[7px] w-[7px] rounded-[2px] bg-[#6D4AFF]"></span>
          {activeBrand?.name ?? 'Sem marca'}
        </span>
        <div className="flex items-center gap-[2px]">
          {STEPS.map((s, idx) => {
            const isCompleted = idx < currentIndex
            const isCurrent = idx === currentIndex
            
            return (
              <div key={s.key} className="flex items-center">
                <span
                  className={`inline-flex items-center gap-[7px] rounded-[7px] px-[9px] py-[5px] font-sans text-[12px] font-medium ${
                    isCurrent
                      ? 'bg-[#6D4AFF]/15 text-[#D6CCFF]'
                      : isCompleted
                        ? 'text-[#8C8CA0]'
                        : 'text-[#5E5E75]'
                  }`}
                >
                  {isCompleted ? (
                    <span className="flex h-4 w-4 items-center justify-center rounded-[5px] bg-[#3DDC97]/15 text-[#3DDC97]">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  ) : (
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-[5px] font-mono text-[9px] font-semibold ${
                        isCurrent ? 'bg-[#6D4AFF] text-white' : 'bg-[#1C1C27] text-[#6E6E85]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  )}
                  {s.label}
                </span>
                {idx < STEPS.length - 1 && (
                  <ChevronRight className="mx-1 h-[13px] w-[13px] text-[#3A3A4A]" />
                )}
              </div>
            )
          })}
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <ModelSelector />
          {restoredAt && (
            <span className="font-mono text-[11px] font-medium text-[#5E5E75]">
              rascunho salvo {restoredAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={startOver}
            className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#23232F] bg-[#14141C] text-[#8C8CA0] transition-colors hover:text-white"
            title="Começar do zero"
          >
            <X className="h-[15px] w-[15px]" />
          </button>
        </div>
      </div>

      {loadingMessages ? (
        <div className="flex-1 p-5">
          <AiLoading messages={loadingMessages} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* Left Sidebar (Briefing context) - Only show if past Idea step */}
          {currentIndex > 0 && (
            <aside className="flex w-[296px] shrink-0 flex-col gap-[18px] overflow-y-auto border-r border-[#1E1E28] bg-[#0E0E14] p-[18px] text-[#EDEDF2]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#6E6E85]">
                  Briefing
                </span>
                <button
                  onClick={() => setStep('brief')}
                  className="inline-flex cursor-pointer items-center gap-[5px] font-mono text-[10px] font-medium text-[#B9A6FF] hover:underline"
                >
                  <Pencil className="h-[11px] w-[11px]" />
                  editar
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-[#5E5E75]">
                  Ideia original
                </span>
                <p className="m-0 font-sans text-[13px] leading-relaxed text-[#C9C9DB]">
                  {idea || 'Nenhuma ideia digitada.'}
                </p>
              </div>
              <div className="flex flex-col gap-2 border-t border-[#1E1E28] pt-4">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-[#5E5E75]">
                  Decisões
                </span>
                <div className="flex items-baseline justify-between gap-2.5">
                  <span className="font-sans text-[12px] text-[#8C8CA0]">Plataforma</span>
                  <span className="text-right font-sans text-[12px] font-medium">{brief.platform || '-'}</span>
                </div>
                {selectedAngle && (
                  <div className="flex items-baseline justify-between gap-2.5">
                    <span className="font-sans text-[12px] text-[#8C8CA0]">Ângulo</span>
                    <span className="text-right font-sans text-[12px] font-medium">
                      {selectedAngle.type}
                    </span>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-2.5">
                  <span className="font-sans text-[12px] text-[#8C8CA0]">Duração</span>
                  <span className="text-right font-mono text-[12px] font-medium">
                    {brief.duration_seconds}s
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2.5">
                  <span className="font-sans text-[12px] text-[#8C8CA0]">Tom</span>
                  <span className="text-right font-sans text-[12px] font-medium">{brief.tone || '-'}</span>
                </div>
              </div>
            </aside>
          )}

          {/* Center Main Content */}
          <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-5 text-[#EDEDF2]">
            {step === 'idea' && (
              <div className="flex max-w-3xl flex-col gap-5">
                <FormField label={strings.create.ideaLabel} hint={strings.create.ideaHint}>
                  {(fieldProps) => (
                    <Textarea
                      {...fieldProps}
                      rows={6}
                      autoFocus
                      value={idea}
                      onChange={(event) => setIdea(event.target.value)}
                      placeholder={strings.create.ideaPlaceholder}
                      className="bg-[#14141C] border-[#23232F]"
                    />
                  )}
                </FormField>

                {brandProducts.length > 0 && (
                  <FormField
                    label="Produto (opcional)"
                    hint="Escolher um produto deixa o roteiro muito mais específico."
                  >
                    {(fieldProps) => (
                      <Select value={productId} onValueChange={setProductId}>
                        <SelectTrigger {...fieldProps} className="sm:w-72 bg-[#14141C] border-[#23232F]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#14141C] border-[#23232F]">
                          <SelectItem value="none">Nenhum produto</SelectItem>
                          {brandProducts.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormField>
                )}

                <div className="flex justify-end pt-2">
                  <Button className="h-11 bg-[#6D4AFF] text-white hover:bg-[#6D4AFF]/90" onClick={handleAnalyzeIdea}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    {strings.create.analyze}
                  </Button>
                </div>
              </div>
            )}

            {step === 'brief' && (
              <div className="max-w-3xl">
                <BriefStep
                  brief={brief}
                  onChange={setBrief}
                  onNext={() => loadAngles()}
                  contextRef={contextRef}
                />
              </div>
            )}

            {step === 'angle' && (
              <AngleStep
                angles={angles}
                selected={selectedAngle}
                onSelect={setSelectedAngle}
                onRegenerate={() => loadAngles({ force: true })}
                onBack={() => setStep('brief')}
                onNext={() => loadHooks()}
                isRegenerating={false}
              />
            )}

            {step === 'hook' && (
              <HookStep
                hooks={hooks}
                selected={selectedHook}
                onSelect={setSelectedHook}
                onRegenerate={() => loadHooks({ force: true })}
                onBack={() => setStep('angle')}
                onNext={loadScript}
                isRegenerating={false}
              />
            )}

            {step === 'script' && script && (
              <ScriptStep
                script={script}
                targetSeconds={brief.duration_seconds}
                tone={brief.tone}
                isSaving={isSaving}
                onBack={() => setStep('hook')}
                onSave={handleSave}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function angleKey(angle: Angle) {
  return `${angle.type}|${angle.title}`
}

