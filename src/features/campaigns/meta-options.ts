import type { Option } from '@/config/options'

/**
 * Vocabulário do Meta Ads, separado de config/options.ts de propósito.
 *
 * As opções do Scriptly descrevem conteúdo (plataforma, tom, funil). Estas
 * descrevem a plataforma de anúncios, mudam quando o Meta muda, e misturar as
 * duas faria um seletor de objetivo de roteiro oferecer "Cadastros".
 *
 * Os objetivos seguem os seis do Odax (a consolidação que o Meta fez dos treze
 * antigos). Quem só viu o painel antigo procura "Conversões": o campo de
 * otimização do conjunto é onde isso vive agora.
 */

export const META_CAMPAIGN_OBJECTIVES: Option[] = [
  { value: 'awareness', label: 'Reconhecimento' },
  { value: 'traffic', label: 'Tráfego' },
  { value: 'engagement', label: 'Engajamento' },
  { value: 'leads', label: 'Cadastros' },
  { value: 'app_promotion', label: 'Promoção do app' },
  { value: 'sales', label: 'Vendas' },
]

export const META_BUYING_TYPES: Option[] = [
  { value: 'auction', label: 'Leilão' },
  { value: 'reservation', label: 'Reserva' },
]

export const META_BUDGET_MODES: Option[] = [
  { value: 'daily', label: 'Diário' },
  { value: 'lifetime', label: 'Vitalício' },
]

/** Onde o orçamento vive. É a decisão que mais confunde na hora de montar. */
export const META_BUDGET_LEVELS: Option[] = [
  { value: 'campaign', label: 'Na campanha (CBO / Advantage+)' },
  { value: 'adset', label: 'Nos conjuntos (ABO)' },
]

export const META_OPTIMIZATION_GOALS: Option[] = [
  { value: 'conversions', label: 'Conversões' },
  { value: 'link_clicks', label: 'Cliques no link' },
  { value: 'landing_page_views', label: 'Visualizações da página' },
  { value: 'impressions', label: 'Impressões' },
  { value: 'reach', label: 'Alcance' },
  { value: 'thruplay', label: 'ThruPlay' },
  { value: 'lead_generation', label: 'Geração de cadastros' },
  { value: 'value', label: 'Valor de conversão' },
]

export const META_AUDIENCE_TYPES: Option[] = [
  { value: 'broad', label: 'Aberto (só idade e local)' },
  { value: 'interests', label: 'Interesses e comportamentos' },
  { value: 'custom', label: 'Personalizado (site, lista, engajamento)' },
  { value: 'lookalike', label: 'Semelhante (lookalike)' },
  { value: 'retargeting', label: 'Remarketing' },
]

export const META_PLACEMENT_MODES: Option[] = [
  { value: 'advantage', label: 'Automático (Advantage+)' },
  { value: 'manual', label: 'Manual' },
]

export const META_AD_FORMATS: Option[] = [
  { value: 'single_video', label: 'Vídeo único' },
  { value: 'single_image', label: 'Imagem única' },
  { value: 'carousel', label: 'Carrossel' },
  { value: 'collection', label: 'Coleção' },
]

export const META_CTAS: Option[] = [
  { value: 'shop_now', label: 'Comprar agora' },
  { value: 'learn_more', label: 'Saiba mais' },
  { value: 'sign_up', label: 'Cadastre-se' },
  { value: 'send_message', label: 'Enviar mensagem' },
  { value: 'whatsapp', label: 'Chamar no WhatsApp' },
  { value: 'book_now', label: 'Reservar' },
  { value: 'get_offer', label: 'Ver oferta' },
  { value: 'contact_us', label: 'Fale conosco' },
  { value: 'download', label: 'Baixar' },
  { value: 'subscribe', label: 'Assinar' },
]
