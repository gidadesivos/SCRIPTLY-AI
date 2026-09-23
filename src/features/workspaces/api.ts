import { supabase } from '@/lib/supabase'
import { slugify } from '@/lib/slug'
import { NotAllowedError } from '@/features/scripts/api'
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

/**
 * Renomeia. O slug NÃO acompanha o nome de propósito.
 *
 * Slug é identificador estável; recalcular a cada renome esbarraria na unique
 * quando dois workspaces convergissem para o mesmo texto, e quebraria qualquer
 * referência externa por slug. Nome é rótulo, slug é identidade.
 */
export async function renameWorkspace(id: string, name: string): Promise<void> {
  const limpo = name.trim()
  if (!limpo) throw new Error('O nome não pode ficar vazio.')

  const { data, error } = await supabase
    .from('workspaces')
    .update({ name: limpo })
    .eq('id', id)
    .select('id')

  if (error) throw error
  // Sob RLS, um update barrado volta como SUCESSO com zero linhas. Sem esta
  // conferência a tela diria "renomeado" e nada teria mudado.
  if (!data?.length) {
    throw new NotAllowedError('Só quem é owner ou admin pode renomear este workspace.')
  }
}

/** Quanto se perde ao apagar. É isto que o diálogo mostra antes de confirmar. */
export interface WorkspaceContents {
  brands: number
  products: number
  scripts: number
  plans: number
}

export async function countWorkspaceContents(id: string): Promise<WorkspaceContents> {
  const contar = async (tabela: 'brands' | 'products' | 'scripts' | 'campaign_plans') => {
    const { count } = await supabase
      .from(tabela)
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', id)
    return count ?? 0
  }

  const [brands, products, scripts, plans] = await Promise.all([
    contar('brands'),
    contar('products'),
    contar('scripts'),
    contar('campaign_plans'),
  ])

  return { brands, products, scripts, plans }
}

/**
 * Apaga o workspace e, por cascata do banco, TUDO que está dentro dele:
 * marcas, produtos, roteiros, cenas, versões, variações, planos e ligações.
 * Treze tabelas. Não há desfazer.
 */
export async function deleteWorkspace(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) throw error
  if (!data?.length) {
    throw new NotAllowedError('Só o owner pode apagar este workspace.')
  }
}
