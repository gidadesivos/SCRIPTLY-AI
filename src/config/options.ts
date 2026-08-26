export interface Option {
  value: string
  label: string
}

export const PLATFORMS: Option[] = [
  { value: 'instagram_reels', label: 'Instagram Reels' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube_shorts', label: 'YouTube Shorts' },
  { value: 'meta_ads', label: 'Meta Ads' },
  { value: 'instagram_ads', label: 'Instagram Ads' },
  { value: 'facebook_ads', label: 'Facebook Ads' },
  { value: 'youtube_ads', label: 'YouTube Ads' },
  { value: 'generic', label: 'Genérico' },
]

export const OBJECTIVES: Option[] = [
  { value: 'vendas', label: 'Vendas' },
  { value: 'leads', label: 'Leads' },
  { value: 'alcance', label: 'Alcance' },
  { value: 'engajamento', label: 'Engajamento' },
  { value: 'autoridade', label: 'Autoridade' },
  { value: 'seguidores', label: 'Seguidores' },
  { value: 'educacao', label: 'Educação' },
  { value: 'remarketing', label: 'Remarketing' },
  { value: 'oferta', label: 'Oferta' },
  { value: 'lancamento', label: 'Lançamento' },
  { value: 'demonstracao', label: 'Demonstração' },
  { value: 'institucional', label: 'Institucional' },
  { value: 'conversao', label: 'Conversão' },
]

export const TONES: Option[] = [
  { value: 'direto', label: 'Direto' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'natural', label: 'Natural' },
  { value: 'descontraido', label: 'Descontraído' },
  { value: 'premium', label: 'Premium' },
  { value: 'educativo', label: 'Educativo' },
  { value: 'autoridade', label: 'Autoridade' },
  { value: 'curioso', label: 'Curioso' },
  { value: 'provocativo', label: 'Provocativo' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'emocional', label: 'Emocional' },
  { value: 'ugc', label: 'UGC' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'minimalista', label: 'Minimalista' },
]

export const FUNNEL_STAGES: Option[] = [
  { value: 'topo', label: 'Topo' },
  { value: 'meio', label: 'Meio' },
  { value: 'fundo', label: 'Fundo' },
  { value: 'remarketing', label: 'Remarketing' },
]

export const DURATIONS: Option[] = [
  { value: '6', label: '6 segundos' },
  { value: '10', label: '10 segundos' },
  { value: '15', label: '15 segundos' },
  { value: '20', label: '20 segundos' },
  { value: '30', label: '30 segundos' },
  { value: '45', label: '45 segundos' },
  { value: '60', label: '60 segundos' },
]

export const ANGLE_CATEGORIES: Option[] = [
  { value: 'dor', label: 'Dor' },
  { value: 'desejo', label: 'Desejo' },
  { value: 'curiosidade', label: 'Curiosidade' },
  { value: 'problema_oculto', label: 'Problema oculto' },
  { value: 'comparacao', label: 'Comparação' },
  { value: 'demonstracao', label: 'Demonstração' },
  { value: 'resultado', label: 'Resultado' },
  { value: 'transformacao', label: 'Transformação' },
  { value: 'quebra_objecao', label: 'Quebra de objeção' },
  { value: 'erro', label: 'Erro' },
  { value: 'mito', label: 'Mito' },
  { value: 'prova', label: 'Prova' },
  { value: 'oportunidade', label: 'Oportunidade' },
  { value: 'urgencia', label: 'Urgência' },
  { value: 'contrarian', label: 'Contrarian' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'ugc', label: 'UGC' },
]

export const FRAMEWORKS: Option[] = [
  { value: 'auto', label: 'Escolha automática pela IA' },
  { value: 'aida', label: 'AIDA' },
  { value: 'pas', label: 'PAS' },
  { value: 'bab', label: 'BAB' },
  { value: 'hook_dor_solucao_cta', label: 'Hook → Dor → Solução → CTA' },
  { value: 'hook_demo_resultado', label: 'Hook → Demonstração → Resultado' },
  { value: 'hook_problema_prova_cta', label: 'Hook → Problema → Prova → CTA' },
  { value: 'antes_depois_ponte', label: 'Antes → Depois → Ponte' },
  { value: 'lista', label: 'Lista' },
  { value: 'tres_erros', label: '3 Erros' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'ugc', label: 'UGC' },
  { value: 'depoimento', label: 'Depoimento' },
  { value: 'mito_verdade', label: 'Mito × Verdade' },
  { value: 'comparacao', label: 'Comparação' },
  { value: 'objecao_resposta', label: 'Objeção → Resposta' },
  { value: 'produto_em_acao', label: 'Produto em ação' },
  { value: 'problema_oculto', label: 'Problema oculto' },
]

export const SCRIPT_STATUSES: Option[] = [
  { value: 'ideia', label: 'Ideia' },
  { value: 'roteiro', label: 'Roteiro' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'gravacao', label: 'Gravação' },
  { value: 'edicao', label: 'Edição' },
  { value: 'pronto', label: 'Pronto' },
  { value: 'publicado', label: 'Publicado' },
  { value: 'arquivado', label: 'Arquivado' },
]

export function labelFor(options: Option[], value: string | null | undefined): string {
  if (!value) return '—'
  return options.find((option) => option.value === value)?.label ?? value
}
