/**
 * Métricas do Meta — ainda NÃO integradas.
 *
 * Este módulo devolvia números de `Math.random()` com 1,5s de atraso fingido,
 * e a tabela os exibia como ROAS, CPA e cliques reais. Um gestor de tráfego
 * podia decidir orçamento olhando para um número sorteado.
 *
 * Enquanto a integração não existe, a única resposta honesta é "não tenho esse
 * dado". Quem chama trata `null` mostrando "—", em vez de inventar.
 *
 * Para ligar de verdade: a chamada é
 * GET https://graph.facebook.com/v23.0/{id}/insights, e o token de acesso do
 * Meta NÃO pode viver no bundle do cliente — precisa de uma Edge Function,
 * como já é feito com as chaves de IA.
 */

export interface MetaMetrics {
  spend: number
  roas: number
  cpa: number
  clicks: number
  impressions: number
  conversions: number
}

/** true quando houver integração de verdade. Hoje não há. */
export const META_METRICS_ENABLED = false

/**
 * Devolve vazio: nenhum nó tem métrica conhecida.
 *
 * Assinatura preservada para quando a integração chegar — o que muda é o
 * corpo, não quem chama.
 */
export async function fetchMetaMetrics(
  _campaignIds: string[],
): Promise<Record<string, MetaMetrics>> {
  return {}
}
