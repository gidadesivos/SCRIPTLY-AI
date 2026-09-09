import { GEMINI_API_BASE } from './ai-config.ts'

/**
 * Files API do Gemini: subir mídia e obter um URI referenciável.
 *
 * Por que este arquivo existe: vídeo NÃO vai dentro do JSON da geração. Em
 * base64 um arquivo de 50 MB vira ~67 MB de string, atravessa o corpo da
 * requisição, é reparseado na memória da Edge Function e ainda conta como
 * token. A Files API resolve isso: sobe uma vez, devolve um URI, e a geração
 * carrega só o URI.
 *
 * As assinaturas abaixo vieram do discovery document oficial da API
 * (https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta),
 * não de memória:
 *   media.upload   POST /upload/v1beta/files    (uploadType é parâmetro global)
 *   files.get      GET  /v1beta/{name}          devolve File
 *   File.state     STATE_UNSPECIFIED | PROCESSING | ACTIVE | FAILED
 *   Part.fileData  { mimeType, fileUri }
 */

/** Base do upload: /upload vem ANTES da versão, e não depois. */
const UPLOAD_BASE = GEMINI_API_BASE.replace('/v1beta', '/upload/v1beta')

/**
 * O Google só aceita o arquivo depois de processá-lo, e vídeo não fica pronto
 * na hora. Estes números são o orçamento dessa espera dentro de uma invocação
 * de Edge Function — não dá para esperar para sempre.
 */
const POLL_INTERVAL_MS = 1_500
const MAX_POLL_MS = 60_000
const UPLOAD_TIMEOUT_MS = 60_000

export class GeminiFileError extends Error {
  /** true quando repetir tem chance de mudar o resultado. */
  retryable: boolean

  constructor(message: string, retryable: boolean) {
    super(message)
    this.name = 'GeminiFileError'
    this.retryable = retryable
  }
}

interface ArquivoRemoto {
  name?: string
  uri?: string
  state?: 'STATE_UNSPECIFIED' | 'PROCESSING' | 'ACTIVE' | 'FAILED'
  mimeType?: string
  sizeBytes?: string
  error?: { message?: string }
}

interface RespostaUpload {
  file?: ArquivoRemoto
  error?: { message?: string }
}

/** Referência pronta para virar um part de conteúdo. */
export interface GeminiFileRef {
  /** Nome do recurso (files/abc123) — é por ele que se apaga. */
  name: string
  /** URI que entra em fileData.fileUri. */
  uri: string
  mimeType: string
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Sobe os bytes e devolve a referência, JÁ processada e utilizável.
 *
 * Recebe ArrayBuffer e não stream de propósito: o upload simples precisa do
 * Content-Length, e com o teto de 50 MB o custo de ter os bytes em memória é
 * previsível. Streaming exigiria o protocolo resumable, que é bem mais código
 * para um ganho que este teto não justifica.
 */
export async function uploadVideoToGemini(
  apiKey: string,
  bytes: ArrayBuffer,
  mimeType: string,
): Promise<GeminiFileRef> {
  if (bytes.byteLength === 0) {
    throw new GeminiFileError('O arquivo de referência chegou vazio.', false)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)

  let enviado: ArquivoRemoto
  try {
    const response = await fetch(`${UPLOAD_BASE}/files?uploadType=media`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': mimeType,
        'Content-Length': String(bytes.byteLength),
      },
      body: bytes,
      signal: controller.signal,
    })

    const body = (await response.json().catch(() => null)) as RespostaUpload | null

    if (!response.ok) {
      // 4xx aqui é arquivo ou chave recusados: repetir daria o mesmo.
      throw new GeminiFileError(
        body?.error?.message ?? `O Gemini recusou o upload (HTTP ${response.status}).`,
        response.status >= 500,
      )
    }

    if (!body?.file?.name || !body.file.uri) {
      throw new GeminiFileError('O Gemini aceitou o upload mas não devolveu a referência.', true)
    }
    enviado = body.file
  } catch (error) {
    if (error instanceof GeminiFileError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new GeminiFileError('Tempo esgotado ao enviar o vídeo para análise.', false)
    }
    throw new GeminiFileError((error as Error).message, true)
  } finally {
    clearTimeout(timeout)
  }

  const pronto = await esperarFicarPronto(apiKey, enviado)

  return {
    name: pronto.name as string,
    uri: pronto.uri as string,
    mimeType: pronto.mimeType ?? mimeType,
  }
}

/**
 * Espera o arquivo sair de PROCESSING.
 *
 * Usar o URI antes disso faz a geração falhar com um erro que não explica nada
 * — o arquivo existe, só não está pronto. Melhor esperar aqui, onde dá para
 * dizer exatamente o que aconteceu.
 */
async function esperarFicarPronto(
  apiKey: string,
  arquivo: ArquivoRemoto,
): Promise<ArquivoRemoto> {
  let atual = arquivo
  const limite = Date.now() + MAX_POLL_MS

  while (atual.state === 'PROCESSING' || atual.state === 'STATE_UNSPECIFIED') {
    if (Date.now() > limite) {
      throw new GeminiFileError(
        'O Gemini ainda está processando o vídeo. Tente um arquivo menor ou mais curto.',
        false,
      )
    }
    await sleep(POLL_INTERVAL_MS)

    const response = await fetch(`${GEMINI_API_BASE}/${atual.name}`, {
      headers: { 'x-goog-api-key': apiKey },
    })
    if (!response.ok) {
      throw new GeminiFileError(
        `Falha ao consultar o vídeo enviado (HTTP ${response.status}).`,
        response.status >= 500,
      )
    }
    atual = (await response.json()) as ArquivoRemoto
  }

  if (atual.state === 'FAILED') {
    throw new GeminiFileError(
      atual.error?.message ?? 'O Gemini não conseguiu processar este vídeo.',
      false,
    )
  }

  return atual
}

/**
 * Apaga a cópia do lado do Google. Best-effort de propósito.
 *
 * O Google já expira estes arquivos sozinho, então falhar aqui não deixa lixo
 * eterno — mas derrubar uma geração que DEU CERTO porque a faxina falhou seria
 * trocar um roteiro pronto por nada.
 */
export async function deleteGeminiFile(apiKey: string, name: string): Promise<void> {
  try {
    await fetch(`${GEMINI_API_BASE}/${name}`, {
      method: 'DELETE',
      headers: { 'x-goog-api-key': apiKey },
    })
  } catch (error) {
    console.error('Falha ao apagar arquivo temporário no Gemini:', (error as Error).message)
  }
}
