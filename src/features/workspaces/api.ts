import { supabase } from '@/lib/supabase'
import type { Workspace } from './types'

function slugify(name: string) {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base || 'workspace'}-${suffix}`
}

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
