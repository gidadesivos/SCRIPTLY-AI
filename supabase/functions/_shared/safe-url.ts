/**
 * Guarda contra SSRF na busca de preview de link.
 *
 * A Edge Function busca uma URL que o usuário digitou. Sem filtro, ela vira um
 * proxy para a rede interna da infraestrutura: bastaria apontar para
 * http://169.254.169.254/ (metadados de nuvem, onde vivem credenciais) ou para
 * um serviço interno em 10.x e ler a resposta pelo card do canvas.
 *
 * Por isso só http/https público passa, e o destino é reavaliado a cada
 * redirecionamento — validar só a URL inicial deixaria um redirect 302 para
 * um IP interno atravessar o filtro.
 */

const BLOQUEADOS: RegExp[] = [
  /^localhost$/i,
  /\.localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  // 172.16.0.0 – 172.31.255.255
  /^172\.(1[6-9]|2\d|3[01])\./,
  // link-local, onde ficam os metadados de nuvem
  /^169\.254\./,
  // IPv6 loopback e link-local/ULA
  /^\[?::1\]?$/,
  /^\[?fe80:/i,
  /^\[?f[cd][0-9a-f]{2}:/i,
  // sufixos internos comuns
  /\.internal$/i,
  /\.local$/i,
]

export class UnsafeUrlError extends Error {}

/** Devolve a URL validada ou lança. Aceita só http e https públicos. */
export function assertPublicUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new UnsafeUrlError('Endereço inválido.')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError('Só endereços http e https.')
  }

  const host = url.hostname
  if (BLOQUEADOS.some((padrao) => padrao.test(host))) {
    throw new UnsafeUrlError('Endereço de rede interna não é permitido.')
  }

  return url
}
