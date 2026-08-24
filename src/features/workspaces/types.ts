import type { MemberRole, WorkspacePlan } from '@/types/database'

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: WorkspacePlan
  created_by: string
  created_at: string
  updated_at: string
  /** Papel do usuário ATUAL neste workspace. Ver listWorkspaces. */
  role: MemberRole
}
