/**
 * Mock interface for Meta Graph API integration.
 * Em um cenário real, estas requisições bateriam em:
 * https://graph.facebook.com/v19.0/{campaign-id}/insights
 */

export interface MetaMetrics {
  spend: number
  roas: number
  cpa: number
  clicks: number
  impressions: number
  conversions: number
}

// Simula a latência de rede e a busca de dados reais da Meta
export async function fetchMetaMetrics(campaignIds: string[]): Promise<Record<string, MetaMetrics>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const results: Record<string, MetaMetrics> = {}
      
      campaignIds.forEach((id) => {
        // Gerando números aleatórios mais realistas para os mocks
        results[id] = {
          spend: Math.random() * 500 + 100,
          roas: Number((Math.random() * 3 + 1.5).toFixed(2)),
          cpa: Number((Math.random() * 30 + 15).toFixed(2)),
          clicks: Math.floor(Math.random() * 3000 + 500),
          impressions: Math.floor(Math.random() * 50000 + 10000),
          conversions: Math.floor(Math.random() * 100 + 10),
        }
      })
      
      resolve(results)
    }, 1500) // 1.5s delay
  })
}
