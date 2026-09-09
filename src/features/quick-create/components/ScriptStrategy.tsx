import { strings } from '@/i18n/pt-BR'
import type { QuickScript } from '@/lib/ai'

const t = strings.quickCreate

/**
 * A estratégia que a IA escolheu — a CONCLUSÃO, nunca o caminho até ela.
 *
 * O prompt proíbe expor raciocínio; esta tela é a outra metade da promessa.
 * "Objetivo: quebra de objeção" é resultado. "Primeiro analisei o pedido,
 * depois considerei três ângulos…" seria cadeia de raciocínio, e não entra.
 */
export function ScriptStrategy({ script }: { script: QuickScript }) {
  const itens = [
    { label: t.objective, value: script.objective },
    { label: t.angle, value: script.angle },
    { label: t.audienceLabel, value: script.audience },
    { label: t.promise, value: script.promise },
  ].filter((item) => item.value.trim())

  if (itens.length === 0) return null

  return (
    <section className="rounded-xl border border-[#1E1E28] bg-[#0E0E14] p-4">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#5E5E75]">
        {t.strategy}
      </h2>
      <dl className="flex flex-col gap-3">
        {itens.map((item) => (
          <div key={item.label}>
            <dt className="text-[11px] uppercase tracking-wide text-[#5E5E75]">{item.label}</dt>
            <dd className="mt-0.5 text-[13px] leading-relaxed text-[#EDEDF2]">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
