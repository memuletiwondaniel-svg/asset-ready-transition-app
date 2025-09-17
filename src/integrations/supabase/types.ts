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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      checklist_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      checklist_item_reviews: {
        Row: {
          checklist_item_id: string
          comments: string | null
          created_at: string
          id: string
          pssr_id: string
          reviewed_at: string | null
          reviewer_user_id: string
          status: string
        }
        Insert: {
          checklist_item_id: string
          comments?: string | null
          created_at?: string
          id?: string
          pssr_id: string
          reviewed_at?: string | null
          reviewer_user_id: string
          status: string
        }
        Update: {
          checklist_item_id?: string
          comments?: string | null
          created_at?: string
          id?: string
          pssr_id?: string
          reviewed_at?: string | null
          reviewer_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_item_reviews_pssr_id_fkey"
            columns: ["pssr_id"]
            isOneToOne: false
            referencedRelation: "pssrs"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          Approver: string | null
          category: string
          category_ref_id: string | null
          created_at: string
          created_by: string | null
          description: string
          is_active: boolean
          required_evidence: string | null
          responsible: string | null
          sequence_number: number | null
          topic: string | null
          unique_id: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          Approver?: string | null
          category: string
          category_ref_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          is_active?: boolean
          required_evidence?: string | null
          responsible?: string | null
          sequence_number?: number | null
          topic?: string | null
          unique_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          Approver?: string | null
          category?: string
          category_ref_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          is_active?: boolean
          required_evidence?: string | null
          responsible?: string | null
          sequence_number?: number | null
          topic?: string | null
          unique_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      checklist_topics: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      checklist_uploads: {
        Row: {
          error_log: string | null
          file_path: string
          filename: string
          id: string
          items_added: number | null
          items_failed: number | null
          items_processed: number | null
          items_updated: number | null
          upload_status: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          error_log?: string | null
          file_path: string
          filename: string
          id?: string
          items_added?: number | null
          items_failed?: number | null
          items_processed?: number | null
          items_updated?: number | null
          upload_status?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          error_log?: string | null
          file_path?: string
          filename?: string
          id?: string
          items_added?: number | null
          items_failed?: number | null
          items_processed?: number | null
          items_updated?: number | null
          upload_status?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      checklists: {
        Row: {
          created_at: string
          created_by: string | null
          custom_reason: string | null
          id: string
          name: string
          reason: string
          selected_items: string[]
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_reason?: string | null
          id?: string
          name: string
          reason: string
          selected_items?: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_reason?: string | null
          id?: string
          name?: string
          reason?: string
          selected_items?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      commission: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_reasons: {
        Row: {
          created_at: string
          created_by: string
          id: string
          reason_text: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          reason_text: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          reason_text?: string
        }
        Relationships: []
      }
      discipline: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      field: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      hubs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          checklist_item_id: string | null
          content: string
          created_at: string
          id: string
          pssr_id: string | null
          recipient_email: string
          recipient_user_id: string
          sender_user_id: string | null
          sent_at: string | null
          status: string
          title: string
          type: string
        }
        Insert: {
          checklist_item_id?: string | null
          content: string
          created_at?: string
          id?: string
          pssr_id?: string | null
          recipient_email: string
          recipient_user_id: string
          sender_user_id?: string | null
          sent_at?: string | null
          status?: string
          title: string
          type: string
        }
        Update: {
          checklist_item_id?: string | null
          content?: string
          created_at?: string
          id?: string
          pssr_id?: string | null
          recipient_email?: string
          recipient_user_id?: string
          sender_user_id?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_pssr_id_fkey"
            columns: ["pssr_id"]
            isOneToOne: false
            referencedRelation: "pssrs"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      plant: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string | null
          authenticator_id: string | null
          avatar_url: string | null
          backup_email: string | null
          commission: string | null
          company: Database["public"]["Enums"]["user_company"] | null
          country_code: string | null
          created_at: string
          department: string | null
          discipline: string | null
          email: string
          field: string | null
          first_name: string | null
          full_name: string | null
          functional_email: boolean | null
          functional_email_address: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          last_name: string | null
          last_password_reset: string | null
          locked_until: string | null
          login_attempts: number | null
          manager_id: string | null
          notification_preferences: Json | null
          password_change_required: boolean | null
          password_changed_at: string | null
          password_reset_required: boolean | null
          personal_email: string | null
          phone_number: string | null
          plant: string | null
          position: string | null
          preferences: Json | null
          primary_phone: string | null
          rejection_reason: string | null
          role: string | null
          secondary_phone: string | null
          sso_enabled: boolean | null
          station: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          temporary_password: string | null
          two_factor_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string | null
          authenticator_id?: string | null
          avatar_url?: string | null
          backup_email?: string | null
          commission?: string | null
          company?: Database["public"]["Enums"]["user_company"] | null
          country_code?: string | null
          created_at?: string
          department?: string | null
          discipline?: string | null
          email: string
          field?: string | null
          first_name?: string | null
          full_name?: string | null
          functional_email?: boolean | null
          functional_email_address?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          last_name?: string | null
          last_password_reset?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          manager_id?: string | null
          notification_preferences?: Json | null
          password_change_required?: boolean | null
          password_changed_at?: string | null
          password_reset_required?: boolean | null
          personal_email?: string | null
          phone_number?: string | null
          plant?: string | null
          position?: string | null
          preferences?: Json | null
          primary_phone?: string | null
          rejection_reason?: string | null
          role?: string | null
          secondary_phone?: string | null
          sso_enabled?: boolean | null
          station?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          temporary_password?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string | null
          authenticator_id?: string | null
          avatar_url?: string | null
          backup_email?: string | null
          commission?: string | null
          company?: Database["public"]["Enums"]["user_company"] | null
          country_code?: string | null
          created_at?: string
          department?: string | null
          discipline?: string | null
          email?: string
          field?: string | null
          first_name?: string | null
          full_name?: string | null
          functional_email?: boolean | null
          functional_email_address?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          last_name?: string | null
          last_password_reset?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          manager_id?: string | null
          notification_preferences?: Json | null
          password_change_required?: boolean | null
          password_changed_at?: string | null
          password_reset_required?: boolean | null
          personal_email?: string | null
          phone_number?: string | null
          plant?: string | null
          position?: string | null
          preferences?: Json | null
          primary_phone?: string | null
          rejection_reason?: string | null
          role?: string | null
          secondary_phone?: string | null
          sso_enabled?: boolean | null
          station?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          temporary_password?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_commission_fkey"
            columns: ["commission"]
            isOneToOne: false
            referencedRelation: "commission"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_discipline_fkey"
            columns: ["discipline"]
            isOneToOne: false
            referencedRelation: "discipline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_field_fkey"
            columns: ["field"]
            isOneToOne: false
            referencedRelation: "field"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_plant_fkey"
            columns: ["plant"]
            isOneToOne: false
            referencedRelation: "plant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_station_fkey"
            columns: ["station"]
            isOneToOne: false
            referencedRelation: "station"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          file_extension: string | null
          file_path: string | null
          file_size: number | null
          id: string
          link_type: string | null
          link_url: string | null
          project_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          file_extension?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          link_type?: string | null
          link_url?: string | null
          project_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          file_extension?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          link_type?: string | null
          link_url?: string | null
          project_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_scorecard_project: boolean | null
          milestone_date: string
          milestone_name: string
          project_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_scorecard_project?: boolean | null
          milestone_date: string
          milestone_name: string
          project_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_scorecard_project?: boolean | null
          milestone_date?: string
          milestone_name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team_members: {
        Row: {
          created_at: string
          id: string
          is_lead: boolean | null
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_lead?: boolean | null
          project_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_lead?: boolean | null
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string | null
          hub_id: string | null
          id: string
          is_active: boolean
          plant_id: string | null
          project_id_number: string
          project_id_prefix: string
          project_scope: string | null
          project_scope_image_url: string | null
          project_title: string
          station_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hub_id?: string | null
          id?: string
          is_active?: boolean
          plant_id?: string | null
          project_id_number: string
          project_id_prefix: string
          project_scope?: string | null
          project_scope_image_url?: string | null
          project_title: string
          station_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hub_id?: string | null
          id?: string
          is_active?: boolean
          plant_id?: string | null
          project_id_number?: string
          project_id_prefix?: string
          project_scope?: string | null
          project_scope_image_url?: string | null
          project_title?: string
          station_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "station"
            referencedColumns: ["id"]
          },
        ]
      }
      pssr_approvers: {
        Row: {
          approved_at: string | null
          approver_level: number
          approver_name: string
          approver_role: string
          created_at: string
          id: string
          pssr_id: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approver_level: number
          approver_name: string
          approver_role: string
          created_at?: string
          id?: string
          pssr_id: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          approver_level?: number
          approver_name?: string
          approver_role?: string
          created_at?: string
          id?: string
          pssr_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pssr_approvers_pssr_id_fkey"
            columns: ["pssr_id"]
            isOneToOne: false
            referencedRelation: "pssrs"
            referencedColumns: ["id"]
          },
        ]
      }
      pssr_checklist_responses: {
        Row: {
          action_owner: string | null
          approved_at: string | null
          checklist_item_id: string
          created_at: string
          deviation_reason: string | null
          follow_up_action: string | null
          id: string
          justification: string | null
          mitigations: string | null
          narrative: string | null
          potential_risk: string | null
          pssr_id: string
          response: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          action_owner?: string | null
          approved_at?: string | null
          checklist_item_id: string
          created_at?: string
          deviation_reason?: string | null
          follow_up_action?: string | null
          id?: string
          justification?: string | null
          mitigations?: string | null
          narrative?: string | null
          potential_risk?: string | null
          pssr_id: string
          response?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          action_owner?: string | null
          approved_at?: string | null
          checklist_item_id?: string
          created_at?: string
          deviation_reason?: string | null
          follow_up_action?: string | null
          id?: string
          justification?: string | null
          mitigations?: string | null
          narrative?: string | null
          potential_risk?: string | null
          pssr_id?: string
          response?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pssr_checklist_responses_pssr_id_fkey"
            columns: ["pssr_id"]
            isOneToOne: false
            referencedRelation: "pssrs"
            referencedColumns: ["id"]
          },
        ]
      }
      pssr_links: {
        Row: {
          created_at: string
          created_by: string
          id: string
          linked_pssr_id: string
          parent_pssr_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          linked_pssr_id: string
          parent_pssr_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          linked_pssr_id?: string
          parent_pssr_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pssr_links_linked_pssr_id_fkey"
            columns: ["linked_pssr_id"]
            isOneToOne: false
            referencedRelation: "pssrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pssr_links_parent_pssr_id_fkey"
            columns: ["parent_pssr_id"]
            isOneToOne: false
            referencedRelation: "pssrs"
            referencedColumns: ["id"]
          },
        ]
      }
      pssr_team_members: {
        Row: {
          created_at: string
          id: string
          member_name: string
          member_role: string
          member_type: string
          pssr_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_name: string
          member_role: string
          member_type: string
          pssr_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_name?: string
          member_role?: string
          member_type?: string
          pssr_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pssr_team_members_pssr_id_fkey"
            columns: ["pssr_id"]
            isOneToOne: false
            referencedRelation: "pssrs"
            referencedColumns: ["id"]
          },
        ]
      }
      pssrs: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          asset: string
          completed_at: string | null
          created_at: string
          cs_location: string | null
          finalized_at: string | null
          id: string
          plant: string | null
          project_id: string | null
          project_name: string | null
          pssr_id: string
          reason: string
          scope: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          asset: string
          completed_at?: string | null
          created_at?: string
          cs_location?: string | null
          finalized_at?: string | null
          id?: string
          plant?: string | null
          project_id?: string | null
          project_name?: string | null
          pssr_id: string
          reason: string
          scope?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          asset?: string
          completed_at?: string | null
          created_at?: string
          cs_location?: string | null
          finalized_at?: string | null
          id?: string
          plant?: string | null
          project_id?: string | null
          project_name?: string | null
          pssr_id?: string
          reason?: string
          scope?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      station: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_delegations: {
        Row: {
          checklist_item_id: string
          created_at: string
          created_by: string
          delegated_to_user_id: string
          delegation_reason: string | null
          id: string
          original_approver_id: string
          pssr_id: string
        }
        Insert: {
          checklist_item_id: string
          created_at?: string
          created_by: string
          delegated_to_user_id: string
          delegation_reason?: string | null
          id?: string
          original_approver_id: string
          pssr_id: string
        }
        Update: {
          checklist_item_id?: string
          created_at?: string
          created_by?: string
          delegated_to_user_id?: string
          delegation_reason?: string | null
          id?: string
          original_approver_id?: string
          pssr_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_delegations_pssr_id_fkey"
            columns: ["pssr_id"]
            isOneToOne: false
            referencedRelation: "pssrs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_privileges: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          privilege: Database["public"]["Enums"]["user_privilege"]
          user_id: string | null
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          privilege: Database["public"]["Enums"]["user_privilege"]
          user_id?: string | null
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          privilege?: Database["public"]["Enums"]["user_privilege"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_privileges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_projects: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          project_name: string
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          project_name: string
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          project_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string | null
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id?: string | null
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          sso_provider: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token: string
          sso_provider?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          sso_provider?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_user_account: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      get_active_roles: {
        Args: Record<PropertyKey, never>
        Returns: {
          value: string
        }[]
      }
      get_active_ta2_commissions: {
        Args: Record<PropertyKey, never>
        Returns: {
          value: string
        }[]
      }
      get_active_ta2_disciplines: {
        Args: Record<PropertyKey, never>
        Returns: {
          value: string
        }[]
      }
      get_category_ref_id: {
        Args: { category_name: string }
        Returns: string
      }
      get_enhanced_user_management_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          account_status: string
          avatar_url: string
          company: Database["public"]["Enums"]["user_company"]
          created_at: string
          department: string
          email: string
          first_name: string
          full_name: string
          functional_email_address: string
          job_title: string
          last_activity: string
          last_login_at: string
          last_name: string
          locked_until: string
          login_attempts: number
          manager_name: string
          password_change_required: boolean
          pending_actions: number
          phone_number: string
          position: string
          projects: string[]
          role: string
          roles: string[]
          sso_enabled: boolean
          status: Database["public"]["Enums"]["user_status"]
          ta2_commission: string
          ta2_discipline: string
          two_factor_enabled: boolean
          user_id: string
        }[]
      }
      get_public_profile_info: {
        Args: { target_user_id: string }
        Returns: {
          company: Database["public"]["Enums"]["user_company"]
          department: string
          first_name: string
          full_name: string
          job_title: string
          last_name: string
          user_id: string
        }[]
      }
      get_unique_topics: {
        Args: Record<PropertyKey, never>
        Returns: {
          topic: string
        }[]
      }
      get_user_management_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          account_status: string
          company: Database["public"]["Enums"]["user_company"]
          created_at: string
          email: string
          employee_id: string
          full_name: string
          job_title: string
          last_login_at: string
          manager_name: string
          phone_number: string
          roles: string[]
          sso_enabled: boolean
          user_id: string
        }[]
      }
      initiate_password_reset: {
        Args: { user_email: string }
        Returns: string
      }
      reject_user_account: {
        Args: { rejection_reason_text?: string; target_user_id: string }
        Returns: boolean
      }
      reorder_checklist_item: {
        Args: { item_unique_id: string; new_position: number }
        Returns: undefined
      }
      track_failed_login: {
        Args: { ip_addr?: unknown; user_uuid: string }
        Returns: undefined
      }
      track_user_login: {
        Args: { session_data?: Json; user_uuid: string }
        Returns: undefined
      }
      update_checklist_sequence_numbers: {
        Args: { target_category: string }
        Returns: undefined
      }
      user_has_privilege: {
        Args: {
          privilege_name: Database["public"]["Enums"]["user_privilege"]
          user_uuid: string
        }
        Returns: boolean
      }
      user_has_role: {
        Args: { role_name: string; user_uuid: string }
        Returns: boolean
      }
      user_is_admin: {
        Args: { user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      ta2_commission: "Asset" | "Project and Engineering"
      ta2_discipline:
        | "Civil"
        | "Static"
        | "PACO"
        | "Process"
        | "Technical Safety"
      user_company: "BGC" | "KENT"
      user_privilege:
        | "view_only"
        | "complete_assigned_tasks"
        | "edit_checklist_approvers"
        | "edit_create_authenticate_user"
        | "edit_create_project"
        | "edit_create_master_checklist"
        | "create_approve_operation_readiness"
        | "create_approve_training_plan"
        | "create_approve_pac"
        | "create_approve_fac"
      user_role:
        | "admin"
        | "manager"
        | "engineer"
        | "safety_officer"
        | "technical_authority"
        | "user"
      user_status:
        | "active"
        | "inactive"
        | "pending_approval"
        | "rejected"
        | "new"
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
  public: {
    Enums: {
      ta2_commission: ["Asset", "Project and Engineering"],
      ta2_discipline: [
        "Civil",
        "Static",
        "PACO",
        "Process",
        "Technical Safety",
      ],
      user_company: ["BGC", "KENT"],
      user_privilege: [
        "view_only",
        "complete_assigned_tasks",
        "edit_checklist_approvers",
        "edit_create_authenticate_user",
        "edit_create_project",
        "edit_create_master_checklist",
        "create_approve_operation_readiness",
        "create_approve_training_plan",
        "create_approve_pac",
        "create_approve_fac",
      ],
      user_role: [
        "admin",
        "manager",
        "engineer",
        "safety_officer",
        "technical_authority",
        "user",
      ],
      user_status: [
        "active",
        "inactive",
        "pending_approval",
        "rejected",
        "new",
      ],
    },
  },
} as const
