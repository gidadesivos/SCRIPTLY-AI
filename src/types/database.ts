/**
 * Tipos do banco escritos à mão a partir de supabase/migrations/0001_init.sql.
 * Assim que houver um projeto Supabase real conectado, regenerar com:
 *   supabase gen types typescript --project-id <id> > src/types/database.ts
 */
export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          theme: 'light' | 'dark' | 'system'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          theme?: 'light' | 'dark' | 'system'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          theme?: 'light' | 'dark' | 'system'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: MemberRole
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: MemberRole
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: MemberRole
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey'
            columns: ['workspace_id']
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      is_workspace_member: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      has_workspace_role: {
        Args: { p_workspace_id: string; p_roles: string[] }
        Returns: boolean
      }
      create_workspace_with_owner: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
    }
    Enums: {
      member_role: MemberRole
      theme_preference: 'light' | 'dark' | 'system'
    }
    CompositeTypes: Record<string, never>
  }
}
