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

export type Platform =
  | 'instagram_reels'
  | 'tiktok'
  | 'youtube_shorts'
  | 'meta_ads'
  | 'instagram_ads'
  | 'facebook_ads'
  | 'youtube_ads'
  | 'generic'

export type ScriptStatus =
  | 'ideia'
  | 'roteiro'
  | 'aprovado'
  | 'gravacao'
  | 'edicao'
  | 'pronto'
  | 'publicado'
  | 'arquivado'

export type FunnelStage = 'topo' | 'meio' | 'fundo' | 'remarketing'

type ScriptColumns = {
  id: string
  workspace_id: string
  brand_id: string
  product_id: string | null
  created_by: string
  title: string
  description: string | null
  platform: Platform
  objective: string | null
  funnel_stage: FunnelStage | null
  duration_seconds: number
  language: string
  tone: string | null
  target_audience: string | null
  pain: string | null
  desire: string | null
  promise: string | null
  angle_type: string | null
  angle_description: string | null
  hook_text: string | null
  hook_category: string | null
  hook_score: number | null
  framework: string | null
  cta: string | null
  strategy_summary: string | null
  status: ScriptStatus
  scheduled_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

type SceneColumns = {
  id: string
  workspace_id: string
  script_id: string
  order_index: number
  start_second: number | null
  end_second: number | null
  purpose: string | null
  shot: string | null
  visual: string | null
  action: string | null
  voiceover: string | null
  on_screen_text: string | null
  broll: string | null
  editing_direction: string | null
  transition: string | null
  sound_suggestion: string | null
  created_at: string
  updated_at: string
}

type AiGenerationColumns = {
  id: string
  workspace_id: string
  user_id: string
  generation_type: string
  prompt_version: string
  related_entity_type: string | null
  related_entity_id: string | null
  model: string
  status: 'success' | 'invalid_output' | 'error' | 'rate_limited'
  latency_ms: number | null
  input_tokens: number | null
  output_tokens: number | null
  error_message: string | null
  created_at: string
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
      scripts: {
        Row: ScriptColumns
        Insert: Insertable<ScriptColumns, 'workspace_id' | 'brand_id' | 'title' | 'created_by'>
        Update: Partial<ScriptColumns>
        Relationships: [
          {
            foreignKeyName: 'scripts_brand_id_fkey'
            columns: ['brand_id']
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
        ]
      }
      script_scenes: {
        Row: SceneColumns
        Insert: Insertable<SceneColumns, 'workspace_id' | 'script_id' | 'order_index'>
        Update: Partial<SceneColumns>
        Relationships: [
          {
            foreignKeyName: 'script_scenes_script_id_fkey'
            columns: ['script_id']
            referencedRelation: 'scripts'
            referencedColumns: ['id']
          },
        ]
      }
      ai_generations: {
        Row: AiGenerationColumns
        Insert: Insertable<
          AiGenerationColumns,
          'workspace_id' | 'user_id' | 'generation_type' | 'prompt_version' | 'model' | 'status'
        >
        Update: Partial<AiGenerationColumns>
        Relationships: []
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
