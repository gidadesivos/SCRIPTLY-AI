import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { ANTI_REPETITION_SAMPLE } from './ai-config.ts'

/**
 * Monta o contexto enviado ao modelo. Cada bloco entra por um motivo explícito
 * (§5 regra de ouro): nunca despejar a base inteira.
 *
 *  - marca    → tom, público, provas e palavras proibidas guiam tudo
 *  - produto  → oferta, benefícios e objeções concretas
 *  - títulos  → anti-repetição (§7.4)
 */

function list(label: string, values: string[] | null | undefined): string {
  if (!values?.length) return ''
  return `${label}: ${values.join('; ')}\n`
}

function line(label: string, value: string | null | undefined): string {
  if (!value?.trim()) return ''
  return `${label}: ${value.trim()}\n`
}

export interface BuiltContext {
  brandBlock: string
  productBlock: string
  avoidBlock: string
  forbiddenWords: string[]
  language: string
}

export async function buildContext(
  admin: SupabaseClient,
  workspaceId: string,
  brandId: string,
  productId?: string | null,
): Promise<BuiltContext> {
  const { data: brand, error: brandError } = await admin
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .eq('workspace_id', workspaceId)
    .single()

  if (brandError || !brand) throw new Error('Marca não encontrada neste workspace.')

  let brandBlock = ''
  brandBlock += line('Marca', brand.name)
  brandBlock += line('Descrição', brand.description)
  brandBlock += line('Setor', brand.industry)
  brandBlock += line('Proposta de valor', brand.value_proposition)
  brandBlock += line('Posicionamento', brand.positioning)
  brandBlock += line('Tom', brand.tone)
  brandBlock += line('Personalidade', brand.personality)
  brandBlock += list('Públicos-alvo', brand.target_audiences)
  brandBlock += list('Dores', brand.pains)
  brandBlock += list('Desejos', brand.desires)
  brandBlock += list('Objeções', brand.objections)
  brandBlock += list('Diferenciais', brand.differentiators)
  brandBlock += list('Benefícios', brand.benefits)
  brandBlock += list('Provas disponíveis', brand.proofs)
  brandBlock += list('Palavras preferidas', brand.preferred_words)
  brandBlock += list('Palavras proibidas', brand.forbidden_words)
  brandBlock += list('CTAs preferidos', brand.preferred_ctas)
  brandBlock += line('Instruções específicas da marca', brand.ai_instructions)

  let productBlock = ''
  if (productId) {
    const { data: product } = await admin
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (product) {
      productBlock += line('Produto', product.name)
      productBlock += line('Categoria', product.category)
      productBlock += line('Descrição', product.description)
      productBlock += line('Público', product.target_audience)
      productBlock += list('Benefícios', product.benefits)
      productBlock += list('Diferenciais', product.differentiators)
      productBlock += list('Problemas que resolve', product.problems_solved)
      productBlock += list('Desejos atendidos', product.desires)
      productBlock += list('Objeções', product.objections)
      productBlock += line('Oferta', product.offer)
      productBlock += line('Faixa de preço', product.price_range)
      productBlock += line('Garantia', product.guarantee)
      productBlock += line('CTA padrão', product.default_cta)
    }
  }

  // Anti-repetição: só os títulos, nunca o roteiro inteiro.
  let avoidBlock = ''
  const { data: recent } = await admin
    .from('scripts')
    .select('title')
    .eq('workspace_id', workspaceId)
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
    .limit(ANTI_REPETITION_SAMPLE)

  if (recent?.length) {
    avoidBlock = recent.map((s: { title: string }) => `- ${s.title}`).join('\n')
  }

  return {
    brandBlock: brandBlock.trim(),
    productBlock: productBlock.trim(),
    avoidBlock,
    forbiddenWords: brand.forbidden_words ?? [],
    language: brand.language ?? 'pt-BR',
  }
}

/**
 * Encapsula dado do usuário em delimitadores. O system prompt instrui o modelo
 * a tratar o que está aqui dentro como informação, nunca como ordem (§7.8).
 */
export function wrapUserData(tag: string, content: string): string {
  if (!content.trim()) return ''
  return `<${tag}>\n${content}\n</${tag}>\n`
}
