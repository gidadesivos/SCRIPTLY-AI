import { useState, useMemo } from 'react'
import type { CampaignNode } from '@/features/campaigns/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Info } from 'lucide-react'
import { NODE_LABELS } from '@/features/campaigns/types'
import { META_METRICS_ENABLED, type MetaMetrics } from '@/features/meta/api'

interface CampaignTableProps {
  nodes: CampaignNode[]
}

export function CampaignTable({ nodes }: CampaignTableProps) {
  /*
   * Vazio enquanto não houver integração com o Meta.
   *
   * Antes, cada célula sem métrica caía num Math.random(): a tabela mostrava
   * ROAS, CPA e cliques inventados com cara de dado real, e o botão
   * "Sincronizar" chamava um mock que fingia 1,5s de rede para devolver mais
   * números sorteados. Quem monta campanha decide orçamento com esses números.
   */
  const [metrics] = useState<Record<string, MetaMetrics>>({})

  // Simple sorting: campaigns first, then adsets, then ads
  const sortedNodes = useMemo(() => {
    const levelOrder: Record<string, number> = {
      campanha: 1,
      conjunto: 2,
      anuncio: 3,
    }
    return [...nodes].sort((a, b) => (levelOrder[a.type] || 0) - (levelOrder[b.type] || 0) || (a.order_index - b.order_index))
  }, [nodes])

  /** Número real ou travessão. Nunca um palpite. */
  const metricOrDash = (value: string | number | undefined) =>
    value === undefined ? '—' : String(value)

  return (
    <div className="flex-1 overflow-auto p-6 pt-20 text-[#EDEDF2]">
      <div className="mx-auto max-w-5xl rounded-md border border-[#23232F] bg-[#14141C] p-4">
        <div className="mb-4 flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Plano em tabela</h2>
          {!META_METRICS_ENABLED && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-px h-3.5 w-3.5 shrink-0" />
              Nome, tipo, status e orçamento vêm do seu plano. ROAS, CPA e cliques
              ficam em branco porque a conta do Meta ainda não está conectada — este
              app não tem esses números.
            </p>
          )}
        </div>
        
        <div className="rounded-md border border-[#23232F]">
          <Table>
            <TableHeader className="bg-[#0B0B10]">
              <TableRow className="border-[#23232F] hover:bg-transparent">
                <TableHead className="w-[300px]">Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Orçamento</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead className="text-right">CPA</TableHead>
                <TableHead className="text-right">Cliques</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedNodes.map((node) => {
                const data = node.data as Record<string, unknown>
                const m = metrics[node.id]
                
                const roas = m ? `${m.roas.toFixed(2)}x` : undefined
                const cpa = m
                  ? m.cpa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : undefined
                const clicks = m ? m.clicks.toLocaleString('pt-BR') : undefined
                const budget = data.budget_amount 
                  ? Number(data.budget_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                  : '—'
                
                return (
                  <TableRow key={node.id} className="border-[#23232F] hover:bg-[#23232F]/50">
                    <TableCell className="font-medium text-[#EDEDF2]">
                      <div className="flex flex-col">
                        <span className="truncate">{node.label || 'Sem Nome'}</span>
                        {node.type === 'conjunto' && <span className="text-[10px] text-muted-foreground">{String(data.audience_type ?? '')}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {NODE_LABELS[node.type]}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                        {String(data.status || 'draft')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-[#EDEDF2]">{budget}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-muted-foreground">
                      {metricOrDash(roas)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-muted-foreground">
                      {metricOrDash(cpa)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-muted-foreground">
                      {metricOrDash(clicks)}
                    </TableCell>
                  </TableRow>
                )
              })}
              
              {nodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Nenhum nó criado no Canvas ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
