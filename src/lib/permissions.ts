import type { MemberRole } from '@/types/database'

/**
 * Espelho das policies de RLS, para a interface não oferecer o que o banco vai
 * recusar.
 *
 * Isto NÃO é segurança — quem decide é a RLS. É honestidade de interface: um
 * delete barrado por RLS volta como sucesso com zero linhas, então oferecer o
 * botão a quem não pode produz uma tela que mente. A verificação de verdade
 * continua no banco, e a API confere quantas linhas voltaram.
 *
 * Ao mudar uma policy, mude aqui junto. O comentário de cada função diz qual
 * policy ela espelha.
 */

/** Espelha scripts_delete (migration 0005): apenas owner e admin. */
export function canDeleteScripts(role: MemberRole | undefined): boolean {
  return role === 'owner' || role === 'admin'
}

/** Espelha scripts_update (migration 0005): editor também mexe em conteúdo. */
export function canEditScripts(role: MemberRole | undefined): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor'
}

/** Espelha workspaces_update (migration 0001): owner e admin renomeiam. */
export function canRenameWorkspace(role: MemberRole | undefined): boolean {
  return role === 'owner' || role === 'admin'
}

/**
 * Espelha workspaces_delete (migration 0001): SOMENTE owner.
 *
 * É a permissão mais restrita do app, e com razão: apagar um workspace
 * cascateia para 13 tabelas — marcas, produtos, roteiros, cenas, versões,
 * planos de campanha. Um admin não deve conseguir evaporar o trabalho de todos.
 */
export function canDeleteWorkspace(role: MemberRole | undefined): boolean {
  return role === 'owner'
}
