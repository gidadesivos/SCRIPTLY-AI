import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { useActiveBrand } from '@/features/brands/hooks/useActiveBrand'
import { useProducts } from '@/features/products/hooks/useProducts'
import { useActiveModel } from '@/hooks/useActiveModel'
import { saveScript } from '@/features/scripts/api'
import { strings } from '@/i18n/pt-BR'
import type { ModelRef } from '@/lib/ai'
import type { FunnelStage, Platform } from '@/types/database'
import { QuickCreateForm } from '@/features/quick-create/components/QuickCreateForm'
import { QuickCreateLoading } from '@/features/quick-create/components/QuickCreateLoading'
import { QuickScriptResult } from '@/features/quick-create/components/QuickScriptResult'
import { HookOptions } from '@/features/quick-create/components/HookOptions'
import { useQuickCreate } from '@/features/quick-create/hooks/useQuickCreate'
import { useQuickCreateDraft } from '@/features/quick-create/hooks/useQuickCreateDraft'
import {
  EMPTY_QUICK_DRAFT,
  type QuickDraft,
} from '@/features/quick-create/schemas/quickScript'

const t = strings.quickCreate

/**
 * Criação (Beta): contexto → gerar → editar → salvar, numa tela só.
 *
 * Não compartilha nada com o CreatePage guiado de propósito. São dois produtos
 * com a mesma finalidade e experiências opostas; fundi-los faria cada mudança
 * num deles arriscar o outro, e desligar a Beta deixaria de ser uma decisão
 * reversível.
 */
export function QuickCreatePage() {
  const navigate = useNavigate()
  const { activeWorkspace } = useActiveWorkspace()
  const { activeBrand } = useActiveBrand()
  const { activeModel } = useActiveModel()

  const workspaceId = activeWorkspace?.id ?? ''
  const brandId = activeBrand?.id ?? ''

  const modelRef: ModelRef | undefined = activeModel
    ? { provider: activeModel.provider, modelId: activeModel.modelId }
    : undefined

  const [draft, setDraft] = useState<QuickDraft>(EMPTY_QUICK_DRAFT)
  const [isSaving, setIsSaving] = useState(false)

  const { data: products = [] } = useProducts({ workspaceId, status: 'active' })
  const brandProducts = useMemo(
    () => products.filter((product) => product.brand_id === brandId),
    [products, brandId],
  )

  const quick = useQuickCreate({ modelRef })

  const aplicarRascunho = useCallback((restaurado: QuickDraft) => {
    // Vídeo não sobrevive ao recarregamento: o arquivo não vai para o
    // localStorage, então restaurar o modo 'video' mostraria um cartão vazio
    // prometendo uma referência que não existe mais.
    setDraft({
      ...restaurado,
      referenceMode: restaurado.referenceMode === 'video' ? 'none' : restaurado.referenceMode,
    })
  }, [])

  const { restoredAt, clear: clearDraft } = useQuickCreateDraft({
    workspaceId,
    brandId,
    draft,
    onRestore: aplicarRascunho,
  })

  const contextRef = {
    workspaceId,
    brandId,
    productId: draft.productId === 'none' ? null : draft.productId,
  }

  function alterarRascunho(patch: Partial<QuickDraft>) {
    setDraft((atual) => ({ ...atual, ...patch }))
  }

  const referenciaPendente =
    draft.referenceMode === 'video' &&
    (quick.reference.status === 'uploading' || quick.reference.status === 'analyzing')

  const podeGerar =
    Boolean(workspaceId && brandId) && draft.request.trim().length >= 3 && !referenciaPendente

  function gerar() {
    if (!brandId) {
      toast.error(t.brandRequired)
      return
    }
    if (draft.request.trim().length < 3) {
      toast.error(t.requestRequired)
      return
    }
    void quick.generate(contextRef, draft)
  }

  async function salvar() {
    if (!quick.script || isSaving) return
    setIsSaving(true)
    try {
      /*
       * O MESMO saveScript do fluxo guiado. Um roteiro da Beta precisa ser
       * indistinguível dos outros na biblioteca e no editor; uma função de
       * salvamento paralela abriria caminho para os dois divergirem.
       */
      const id = await saveScript({
        workspaceId,
        brandId,
        productId: contextRef.productId,
        title: quick.script.title,
        description: quick.script.strategy_summary,
        platform: draft.platform as Platform,
        objective: quick.script.objective,
        funnelStage: (draft.funnelStage || null) as FunnelStage | null,
        durationSeconds: draft.durationSeconds,
        tone: draft.tone === 'automatico' ? '' : draft.tone,
        targetAudience: quick.script.audience,
        pain: '',
        desire: '',
        promise: quick.script.promise,
        angleType: draft.contentType === 'automatico' ? '' : draft.contentType,
        angleDescription: quick.script.angle,
        hookText: quick.script.hook,
        hookCategory: '',
        hookScore: null,
        framework: quick.script.framework,
        cta: quick.script.cta,
        strategySummary: quick.script.strategy_summary,
        scenes: quick.script.scenes,
        creationMode: 'quick_beta',
        referenceType: draft.referenceMode === 'none' ? null : draft.referenceMode,
      })

      clearDraft()
      quick.toastSaved()
      navigate(`/scripts/${id}`)
    } catch (error) {
      toast.error((error as Error).message || strings.errors.unexpected)
    } finally {
      setIsSaving(false)
    }
  }

  function recomecar() {
    setDraft(EMPTY_QUICK_DRAFT)
    quick.reset()
    clearDraft()
  }

  if (!activeBrand) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          title={t.title}
          description={t.brandRequired}
          action={<Button onClick={() => navigate('/brands')}>{strings.brands.title}</Button>}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-[#EDEDF2]">{t.title}</h1>
            <span className="rounded-full border border-[#3A2E63] bg-[#241E3D] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-[#B9A6FF]">
              BETA
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[#8C8CA0]">{t.subtitle}</p>
        </div>

        {(quick.script || draft.request) && (
          <Button variant="ghost" size="sm" onClick={recomecar} className="text-[#8C8CA0]">
            {t.startOver}
          </Button>
        )}
      </header>

      {restoredAt && !quick.script && (
        <p className="text-[12px] text-[#5E5E75]">{t.draftRestored}</p>
      )}

      {quick.isGenerating ? (
        <QuickCreateLoading
          phase={quick.phase ?? 'generating'}
          hasReference={draft.referenceMode === 'video'}
        />
      ) : quick.script ? (
        <QuickScriptResult
          script={quick.script}
          brandName={activeBrand.name}
          productName={brandProducts.find((p) => p.id === contextRef.productId)?.name ?? ''}
          platform={draft.platform}
          durationSeconds={draft.durationSeconds}
          tone={draft.tone === 'automatico' ? '' : draft.tone}
          referenceMode={draft.referenceMode}
          isRefining={quick.isRefining}
          isSaving={isSaving}
          onPatch={quick.patchScript}
          onChangeScene={quick.patchScene}
          onRefine={(instruction) =>
            void quick.refine(contextRef, instruction, {
              platform: draft.platform,
              durationSeconds: draft.durationSeconds,
            })
          }
          onOtherHook={() => void quick.loadHookOptions(contextRef)}
          onRegenerate={gerar}
          onSave={salvar}
        />
      ) : (
        <QuickCreateForm
          draft={draft}
          onChange={alterarRascunho}
          products={brandProducts}
          reference={{
            mode: draft.referenceMode,
            status: quick.reference.status,
            file: quick.reference.file,
            error: quick.reference.error,
            transcript: draft.transcript,
          }}
          onReferenceMode={(mode) => {
            quick.setReferenceMode(mode)
            alterarRascunho({ referenceMode: mode, transcript: '' })
          }}
          onPickVideo={(file) => void quick.pickVideo(workspaceId, file)}
          onRemoveVideo={quick.removeVideo}
          onTranscriptError={quick.setReferenceError}
          isBusy={quick.isGenerating}
          canGenerate={podeGerar}
          onGenerate={gerar}
        />
      )}

      <HookOptions
        open={quick.hookOptions !== null}
        onOpenChange={(open) => !open && quick.setHookOptions(null)}
        hooks={quick.hookOptions ?? []}
        isLoading={quick.isLoadingHooks}
        onChoose={quick.chooseHook}
      />
    </div>
  )
}
