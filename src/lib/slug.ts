/**
 * Slug estável a partir do nome, com sufixo aleatório para garantir unicidade
 * dentro do workspace sem uma ida extra ao banco.
 */
export function slugify(name: string) {
  const base = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base || 'item'}-${suffix}`
}
