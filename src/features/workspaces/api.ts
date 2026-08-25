import { supabase } from '@/lib/supabase'
import { slugify } from '@/lib/slug'
import type { Workspace } from './types'

interface MembershipRow {
  role: Workspace['role']
  workspaces: Omit<Workspace, 'role'>
}

/**
 * Workspaces do usuário, cada um com o PAPEL DELE naquele workspace.
 *
 * A consulta parte de workspace_members, e não de workspaces, porque o papel é
 * o que decide o que a interface pode oferecer. Sem ele, o app mostrava
 * "Excluir" para um viewer: a RLS barrava, mas — e este é o ponto — um delete
 * barrado por RLS volta como SUCESSO com zero linhas, então a tela dizia que
 * apagou e nada tinha sido apagado.
 *
 * Filtrar por user_id é necessário: a policy de workspace_members deixa um
 * membro ver TODOS os membros dos seus workspaces, então sem o filtro viriam
 * também as linhas dos colegas.
 */
export async function listWorkspaces(): Promise<Workspace[]> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return []

  const { data, error } = await supabase
    .from('workspace_members')
    .select('role, workspaces!inner(*)')
    .eq('user_id', userId)
    .order('created_at', { referencedTable: 'workspaces', ascending: true })
    .returns<MembershipRow[]>()

  if (error) throw error
  return data.map((row) => ({ ...row.workspaces, role: row.role }))
}

export async function createWorkspace(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_workspace_with_owner', {
    p_name: name,
    p_slug: slugify(name),
  })

  if (error) throw error
  return data
}
