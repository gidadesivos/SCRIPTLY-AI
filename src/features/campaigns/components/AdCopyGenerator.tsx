import { useState } from 'react'
import { Check, Loader2, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/FormField'
import { AiError, generateAdCopy, type AdCopy } from '@/lib/ai'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { useActiveBrand } from '@/features/brands/hooks/useActiveBrand'
import { labelFor } from '@/config/options'
import { META_CTAS } from '@/features/campaigns/meta-options'
import { strings } from '@/i18n/pt-BR'

interface AdCopyGeneratorProps {
  format: string
  cta: string
  /** Locução do roteiro vinculado, se houver. */
  scriptContext: string
  onApply: (copy: AdCopy) => void
}

/**
 * Escreve texto principal, título, descrição e botão a partir de uma frase.
 *
 * Preenche os quatro de uma vez, e não campo a campo: eles têm que funcionar
 * juntos — título que repete a primeira linha do texto principal desperdiça os
 * dois. Gerar separado produzia exatamente isso.
 *
 * Nada é aplicado sem o usuário ver e aceitar.
 */
export function AdCopyGenerator({ format, cta, scriptContext, onApply }: AdCopyGeneratorProps) {
  const { activeWorkspace } = useActiveWorkspace()
  const { activeBrand } = useActiveBrand()

  const [briefing, setBriefing] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<AdCopy | null>(null)

  const canRun = Boolean(activeWorkspace && activeBrand) && briefing.trim().length >= 3

  async function run() {
    if (!activeWorkspace || !activeBrand) return
    setIsRunning(true)
    try {
      const copy = await generateAdCopy(
        { workspaceId: activeWorkspace.id, brandId: activeBrand.id, productId: null },
        { briefing: briefing.trim(), format, cta, scriptContext },
      )
      setResult(copy)
    } catch (error) {
      toast.error(error instanceof AiError ? error.message : strings.errors.unexpected)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Escrever com IA
      </div>

      {result === null ? (
        <>
          <FormField
            label="Do que é esse anúncio?"
            hint="Uma ou duas frases. A IA usa o Brand Brain e o roteiro vinculado para o resto."
          >
            {(props) => (
              <Textarea
                {...props}
                rows={3}
                value={briefing}
                onChange={(event) => setBriefing(event.target.value)}
                placeholder="Ex: promoção de setembro em adesivo resinado, foco em quem já viu o site"
              />
            )}
          </FormField>

          <Button size="sm" className="h-10" disabled={!canRun || isRunning} onClick={run}>
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isRunning ? 'Escrevendo…' : 'Gerar copy'}
          </Button>

          {scriptContext && (
            <p className="text-[11px] text-muted-foreground">
              O roteiro vinculado vai junto no contexto.
            </p>
          )}
        </>
      ) : (
        <>
          <Preview label="Texto principal" value={result.primary_text} />
          <Preview label="Título" value={result.headline} limit={40} />
          {result.description && (
            <Preview label="Descrição" value={result.description} limit={30} />
          )}
          {result.cta_suggestion && (
            <Preview label="Botão" value={labelFor(META_CTAS, result.cta_suggestion)} />
          )}
          {result.rationale && (
            <p className="text-[11px] italic text-muted-foreground">{result.rationale}</p>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-10 flex-1"
              onClick={() => {
                onApply(result)
                setResult(null)
                setBriefing('')
              }}
            >
              <Check className="h-4 w-4" />
              Usar
            </Button>
            <Button size="sm" variant="ghost" className="h-10" onClick={() => setResult(null)}>
              <X className="h-4 w-4" />
              Descartar
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Mostra o texto e, quando há limite do Meta, quanto dele foi usado.
 *
 * O aviso de estouro é informativo: o Meta aceita passar, só corta com
 * reticências no feed. Quem escreve precisa saber, não ser impedido.
 */
function Preview({ label, value, limit }: { label: string; value: string; limit?: number }) {
  const over = limit !== undefined && value.length > limit

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        {limit !== undefined && (
          <span className={`text-[10px] tabular-nums ${over ? 'text-warning' : 'text-muted-foreground'}`}>
            {value.length}/{limit}
            {over && ' · o Meta corta'}
          </span>
        )}
      </div>
      <p className="whitespace-pre-wrap rounded border border-success/40 bg-success/5 p-2 text-xs">
        {value}
      </p>
    </div>
  )
}
