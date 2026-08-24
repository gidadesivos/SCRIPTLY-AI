import { useMemo, useState } from 'react'
import type { DailyUsageRow } from '@/features/settings/api'
import { cn } from '@/lib/utils'

interface UsageChartProps {
  rows: DailyUsageRow[]
  days: number
}

interface Day {
  date: Date
  key: string
  ok: number
  fail: number
  total: number
}

/**
 * Gerações por dia.
 *
 * A tabela de totais responde "quanto gastei"; ela não responde "estou
 * acelerando?". Um mês num número só esconde o dia em que o uso triplicou — que
 * é justamente o que antecede estourar a cota.
 *
 * Barras empilhadas com duas partes: o que deu certo e o que falhou. Não separo
 * por provedor aqui de propósito — a tabela abaixo já faz isso, e duas séries de
 * identidade mais duas de estado no mesmo gráfico viram quatro cores que ninguém
 * distingue. Aqui a pergunta é volume no tempo, não quem atendeu.
 *
 * As cores foram validadas: roxo e vermelho ficam em ΔE 36,9 em visão normal e
 * 30,4 em deuteranopia. Roxo e azul, o par óbvio, reprovaria.
 */
export function UsageChart({ rows, days }: UsageChartProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  // Série completa, com dias vazios: buraco no gráfico é informação — mostra
  // que houve pausa. Pular dia sem uso comprimiria o tempo e mentiria sobre o ritmo.
  const series = useMemo<Day[]>(() => {
    const byDay = new Map<string, { ok: number; fail: number }>()
    for (const row of rows) {
      const current = byDay.get(row.dia) ?? { ok: 0, fail: 0 }
      current.ok += row.total - row.falhas
      current.fail += row.falhas
      byDay.set(row.dia, current)
    }

    const out: Day[] = []
    const today = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const key = date.toISOString().slice(0, 10)
      const found = byDay.get(key) ?? { ok: 0, fail: 0 }
      out.push({ date, key, ok: found.ok, fail: found.fail, total: found.ok + found.fail })
    }
    return out
  }, [rows, days])

  const max = Math.max(1, ...series.map((day) => day.total))
  const totalOk = series.reduce((sum, day) => sum + day.ok, 0)
  const totalFail = series.reduce((sum, day) => sum + day.fail, 0)
  const active = series.find((day) => day.key === hovered) ?? null

  if (totalOk + totalFail === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhuma geração nos últimos {days} dias.</p>
    )
  }

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Gerações por dia · últimos {days} dias
        </span>

        {/* Rótulo direto no lugar de legenda separada: com duas séries, dizer o
            número ao lado da cor economiza uma ida e volta do olho. */}
        <span className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-chart-ok" />
            <span className="tabular-nums">{totalOk}</span>
            <span className="text-muted-foreground">ok</span>
          </span>
          {totalFail > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-chart-fail" />
              <span className="tabular-nums">{totalFail}</span>
              <span className="text-muted-foreground">falharam</span>
            </span>
          )}
        </span>
      </figcaption>

      {/* gap-0.5 = 2px de superfície entre barras; sem isso um dia colado no
          outro vira um bloco só e a leitura de "por dia" se perde. */}
      <div
        className="relative flex h-28 items-end gap-0.5"
        onMouseLeave={() => setHovered(null)}
        role="img"
        aria-label={`Gerações por dia nos últimos ${days} dias: ${totalOk} com sucesso, ${totalFail} com falha.`}
      >
        {series.map((day) => (
          <button
            key={day.key}
            type="button"
            // Alvo maior que a barra: barras finas são impossíveis de acertar.
            className="group relative flex h-full flex-1 cursor-default flex-col justify-end"
            onMouseEnter={() => setHovered(day.key)}
            onFocus={() => setHovered(day.key)}
            onBlur={() => setHovered(null)}
            aria-label={`${day.date.toLocaleDateString('pt-BR')}: ${day.total} ${day.total === 1 ? 'geração' : 'gerações'}`}
          >
            {day.fail > 0 && (
              <span
                // mb-0.5 = os mesmos 2px de superfície separando os segmentos
                // empilhados. Encostados, roxo e vermelho leem como uma barra
                // só de cor estranha em vez de duas quantidades.
                className="mb-0.5 w-full rounded-t-[2px] bg-chart-fail"
                style={{ height: `${(day.fail / max) * 100}%` }}
              />
            )}
            {day.ok > 0 && (
              <span
                className={cn(
                  'w-full bg-chart-ok',
                  // Canto arredondado só no topo da pilha, e sempre na base.
                  day.fail === 0 && 'rounded-t-[2px]',
                )}
                style={{ height: `${(day.ok / max) * 100}%` }}
              />
            )}
            {day.total === 0 && <span className="h-px w-full bg-border" />}

            <span
              className={cn(
                'pointer-events-none absolute inset-0 rounded-sm bg-foreground/5 opacity-0 transition-opacity',
                hovered === day.key && 'opacity-100',
              )}
            />
          </button>
        ))}
      </div>

      {/* Área reservada: sem altura fixa o gráfico pularia ao passar o mouse. */}
      <div className="h-8">
        {active ? (
          <p className="text-xs">
            <span className="font-medium">
              {active.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
            {active.total === 0 ? (
              <span className="text-muted-foreground"> · sem gerações</span>
            ) : (
              <>
                <span className="text-muted-foreground"> · </span>
                <span className="tabular-nums">{active.ok}</span>
                <span className="text-muted-foreground"> ok</span>
                {active.fail > 0 && (
                  <>
                    <span className="text-muted-foreground">, </span>
                    <span className="tabular-nums text-chart-fail">{active.fail}</span>
                    <span className="text-muted-foreground"> falharam</span>
                  </>
                )}
              </>
            )}
          </p>
        ) : (
          <p className="flex justify-between text-[11px] text-muted-foreground">
            <span>{series[0]?.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
            <span>hoje</span>
          </p>
        )}
      </div>
    </figure>
  )
}
