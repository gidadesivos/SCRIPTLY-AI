export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_generations: {
        Row: {
          created_at: string
          error_message: string | null
          generation_type: string
          id: string
          input_tokens: number | null
          latency_ms: number | null
          model: string
          output_tokens: number | null
          prompt_version: string
          provider: string
          related_entity_id: string | null
          related_entity_type: string | null
          status: Database["public"]["Enums"]["ai_generation_status"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          generation_type: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model: string
          output_tokens?: number | null
          prompt_version: string
          provider?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          status: Database["public"]["Enums"]["ai_generation_status"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          generation_type?: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string
          output_tokens?: number | null
          prompt_version?: string
          provider?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: Database["public"]["Enums"]["ai_generation_status"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          ai_instructions: string | null
          benefits: string[]
          competitors: string[]
          country: string | null
          created_at: string
          created_by: string
          description: string | null
          desires: string[]
          differentiators: string[]
          forbidden_words: string[]
          id: string
          industry: string | null
          instagram: string | null
          language: string
          logo_url: string | null
          name: string
          objections: string[]
          pains: string[]
          personality: string | null
          positioning: string | null
          preferred_ctas: string[]
          preferred_words: string[]
          proofs: string[]
          slug: string
          status: Database["public"]["Enums"]["resource_status"]
          target_audiences: string[]
          tone: string | null
          updated_at: string
          value_proposition: string | null
          website: string | null
          workspace_id: string
        }
        Insert: {
          ai_instructions?: string | null
          benefits?: string[]
          competitors?: string[]
          country?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          desires?: string[]
          differentiators?: string[]
          forbidden_words?: string[]
          id?: string
          industry?: string | null
          instagram?: string | null
          language?: string
          logo_url?: string | null
          name: string
          objections?: string[]
          pains?: string[]
          personality?: string | null
          positioning?: string | null
          preferred_ctas?: string[]
          preferred_words?: string[]
          proofs?: string[]
          slug: string
          status?: Database["public"]["Enums"]["resource_status"]
          target_audiences?: string[]
          tone?: string | null
          updated_at?: string
          value_proposition?: string | null
          website?: string | null
          workspace_id: string
        }
        Update: {
          ai_instructions?: string | null
          benefits?: string[]
          competitors?: string[]
          country?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          desires?: string[]
          differentiators?: string[]
          forbidden_words?: string[]
          id?: string
          industry?: string | null
          instagram?: string | null
          language?: string
          logo_url?: string | null
          name?: string
          objections?: string[]
          pains?: string[]
          personality?: string | null
          positioning?: string | null
          preferred_ctas?: string[]
          preferred_words?: string[]
          proofs?: string[]
          slug?: string
          status?: Database["public"]["Enums"]["resource_status"]
          target_audiences?: string[]
          tone?: string | null
          updated_at?: string
          value_proposition?: string | null
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_links: {
        Row: {
          created_at: string
          id: string
          label: string
          plan_id: string
          source_handle: string | null
          source_id: string
          style: Json | null
          target_handle: string | null
          target_id: string
          type: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          plan_id: string
          source_handle?: string | null
          source_id: string
          style?: Json | null
          target_handle?: string | null
          target_id: string
          type?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          plan_id?: string
          source_handle?: string | null
          source_id?: string
          style?: Json | null
          target_handle?: string | null
          target_id?: string
          type?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_links_plan_id_workspace_id_fkey"
            columns: ["plan_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "campaign_plans"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "campaign_links_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "campaign_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_links_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "campaign_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_nodes: {
        Row: {
          created_at: string
          data: Json
          id: string
          label: string
          media_kind: string
          media_url: string
          order_index: number
          parent_id: string | null
          plan_id: string
          position_x: number
          position_y: number
          script_id: string | null
          type: Database["public"]["Enums"]["campaign_node_type"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          label?: string
          media_kind?: string
          media_url?: string
          order_index?: number
          parent_id?: string | null
          plan_id: string
          position_x?: number
          position_y?: number
          script_id?: string | null
          type: Database["public"]["Enums"]["campaign_node_type"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          label?: string
          media_kind?: string
          media_url?: string
          order_index?: number
          parent_id?: string | null
          plan_id?: string
          position_x?: number
          position_y?: number
          script_id?: string | null
          type?: Database["public"]["Enums"]["campaign_node_type"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "campaign_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_nodes_plan_id_workspace_id_fkey"
            columns: ["plan_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "campaign_plans"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "campaign_nodes_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_nodes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_plans: {
        Row: {
          brand_id: string
          created_at: string
          created_by: string
          description: string
          id: string
          name: string
          objective: string
          status: Database["public"]["Enums"]["resource_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          created_by: string
          description?: string
          id?: string
          name: string
          objective?: string
          status?: Database["public"]["Enums"]["resource_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          name?: string
          objective?: string
          status?: Database["public"]["Enums"]["resource_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_plans_brand_id_workspace_id_fkey"
            columns: ["brand_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "campaign_plans_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_limits: {
        Row: {
          description: string
          generations_per_minute: number | null
          generations_per_month: number | null
          label: string
          plan: Database["public"]["Enums"]["workspace_plan"]
          sort_order: number
        }
        Insert: {
          description: string
          generations_per_minute?: number | null
          generations_per_month?: number | null
          label: string
          plan: Database["public"]["Enums"]["workspace_plan"]
          sort_order: number
        }
        Update: {
          description?: string
          generations_per_minute?: number | null
          generations_per_month?: number | null
          label?: string
          plan?: Database["public"]["Enums"]["workspace_plan"]
          sort_order?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          benefits: string[]
          brand_id: string
          category: string | null
          created_at: string
          created_by: string
          default_cta: string | null
          description: string | null
          desires: string[]
          differentiators: string[]
          faq: Json
          guarantee: string | null
          id: string
          links: Json
          name: string
          notes: string | null
          objections: string[]
          offer: string | null
          price_range: string | null
          problems_solved: string[]
          slug: string
          status: Database["public"]["Enums"]["resource_status"]
          target_audience: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          benefits?: string[]
          brand_id: string
          category?: string | null
          created_at?: string
          created_by: string
          default_cta?: string | null
          description?: string | null
          desires?: string[]
          differentiators?: string[]
          faq?: Json
          guarantee?: string | null
          id?: string
          links?: Json
          name: string
          notes?: string | null
          objections?: string[]
          offer?: string | null
          price_range?: string | null
          problems_solved?: string[]
          slug: string
          status?: Database["public"]["Enums"]["resource_status"]
          target_audience?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          benefits?: string[]
          brand_id?: string
          category?: string | null
          created_at?: string
          created_by?: string
          default_cta?: string | null
          description?: string | null
          desires?: string[]
          differentiators?: string[]
          faq?: Json
          guarantee?: string | null
          id?: string
          links?: Json
          name?: string
          notes?: string | null
          objections?: string[]
          offer?: string | null
          price_range?: string | null
          problems_solved?: string[]
          slug?: string
          status?: Database["public"]["Enums"]["resource_status"]
          target_audience?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_workspace_id_fkey"
            columns: ["brand_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          theme: Database["public"]["Enums"]["theme_preference"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          theme?: Database["public"]["Enums"]["theme_preference"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          theme?: Database["public"]["Enums"]["theme_preference"]
          updated_at?: string
        }
        Relationships: []
      }
      script_scenes: {
        Row: {
          action: string | null
          broll: string | null
          created_at: string
          editing_direction: string | null
          end_second: number | null
          id: string
          on_screen_text: string | null
          order_index: number
          purpose: string | null
          script_id: string
          shot: string | null
          sound_suggestion: string | null
          start_second: number | null
          transition: string | null
          updated_at: string
          visual: string | null
          voiceover: string | null
          workspace_id: string
        }
        Insert: {
          action?: string | null
          broll?: string | null
          created_at?: string
          editing_direction?: string | null
          end_second?: number | null
          id?: string
          on_screen_text?: string | null
          order_index: number
          purpose?: string | null
          script_id: string
          shot?: string | null
          sound_suggestion?: string | null
          start_second?: number | null
          transition?: string | null
          updated_at?: string
          visual?: string | null
          voiceover?: string | null
          workspace_id: string
        }
        Update: {
          action?: string | null
          broll?: string | null
          created_at?: string
          editing_direction?: string | null
          end_second?: number | null
          id?: string
          on_screen_text?: string | null
          order_index?: number
          purpose?: string | null
          script_id?: string
          shot?: string | null
          sound_suggestion?: string | null
          start_second?: number | null
          transition?: string | null
          updated_at?: string
          visual?: string | null
          voiceover?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_scenes_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_scenes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      script_variations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          label: string
          parent_script_id: string
          variation_script_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          label: string
          parent_script_id: string
          variation_script_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          label?: string
          parent_script_id?: string
          variation_script_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_variations_parent_script_id_fkey"
            columns: ["parent_script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_variations_variation_script_id_fkey"
            columns: ["variation_script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_variations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      script_versions: {
        Row: {
          change_description: string | null
          created_at: string
          created_by: string
          id: string
          script_id: string
          snapshot: Json
          version_number: number
          workspace_id: string
        }
        Insert: {
          change_description?: string | null
          created_at?: string
          created_by: string
          id?: string
          script_id: string
          snapshot: Json
          version_number: number
          workspace_id: string
        }
        Update: {
          change_description?: string | null
          created_at?: string
          created_by?: string
          id?: string
          script_id?: string
          snapshot?: Json
          version_number?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_versions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          angle_description: string | null
          angle_type: string | null
          brand_id: string
          created_at: string
          created_by: string
          cta: string | null
          description: string | null
          desire: string | null
          duration_seconds: number
          framework: string | null
          funnel_stage: Database["public"]["Enums"]["funnel_stage"] | null
          hook_category: string | null
          hook_score: number | null
          hook_text: string | null
          id: string
          language: string
          objective: string | null
          pain: string | null
          platform: Database["public"]["Enums"]["platform"]
          product_id: string | null
          promise: string | null
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["script_status"]
          strategy_summary: string | null
          target_audience: string | null
          title: string
          tone: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          angle_description?: string | null
          angle_type?: string | null
          brand_id: string
          created_at?: string
          created_by: string
          cta?: string | null
          description?: string | null
          desire?: string | null
          duration_seconds?: number
          framework?: string | null
          funnel_stage?: Database["public"]["Enums"]["funnel_stage"] | null
          hook_category?: string | null
          hook_score?: number | null
          hook_text?: string | null
          id?: string
          language?: string
          objective?: string | null
          pain?: string | null
          platform?: Database["public"]["Enums"]["platform"]
          product_id?: string | null
          promise?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["script_status"]
          strategy_summary?: string | null
          target_audience?: string | null
          title: string
          tone?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          angle_description?: string | null
          angle_type?: string | null
          brand_id?: string
          created_at?: string
          created_by?: string
          cta?: string | null
          description?: string | null
          desire?: string | null
          duration_seconds?: number
          framework?: string | null
          funnel_stage?: Database["public"]["Enums"]["funnel_stage"] | null
          hook_category?: string | null
          hook_score?: number | null
          hook_text?: string | null
          id?: string
          language?: string
          objective?: string | null
          pain?: string | null
          platform?: Database["public"]["Enums"]["platform"]
          product_id?: string | null
          promise?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["script_status"]
          strategy_summary?: string | null
          target_audience?: string | null
          title?: string
          tone?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scripts_brand_id_workspace_id_fkey"
            columns: ["brand_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "scripts_product_id_workspace_id_fkey"
            columns: ["product_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "scripts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_ai_models: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          label: string
          model_id: string
          position: number
          provider: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
          model_id: string
          position?: number
          provider?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
          model_id?: string
          position?: number
          provider?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_ai_models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          plan: Database["public"]["Enums"]["workspace_plan"]
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          plan?: Database["public"]["Enums"]["workspace_plan"]
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          plan?: Database["public"]["Enums"]["workspace_plan"]
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_plan_fkey"
            columns: ["plan"]
            isOneToOne: false
            referencedRelation: "plan_limits"
            referencedColumns: ["plan"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_script_version: {
        Args: {
          p_change_description?: string
          p_script_id: string
          p_snapshot: Json
        }
        Returns: number
      }
      create_workspace_with_owner: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      daily_ai_usage: {
        Args: { p_days?: number; p_workspace_id: string }
        Returns: {
          dia: string
          falhas: number
          provider: string
          total: number
        }[]
      }
      has_workspace_role: {
        Args: { p_roles: string[]; p_workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      provider_usage: {
        Args: { p_days?: number; p_workspace_id: string }
        Returns: {
          erros: number
          input_tokens: number
          media_ms: number
          output_tokens: number
          provider: string
          quota: number
          sucessos: number
          total: number
        }[]
      }
      reorder_script_scenes: {
        Args: { p_scene_ids: string[]; p_script_id: string }
        Returns: undefined
      }
      restore_script_version: {
        Args: { p_script_id: string; p_version_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      workspace_generations_this_month: {
        Args: { p_workspace_id: string }
        Returns: number
      }
    }
    Enums: {
      ai_generation_status:
        | "success"
        | "invalid_output"
        | "error"
        | "rate_limited"
        | "quota_exceeded"
      campaign_node_type:
        | "campanha"
        | "conjunto"
        | "anuncio"
        | "publico"
        | "landing_page"
        | "whatsapp"
        | "oferta"
        | "pixel_evento"
        | "observacao"
        | "meta_kpi"
        | "nota"
        | "frame"
        | "texto"
        | "forma"
      funnel_stage: "topo" | "meio" | "fundo" | "remarketing"
      member_role: "owner" | "admin" | "editor" | "viewer"
      platform:
        | "instagram_reels"
        | "tiktok"
        | "youtube_shorts"
        | "meta_ads"
        | "instagram_ads"
        | "facebook_ads"
        | "youtube_ads"
        | "generic"
      resource_status: "active" | "archived"
      script_status:
        | "ideia"
        | "roteiro"
        | "aprovado"
        | "gravacao"
        | "edicao"
        | "pronto"
        | "publicado"
        | "arquivado"
      theme_preference: "light" | "dark" | "system"
      workspace_plan: "free" | "starter" | "pro" | "agency" | "unlimited"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ai_generation_status: [
        "success",
        "invalid_output",
        "error",
        "rate_limited",
        "quota_exceeded",
      ],
      campaign_node_type: [
        "campanha",
        "conjunto",
        "anuncio",
        "publico",
        "landing_page",
        "whatsapp",
        "oferta",
        "pixel_evento",
        "observacao",
        "meta_kpi",
        "nota",
        "frame",
        "texto",
        "forma",
      ],
      funnel_stage: ["topo", "meio", "fundo", "remarketing"],
      member_role: ["owner", "admin", "editor", "viewer"],
      platform: [
        "instagram_reels",
        "tiktok",
        "youtube_shorts",
        "meta_ads",
        "instagram_ads",
        "facebook_ads",
        "youtube_ads",
        "generic",
      ],
      resource_status: ["active", "archived"],
      script_status: [
        "ideia",
        "roteiro",
        "aprovado",
        "gravacao",
        "edicao",
        "pronto",
        "publicado",
        "arquivado",
      ],
      theme_preference: ["light", "dark", "system"],
      workspace_plan: ["free", "starter", "pro", "agency", "unlimited"],
    },
  },
} as const

export type ResourceStatus = Database['public']['Enums']['resource_status']
export type MemberRole = Database['public']['Enums']['member_role']
export type WorkspacePlan = Database['public']['Enums']['workspace_plan']
export type FunnelStage = Database['public']['Enums']['funnel_stage']
export type Platform = Database['public']['Enums']['platform']
export type CampaignNodeType = Database['public']['Enums']['campaign_node_type']

export type ScriptSnapshot = {
  script: any
  scenes: any[]
}

