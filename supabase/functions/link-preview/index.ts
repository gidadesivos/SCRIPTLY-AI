import { z } from 'npm:zod@3.23.8'
import { authenticate, AuthError, ConfigError } from '../_shared/auth.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/http.ts'
import { assertPublicUrl, UnsafeUrlError } from '../_shared/safe-url.ts'

/**
 * Cartão Open Graph de uma URL, para o card de página de destino no canvas.
 *
 * Por que não um <iframe> direto no card: quase todo site manda
 * X-Frame-Options ou CSP frame-ancestors e recusa ser embutido. O usuário veria
 * uma caixa branca na maioria das vezes. Ler as meta tags e montar o cartão é
 * o que funciona — é o que Slack e Notion fazem.
 *
 * Por que no servidor e não no navegador: o fetch do navegador esbarra em CORS
 * em site de terceiro. Aqui não há CORS, mas há SSRF — daí o assertPublicUrl.
 */

const requestSchema = z.object({
  workspaceId: z.string().uuid(),
  url: z.string().min(1).max(2048),
})

const MAX_BYTES = 512 * 1024
const TIMEOUT_MS = 8_000
const MAX_REDIRECTS = 3

/** Meta tag por propriedade, aceitando aspas simples ou duplas e ordem trocada. */
function metaTag(html: string, nome: string): string {
  const escapado = nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const padroes = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escapado}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escapado}["']`, 'i'),
  ]
  for (const padrao of padroes) {
    const achado = html.match(padrao)
    if (achado?.[1]) return decodeEntidades(achado[1].trim())
  }
  return ''
}

function decodeEntidades(texto: string): string {
  return texto
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function tituloHtml(html: string): string {
  const achado = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return achado?.[1] ? decodeEntidades(achado[1].trim()) : ''
}

/** Resolve caminho relativo do og:image contra a página. */
function absolutizar(valor: string, base: URL): string {
  if (!valor) return ''
  try {
    return new URL(valor, base).toString()
  } catch {
    return ''
  }
}

/**
 * Busca seguindo redirecionamentos à mão, revalidando cada destino.
 * `redirect: 'follow'` seguiria para um IP interno sem passar pelo filtro.
 */
async function buscarComGuarda(inicial: URL, signal: AbortSignal): Promise<{ html: string; final: URL }> {
  let atual = inicial

  for (let salto = 0; salto <= MAX_REDIRECTS; salto++) {
    const resposta = await fetch(atual, {
      signal,
      redirect: 'manual',
      headers: {
        // Alguns sites devolvem 403 para agente desconhecido.
        'User-Agent': 'Mozilla/5.0 (compatible; ScriptlyBot/1.0; +https://scriptly.ai)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    if (resposta.status >= 300 && resposta.status < 400) {
      const destino = resposta.headers.get('location')
      if (!destino) throw new Error(`Redirecionamento sem destino (${resposta.status}).`)
      atual = assertPublicUrl(new URL(destino, atual).toString())
      continue
    }

    if (!resposta.ok) throw new Error(`A página respondeu ${resposta.status}.`)

    const tipo = resposta.headers.get('content-type') ?? ''
    if (!tipo.includes('html')) throw new Error('O endereço não devolveu uma página HTML.')

    // Lê no máximo MAX_BYTES: as meta tags ficam no <head>, e baixar o site
    // inteiro só gastaria tempo e memória da function.
    const reader = resposta.body?.getReader()
    if (!reader) throw new Error('Resposta vazia.')

    const pedacos: Uint8Array[] = []
    let total = 0
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      pedacos.push(value)
      total += value.length
    }
    await reader.cancel().catch(() => {})

    const buffer = new Uint8Array(total)
    let offset = 0
    for (const pedaco of pedacos) {
      buffer.set(pedaco.subarray(0, Math.min(pedaco.length, total - offset)), offset)
      offset += pedaco.length
    }

    return { html: new TextDecoder('utf-8').decode(buffer), final: atual }
  }

  throw new Error('Redirecionamentos demais.')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse('invalid_request', 405)

  let body: z.infer<typeof requestSchema>
  try {
    body = requestSchema.parse(await req.json())
  } catch {
    return errorResponse('invalid_request', 400)
  }

  try {
    await authenticate(req, body.workspaceId)
  } catch (error) {
    if (error instanceof AuthError) {
      return errorResponse(error.code, error.code === 'unauthorized' ? 401 : 403, error.message)
    }
    if (error instanceof ConfigError) {
      console.error('[link-preview] configuração ausente:', error.message)
      return errorResponse('ai_unavailable', 503, error.message)
    }
    return errorResponse('unexpected', 500)
  }

  // Sem esquema, "site.com.br" não é URL válida. Assumir https é o que o
  // usuário quis dizer ao colar o endereço.
  const bruta = /^https?:\/\//i.test(body.url) ? body.url : `https://${body.url}`

  let alvo: URL
  try {
    alvo = assertPublicUrl(bruta)
  } catch (error) {
    return errorResponse('invalid_request', 400, (error as Error).message)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const { html, final } = await buscarComGuarda(alvo, controller.signal)

    return jsonResponse({
      data: {
        url: final.toString(),
        title: metaTag(html, 'og:title') || tituloHtml(html),
        description: metaTag(html, 'og:description') || metaTag(html, 'description'),
        image: absolutizar(metaTag(html, 'og:image') || metaTag(html, 'twitter:image'), final),
        site: metaTag(html, 'og:site_name') || final.hostname,
      },
    })
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      return errorResponse('invalid_request', 400, error.message)
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      return errorResponse('ai_unavailable', 504, 'A página demorou demais para responder.')
    }
    console.error('[link-preview] falhou:', (error as Error).message)
    return errorResponse('ai_unavailable', 502, (error as Error).message)
  } finally {
    clearTimeout(timeout)
  }
})
