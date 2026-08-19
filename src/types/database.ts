/**
 * Tipos do banco escritos à mão a partir de supabase/migrations/.
 * Regenerar a partir do schema real com:
 *   supabase gen types typescript --project-id <id> > src/types/database.ts
 */
export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer'
export type ResourceStatus = 'active' | 'archived'

export interface FaqEntry {
  question: string
  answer: string
}

export interface LinkEntry {
  label: string
  url: string
}

type BrandColumns = {
  id: string
  workspace_id: string
  name: string
  slug: string
  logo_url: string | null
  description: string | null
  industry: string | null
  website: string | null
  instagram: string | null
  country: string | null
  language: string
  tone: string | null
  personality: string | null
  value_proposition: string | null
  positioning: string | null
  target_audiences: string[]
  pains: string[]
  desires: string[]
  objections: string[]
  differentiators: string[]
  benefits: string[]
  proofs: string[]
  preferred_words: string[]
  forbidden_words: string[]
  preferred_ctas: string[]
  competitors: string[]
  ai_instructions: string | null
  status: ResourceStatus
  created_by: string
  created_at: string
  updated_at: string
}

type ProductColumns = {
  id: string
  workspace_id: string
  brand_id: string
  name: string
  slug: string
  category: string | null
  description: string | null
  benefits: string[]
  differentiators: string[]
  problems_solved: string[]
  desires: string[]
  objections: string[]
  target_audience: string | null
  faq: FaqEntry[]
  links: LinkEntry[]
  offer: string | null
  price_range: string | null
  guarantee: string | null
  default_cta: string | null
  notes: string | null
  status: ResourceStatus
  created_by: string
  created_at: string
  updated_at: string
}

type Insertable<T, Required extends keyof T> = Partial<Omit<T, Required>> & Pick<T, Required>

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
      brands: {
        Row: BrandColumns
        Insert: Insertable<BrandColumns, 'workspace_id' | 'name' | 'slug' | 'created_by'>
        Update: Partial<BrandColumns>
        Relationships: [
          {
            foreignKeyName: 'brands_workspace_id_fkey'
            columns: ['workspace_id']
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      products: {
        Row: ProductColumns
        Insert: Insertable<
          ProductColumns,
          'workspace_id' | 'brand_id' | 'name' | 'slug' | 'created_by'
        >
        Update: Partial<ProductColumns>
        Relationships: [
          {
            foreignKeyName: 'products_brand_id_fkey'
            columns: ['brand_id']
            referencedRelation: 'brands'
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
      resource_status: ResourceStatus
    }
    CompositeTypes: Record<string, never>
  }
}
