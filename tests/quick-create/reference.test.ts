import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_REFERENCE_VIDEO_BYTES,
  formatBytes,
  validateReferenceVideo,
} from '../../src/features/quick-create/reference-rules.ts'
import {
  normalizeTranscript,
  validateTranscriptFile,
} from '../../src/features/quick-create/transcript-files.ts'

/**
 * Dublê de File: o node:test não roda num navegador, e o que está sendo testado
 * são as REGRAS (nome, tipo, tamanho), não a API de arquivo do browser.
 */
function arquivo(name: string, type: string, size: number): File {
  return { name, type, size } as File
}

// ------------------------------------------------------- vídeo de referência
test('aceita os formatos anunciados na interface', () => {
  assert.equal(validateReferenceVideo(arquivo('a.mp4', 'video/mp4', 1024)), null)
  assert.equal(validateReferenceVideo(arquivo('a.mov', 'video/quicktime', 1024)), null)
  assert.equal(validateReferenceVideo(arquivo('a.webm', 'video/webm', 1024)), null)
})

test('aceita .mov com type vazio — alguns navegadores não informam o MIME', () => {
  assert.equal(validateReferenceVideo(arquivo('video.mov', '', 2048)), null)
})

test('recusa formato não suportado', () => {
  const erro = validateReferenceVideo(arquivo('a.avi', 'video/x-msvideo', 1024))
  assert.match(erro ?? '', /Formato não suportado/)
})

test('recusa arquivo vazio antes de qualquer outra checagem', () => {
  const erro = validateReferenceVideo(arquivo('a.mp4', 'video/mp4', 0))
  assert.match(erro ?? '', /vazio/)
})

test('recusa acima do teto e diz o tamanho', () => {
  const erro = validateReferenceVideo(
    arquivo('grande.mp4', 'video/mp4', MAX_REFERENCE_VIDEO_BYTES + 1),
  )
  assert.match(erro ?? '', /muito grande/)
  assert.match(erro ?? '', /50,0 MB/)
})

test('exatamente no teto passa — o limite é inclusivo', () => {
  assert.equal(
    validateReferenceVideo(arquivo('limite.mp4', 'video/mp4', MAX_REFERENCE_VIDEO_BYTES)),
    null,
  )
})

test('extensão maiúscula é aceita', () => {
  assert.equal(validateReferenceVideo(arquivo('VIDEO.MP4', '', 1024)), null)
})

test('formatBytes usa vírgula decimal, como no resto do app', () => {
  assert.equal(formatBytes(500), '500 B')
  assert.equal(formatBytes(2048), '2 KB')
  assert.equal(formatBytes(34_000_000), '32,4 MB')
})

// ------------------------------------------------------------- transcrição
test('SRT vira texto corrido, sem tempo nem numeração', () => {
  const srt = [
    '1',
    '00:00:01,000 --> 00:00:04,000',
    'Existe uma diferença entre adesivo comum',
    'e adesivo resinado.',
    '',
    '2',
    '00:00:04,500 --> 00:00:07,000',
    'E ela aparece no primeiro inverno.',
  ].join('\n')

  assert.equal(
    normalizeTranscript(srt),
    'Existe uma diferença entre adesivo comum e adesivo resinado. E ela aparece no primeiro inverno.',
  )
})

test('VTT perde cabeçalho, NOTE e tags inline', () => {
  const vtt = [
    'WEBVTT',
    '',
    'NOTE gerado automaticamente',
    '',
    '00:00.000 --> 00:02.000',
    '<v Locutor>Три coisas que você precisa saber</v>',
  ].join('\n')

  assert.equal(normalizeTranscript(vtt), 'Три coisas que você precisa saber')
})

test('linha repetida em sequência é colapsada (legenda automática)', () => {
  const bruto = ['O adesivo barato', 'O adesivo barato', 'sai caro depois.'].join('\n')
  assert.equal(normalizeTranscript(bruto), 'O adesivo barato sai caro depois.')
})

test('repetição NÃO adjacente é preservada — pode ser refrão intencional', () => {
  const bruto = ['Preste atenção', 'no acabamento', 'Preste atenção'].join('\n')
  assert.equal(normalizeTranscript(bruto), 'Preste atenção no acabamento Preste atenção')
})

test('texto simples sem marcação atravessa intacto', () => {
  assert.equal(normalizeTranscript('Uma frase só.'), 'Uma frase só.')
})

test('arquivo de transcrição: extensão e tamanho', () => {
  assert.equal(validateTranscriptFile(arquivo('a.srt', 'text/plain', 100)), null)
  assert.match(validateTranscriptFile(arquivo('a.pdf', 'application/pdf', 100)) ?? '', /Formato/)
  assert.match(validateTranscriptFile(arquivo('a.txt', 'text/plain', 0)) ?? '', /vazio/)
  assert.match(
    validateTranscriptFile(arquivo('a.txt', 'text/plain', 600 * 1024)) ?? '',
    /512 KB/,
  )
})
