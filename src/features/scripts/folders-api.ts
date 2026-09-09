import { supabase } from '@/lib/supabase'
import { NotAllowedError } from '@/features/scripts/api'

export interface ScriptFolder {
  id: string
  workspace_id: string
  parent_id: string | null
  name: string
  position: number
  created_at: string
}

/** Pasta com os filhos já aninhados, pronta para desenhar a árvore. */
export interface FolderNode extends ScriptFolder {
  children: FolderNode[]
  /** Quantos roteiros estão DIRETAMENTE nesta pasta. */
  count: number
}

export async function listFolders(workspaceId: string): Promise<ScriptFolder[]> {
  const { data, error } = await supabase
    .from('script_folders')
    .select('id, workspace_id, parent_id, name, position, created_at')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true })
    .order('name', { ascending: true })
    .returns<ScriptFolder[]>()

  if (error) throw error
  return data
}

/** Quantos roteiros por pasta. Uma consulta só, agregada no cliente. */
export async function countByFolder(workspaceId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('scripts')
    .select('folder_id')
    .eq('workspace_id', workspaceId)
    .neq('status', 'arquivado')
    .returns<Array<{ folder_id: string | null }>>()

  if (error) throw error

  const contagem: Record<string, number> = {}
  for (const linha of data) {
    const chave = linha.folder_id ?? 'raiz'
    contagem[chave] = (contagem[chave] ?? 0) + 1
  }
  return contagem
}

/**
 * Monta a árvore a partir da lista plana.
 *
 * Pasta órfã — pai que sumiu por qualquer motivo — sobe para a raiz em vez de
 * desaparecer. Some da tela seria pior: o usuário veria os roteiros contados
 * num lugar que não existe em lugar nenhum.
 */
export function buildTree(
  folders: ScriptFolder[],
  counts: Record<string, number>,
): FolderNode[] {
  const porId = new Map<string, FolderNode>(
    folders.map((f) => [f.id, { ...f, children: [], count: counts[f.id] ?? 0 }]),
  )

  const raiz: FolderNode[] = []
  for (const node of porId.values()) {
    const pai = node.parent_id ? porId.get(node.parent_id) : undefined
    if (pai) pai.children.push(node)
    else raiz.push(node)
  }

  const ordenar = (lista: FolderNode[]) => {
    lista.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'pt-BR'))
    lista.forEach((n) => ordenar(n.children))
  }
  ordenar(raiz)

  return raiz
}

/** Ids da pasta e de tudo que está dentro dela, em qualquer profundidade. */
export function descendantIds(node: FolderNode): string[] {
  return [node.id, ...node.children.flatMap(descendantIds)]
}

export async function createFolder(input: {
  workspaceId: string
  parentId: string | null
  name: string
}): Promise<ScriptFolder> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Sessão expirada.')

  const { data, error } = await supabase
    .from('script_folders')
    .insert({
      workspace_id: input.workspaceId,
      parent_id: input.parentId,
      name: input.name.trim(),
      created_by: user.user.id,
    })
    .select('id, workspace_id, parent_id, name, position, created_at')
    .single<ScriptFolder>()

  if (error) throw error
  return data
}

/*
 * Toda mutação confere as linhas afetadas.
 *
 * Quando a RLS barra, o Postgres não devolve erro: devolve sucesso com ZERO
 * linhas. Sem esta checagem a tela diria "renomeado" e nada teria mudado.
 */
export async function renameFolder(id: string, name: string): Promise<void> {
  const { data, error } = await supabase
    .from('script_folders')
    .update({ name: name.trim() })
    .eq('id', id)
    .select('id')

  if (error) throw error
  if (!data?.length) {
    throw new NotAllowedError('Você não tem permissão para renomear pastas neste workspace.')
  }
}

export async function moveFolder(id: string, parentId: string | null): Promise<void> {
  const { data, error } = await supabase
    .from('script_folders')
    .update({ parent_id: parentId })
    .eq('id', id)
    .select('id')

  if (error) throw error
  if (!data?.length) {
    throw new NotAllowedError('Você não tem permissão para mover pastas neste workspace.')
  }
}

/**
 * Apaga a pasta. As subpastas vão junto (cascade), mas NENHUM roteiro é
 * perdido: o folder_id deles é anulado e eles voltam para a raiz.
 */
export async function deleteFolder(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('script_folders')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) throw error
  if (!data?.length) {
    throw new NotAllowedError('Só owner e admin podem excluir pastas.')
  }
}

export async function moveScriptToFolder(scriptId: string, folderId: string | null): Promise<void> {
  const { data, error } = await supabase
    .from('scripts')
    .update({ folder_id: folderId })
    .eq('id', scriptId)
    .select('id')

  if (error) throw error
  if (!data?.length) {
    throw new NotAllowedError('Você não tem permissão para mover roteiros neste workspace.')
  }
}
