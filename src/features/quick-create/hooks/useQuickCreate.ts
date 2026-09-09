import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  AiError,
  analyzeVideoReference,
  generateQuickScript,
  quickHookOptions,
  refineQuickScript,
  type ModelRef,
  type QuickScript,
  type ReferenceInsights,
} from '@/lib/ai'
import { strings } from '@/i18n/pt-BR'
import {
  removeReferenceVideo,
  uploadReferenceVideo,
} from '@/features/quick-create/reference-upload'
import { validateReferenceVideo } from '@/features/quick-create/reference-rules'
import type {
  QuickDraft,
  ReferenceMode,
  ReferenceStatus,
} from '@/features/quick-create/schemas/quickScript'
import type { QuickPhase } from '@/features/quick-create/components/QuickCreateLoading'

const t = strings.quickCreate

interface ContextoRef {
  workspaceId: string
  brandId: string
  productId: string | null
}

export interface ReferenceRuntime {
  mode: ReferenceMode
  status: ReferenceStatus
  file: { name: string; size: number } | null
  error: string
  /** Caminho no Storage; só existe depois do upload. */
  path: string | null
  insights: ReferenceInsights | null
}

const REFERENCIA_VAZIA: ReferenceRuntime = {
  mode: 'none',
  status: 'idle',
  file: null,
  error: '',
  path: null,
  insights: null,
}

/**
 * Orquestra upload, análise, geração e refinamento.
 *
 * Fica fora da página porque a página já tem trabalho demais só montando a
 * tela — e porque esta é a parte que dá para testar sem renderizar nada.
 */
export function useQuickCreate({ modelRef }: { modelRef?: ModelRef }) {
  const [script, setScript] = useState<QuickScript | null>(null)
  const [phase, setPhase] = useState<QuickPhase | null>(null)
  const [isRefining, setIsRefining] = useState(false)
  const [reference, setReference] = useState<ReferenceRuntime>(REFERENCIA_VAZIA)
  const [hookOptions, setHookOptions] = useState<string[] | null>(null)
  const [isLoadingHooks, setIsLoadingHooks] = useState(false)

  /*
   * Trava de reentrada em ref, e não em state: state só vale no próximo render,
   * e dois cliques no mesmo frame passariam os dois pela checagem. Com ref a
   * segunda chamada encontra a trava já levantada.
   */
  const emVoo = useRef(false)

  const isGenerating = phase !== null

  function mostrarErro(error: unknown) {
    toast.error(error instanceof AiError ? error.message : strings.errors.unexpected)
  }

  // ------------------------------------------------------------- referência
  const setReferenceMode = useCallback((mode: ReferenceMode) => {
    setReference((atual) => {
      // Trocar de modo descarta o vídeo pendente: manter um arquivo invisível
      // faria a geração usar uma referência que a tela não mostra mais.
      if (atual.path && mode !== 'video') void removeReferenceVideo(atual.path)
      return { ...REFERENCIA_VAZIA, mode }
    })
  }, [])

  const pickVideo = useCallback(
    async (workspaceId: string, file: File) => {
      const problema = validateReferenceVideo(file)
      if (problema) {
        setReference((atual) => ({ ...atual, status: 'error', error: problema, file: null }))
        return
      }

      setReference((atual) => {
        if (atual.path) void removeReferenceVideo(atual.path)
        return {
          mode: 'video',
          status: 'uploading',
          file: { name: file.name, size: file.size },
          error: '',
          path: null,
          insights: null,
        }
      })

      try {
        const { path } = await uploadReferenceVideo(workspaceId, file)
        setReference((atual) => ({ ...atual, status: 'uploaded', path }))
      } catch (error) {
        setReference((atual) => ({
          ...atual,
          status: 'error',
          error: (error as Error).message || strings.errors.unexpected,
        }))
      }
    },
    [],
  )

  const removeVideo = useCallback(() => {
    setReference((atual) => {
      if (atual.path) void removeReferenceVideo(atual.path)
      return { ...REFERENCIA_VAZIA, mode: 'video' }
    })
  }, [])

  const setReferenceError = useCallback((message: string) => {
    setReference((atual) => ({ ...atual, status: 'error', error: message }))
  }, [])

  // --------------------------------------------------------------- geração
  const generate = useCallback(
    async (ctx: ContextoRef, draft: QuickDraft) => {
      if (emVoo.current) return
      emVoo.current = true

      try {
        let insights: ReferenceInsights | null = reference.insights

        /*
         * Analisa só quando há vídeo E ele ainda não foi lido. Reanalisar a cada
         * "gerar de novo" cobraria do usuário o upload e a espera outra vez para
         * chegar exatamente ao mesmo resultado.
         */
        if (draft.referenceMode === 'video' && reference.path && !insights) {
          setPhase('reference')
          setReference((atual) => ({ ...atual, status: 'analyzing', error: '' }))
          try {
            insights = await analyzeVideoReference(ctx.workspaceId, reference.path, draft.request)
            setReference((atual) => ({ ...atual, status: 'ready', insights }))
          } catch (error) {
            const mensagem =
              error instanceof AiError ? error.message : strings.errors.unexpected
            setReference((atual) => ({ ...atual, status: 'error', error: mensagem }))
            toast.error(mensagem)
            return
          }
        }

        setPhase('generating')
        const resultado = await generateQuickScript(
          ctx,
          {
            request: draft.request,
            contentType: draft.contentType,
            platform: draft.platform,
            durationSeconds: draft.durationSeconds,
            tone: draft.tone,
            audience: draft.audience,
            cta: draft.cta,
            funnelStage: draft.funnelStage,
            extraInstructions: draft.extraInstructions,
            withoutCta: draft.withoutCta,
            voiceoverOnly: draft.voiceoverOnly,
            transcript: draft.referenceMode === 'transcript' ? draft.transcript : '',
            insights: draft.referenceMode === 'video' ? insights : null,
          },
          modelRef,
        )
        setScript(resultado)
      } catch (error) {
        mostrarErro(error)
      } finally {
        setPhase(null)
        emVoo.current = false
      }
    },
    [modelRef, reference.insights, reference.path],
  )

  const refine = useCallback(
    async (ctx: ContextoRef, instruction: string, contexto: { platform: string; durationSeconds: number }) => {
      if (!script || emVoo.current) return
      emVoo.current = true
      setIsRefining(true)
      try {
        const atualizado = await refineQuickScript(ctx, script, instruction, contexto, modelRef)
        setScript(atualizado)
      } catch (error) {
        // O roteiro anterior fica intacto: falha ao refinar não pode custar ao
        // usuário o que ele já tinha aprovado.
        mostrarErro(error)
      } finally {
        setIsRefining(false)
        emVoo.current = false
      }
    },
    [script, modelRef],
  )

  const loadHookOptions = useCallback(
    async (ctx: ContextoRef) => {
      if (!script) return
      setIsLoadingHooks(true)
      setHookOptions([])
      try {
        const { hooks } = await quickHookOptions(
          ctx,
          {
            title: script.title,
            hook: script.hook,
            angle: script.angle,
            voiceovers: script.scenes.map((scene) => scene.voiceover),
          },
          3,
          modelRef,
        )
        setHookOptions(hooks)
      } catch (error) {
        mostrarErro(error)
        setHookOptions(null)
      } finally {
        setIsLoadingHooks(false)
      }
    },
    [script, modelRef],
  )

  /**
   * Troca o hook e a locução da PRIMEIRA cena junto.
   *
   * O hook é a primeira frase falada: trocar só o campo `hook` deixaria a cena 1
   * dizendo a abertura antiga, e o roteiro começaria duas vezes.
   */
  const chooseHook = useCallback((hook: string) => {
    setScript((atual) => {
      if (!atual) return atual
      const scenes = atual.scenes.map((scene, index) =>
        index === 0 ? { ...scene, voiceover: hook } : scene,
      )
      return { ...atual, hook, scenes }
    })
    setHookOptions(null)
  }, [])

  const patchScript = useCallback((patch: Partial<QuickScript>) => {
    setScript((atual) => (atual ? { ...atual, ...patch } : atual))
  }, [])

  const patchScene = useCallback((index: number, patch: Partial<QuickScript['scenes'][number]>) => {
    setScript((atual) => {
      if (!atual) return atual
      const scenes = atual.scenes.map((scene, i) => (i === index ? { ...scene, ...patch } : scene))
      return { ...atual, scenes }
    })
  }, [])

  const reset = useCallback(() => {
    setScript(null)
    setHookOptions(null)
    setReference((atual) => {
      if (atual.path) void removeReferenceVideo(atual.path)
      return REFERENCIA_VAZIA
    })
  }, [])

  return {
    script,
    phase,
    isGenerating,
    isRefining,
    reference,
    hookOptions,
    isLoadingHooks,
    setReferenceMode,
    pickVideo,
    removeVideo,
    setReferenceError,
    generate,
    refine,
    loadHookOptions,
    chooseHook,
    patchScript,
    patchScene,
    setHookOptions,
    reset,
    toastSaved: () => toast.success(t.saved),
  }
}
