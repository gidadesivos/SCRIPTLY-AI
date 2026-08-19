import { supabase } from '@/lib/supabase'
import { slugify } from '@/lib/slug'
import type { Workspace } from './types'

export async function listWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function createWorkspace(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_workspace_with_owner', {
    p_name: name,
    p_slug: slugify(name),
  })

  if (error) throw error
  return data
}
