import { useMemo, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { RotateCcw, Sparkles, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
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
import { AiLoading } from '@/features/create/components/AiLoading'
import { StepIndicator, type Step } from '@/features/create/components/StepIndicator'
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
} from '@/lib/ai'
import { strings } from '@/i18n/pt-BR'

const STEPS: Step[] = [
  { key: 'idea', label: strings.create.steps.idea },
  { key: 'brief', label: strings.create.steps.brief },
  { key: 'angle', label: strings.create.steps.angle },
  { key: 'hook', label: strings.create.steps.hook },
  { key: 'script', label: strings.create.steps.script },
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

  /**
   * Cache do que a IA já devolveu nesta sessão, por entrada.
   *
   * Voltar uma etapa para reler o briefing e seguir em frente era uma chamada
   * nova, com a espera inteira, para receber praticamente a mesma coisa. Com o
   * cache, ir e voltar é instantâneo e não gasta quota de IA.
   *
   * Só o botão "Gerar outros" ignora o cache — ali pedir variedade é o ponto.
   * Em ref, e não em state: o cache não muda o que está na tela.
   */
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

  /**
   * Tudo que a IA gera parte do briefing e do produto: mudar qualquer campo
   * invalida ângulos, hooks e roteiro guardados. Por isso o briefing inteiro
   * entra na chave do cache, e não só o que veio depois dele.
   */
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
      const parsed = await parseFreeformIdea(workspaceId, idea)
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
      const result = await generateAngles(contextRef, brief)
      anglesCache.current.set(cacheKey, result.angles)
      showAngles(result.angles)
    } catch (error) {
      handleAiError(error)
    } finally {
      setLoadingMessages(null)
    }
  }

  /** Preserva a escolha do usuário quando ela sobrevive à nova lista. */
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
      })
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
      // O rascunho virou roteiro no banco: manter a cópia local só faria o
      // fluxo reabrir num trabalho que já está salvo.
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.create.title}
        description={activeBrand ? `Marca ativa: ${activeBrand.name}` : undefined}
      />

      <StepIndicator steps={STEPS} currentIndex={currentIndex} />

      {restoredAt && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
          <p className="text-sm text-muted-foreground">
            Retomamos seu rascunho de {formatRestoredAt(restoredAt)}.
          </p>
          <Button variant="ghost" size="sm" className="h-9" onClick={startOver}>
            <RotateCcw className="h-4 w-4" />
            Começar do zero
          </Button>
        </div>
      )}

      {loadingMessages ? (
        <AiLoading messages={loadingMessages} />
      ) : (
        <>
          {step === 'idea' && (
            <div className="flex flex-col gap-5">
              <FormField label={strings.create.ideaLabel} hint={strings.create.ideaHint}>
                {(fieldProps) => (
                  <Textarea
                    {...fieldProps}
                    rows={4}
                    autoFocus
                    value={idea}
                    onChange={(event) => setIdea(event.target.value)}
                    placeholder={strings.create.ideaPlaceholder}
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
                      <SelectTrigger {...fieldProps} className="sm:w-72">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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

              <div className="flex justify-end border-t border-border pt-4">
                <Button className="h-11" onClick={handleAnalyzeIdea}>
                  <Wand2 className="h-4 w-4" />
                  {strings.create.analyze}
                </Button>
              </div>
            </div>
          )}

          {step === 'brief' && (
            <BriefStep
              brief={brief}
              onChange={setBrief}
              onNext={() => loadAngles()}
              contextRef={contextRef}
            />
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
        </>
      )}
    </div>
  )
}

/** Identidade de um ângulo para o cache: o tipo sozinho se repete entre listas. */
function angleKey(angle: Angle) {
  return `${angle.type}|${angle.title}`
}

/** "hoje às 14:32" quando é do mesmo dia; a data completa quando é mais antigo. */
function formatRestoredAt(date: Date) {
  const isToday = date.toDateString() === new Date().toDateString()
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `hoje às ${time}`
  return `${date.toLocaleDateString('pt-BR')} às ${time}`
}
