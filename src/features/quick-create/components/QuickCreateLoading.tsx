import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { strings } from '@/i18n/pt-BR'

const t = strings.quickCreate.loading

/**
 * As fases REAIS do processamento.
 *
 * 'reference' só existe quando há referência — mostrar "Analisando a
 * referência" para quem não enviou nada seria teatro, e teatro na barra de
 * progresso ensina o usuário a não confiar no que a tela diz.
 */
export type QuickPhase = 'reference' | 'generating' | 'done'

interface Passo {
  id: string
  label: string
}

export function QuickCreateLoading({
  phase,
  hasReference,
}: {
  phase: QuickPhase
  hasReference: boolean
}) {
  /*
   * "Entendendo sua ideia", "Consultando sua marca" e "Definindo a estratégia"
   * acontecem DENTRO da mesma chamada — o modelo faz as três de uma vez, e o
   * servidor não emite progresso parcial. Elas aparecem juntas, como uma fase
   * só, em vez de fingirem uma sequência que ninguém está medindo.
   */
  const passos: Passo[] = [
    ...(hasReference ? [{ id: 'reference', label: t.reference }] : []),
    { id: 'generating', label: `${t.understanding} · ${t.brand} · ${t.strategy}` },
    { id: 'writing', label: t.writing },
  ]

  const indiceAtual = phase === 'reference' ? 0 : hasReference ? 1 : 0

  return (
    <div
      className="flex flex-col items-center justify-center gap-6 rounded-xl border border-[#1E1E28] bg-[#0E0E14] px-6 py-14"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-6 w-6 animate-spin text-[#B9A6FF]" aria-hidden />
      <p className="text-[15px] font-medium text-[#EDEDF2]">{t.title}</p>

      <ol className="flex w-full max-w-sm flex-col gap-2.5">
        {passos.map((passo, index) => {
          const concluido = index < indiceAtual
          const atual = index === indiceAtual
          return (
            <li
              key={passo.id}
              className={cn(
                'flex items-start gap-2.5 text-[13px]',
                concluido ? 'text-[#6EE7A8]' : atual ? 'text-[#EDEDF2]' : 'text-[#5E5E75]',
              )}
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                {concluido ? (
                  <Check className="h-3.5 w-3.5" aria-hidden />
                ) : atual ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1">{passo.label}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
