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
import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2 } from 'lucide-react'
import { NODE_LABELS } from '@/features/campaigns/types'
import { fetchMetaMetrics, type MetaMetrics } from '@/features/meta/api'

interface CampaignTableProps {
  nodes: CampaignNode[]
}

export function CampaignTable({ nodes }: CampaignTableProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [metrics, setMetrics] = useState<Record<string, MetaMetrics>>({})

  // Simple sorting: campaigns first, then adsets, then ads
  const sortedNodes = useMemo(() => {
    const levelOrder: Record<string, number> = {
      campanha: 1,
      conjunto: 2,
      anuncio: 3,
    }
    return [...nodes].sort((a, b) => (levelOrder[a.type] || 0) - (levelOrder[b.type] || 0) || (a.order_index - b.order_index))
  }, [nodes])

  async function handleSync() {
    setIsSyncing(true)
    try {
      const ids = nodes.map(n => n.id)
      const data = await fetchMetaMetrics(ids)
      setMetrics(data)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex-1 overflow-auto p-6 pt-20 text-[#EDEDF2]">
      <div className="mx-auto max-w-5xl rounded-md border border-[#23232F] bg-[#14141C] p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Desempenho (Visão em Tabela)</h2>
          <Button 
            size="sm" 
            onClick={handleSync} 
            disabled={isSyncing}
            className="bg-blue-600 text-white hover:bg-blue-700 h-9"
          >
            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sincronizar
          </Button>
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
                
                // Mocks iniciais
                const roas = m ? m.roas.toFixed(2) : (Math.random() * (4.5 - 1.2) + 1.2).toFixed(2)
                const cpa = m ? m.cpa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : (Math.random() * (45 - 15) + 15).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                const clicks = m ? m.clicks : Math.floor(Math.random() * (5000 - 100) + 100)
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
                    <TableCell className="text-right font-medium text-emerald-400">{roas}x</TableCell>
                    <TableCell className="text-right font-medium text-[#EDEDF2]">{cpa}</TableCell>
                    <TableCell className="text-right font-medium text-blue-400">{clicks}</TableCell>
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
