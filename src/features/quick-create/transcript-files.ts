/**
 * Leitura de arquivos de transcrição (.txt, .srt, .vtt).
 *
 * Arquivo de legenda é texto pequeno: ler no navegador e mandar já limpo é bem
 * mais simples do que subir para o Storage e criar uma segunda rota de análise.
 * A complexidade do vídeo existe porque vídeo é grande — texto não é.
 */

export const MAX_TRANSCRIPT_BYTES = 512 * 1024
export const MAX_TRANSCRIPT_CHARS = 40_000

export const ACCEPTED_TRANSCRIPT_EXTENSIONS = ['.txt', '.srt', '.vtt']
export const TRANSCRIPT_ACCEPT_ATTR = [
  ...ACCEPTED_TRANSCRIPT_EXTENSIONS,
  'text/plain',
  'text/vtt',
].join(',')

/** Linha "00:00:01,000 --> 00:00:04,000", com vírgula (SRT) ou ponto (VTT). */
const LINHA_DE_TEMPO = /^\s*(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}\s*-->\s*/
/** Numeração sequencial dos blocos de SRT. */
const SO_NUMERO = /^\s*\d+\s*$/
/** Cabeçalho e blocos de metadados do WebVTT. */
const CABECALHO_VTT = /^\s*(WEBVTT|NOTE|STYLE|REGION)\b/i
/** Tags inline de legenda: <v Fulano>, <c.classe>, <00:00:01.000>. */
const TAG_INLINE = /<[^>]*>/g

/**
 * Transforma legenda em texto corrido.
 *
 * Timestamps e numeração não ajudam o modelo a entender o conteúdo e ainda
 * gastam tokens — e, pior, um bloco cheio de "00:00:12,400 --> 00:00:15,120"
 * empurra o modelo a raciocinar sobre tempo em vez de sobre a mensagem.
 *
 * Falas repetidas em sequência (comuns em legenda automática, que reexibe a
 * linha anterior) são colapsadas.
 */
export function normalizeTranscript(raw: string): string {
  const linhas = raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((linha) => linha.replace(TAG_INLINE, '').trim())

  const uteis: string[] = []
  for (const linha of linhas) {
    if (!linha) continue
    if (LINHA_DE_TEMPO.test(linha)) continue
    if (SO_NUMERO.test(linha)) continue
    if (CABECALHO_VTT.test(linha)) continue
    if (uteis[uteis.length - 1] === linha) continue
    uteis.push(linha)
  }

  return uteis.join(' ').replace(/\s{2,}/g, ' ').trim()
}

export function validateTranscriptFile(file: File): string | null {
  if (file.size === 0) return 'O arquivo está vazio.'
  if (file.size > MAX_TRANSCRIPT_BYTES) {
    return 'Arquivo de transcrição muito grande. O limite é 512 KB.'
  }
  const nome = file.name.toLowerCase()
  if (!ACCEPTED_TRANSCRIPT_EXTENSIONS.some((ext) => nome.endsWith(ext))) {
    return 'Formato não suportado. Envie .txt, .srt ou .vtt.'
  }
  return null
}

/** Lê e normaliza. Devolve erro em vez de lançar, para a UI só exibir. */
export async function readTranscriptFile(
  file: File,
): Promise<{ text: string } | { error: string }> {
  const problema = validateTranscriptFile(file)
  if (problema) return { error: problema }

  let bruto: string
  try {
    bruto = await file.text()
  } catch {
    return { error: 'Não foi possível ler o arquivo.' }
  }

  const texto = normalizeTranscript(bruto)
  if (!texto) return { error: 'O arquivo não tem texto aproveitável.' }

  // Trunca em vez de recusar: uma transcrição longa demais ainda é útil pelo
  // começo, e recusar por inteiro faria o usuário editar o arquivo à mão.
  return { text: texto.slice(0, MAX_TRANSCRIPT_CHARS) }
}
