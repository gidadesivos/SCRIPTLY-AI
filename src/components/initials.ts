/**
 * Iniciais para o gatilho compacto dos seletores no rail lateral.
 *
 * O rail tem 72px: não cabe nome. Duas letras identificam o workspace ou a
 * marca ativa de relance, e o nome completo vai no title/aria-label.
 */
export function initialsOf(name: string | null | undefined): string {
  const limpo = (name ?? '').trim()
  if (!limpo) return '—'
  const palavras = limpo.split(/\s+/).filter(Boolean)
  if (palavras.length === 1) return palavras[0].slice(0, 2).toUpperCase()
  return (palavras[0][0] + palavras[1][0]).toUpperCase()
}
