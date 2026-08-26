import type { CampaignNode } from '@/features/campaigns/types'

/**
 * Avisos derivados das regras do Meta.
 *
 * São avisos, não bloqueios: planejamento passa por estados incompletos, e uma
 * ferramenta que impede salvar um rascunho pela metade atrapalha mais do que
 * ajuda. O que ela precisa fazer é não deixar você descobrir o problema só na
 * hora de subir a campanha.
 *
 * Cada regra tem um comentário dizendo o que acontece no Meta se ela for
 * ignorada — sem isso viram superstição.
 */
export function issuesFor(node: CampaignNode, all: CampaignNode[]): string[] {
  const issues: string[] = []
  const children = all.filter((n) => n.parent_id === node.id)
  const data = node.data as Record<string, unknown>

  if (node.type === 'campanha') {
    if (!data.objective) {
      issues.push('Sem objetivo definido.')
    }

    // O Meta não deixa publicar campanha vazia, e o objetivo escolhido limita
    // quais otimizações os conjuntos podem usar.
    if (children.length === 0) {
      issues.push('Nenhum conjunto de anúncios.')
    }

    // CBO e ABO são exclusivos: o orçamento fica na campanha OU nos conjuntos.
    if (data.budget_level === 'campaign') {
      if (!data.budget_amount) {
        issues.push('Orçamento na campanha, mas sem valor.')
      }
      const withOwnBudget = children.filter(
        (child) => (child.data as Record<string, unknown>).budget_amount,
      )
      if (withOwnBudget.length > 0) {
        issues.push(
          `Orçamento está na campanha, mas ${withOwnBudget.length === 1 ? '1 conjunto tem' : `${withOwnBudget.length} conjuntos têm`} orçamento próprio. O Meta ignora um dos dois.`,
        )
      }
    }

    if (data.budget_level === 'adset') {
      const withoutBudget = children.filter(
        (child) => !(child.data as Record<string, unknown>).budget_amount,
      )
      if (withoutBudget.length > 0) {
        issues.push(
          `Orçamento é por conjunto, mas ${withoutBudget.length === 1 ? '1 conjunto está' : `${withoutBudget.length} conjuntos estão`} sem valor.`,
        )
      }
    }

    if (!data.budget_level) {
      issues.push('Não está definido se o orçamento fica na campanha ou nos conjuntos.')
    }
  }

  if (node.type === 'conjunto') {
    if (children.length === 0) {
      issues.push('Nenhum anúncio.')
    }
    if (!data.audience_type) {
      issues.push('Público não definido.')
    }
    // Sem evento de conversão, o Meta otimiza para o padrão e a campanha
    // entrega para quem clica, não para quem compra.
    if (data.optimization_goal === 'conversions' && !data.conversion_event) {
      issues.push('Otimiza para conversões, mas o evento não foi escolhido.')
    }
    if (!data.optimization_goal) {
      issues.push('Otimização não definida.')
    }
  }

  if (node.type === 'anuncio') {
    // Criativo é o que o Meta exige para o anúncio existir. Um roteiro
    // vinculado conta: é ele que vira o vídeo.
    if (!node.script_id && !data.format) {
      issues.push('Sem criativo: nem roteiro vinculado, nem formato definido.')
    }
    if (!data.primary_text) {
      issues.push('Sem texto principal.')
    }
    if (!data.destination) {
      issues.push('Sem destino.')
    }
  }

  return issues
}

/** Quantos avisos o plano inteiro tem, para o cabeçalho mostrar de uma vez. */
export function countIssues(nodes: CampaignNode[]): number {
  return nodes.reduce((total, node) => total + issuesFor(node, nodes).length, 0)
}

export interface PlanTotals {
  campanhas: number
  conjuntos: number
  anuncios: number
  /** Soma dos orçamentos que serão de fato aplicados. */
  orcamento: number
  comCriativo: number
  issues: number
}

/**
 * Totais do plano.
 *
 * O orçamento não é a soma de tudo que está preenchido: quando a campanha usa
 * CBO, o valor dos conjuntos é ignorado pelo Meta, e somar os dois daria um
 * número que não existe. Cada campanha contribui com o que a plataforma vai
 * mesmo gastar.
 */
export function planTotals(nodes: CampaignNode[]): PlanTotals {
  const value = (node: CampaignNode) =>
    Number((node.data as Record<string, unknown>).budget_amount ?? 0) || 0

  let orcamento = 0
  for (const campanha of nodes.filter((node) => node.type === 'campanha')) {
    const conjuntos = nodes.filter((node) => node.parent_id === campanha.id)
    const level = (campanha.data as Record<string, unknown>).budget_level

    orcamento +=
      level === 'campaign'
        ? value(campanha)
        : conjuntos.reduce((sum, conjunto) => sum + value(conjunto), 0)
  }

  const anuncios = nodes.filter((node) => node.type === 'anuncio')

  return {
    campanhas: nodes.filter((node) => node.type === 'campanha').length,
    conjuntos: nodes.filter((node) => node.type === 'conjunto').length,
    anuncios: anuncios.length,
    orcamento,
    comCriativo: anuncios.filter((node) => node.script_id || node.media_url).length,
    issues: countIssues(nodes),
  }
}
