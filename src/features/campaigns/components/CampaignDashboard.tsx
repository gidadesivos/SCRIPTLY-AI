import { useState } from 'react'
import type { CampaignNode } from '@/features/campaigns/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, TrendingUp, Users, DollarSign, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchMetaMetrics } from '@/features/meta/api'

interface CampaignDashboardProps {
  nodes: CampaignNode[]
}

export function CampaignDashboard({ nodes }: CampaignDashboardProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [synced, setSynced] = useState(false)

  // Calculando totais com base nos nós reais (orçamento) e dados fixos para métricas
  const totalBudget = nodes.reduce((acc, node) => {
    const data = node.data as Record<string, unknown>
    return acc + (Number(data.budget_amount) || 0)
  }, 0)
  
  // Dados mockados ou calculados se sincronizado
  const spent = totalBudget > 0 ? totalBudget * (synced ? 0.72 : 0.45) : (synced ? 2400.00 : 1500.00)
  const progressPercent = totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : (synced ? 72 : 45)
  
  const mockMetrics = {
    roas: synced ? 4.1 : 3.2,
    cpa: synced ? 18.20 : 24.50,
    clicks: synced ? 28450 : 12458,
    conversions: synced ? 812 : 312
  }

  async function handleSync() {
    setIsSyncing(true)
    try {
      const ids = nodes.map(n => n.id)
      await fetchMetaMetrics(ids)
      setSynced(true)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex-1 overflow-auto p-6 pt-20 text-[#EDEDF2]">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Dashboard de Performance</h2>
          <div className="flex items-center gap-4">
            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 hidden sm:inline-block">
              {synced ? 'Sincronizado com Meta API (Simulação)' : 'Dados Iniciais'}
            </span>
            <Button 
              size="sm" 
              onClick={handleSync} 
              disabled={isSyncing}
              className="bg-blue-600 text-white hover:bg-blue-700 h-9"
            >
              {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {isSyncing ? 'Sincronizando...' : 'Sincronizar com Meta'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-[#23232F] bg-[#14141C] text-[#EDEDF2]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Orçamento Consumido</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {spent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground">
                de {totalBudget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} planejado
              </p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#23232F]">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-500 ease-in-out" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-[#23232F] bg-[#14141C] text-[#EDEDF2]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ROAS Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">{mockMetrics.roas}x</div>
              <p className="text-xs text-muted-foreground">
                +0.5x acima da meta (2.7x)
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#23232F] bg-[#14141C] text-[#EDEDF2]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">CPA Médio</CardTitle>
              <Target className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockMetrics.cpa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground">
                -12% vs mês anterior
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#23232F] bg-[#14141C] text-[#EDEDF2]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Conversões Totais</CardTitle>
              <Users className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockMetrics.conversions}</div>
              <p className="text-xs text-muted-foreground">
                De {mockMetrics.clicks.toLocaleString('pt-BR')} cliques
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
