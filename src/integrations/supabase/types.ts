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
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
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
      fac_prerequisites: {
        Row: {
          created_at: string | null
          created_by: string | null
          delivering_party_role_id: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean | null
          receiving_party_role_id: string | null
          sample_evidence: string | null
          summary: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          delivering_party_role_id?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          receiving_party_role_id?: string | null
          sample_evidence?: string | null
          summary: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          delivering_party_role_id?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          receiving_party_role_id?: string | null
          sample_evidence?: string | null
          summary?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fac_prerequisites_delivering_party_role_id_fkey"
            columns: ["delivering_party_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fac_prerequisites_receiving_party_role_id_fkey"
            columns: ["receiving_party_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      field: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          plant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          plant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          plant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plant"
            referencedColumns: ["id"]
          },
        ]
      }
      handover_certificate_templates: {
        Row: {
          certificate_type: string
          content: string
          created_at: string | null
          created_by: string | null
          default_signatories: Json | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          certificate_type: string
          content: string
          created_at?: string | null
          created_by?: string | null
          default_signatories?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          certificate_type?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          default_signatories?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
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
      microsoft_oauth_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string
          scope: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          scope?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          scope?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          checklist_items: boolean | null
          created_at: string
          email_digest_frequency: string | null
          email_notifications: boolean | null
          id: string
          pssr_updates: boolean | null
          security_alerts: boolean | null
          system_alerts: boolean | null
          team_messages: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist_items?: boolean | null
          created_at?: string
          email_digest_frequency?: string | null
          email_notifications?: boolean | null
          id?: string
          pssr_updates?: boolean | null
          security_alerts?: boolean | null
          system_alerts?: boolean | null
          team_messages?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          checklist_items?: boolean | null
          created_at?: string
          email_digest_frequency?: string | null
          email_notifications?: boolean | null
          id?: string
          pssr_updates?: boolean | null
          security_alerts?: boolean | null
          system_alerts?: boolean | null
          team_messages?: boolean | null
          updated_at?: string
          user_id?: string
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
      ora_activity_catalog: {
        Row: {
          activity_id: string
          ams_processes: string[] | null
          applicable_business: string | null
          area: string
          created_at: string | null
          created_by: string | null
          dcaf_control_point: string | null
          description: string | null
          discipline: string | null
          display_order: number | null
          entry_type: string
          estimated_manhours: number | null
          id: string
          is_active: boolean | null
          level: string
          name: string
          or_toolbox_section: string | null
          outcome_evidence: string | null
          phase: string
          pmf_controls: string[] | null
          precursors: string[] | null
          requirement_level: string
          rolled_up_in_document: string | null
          tools_templates: string | null
          updated_at: string | null
        }
        Insert: {
          activity_id: string
          ams_processes?: string[] | null
          applicable_business?: string | null
          area?: string
          created_at?: string | null
          created_by?: string | null
          dcaf_control_point?: string | null
          description?: string | null
          discipline?: string | null
          display_order?: number | null
          entry_type?: string
          estimated_manhours?: number | null
          id?: string
          is_active?: boolean | null
          level?: string
          name: string
          or_toolbox_section?: string | null
          outcome_evidence?: string | null
          phase: string
          pmf_controls?: string[] | null
          precursors?: string[] | null
          requirement_level?: string
          rolled_up_in_document?: string | null
          tools_templates?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_id?: string
          ams_processes?: string[] | null
          applicable_business?: string | null
          area?: string
          created_at?: string | null
          created_by?: string | null
          dcaf_control_point?: string | null
          description?: string | null
          discipline?: string | null
          display_order?: number | null
          entry_type?: string
          estimated_manhours?: number | null
          id?: string
          is_active?: boolean | null
          level?: string
          name?: string
          or_toolbox_section?: string | null
          outcome_evidence?: string | null
          phase?: string
          pmf_controls?: string[] | null
          precursors?: string[] | null
          requirement_level?: string
          rolled_up_in_document?: string | null
          tools_templates?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ora_cost_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      ora_handover_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number | null
          from_party: string | null
          handover_date: string | null
          id: string
          item_name: string
          notes: string | null
          ora_plan_id: string
          signed_off_at: string | null
          signed_off_by: string | null
          status: string | null
          to_party: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          from_party?: string | null
          handover_date?: string | null
          id?: string
          item_name: string
          notes?: string | null
          ora_plan_id: string
          signed_off_at?: string | null
          signed_off_by?: string | null
          status?: string | null
          to_party?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          from_party?: string | null
          handover_date?: string | null
          id?: string
          item_name?: string
          notes?: string | null
          ora_plan_id?: string
          signed_off_at?: string | null
          signed_off_by?: string | null
          status?: string | null
          to_party?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ora_handover_items_ora_plan_id_fkey"
            columns: ["ora_plan_id"]
            isOneToOne: false
            referencedRelation: "orp_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      ora_maintenance_batches: {
        Row: {
          batch_name: string
          batch_number: number
          completion_date: string | null
          component_type: string
          created_at: string | null
          description: string
          id: string
          notes: string | null
          ora_plan_id: string
          progress_percent: number | null
          responsible_person: string | null
          status: string | null
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          batch_name: string
          batch_number: number
          completion_date?: string | null
          component_type: string
          created_at?: string | null
          description: string
          id?: string
          notes?: string | null
          ora_plan_id: string
          progress_percent?: number | null
          responsible_person?: string | null
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          batch_name?: string
          batch_number?: number
          completion_date?: string | null
          component_type?: string
          created_at?: string | null
          description?: string
          id?: string
          notes?: string | null
          ora_plan_id?: string
          progress_percent?: number | null
          responsible_person?: string | null
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ora_maintenance_batches_ora_plan_id_fkey"
            columns: ["ora_plan_id"]
            isOneToOne: false
            referencedRelation: "orp_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      ora_maintenance_readiness: {
        Row: {
          category: string
          completion_date: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          item_name: string
          notes: string | null
          ora_plan_id: string
          overall_progress: number | null
          responsible_person: string | null
          status: string | null
          target_completion_date: string | null
          target_date: string | null
          updated_at: string
        }
        Insert: {
          category: string
          completion_date?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          item_name: string
          notes?: string | null
          ora_plan_id: string
          overall_progress?: number | null
          responsible_person?: string | null
          status?: string | null
          target_completion_date?: string | null
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          completion_date?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          item_name?: string
          notes?: string | null
          ora_plan_id?: string
          overall_progress?: number | null
          responsible_person?: string | null
          status?: string | null
          target_completion_date?: string | null
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ora_maintenance_readiness_ora_plan_id_fkey"
            columns: ["ora_plan_id"]
            isOneToOne: false
            referencedRelation: "orp_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      ora_plan_templates: {
        Row: {
          applicable_phases: string[]
          complexity: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          project_type: string
          updated_at: string | null
        }
        Insert: {
          applicable_phases?: string[]
          complexity?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          project_type: string
          updated_at?: string | null
        }
        Update: {
          applicable_phases?: string[]
          complexity?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          project_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ora_template_activities: {
        Row: {
          activity_id: string
          created_at: string | null
          custom_estimated_hours: number | null
          display_order: number | null
          id: string
          is_required: boolean | null
          notes: string | null
          template_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string | null
          custom_estimated_hours?: number | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          notes?: string | null
          template_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string | null
          custom_estimated_hours?: number | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          notes?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ora_template_activities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "ora_activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ora_template_activities_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ora_plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ora_training_approvals: {
        Row: {
          approved_at: string | null
          approver_role: string
          approver_user_id: string | null
          comments: string | null
          created_at: string
          id: string
          sequence_order: number
          status: Database["public"]["Enums"]["ora_training_approval_status"]
          training_plan_id: string
        }
        Insert: {
          approved_at?: string | null
          approver_role: string
          approver_user_id?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          sequence_order?: number
          status?: Database["public"]["Enums"]["ora_training_approval_status"]
          training_plan_id: string
        }
        Update: {
          approved_at?: string | null
          approver_role?: string
          approver_user_id?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          sequence_order?: number
          status?: Database["public"]["Enums"]["ora_training_approval_status"]
          training_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ora_training_approvals_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "ora_training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      ora_training_evidence: {
        Row: {
          created_at: string
          description: string | null
          evidence_type: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          training_item_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          evidence_type?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          training_item_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          evidence_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          training_item_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ora_training_evidence_training_item_id_fkey"
            columns: ["training_item_id"]
            isOneToOne: false
            referencedRelation: "ora_training_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ora_training_items: {
        Row: {
          actual_cost: number | null
          completion_date: string | null
          created_at: string
          delivery_method: string[] | null
          detailed_description: string | null
          display_order: number | null
          duration_hours: number | null
          estimated_cost: number | null
          execution_stage:
            | Database["public"]["Enums"]["ora_training_execution_stage"]
            | null
          id: string
          justification: string | null
          notes: string | null
          overview: string | null
          po_issued_date: string | null
          po_number: string | null
          po_status: string | null
          scheduled_date: string | null
          scheduled_end_date: string | null
          ta_approval_date: string | null
          ta_reviewer_id: string | null
          target_audience: string[] | null
          tentative_date: string | null
          title: string
          trainees: string[] | null
          training_plan_id: string
          training_provider: string | null
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          completion_date?: string | null
          created_at?: string
          delivery_method?: string[] | null
          detailed_description?: string | null
          display_order?: number | null
          duration_hours?: number | null
          estimated_cost?: number | null
          execution_stage?:
            | Database["public"]["Enums"]["ora_training_execution_stage"]
            | null
          id?: string
          justification?: string | null
          notes?: string | null
          overview?: string | null
          po_issued_date?: string | null
          po_number?: string | null
          po_status?: string | null
          scheduled_date?: string | null
          scheduled_end_date?: string | null
          ta_approval_date?: string | null
          ta_reviewer_id?: string | null
          target_audience?: string[] | null
          tentative_date?: string | null
          title: string
          trainees?: string[] | null
          training_plan_id: string
          training_provider?: string | null
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          completion_date?: string | null
          created_at?: string
          delivery_method?: string[] | null
          detailed_description?: string | null
          display_order?: number | null
          duration_hours?: number | null
          estimated_cost?: number | null
          execution_stage?:
            | Database["public"]["Enums"]["ora_training_execution_stage"]
            | null
          id?: string
          justification?: string | null
          notes?: string | null
          overview?: string | null
          po_issued_date?: string | null
          po_number?: string | null
          po_status?: string | null
          scheduled_date?: string | null
          scheduled_end_date?: string | null
          ta_approval_date?: string | null
          ta_reviewer_id?: string | null
          target_audience?: string[] | null
          tentative_date?: string | null
          title?: string
          trainees?: string[] | null
          training_plan_id?: string
          training_provider?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ora_training_items_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "ora_training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      ora_training_materials: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          is_approved: boolean | null
          material_type: string | null
          training_item_id: string
          uploaded_by: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_approved?: boolean | null
          material_type?: string | null
          training_item_id: string
          uploaded_by: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_approved?: boolean | null
          material_type?: string | null
          training_item_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ora_training_materials_training_item_id_fkey"
            columns: ["training_item_id"]
            isOneToOne: false
            referencedRelation: "ora_training_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ora_training_plans: {
        Row: {
          approved_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          ora_plan_id: string
          overall_progress: number | null
          status: Database["public"]["Enums"]["ora_training_status"]
          submitted_at: string | null
          title: string
          total_estimated_cost: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          ora_plan_id: string
          overall_progress?: number | null
          status?: Database["public"]["Enums"]["ora_training_status"]
          submitted_at?: string | null
          title: string
          total_estimated_cost?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          ora_plan_id?: string
          overall_progress?: number | null
          status?: Database["public"]["Enums"]["ora_training_status"]
          submitted_at?: string | null
          title?: string
          total_estimated_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ora_training_plans_ora_plan_id_fkey"
            columns: ["ora_plan_id"]
            isOneToOne: false
            referencedRelation: "orp_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      ora_training_system_mappings: {
        Row: {
          created_at: string
          created_by: string | null
          handover_point_id: string | null
          id: string
          system_id: string
          training_item_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          handover_point_id?: string | null
          id?: string
          system_id: string
          training_item_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          handover_point_id?: string | null
          id?: string
          system_id?: string
          training_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ora_training_system_mappings_handover_point_id_fkey"
            columns: ["handover_point_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ora_training_system_mappings_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "p2a_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ora_training_system_mappings_training_item_id_fkey"
            columns: ["training_item_id"]
            isOneToOne: false
            referencedRelation: "ora_training_items"
            referencedColumns: ["id"]
          },
        ]
      }
      orm_attachments: {
        Row: {
          attachment_type: string
          created_at: string
          deliverable_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_by: string
        }
        Insert: {
          attachment_type: string
          created_at?: string
          deliverable_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by: string
        }
        Update: {
          attachment_type?: string
          created_at?: string
          deliverable_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "orm_attachments_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "orm_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      orm_daily_reports: {
        Row: {
          challenges: string | null
          created_at: string
          deliverable_id: string
          hours_worked: number
          id: string
          next_day_plan: string | null
          progress_percentage: number | null
          report_date: string
          submitted_by: string
          work_completed: string
        }
        Insert: {
          challenges?: string | null
          created_at?: string
          deliverable_id: string
          hours_worked: number
          id?: string
          next_day_plan?: string | null
          progress_percentage?: number | null
          report_date?: string
          submitted_by: string
          work_completed: string
        }
        Update: {
          challenges?: string | null
          created_at?: string
          deliverable_id?: string
          hours_worked?: number
          id?: string
          next_day_plan?: string | null
          progress_percentage?: number | null
          report_date?: string
          submitted_by?: string
          work_completed?: string
        }
        Relationships: [
          {
            foreignKeyName: "orm_daily_reports_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "orm_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      orm_deliverable_templates: {
        Row: {
          created_at: string
          created_by: string | null
          deliverable_type: Database["public"]["Enums"]["orm_deliverable_type"]
          description: string | null
          estimated_hours: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deliverable_type: Database["public"]["Enums"]["orm_deliverable_type"]
          description?: string | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deliverable_type?: Database["public"]["Enums"]["orm_deliverable_type"]
          description?: string | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      orm_deliverables: {
        Row: {
          actual_hours: number | null
          assigned_resource_id: string | null
          completion_date: string | null
          created_at: string
          deliverable_type: Database["public"]["Enums"]["orm_deliverable_type"]
          estimated_hours: number | null
          id: string
          orm_plan_id: string
          progress_percentage: number | null
          qaqc_reviewer_id: string | null
          start_date: string | null
          updated_at: string
          workflow_stage: Database["public"]["Enums"]["orm_workflow_stage"]
        }
        Insert: {
          actual_hours?: number | null
          assigned_resource_id?: string | null
          completion_date?: string | null
          created_at?: string
          deliverable_type: Database["public"]["Enums"]["orm_deliverable_type"]
          estimated_hours?: number | null
          id?: string
          orm_plan_id: string
          progress_percentage?: number | null
          qaqc_reviewer_id?: string | null
          start_date?: string | null
          updated_at?: string
          workflow_stage?: Database["public"]["Enums"]["orm_workflow_stage"]
        }
        Update: {
          actual_hours?: number | null
          assigned_resource_id?: string | null
          completion_date?: string | null
          created_at?: string
          deliverable_type?: Database["public"]["Enums"]["orm_deliverable_type"]
          estimated_hours?: number | null
          id?: string
          orm_plan_id?: string
          progress_percentage?: number | null
          qaqc_reviewer_id?: string | null
          start_date?: string | null
          updated_at?: string
          workflow_stage?: Database["public"]["Enums"]["orm_workflow_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "orm_deliverables_orm_plan_id_fkey"
            columns: ["orm_plan_id"]
            isOneToOne: false
            referencedRelation: "orm_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      orm_document_checklist: {
        Row: {
          created_at: string
          deliverable_id: string
          document_name: string
          document_type: string
          id: string
          is_mandatory: boolean | null
          is_received: boolean | null
          notes: string | null
          received_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deliverable_id: string
          document_name: string
          document_type: string
          id?: string
          is_mandatory?: boolean | null
          is_received?: boolean | null
          notes?: string | null
          received_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deliverable_id?: string
          document_name?: string
          document_type?: string
          id?: string
          is_mandatory?: boolean | null
          is_received?: boolean | null
          notes?: string | null
          received_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orm_document_checklist_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "orm_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      orm_milestones: {
        Row: {
          completion_date: string | null
          created_at: string
          description: string | null
          id: string
          linked_deliverables: string[] | null
          name: string
          orm_plan_id: string
          progress_percentage: number | null
          status: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          completion_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          linked_deliverables?: string[] | null
          name: string
          orm_plan_id: string
          progress_percentage?: number | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          completion_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          linked_deliverables?: string[] | null
          name?: string
          orm_plan_id?: string
          progress_percentage?: number | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orm_milestones_orm_plan_id_fkey"
            columns: ["orm_plan_id"]
            isOneToOne: false
            referencedRelation: "orm_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      orm_notification_preferences: {
        Row: {
          created_at: string | null
          digest_frequency: string
          digest_time: string | null
          id: string
          include_milestone_progress: boolean | null
          include_overdue_tasks: boolean | null
          include_pending_reviews: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          digest_frequency?: string
          digest_time?: string | null
          id?: string
          include_milestone_progress?: boolean | null
          include_overdue_tasks?: boolean | null
          include_pending_reviews?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          digest_frequency?: string
          digest_time?: string | null
          id?: string
          include_milestone_progress?: boolean | null
          include_overdue_tasks?: boolean | null
          include_pending_reviews?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      orm_notifications: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          notification_type: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          notification_type: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      orm_plans: {
        Row: {
          created_at: string
          created_by: string | null
          estimated_completion_date: string | null
          id: string
          is_active: boolean
          orm_lead_id: string
          overall_progress: number | null
          project_id: string
          scope_description: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estimated_completion_date?: string | null
          id?: string
          is_active?: boolean
          orm_lead_id: string
          overall_progress?: number | null
          project_id: string
          scope_description?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estimated_completion_date?: string | null
          id?: string
          is_active?: boolean
          orm_lead_id?: string
          overall_progress?: number | null
          project_id?: string
          scope_description?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orm_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orm_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      orm_tasks: {
        Row: {
          assigned_to: string
          completion_date: string | null
          created_at: string
          created_by: string
          deliverable_id: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          completion_date?: string | null
          created_at?: string
          created_by: string
          deliverable_id: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          completion_date?: string | null
          created_at?: string
          created_by?: string
          deliverable_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orm_tasks_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "orm_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      orm_template_checklists: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          id: string
          is_mandatory: boolean
          sequence_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          id?: string
          is_mandatory?: boolean
          sequence_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          id?: string
          is_mandatory?: boolean
          sequence_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orm_template_checklists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "orm_deliverable_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      orm_template_tasks: {
        Row: {
          created_at: string
          description: string | null
          estimated_days: number | null
          id: string
          priority: string
          sequence_order: number
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_days?: number | null
          id?: string
          priority?: string
          sequence_order?: number
          template_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_days?: number | null
          id?: string
          priority?: string
          sequence_order?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "orm_template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "orm_deliverable_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      orm_workflow_comments: {
        Row: {
          comment: string
          created_at: string
          deliverable_id: string
          id: string
          user_id: string
          workflow_stage: Database["public"]["Enums"]["orm_workflow_stage"]
        }
        Insert: {
          comment: string
          created_at?: string
          deliverable_id: string
          id?: string
          user_id: string
          workflow_stage: Database["public"]["Enums"]["orm_workflow_stage"]
        }
        Update: {
          comment?: string
          created_at?: string
          deliverable_id?: string
          id?: string
          user_id?: string
          workflow_stage?: Database["public"]["Enums"]["orm_workflow_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "orm_workflow_comments_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "orm_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      orp_activity_log: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          orp_plan_id: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          orp_plan_id: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          orp_plan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orp_activity_log_orp_plan_id_fkey"
            columns: ["orp_plan_id"]
            isOneToOne: false
            referencedRelation: "orp_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      orp_approvals: {
        Row: {
          approved_at: string | null
          approver_role: string
          approver_user_id: string | null
          comments: string | null
          created_at: string
          id: string
          orp_plan_id: string
          status: Database["public"]["Enums"]["orp_approval_status"]
        }
        Insert: {
          approved_at?: string | null
          approver_role: string
          approver_user_id?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          orp_plan_id: string
          status?: Database["public"]["Enums"]["orp_approval_status"]
        }
        Update: {
          approved_at?: string | null
          approver_role?: string
          approver_user_id?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          orp_plan_id?: string
          status?: Database["public"]["Enums"]["orp_approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "orp_approvals_orp_plan_id_fkey"
            columns: ["orp_plan_id"]
            isOneToOne: false
            referencedRelation: "orp_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      orp_collaborators: {
        Row: {
          added_by: string
          created_at: string
          id: string
          plan_deliverable_id: string
          user_id: string
        }
        Insert: {
          added_by: string
          created_at?: string
          id?: string
          plan_deliverable_id: string
          user_id: string
        }
        Update: {
          added_by?: string
          created_at?: string
          id?: string
          plan_deliverable_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orp_collaborators_plan_deliverable_id_fkey"
            columns: ["plan_deliverable_id"]
            isOneToOne: false
            referencedRelation: "orp_plan_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      orp_comment_attachments: {
        Row: {
          comment_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_by: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "orp_comment_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "orp_deliverable_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      orp_deliverable_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          plan_deliverable_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          plan_deliverable_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          plan_deliverable_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "orp_deliverable_attachments_plan_deliverable_id_fkey"
            columns: ["plan_deliverable_id"]
            isOneToOne: false
            referencedRelation: "orp_plan_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      orp_deliverable_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          mentions: string[] | null
          parent_comment_id: string | null
          plan_deliverable_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          mentions?: string[] | null
          parent_comment_id?: string | null
          plan_deliverable_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          mentions?: string[] | null
          parent_comment_id?: string | null
          plan_deliverable_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orp_deliverable_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "orp_deliverable_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orp_deliverable_comments_plan_deliverable_id_fkey"
            columns: ["plan_deliverable_id"]
            isOneToOne: false
            referencedRelation: "orp_plan_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      orp_deliverable_dependencies: {
        Row: {
          created_at: string
          deliverable_id: string
          id: string
          predecessor_id: string
        }
        Insert: {
          created_at?: string
          deliverable_id: string
          id?: string
          predecessor_id: string
        }
        Update: {
          created_at?: string
          deliverable_id?: string
          id?: string
          predecessor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orp_deliverable_dependencies_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "orp_plan_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orp_deliverable_dependencies_predecessor_id_fkey"
            columns: ["predecessor_id"]
            isOneToOne: false
            referencedRelation: "orp_plan_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      orp_deliverable_sub_options: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          parent_deliverable_id: string
        }
        Insert: {
          created_at?: string
          display_order: number
          id?: string
          is_active?: boolean
          name: string
          parent_deliverable_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          parent_deliverable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orp_deliverable_sub_options_parent_deliverable_id_fkey"
            columns: ["parent_deliverable_id"]
            isOneToOne: false
            referencedRelation: "orp_deliverables_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      orp_deliverables_catalog: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          has_sub_options: boolean
          id: string
          is_active: boolean
          name: string
          phase: Database["public"]["Enums"]["orp_phase"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order: number
          has_sub_options?: boolean
          id?: string
          is_active?: boolean
          name: string
          phase: Database["public"]["Enums"]["orp_phase"]
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          has_sub_options?: boolean
          id?: string
          is_active?: boolean
          name?: string
          phase?: Database["public"]["Enums"]["orp_phase"]
        }
        Relationships: []
      }
      orp_milestones: {
        Row: {
          completion_date: string | null
          created_at: string
          description: string | null
          id: string
          linked_deliverables: string[] | null
          name: string
          orp_plan_id: string
          progress_percentage: number | null
          status: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          completion_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          linked_deliverables?: string[] | null
          name: string
          orp_plan_id: string
          progress_percentage?: number | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          completion_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          linked_deliverables?: string[] | null
          name?: string
          orp_plan_id?: string
          progress_percentage?: number | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orp_milestones_orp_plan_id_fkey"
            columns: ["orp_plan_id"]
            isOneToOne: false
            referencedRelation: "orp_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      orp_plan_deliverable_sub_selections: {
        Row: {
          created_at: string
          custom_name: string | null
          id: string
          plan_deliverable_id: string
          sub_option_id: string
        }
        Insert: {
          created_at?: string
          custom_name?: string | null
          id?: string
          plan_deliverable_id: string
          sub_option_id: string
        }
        Update: {
          created_at?: string
          custom_name?: string | null
          id?: string
          plan_deliverable_id?: string
          sub_option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orp_plan_deliverable_sub_selections_plan_deliverable_id_fkey"
            columns: ["plan_deliverable_id"]
            isOneToOne: false
            referencedRelation: "orp_plan_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orp_plan_deliverable_sub_selections_sub_option_id_fkey"
            columns: ["sub_option_id"]
            isOneToOne: false
            referencedRelation: "orp_deliverable_sub_options"
            referencedColumns: ["id"]
          },
        ]
      }
      orp_plan_deliverables: {
        Row: {
          actual_cost: number | null
          comments: string | null
          committed_cost: number | null
          completion_percentage: number | null
          cost_category: string | null
          created_at: string
          deliverable_id: string
          end_date: string | null
          estimated_cost: number | null
          estimated_manhours: number | null
          id: string
          orp_plan_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["orp_deliverable_status"]
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          comments?: string | null
          committed_cost?: number | null
          completion_percentage?: number | null
          cost_category?: string | null
          created_at?: string
          deliverable_id: string
          end_date?: string | null
          estimated_cost?: number | null
          estimated_manhours?: number | null
          id?: string
          orp_plan_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["orp_deliverable_status"]
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          comments?: string | null
          committed_cost?: number | null
          completion_percentage?: number | null
          cost_category?: string | null
          created_at?: string
          deliverable_id?: string
          end_date?: string | null
          estimated_cost?: number | null
          estimated_manhours?: number | null
          id?: string
          orp_plan_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["orp_deliverable_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orp_plan_deliverables_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "orp_deliverables_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orp_plan_deliverables_orp_plan_id_fkey"
            columns: ["orp_plan_id"]
            isOneToOne: false
            referencedRelation: "orp_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      orp_plans: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          ora_engineer_id: string
          phase: Database["public"]["Enums"]["orp_phase"]
          project_id: string
          status: Database["public"]["Enums"]["orp_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          ora_engineer_id: string
          phase: Database["public"]["Enums"]["orp_phase"]
          project_id: string
          status?: Database["public"]["Enums"]["orp_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          ora_engineer_id?: string
          phase?: Database["public"]["Enums"]["orp_phase"]
          project_id?: string
          status?: Database["public"]["Enums"]["orp_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orp_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orp_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      orp_resources: {
        Row: {
          allocation_percentage: number | null
          created_at: string
          id: string
          name: string
          orp_plan_id: string
          position: string
          role_description: string | null
          user_id: string | null
        }
        Insert: {
          allocation_percentage?: number | null
          created_at?: string
          id?: string
          name: string
          orp_plan_id: string
          position: string
          role_description?: string | null
          user_id?: string | null
        }
        Update: {
          allocation_percentage?: number | null
          created_at?: string
          id?: string
          name?: string
          orp_plan_id?: string
          position?: string
          role_description?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orp_resources_orp_plan_id_fkey"
            columns: ["orp_plan_id"]
            isOneToOne: false
            referencedRelation: "orp_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      orp_risks: {
        Row: {
          actual_resolution_date: string | null
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          identified_date: string | null
          mitigation_plan: string | null
          orp_plan_id: string
          owner_user_id: string | null
          probability: string
          severity: string
          status: string
          target_resolution_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_resolution_date?: string | null
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          identified_date?: string | null
          mitigation_plan?: string | null
          orp_plan_id: string
          owner_user_id?: string | null
          probability: string
          severity: string
          status?: string
          target_resolution_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_resolution_date?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          identified_date?: string | null
          mitigation_plan?: string | null
          orp_plan_id?: string
          owner_user_id?: string | null
          probability?: string
          severity?: string
          status?: string
          target_resolution_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orp_risks_orp_plan_id_fkey"
            columns: ["orp_plan_id"]
            isOneToOne: false
            referencedRelation: "orp_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      orp_template_approvals: {
        Row: {
          approver_role: string
          created_at: string
          display_order: number
          id: string
          template_id: string
        }
        Insert: {
          approver_role: string
          created_at?: string
          display_order?: number
          id?: string
          template_id: string
        }
        Update: {
          approver_role?: string
          created_at?: string
          display_order?: number
          id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orp_template_approvals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "orp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      orp_template_deliverables: {
        Row: {
          created_at: string
          deliverable_id: string
          display_order: number
          estimated_manhours: number | null
          id: string
          is_required: boolean
          template_id: string
        }
        Insert: {
          created_at?: string
          deliverable_id: string
          display_order?: number
          estimated_manhours?: number | null
          id?: string
          is_required?: boolean
          template_id: string
        }
        Update: {
          created_at?: string
          deliverable_id?: string
          display_order?: number
          estimated_manhours?: number | null
          id?: string
          is_required?: boolean
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orp_template_deliverables_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "orp_deliverables_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orp_template_deliverables_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "orp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      orp_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          phase: string
          project_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          phase: string
          project_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phase?: string
          project_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      outstanding_work_items: {
        Row: {
          action_party_role_id: string | null
          assigned_to: string | null
          comments: string | null
          completed_date: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          item_number: string
          priority: number | null
          project_id: string | null
          source: string
          source_id: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          action_party_role_id?: string | null
          assigned_to?: string | null
          comments?: string | null
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          item_number: string
          priority?: number | null
          project_id?: string | null
          source: string
          source_id?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          action_party_role_id?: string | null
          assigned_to?: string | null
          comments?: string | null
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          item_number?: string
          priority?: number | null
          project_id?: string | null
          source?: string
          source_id?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outstanding_work_items_action_party_role_id_fkey"
            columns: ["action_party_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outstanding_work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outstanding_work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_approval_workflow: {
        Row: {
          approved_at: string | null
          approver_name: string
          approver_user_id: string | null
          comments: string | null
          created_at: string
          handover_id: string
          id: string
          stage: Database["public"]["Enums"]["p2a_approval_stage"]
          status: Database["public"]["Enums"]["p2a_approval_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approver_name: string
          approver_user_id?: string | null
          comments?: string | null
          created_at?: string
          handover_id: string
          id?: string
          stage: Database["public"]["Enums"]["p2a_approval_stage"]
          status?: Database["public"]["Enums"]["p2a_approval_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approver_name?: string
          approver_user_id?: string | null
          comments?: string | null
          created_at?: string
          handover_id?: string
          id?: string
          stage?: Database["public"]["Enums"]["p2a_approval_stage"]
          status?: Database["public"]["Enums"]["p2a_approval_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_approval_workflow_handover_id_fkey"
            columns: ["handover_id"]
            isOneToOne: false
            referencedRelation: "p2a_handovers"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_audit_trail: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string
          handover_id: string
          id: string
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type: string
          handover_id: string
          id?: string
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          handover_id?: string
          id?: string
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_audit_trail_handover_id_fkey"
            columns: ["handover_id"]
            isOneToOne: false
            referencedRelation: "p2a_handovers"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_deliverable_attachments: {
        Row: {
          created_at: string
          deliverable_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          deliverable_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          deliverable_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_deliverable_attachments_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_deliverable_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      p2a_handover_approvers: {
        Row: {
          approved_at: string | null
          comments: string | null
          created_at: string | null
          display_order: number
          handover_id: string
          id: string
          role_name: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          comments?: string | null
          created_at?: string | null
          display_order: number
          handover_id: string
          id?: string
          role_name: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          comments?: string | null
          created_at?: string | null
          display_order?: number
          handover_id?: string
          id?: string
          role_name?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "p2a_handover_approvers_handover_id_fkey"
            columns: ["handover_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_handover_deliverables: {
        Row: {
          category_id: string
          comments: string | null
          completion_date: string | null
          created_at: string
          deliverable_name: string
          delivering_party: string
          handover_id: string
          id: string
          receiving_party: string
          status: Database["public"]["Enums"]["p2a_deliverable_status"]
          updated_at: string
        }
        Insert: {
          category_id: string
          comments?: string | null
          completion_date?: string | null
          created_at?: string
          deliverable_name: string
          delivering_party: string
          handover_id: string
          id?: string
          receiving_party: string
          status?: Database["public"]["Enums"]["p2a_deliverable_status"]
          updated_at?: string
        }
        Update: {
          category_id?: string
          comments?: string | null
          completion_date?: string | null
          created_at?: string
          deliverable_name?: string
          delivering_party?: string
          handover_id?: string
          id?: string
          receiving_party?: string
          status?: Database["public"]["Enums"]["p2a_deliverable_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_handover_deliverables_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "p2a_deliverable_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2a_handover_deliverables_handover_id_fkey"
            columns: ["handover_id"]
            isOneToOne: false
            referencedRelation: "p2a_handovers"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_handover_plans: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          ora_plan_id: string | null
          plant_code: string | null
          project_code: string | null
          project_id: string | null
          status: Database["public"]["Enums"]["p2a_plan_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          ora_plan_id?: string | null
          plant_code?: string | null
          project_code?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["p2a_plan_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          ora_plan_id?: string | null
          plant_code?: string | null
          project_code?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["p2a_plan_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_handover_plans_ora_plan_id_fkey"
            columns: ["ora_plan_id"]
            isOneToOne: false
            referencedRelation: "orp_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2a_handover_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2a_handover_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_handover_point_systems: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          handover_point_id: string
          id: string
          subsystem_id: string | null
          system_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          handover_point_id: string
          id?: string
          subsystem_id?: string | null
          system_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          handover_point_id?: string
          id?: string
          subsystem_id?: string | null
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_handover_point_systems_handover_point_id_fkey"
            columns: ["handover_point_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2a_handover_point_systems_subsystem_id_fkey"
            columns: ["subsystem_id"]
            isOneToOne: false
            referencedRelation: "p2a_subsystems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2a_handover_point_systems_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "p2a_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_handover_points: {
        Row: {
          completion_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          execution_plan_approved_at: string | null
          execution_plan_approved_by: string | null
          execution_plan_status: string
          execution_plan_submitted_at: string | null
          execution_plan_submitted_by: string | null
          handover_plan_id: string | null
          id: string
          name: string
          phase_id: string | null
          position_x: number
          position_y: number
          status: Database["public"]["Enums"]["p2a_handover_point_status"]
          target_date: string | null
          updated_at: string
          vcr_code: string
        }
        Insert: {
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          execution_plan_approved_at?: string | null
          execution_plan_approved_by?: string | null
          execution_plan_status?: string
          execution_plan_submitted_at?: string | null
          execution_plan_submitted_by?: string | null
          handover_plan_id?: string | null
          id?: string
          name: string
          phase_id?: string | null
          position_x?: number
          position_y?: number
          status?: Database["public"]["Enums"]["p2a_handover_point_status"]
          target_date?: string | null
          updated_at?: string
          vcr_code: string
        }
        Update: {
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          execution_plan_approved_at?: string | null
          execution_plan_approved_by?: string | null
          execution_plan_status?: string
          execution_plan_submitted_at?: string | null
          execution_plan_submitted_by?: string | null
          handover_plan_id?: string | null
          id?: string
          name?: string
          phase_id?: string | null
          position_x?: number
          position_y?: number
          status?: Database["public"]["Enums"]["p2a_handover_point_status"]
          target_date?: string | null
          updated_at?: string
          vcr_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_handover_points_handover_plan_id_fkey"
            columns: ["handover_plan_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2a_handover_points_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "p2a_project_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_handover_prerequisites: {
        Row: {
          comments: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          deviation_reason: string | null
          evidence_links: string[] | null
          follow_up_action: string | null
          handover_id: string
          id: string
          mitigation: string | null
          pac_prerequisite_id: string
          receiving_party_user_id: string | null
          status: string
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          comments?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          deviation_reason?: string | null
          evidence_links?: string[] | null
          follow_up_action?: string | null
          handover_id: string
          id?: string
          mitigation?: string | null
          pac_prerequisite_id: string
          receiving_party_user_id?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          comments?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          deviation_reason?: string | null
          evidence_links?: string[] | null
          follow_up_action?: string | null
          handover_id?: string
          id?: string
          mitigation?: string | null
          pac_prerequisite_id?: string
          receiving_party_user_id?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "p2a_handover_prerequisites_handover_id_fkey"
            columns: ["handover_id"]
            isOneToOne: false
            referencedRelation: "p2a_handovers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2a_handover_prerequisites_pac_prerequisite_id_fkey"
            columns: ["pac_prerequisite_id"]
            isOneToOne: false
            referencedRelation: "pac_prerequisites"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_handovers: {
        Row: {
          created_at: string
          created_by: string
          fac_effective_date: string | null
          handover_scope: string | null
          id: string
          is_active: boolean
          pac_effective_date: string | null
          phase: Database["public"]["Enums"]["p2a_phase"]
          project_id: string
          pssr_signed_date: string | null
          status: Database["public"]["Enums"]["p2a_status"]
          submitted_at: string | null
          submitted_by: string | null
          template_id: string | null
          template_ignored: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          fac_effective_date?: string | null
          handover_scope?: string | null
          id?: string
          is_active?: boolean
          pac_effective_date?: string | null
          phase: Database["public"]["Enums"]["p2a_phase"]
          project_id: string
          pssr_signed_date?: string | null
          status?: Database["public"]["Enums"]["p2a_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          template_id?: string | null
          template_ignored?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          fac_effective_date?: string | null
          handover_scope?: string | null
          id?: string
          is_active?: boolean
          pac_effective_date?: string | null
          phase?: Database["public"]["Enums"]["p2a_phase"]
          project_id?: string
          pssr_signed_date?: string | null
          status?: Database["public"]["Enums"]["p2a_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          template_id?: string | null
          template_ignored?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_handovers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2a_handovers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2a_handovers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pac_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_itp_activities: {
        Row: {
          activity_name: string
          created_at: string
          display_order: number
          handover_point_id: string
          id: string
          inspection_type: string
          notes: string | null
          system_id: string
          updated_at: string
        }
        Insert: {
          activity_name: string
          created_at?: string
          display_order?: number
          handover_point_id: string
          id?: string
          inspection_type?: string
          notes?: string | null
          system_id: string
          updated_at?: string
        }
        Update: {
          activity_name?: string
          created_at?: string
          display_order?: number
          handover_point_id?: string
          id?: string
          inspection_type?: string
          notes?: string | null
          system_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_itp_activities_handover_point_id_fkey"
            columns: ["handover_point_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2a_itp_activities_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "p2a_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_notifications: {
        Row: {
          created_at: string
          handover_id: string
          id: string
          message: string
          notification_type: string
          read: boolean
          recipient_user_id: string
          sender_user_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          handover_id: string
          id?: string
          message: string
          notification_type: string
          read?: boolean
          recipient_user_id: string
          sender_user_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          handover_id?: string
          id?: string
          message?: string
          notification_type?: string
          read?: boolean
          recipient_user_id?: string
          sender_user_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_notifications_handover_id_fkey"
            columns: ["handover_id"]
            isOneToOne: false
            referencedRelation: "p2a_handovers"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_prerequisite_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          handover_prerequisite_id: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          handover_prerequisite_id: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          handover_prerequisite_id?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "p2a_prerequisite_attachments_handover_prerequisite_id_fkey"
            columns: ["handover_prerequisite_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_prerequisites"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_project_milestones: {
        Row: {
          actual_date: string | null
          code: string | null
          created_at: string
          display_order: number
          external_id: string | null
          handover_plan_id: string
          id: string
          metadata: Json | null
          name: string
          source: Database["public"]["Enums"]["p2a_milestone_source"]
          target_date: string | null
          updated_at: string
        }
        Insert: {
          actual_date?: string | null
          code?: string | null
          created_at?: string
          display_order?: number
          external_id?: string | null
          handover_plan_id: string
          id?: string
          metadata?: Json | null
          name: string
          source?: Database["public"]["Enums"]["p2a_milestone_source"]
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          actual_date?: string | null
          code?: string | null
          created_at?: string
          display_order?: number
          external_id?: string | null
          handover_plan_id?: string
          id?: string
          metadata?: Json | null
          name?: string
          source?: Database["public"]["Enums"]["p2a_milestone_source"]
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_project_milestones_handover_plan_id_fkey"
            columns: ["handover_plan_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_project_phases: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_order: number
          end_milestone_id: string | null
          handover_plan_id: string
          id: string
          name: string
          start_milestone_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          end_milestone_id?: string | null
          handover_plan_id: string
          id?: string
          name: string
          start_milestone_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          end_milestone_id?: string | null
          handover_plan_id?: string
          id?: string
          name?: string
          start_milestone_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_project_phases_end_milestone_id_fkey"
            columns: ["end_milestone_id"]
            isOneToOne: false
            referencedRelation: "p2a_project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2a_project_phases_handover_plan_id_fkey"
            columns: ["handover_plan_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2a_project_phases_start_milestone_id_fkey"
            columns: ["start_milestone_id"]
            isOneToOne: false
            referencedRelation: "p2a_project_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_subsystems: {
        Row: {
          comm_status: Database["public"]["Enums"]["p2a_subsystem_status"]
          completion_percentage: number
          created_at: string
          display_order: number | null
          id: string
          itr_count: number
          mc_status: Database["public"]["Enums"]["p2a_subsystem_status"]
          metadata: Json | null
          name: string
          pcc_status: Database["public"]["Enums"]["p2a_subsystem_status"]
          punchlist_a_count: number
          punchlist_b_count: number
          subsystem_id: string
          system_id: string
          updated_at: string
        }
        Insert: {
          comm_status?: Database["public"]["Enums"]["p2a_subsystem_status"]
          completion_percentage?: number
          created_at?: string
          display_order?: number | null
          id?: string
          itr_count?: number
          mc_status?: Database["public"]["Enums"]["p2a_subsystem_status"]
          metadata?: Json | null
          name: string
          pcc_status?: Database["public"]["Enums"]["p2a_subsystem_status"]
          punchlist_a_count?: number
          punchlist_b_count?: number
          subsystem_id: string
          system_id: string
          updated_at?: string
        }
        Update: {
          comm_status?: Database["public"]["Enums"]["p2a_subsystem_status"]
          completion_percentage?: number
          created_at?: string
          display_order?: number | null
          id?: string
          itr_count?: number
          mc_status?: Database["public"]["Enums"]["p2a_subsystem_status"]
          metadata?: Json | null
          name?: string
          pcc_status?: Database["public"]["Enums"]["p2a_subsystem_status"]
          punchlist_a_count?: number
          punchlist_b_count?: number
          subsystem_id?: string
          system_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_subsystems_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "p2a_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_systems: {
        Row: {
          actual_rfo_date: string | null
          actual_rfsu_date: string | null
          completion_percentage: number
          completion_status: Database["public"]["Enums"]["p2a_system_completion_status"]
          created_at: string
          display_order: number | null
          external_id: string | null
          handover_plan_id: string
          id: string
          is_hydrocarbon: boolean
          itr_a_count: number
          itr_b_count: number
          itr_total_count: number
          metadata: Json | null
          name: string
          punchlist_a_count: number
          punchlist_b_count: number
          source_type: Database["public"]["Enums"]["p2a_system_source_type"]
          system_id: string
          target_rfo_date: string | null
          target_rfsu_date: string | null
          updated_at: string
        }
        Insert: {
          actual_rfo_date?: string | null
          actual_rfsu_date?: string | null
          completion_percentage?: number
          completion_status?: Database["public"]["Enums"]["p2a_system_completion_status"]
          created_at?: string
          display_order?: number | null
          external_id?: string | null
          handover_plan_id: string
          id?: string
          is_hydrocarbon?: boolean
          itr_a_count?: number
          itr_b_count?: number
          itr_total_count?: number
          metadata?: Json | null
          name: string
          punchlist_a_count?: number
          punchlist_b_count?: number
          source_type?: Database["public"]["Enums"]["p2a_system_source_type"]
          system_id: string
          target_rfo_date?: string | null
          target_rfsu_date?: string | null
          updated_at?: string
        }
        Update: {
          actual_rfo_date?: string | null
          actual_rfsu_date?: string | null
          completion_percentage?: number
          completion_status?: Database["public"]["Enums"]["p2a_system_completion_status"]
          created_at?: string
          display_order?: number | null
          external_id?: string | null
          handover_plan_id?: string
          id?: string
          is_hydrocarbon?: boolean
          itr_a_count?: number
          itr_b_count?: number
          itr_total_count?: number
          metadata?: Json | null
          name?: string
          punchlist_a_count?: number
          punchlist_b_count?: number
          source_type?: Database["public"]["Enums"]["p2a_system_source_type"]
          system_id?: string
          target_rfo_date?: string | null
          target_rfsu_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_systems_handover_plan_id_fkey"
            columns: ["handover_plan_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_user_presence: {
        Row: {
          deliverable_id: string | null
          handover_id: string
          id: string
          is_editing: boolean
          last_seen: string
          user_id: string
        }
        Insert: {
          deliverable_id?: string | null
          handover_id: string
          id?: string
          is_editing?: boolean
          last_seen?: string
          user_id: string
        }
        Update: {
          deliverable_id?: string | null
          handover_id?: string
          id?: string
          is_editing?: boolean
          last_seen?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_user_presence_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2a_user_presence_handover_id_fkey"
            columns: ["handover_id"]
            isOneToOne: false
            referencedRelation: "p2a_handovers"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_vcr_critical_docs: {
        Row: {
          catalog_id: string | null
          created_at: string
          discipline: string | null
          display_order: number
          doc_code: string | null
          handover_point_id: string
          id: string
          notes: string | null
          responsible_person: string | null
          rlmu_required: boolean
          rlmu_status: string | null
          status: string
          target_date: string | null
          tier: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          catalog_id?: string | null
          created_at?: string
          discipline?: string | null
          display_order?: number
          doc_code?: string | null
          handover_point_id: string
          id?: string
          notes?: string | null
          responsible_person?: string | null
          rlmu_required?: boolean
          rlmu_status?: string | null
          status?: string
          target_date?: string | null
          tier?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          catalog_id?: string | null
          created_at?: string
          discipline?: string | null
          display_order?: number
          doc_code?: string | null
          handover_point_id?: string
          id?: string
          notes?: string | null
          responsible_person?: string | null
          rlmu_required?: boolean
          rlmu_status?: string | null
          status?: string
          target_date?: string | null
          tier?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_vcr_critical_docs_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "p2a_vcr_doc_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_vcr_deliverables: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          handover_point_id: string
          id: string
          responsible_person: string | null
          status: string
          target_date: string | null
          tier: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          handover_point_id: string
          id?: string
          responsible_person?: string | null
          status?: string
          target_date?: string | null
          tier?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          handover_point_id?: string
          id?: string
          responsible_person?: string | null
          status?: string
          target_date?: string | null
          tier?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_vcr_deliverables_handover_point_id_fkey"
            columns: ["handover_point_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_points"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_vcr_doc_catalog: {
        Row: {
          created_at: string
          description: string | null
          discipline: string | null
          display_order: number
          doc_code: string
          id: string
          is_active: boolean
          rlmu_required: boolean
          rlmu_scope: string | null
          tier: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discipline?: string | null
          display_order?: number
          doc_code: string
          id?: string
          is_active?: boolean
          rlmu_required?: boolean
          rlmu_scope?: string | null
          tier: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discipline?: string | null
          display_order?: number
          doc_code?: string
          id?: string
          is_active?: boolean
          rlmu_required?: boolean
          rlmu_scope?: string | null
          tier?: string
          title?: string
        }
        Relationships: []
      }
      p2a_vcr_documentation: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          document_type: string
          handover_point_id: string
          id: string
          responsible_person: string | null
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          document_type?: string
          handover_point_id: string
          id?: string
          responsible_person?: string | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          document_type?: string
          handover_point_id?: string
          id?: string
          responsible_person?: string | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_vcr_documentation_handover_point_id_fkey"
            columns: ["handover_point_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_points"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_vcr_evidence: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_by: string | null
          vcr_prerequisite_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
          vcr_prerequisite_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
          vcr_prerequisite_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_vcr_evidence_vcr_prerequisite_id_fkey"
            columns: ["vcr_prerequisite_id"]
            isOneToOne: false
            referencedRelation: "p2a_vcr_prerequisites"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_vcr_item_overrides: {
        Row: {
          approving_party_role_ids_override: string[] | null
          created_at: string
          delivering_party_role_id_override: string | null
          guidance_notes_override: string | null
          handover_point_id: string
          id: string
          is_na: boolean
          na_reason: string | null
          supporting_evidence_override: string | null
          topic_override: string | null
          updated_at: string
          vcr_item_id: string
          vcr_item_override: string | null
        }
        Insert: {
          approving_party_role_ids_override?: string[] | null
          created_at?: string
          delivering_party_role_id_override?: string | null
          guidance_notes_override?: string | null
          handover_point_id: string
          id?: string
          is_na?: boolean
          na_reason?: string | null
          supporting_evidence_override?: string | null
          topic_override?: string | null
          updated_at?: string
          vcr_item_id: string
          vcr_item_override?: string | null
        }
        Update: {
          approving_party_role_ids_override?: string[] | null
          created_at?: string
          delivering_party_role_id_override?: string | null
          guidance_notes_override?: string | null
          handover_point_id?: string
          id?: string
          is_na?: boolean
          na_reason?: string | null
          supporting_evidence_override?: string | null
          topic_override?: string | null
          updated_at?: string
          vcr_item_id?: string
          vcr_item_override?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "p2a_vcr_item_overrides_delivering_party_role_id_override_fkey"
            columns: ["delivering_party_role_id_override"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2a_vcr_item_overrides_handover_point_id_fkey"
            columns: ["handover_point_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2a_vcr_item_overrides_vcr_item_id_fkey"
            columns: ["vcr_item_id"]
            isOneToOne: false
            referencedRelation: "vcr_items"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_vcr_logsheets: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          display_order: number
          handover_point_id: string
          id: string
          notes: string | null
          responsible_person: string | null
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          description?: string | null
          display_order?: number
          handover_point_id: string
          id?: string
          notes?: string | null
          responsible_person?: string | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          display_order?: number
          handover_point_id?: string
          id?: string
          notes?: string | null
          responsible_person?: string | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      p2a_vcr_operational_registers: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          handover_point_id: string
          id: string
          register_type: string
          responsible_person: string | null
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          handover_point_id: string
          id?: string
          register_type?: string
          responsible_person?: string | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          handover_point_id?: string
          id?: string
          register_type?: string
          responsible_person?: string | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_vcr_operational_registers_handover_point_id_fkey"
            columns: ["handover_point_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_points"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_vcr_prerequisites: {
        Row: {
          comments: string | null
          created_at: string
          delivering_party_id: string | null
          delivering_party_name: string | null
          description: string | null
          display_order: number
          evidence_links: Json | null
          handover_point_id: string
          id: string
          pac_prerequisite_id: string | null
          receiving_party_id: string | null
          receiving_party_name: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["p2a_vcr_prerequisite_status"]
          submitted_at: string | null
          summary: string
          updated_at: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          delivering_party_id?: string | null
          delivering_party_name?: string | null
          description?: string | null
          display_order?: number
          evidence_links?: Json | null
          handover_point_id: string
          id?: string
          pac_prerequisite_id?: string | null
          receiving_party_id?: string | null
          receiving_party_name?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["p2a_vcr_prerequisite_status"]
          submitted_at?: string | null
          summary: string
          updated_at?: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          delivering_party_id?: string | null
          delivering_party_name?: string | null
          description?: string | null
          display_order?: number
          evidence_links?: Json | null
          handover_point_id?: string
          id?: string
          pac_prerequisite_id?: string | null
          receiving_party_id?: string | null
          receiving_party_name?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["p2a_vcr_prerequisite_status"]
          submitted_at?: string | null
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_vcr_prerequisites_handover_point_id_fkey"
            columns: ["handover_point_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2a_vcr_prerequisites_pac_prerequisite_id_fkey"
            columns: ["pac_prerequisite_id"]
            isOneToOne: false
            referencedRelation: "pac_prerequisites"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_vcr_procedures: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          handover_point_id: string
          id: string
          procedure_type: string
          responsible_person: string | null
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          handover_point_id: string
          id?: string
          procedure_type?: string
          responsible_person?: string | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          handover_point_id?: string
          id?: string
          procedure_type?: string
          responsible_person?: string | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_vcr_procedures_handover_point_id_fkey"
            columns: ["handover_point_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_points"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_vcr_qualifications: {
        Row: {
          action_owner_id: string | null
          action_owner_name: string | null
          created_at: string
          follow_up_action: string | null
          id: string
          mitigation: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_comments: string | null
          status: Database["public"]["Enums"]["p2a_qualification_status"]
          submitted_at: string
          submitted_by: string | null
          target_date: string
          updated_at: string
          vcr_prerequisite_id: string
        }
        Insert: {
          action_owner_id?: string | null
          action_owner_name?: string | null
          created_at?: string
          follow_up_action?: string | null
          id?: string
          mitigation: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_comments?: string | null
          status?: Database["public"]["Enums"]["p2a_qualification_status"]
          submitted_at?: string
          submitted_by?: string | null
          target_date: string
          updated_at?: string
          vcr_prerequisite_id: string
        }
        Update: {
          action_owner_id?: string | null
          action_owner_name?: string | null
          created_at?: string
          follow_up_action?: string | null
          id?: string
          mitigation?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_comments?: string | null
          status?: Database["public"]["Enums"]["p2a_qualification_status"]
          submitted_at?: string
          submitted_by?: string | null
          target_date?: string
          updated_at?: string
          vcr_prerequisite_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_vcr_qualifications_vcr_prerequisite_id_fkey"
            columns: ["vcr_prerequisite_id"]
            isOneToOne: false
            referencedRelation: "p2a_vcr_prerequisites"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_vcr_register_catalog: {
        Row: {
          created_at: string
          description: string | null
          discipline: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          register_code: string
          register_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discipline?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          register_code: string
          register_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discipline?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          register_code?: string
          register_type?: string
        }
        Relationships: []
      }
      p2a_vcr_register_selections: {
        Row: {
          action_type: string
          catalog_id: string | null
          created_at: string
          description: string | null
          display_order: number
          handover_point_id: string
          id: string
          name: string | null
          notes: string | null
          register_type: string | null
          responsible_person: string | null
          status: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          action_type?: string
          catalog_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          handover_point_id: string
          id?: string
          name?: string | null
          notes?: string | null
          register_type?: string | null
          responsible_person?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          action_type?: string
          catalog_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          handover_point_id?: string
          id?: string
          name?: string | null
          notes?: string | null
          register_type?: string | null
          responsible_person?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_vcr_register_selections_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "p2a_vcr_register_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_vcr_relationships: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          relationship_type: string
          source_vcr_id: string
          target_vcr_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          relationship_type: string
          source_vcr_id: string
          target_vcr_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          relationship_type?: string
          source_vcr_id?: string
          target_vcr_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_vcr_relationships_source_vcr_id_fkey"
            columns: ["source_vcr_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2a_vcr_relationships_target_vcr_id_fkey"
            columns: ["target_vcr_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_points"
            referencedColumns: ["id"]
          },
        ]
      }
      p2a_vcr_training: {
        Row: {
          created_at: string
          created_by: string | null
          delivery_method: string[] | null
          description: string | null
          display_order: number | null
          duration_hours: number | null
          estimated_cost: number | null
          handover_point_id: string
          id: string
          status: string
          system_ids: string[] | null
          target_audience: string[] | null
          tentative_date: string | null
          title: string
          training_provider: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivery_method?: string[] | null
          description?: string | null
          display_order?: number | null
          duration_hours?: number | null
          estimated_cost?: number | null
          handover_point_id: string
          id?: string
          status?: string
          system_ids?: string[] | null
          target_audience?: string[] | null
          tentative_date?: string | null
          title: string
          training_provider?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivery_method?: string[] | null
          description?: string | null
          display_order?: number | null
          duration_hours?: number | null
          estimated_cost?: number | null
          handover_point_id?: string
          id?: string
          status?: string
          system_ids?: string[] | null
          target_audience?: string[] | null
          tentative_date?: string | null
          title?: string
          training_provider?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2a_vcr_training_handover_point_id_fkey"
            columns: ["handover_point_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_points"
            referencedColumns: ["id"]
          },
        ]
      }
      pac_prerequisite_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          display_order: number
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          display_order: number
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          display_order?: number
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      pac_prerequisite_delivering_parties: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          prerequisite_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          prerequisite_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          prerequisite_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pac_prerequisite_delivering_parties_prerequisite_id_fkey"
            columns: ["prerequisite_id"]
            isOneToOne: false
            referencedRelation: "pac_prerequisites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pac_prerequisite_delivering_parties_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      pac_prerequisite_receiving_parties: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          prerequisite_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          prerequisite_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          prerequisite_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pac_prerequisite_receiving_parties_prerequisite_id_fkey"
            columns: ["prerequisite_id"]
            isOneToOne: false
            referencedRelation: "pac_prerequisites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pac_prerequisite_receiving_parties_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      pac_prerequisites: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by: string | null
          delivering_party_role_id: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean | null
          receiving_party_role_id: string | null
          sample_evidence: string | null
          summary: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivering_party_role_id?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          receiving_party_role_id?: string | null
          sample_evidence?: string | null
          summary: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivering_party_role_id?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          receiving_party_role_id?: string | null
          sample_evidence?: string | null
          summary?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pac_prerequisites_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "pac_prerequisite_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pac_prerequisites_delivering_party_role_id_fkey"
            columns: ["delivering_party_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pac_prerequisites_receiving_party_role_id_fkey"
            columns: ["receiving_party_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      pac_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          prerequisite_ids: string[]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          prerequisite_ids?: string[]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          prerequisite_ids?: string[]
          updated_at?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      plant: {
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
      plip_document_types: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          tier: number
          updated_at: string
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          tier?: number
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          tier?: number
          updated_at?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          created_at: string | null
          department: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
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
          email: string
          field: string | null
          first_name: string | null
          full_name: string | null
          functional_email: boolean | null
          functional_email_address: string | null
          hub: string | null
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
          two_factor_backup_codes: string[] | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
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
          email: string
          field?: string | null
          first_name?: string | null
          full_name?: string | null
          functional_email?: boolean | null
          functional_email_address?: string | null
          hub?: string | null
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
          two_factor_backup_codes?: string[] | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
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
          email?: string
          field?: string | null
          first_name?: string | null
          full_name?: string | null
          functional_email?: boolean | null
          functional_email_address?: string | null
          hub?: string | null
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
          two_factor_backup_codes?: string[] | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
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
            foreignKeyName: "profiles_field_fkey"
            columns: ["field"]
            isOneToOne: false
            referencedRelation: "field"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_hub_fkey"
            columns: ["hub"]
            isOneToOne: false
            referencedRelation: "hubs"
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
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
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
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      project_hub_region: {
        Row: {
          created_at: string
          display_order: number
          hub_id: string
          id: string
          region_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          hub_id: string
          id?: string
          region_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          hub_id?: string
          id?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_hub_region_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: true
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_hub_region_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "project_region"
            referencedColumns: ["id"]
          },
        ]
      }
      project_locations: {
        Row: {
          created_at: string
          id: string
          project_id: string
          station_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          station_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_locations_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "station"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestone_types: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_custom: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_custom?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_custom?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
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
          status: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_scorecard_project?: boolean | null
          milestone_date: string
          milestone_name: string
          project_id: string
          status?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_scorecard_project?: boolean | null
          milestone_date?: string
          milestone_name?: string
          project_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      project_region: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_region_plant: {
        Row: {
          created_at: string | null
          id: string
          plant_id: string
          region_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plant_id: string
          region_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plant_id?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_region_plant_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: true
            referencedRelation: "plant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_region_plant_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "project_region"
            referencedColumns: ["id"]
          },
        ]
      }
      project_region_station: {
        Row: {
          created_at: string | null
          id: string
          region_id: string
          station_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          region_id: string
          station_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          region_id?: string
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_region_station_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "project_region"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_region_station_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: true
            referencedRelation: "station"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team_members: {
        Row: {
          created_at: string | null
          id: string
          is_lead: boolean | null
          project_id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_lead?: boolean | null
          project_id: string
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_lead?: boolean | null
          project_id?: string
          role?: string
          updated_at?: string | null
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
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
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
          is_favorite: boolean | null
          plant_id: string | null
          project_id_number: string
          project_id_prefix: string
          project_scope: string | null
          project_scope_image_url: string | null
          project_title: string
          region_id: string | null
          station_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hub_id?: string | null
          id?: string
          is_active?: boolean
          is_favorite?: boolean | null
          plant_id?: string | null
          project_id_number: string
          project_id_prefix: string
          project_scope?: string | null
          project_scope_image_url?: string | null
          project_title: string
          region_id?: string | null
          station_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hub_id?: string | null
          id?: string
          is_active?: boolean
          is_favorite?: boolean | null
          plant_id?: string | null
          project_id_number?: string
          project_id_prefix?: string
          project_scope?: string | null
          project_scope_image_url?: string | null
          project_title?: string
          region_id?: string | null
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
            foreignKeyName: "projects_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "project_region"
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
      pssr_allowed_approver_roles: {
        Row: {
          created_at: string
          id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pssr_allowed_approver_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: true
            referencedRelation: "roles"
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
          comments: string | null
          created_at: string
          id: string
          pssr_id: string
          status: string
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approver_level: number
          approver_name: string
          approver_role: string
          comments?: string | null
          created_at?: string
          id?: string
          pssr_id: string
          status?: string
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approver_level?: number
          approver_name?: string
          approver_role?: string
          comments?: string | null
          created_at?: string
          id?: string
          pssr_id?: string
          status?: string
          user_id?: string | null
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
      pssr_checklist_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          ref_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          ref_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          ref_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pssr_checklist_items: {
        Row: {
          approvers: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string
          guidance_notes: string | null
          id: string
          is_active: boolean
          responsible: string | null
          sequence_number: number
          supporting_evidence: string | null
          topic: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          approvers?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          guidance_notes?: string | null
          id?: string
          is_active?: boolean
          responsible?: string | null
          sequence_number?: number
          supporting_evidence?: string | null
          topic?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          approvers?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          guidance_notes?: string | null
          id?: string
          is_active?: boolean
          responsible?: string | null
          sequence_number?: number
          supporting_evidence?: string | null
          topic?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "pssr_checklist_items_category_id_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "pssr_checklist_categories"
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
      pssr_checklist_topics: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      pssr_custom_checklist_items: {
        Row: {
          category: string
          created_at: string | null
          description: string
          display_order: number | null
          id: string
          is_active: boolean | null
          pssr_id: string
          supporting_evidence: string | null
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          pssr_id: string
          supporting_evidence?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          pssr_id?: string
          supporting_evidence?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pssr_custom_checklist_items_pssr_id_fkey"
            columns: ["pssr_id"]
            isOneToOne: false
            referencedRelation: "pssrs"
            referencedColumns: ["id"]
          },
        ]
      }
      pssr_delivery_parties: {
        Row: {
          code: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_order: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      pssr_discipline_reviews: {
        Row: {
          completed_at: string | null
          created_at: string
          discipline_comment: string | null
          discipline_role: string
          id: string
          items_reviewed: number | null
          items_total: number | null
          pssr_id: string
          reviewer_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          discipline_comment?: string | null
          discipline_role: string
          id?: string
          items_reviewed?: number | null
          items_total?: number | null
          pssr_id: string
          reviewer_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          discipline_comment?: string | null
          discipline_role?: string
          id?: string
          items_reviewed?: number | null
          items_total?: number | null
          pssr_id?: string
          reviewer_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pssr_discipline_reviews_pssr_id_fkey"
            columns: ["pssr_id"]
            isOneToOne: false
            referencedRelation: "pssrs"
            referencedColumns: ["id"]
          },
        ]
      }
      pssr_item_approvals: {
        Row: {
          approver_role: string
          approver_user_id: string | null
          assigned_at: string | null
          checklist_response_id: string
          comments: string | null
          created_at: string
          id: string
          notified_at: string | null
          pssr_id: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["pssr_item_approval_status"]
          updated_at: string
        }
        Insert: {
          approver_role: string
          approver_user_id?: string | null
          assigned_at?: string | null
          checklist_response_id: string
          comments?: string | null
          created_at?: string
          id?: string
          notified_at?: string | null
          pssr_id: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["pssr_item_approval_status"]
          updated_at?: string
        }
        Update: {
          approver_role?: string
          approver_user_id?: string | null
          assigned_at?: string | null
          checklist_response_id?: string
          comments?: string | null
          created_at?: string
          id?: string
          notified_at?: string | null
          pssr_id?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["pssr_item_approval_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pssr_item_approvals_checklist_response_id_fkey"
            columns: ["checklist_response_id"]
            isOneToOne: false
            referencedRelation: "pssr_checklist_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pssr_item_approvals_pssr_id_fkey"
            columns: ["pssr_id"]
            isOneToOne: false
            referencedRelation: "pssrs"
            referencedColumns: ["id"]
          },
        ]
      }
      pssr_item_overrides: {
        Row: {
          approvers_override: string | null
          checklist_item_id: string
          created_at: string
          description_override: string | null
          id: string
          pssr_id: string
          responsible_override: string | null
          topic_override: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approvers_override?: string | null
          checklist_item_id: string
          created_at?: string
          description_override?: string | null
          id?: string
          pssr_id: string
          responsible_override?: string | null
          topic_override?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approvers_override?: string | null
          checklist_item_id?: string
          created_at?: string
          description_override?: string | null
          id?: string
          pssr_id?: string
          responsible_override?: string | null
          topic_override?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pssr_item_overrides_pssr_id_fkey"
            columns: ["pssr_id"]
            isOneToOne: false
            referencedRelation: "pssrs"
            referencedColumns: ["id"]
          },
        ]
      }
      pssr_key_activities: {
        Row: {
          activity_type: string
          completed_at: string | null
          created_at: string
          display_order: number
          id: string
          label: string
          location: string | null
          notes: string | null
          outlook_event_id: string | null
          pssr_id: string
          scheduled_by: string | null
          scheduled_date: string | null
          scheduled_end_date: string | null
          status: string
          task_id: string | null
          updated_at: string
        }
        Insert: {
          activity_type: string
          completed_at?: string | null
          created_at?: string
          display_order?: number
          id?: string
          label: string
          location?: string | null
          notes?: string | null
          outlook_event_id?: string | null
          pssr_id: string
          scheduled_by?: string | null
          scheduled_date?: string | null
          scheduled_end_date?: string | null
          status?: string
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          activity_type?: string
          completed_at?: string | null
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          location?: string | null
          notes?: string | null
          outlook_event_id?: string | null
          pssr_id?: string
          scheduled_by?: string | null
          scheduled_date?: string | null
          scheduled_end_date?: string | null
          status?: string
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pssr_key_activities_pssr_id_fkey"
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
      pssr_moc_scopes: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      pssr_priority_actions: {
        Row: {
          action_owner_id: string | null
          action_owner_name: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          item_approval_id: string
          priority: Database["public"]["Enums"]["pssr_priority_level"]
          pssr_id: string
          source_type: string | null
          status: Database["public"]["Enums"]["pssr_action_status"]
          target_date: string | null
          updated_at: string
          walkdown_observation_id: string | null
        }
        Insert: {
          action_owner_id?: string | null
          action_owner_name?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          item_approval_id: string
          priority: Database["public"]["Enums"]["pssr_priority_level"]
          pssr_id: string
          source_type?: string | null
          status?: Database["public"]["Enums"]["pssr_action_status"]
          target_date?: string | null
          updated_at?: string
          walkdown_observation_id?: string | null
        }
        Update: {
          action_owner_id?: string | null
          action_owner_name?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          item_approval_id?: string
          priority?: Database["public"]["Enums"]["pssr_priority_level"]
          pssr_id?: string
          source_type?: string | null
          status?: Database["public"]["Enums"]["pssr_action_status"]
          target_date?: string | null
          updated_at?: string
          walkdown_observation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_walkdown_observation"
            columns: ["walkdown_observation_id"]
            isOneToOne: false
            referencedRelation: "pssr_walkdown_observations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pssr_priority_actions_action_owner_id_fkey"
            columns: ["action_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pssr_priority_actions_action_owner_id_fkey"
            columns: ["action_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pssr_priority_actions_item_approval_id_fkey"
            columns: ["item_approval_id"]
            isOneToOne: false
            referencedRelation: "pssr_item_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pssr_priority_actions_pssr_id_fkey"
            columns: ["pssr_id"]
            isOneToOne: false
            referencedRelation: "pssrs"
            referencedColumns: ["id"]
          },
        ]
      }
      pssr_reason_ati_scopes: {
        Row: {
          ati_scope_id: string
          created_at: string
          id: string
          is_active: boolean
          reason_id: string
        }
        Insert: {
          ati_scope_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          reason_id: string
        }
        Update: {
          ati_scope_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          reason_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pssr_reason_ati_scopes_ati_scope_id_fkey"
            columns: ["ati_scope_id"]
            isOneToOne: false
            referencedRelation: "pssr_tie_in_scopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pssr_reason_ati_scopes_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "pssr_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      pssr_reason_categories: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          requires_delivery_party: boolean
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          description?: string | null
          display_order: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          requires_delivery_party?: boolean
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          requires_delivery_party?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      pssr_reason_configuration: {
        Row: {
          checklist_item_ids: string[] | null
          checklist_item_overrides: Json | null
          created_at: string | null
          created_by: string | null
          default_pssr_lead_id: string | null
          id: string
          pssr_approver_role_ids: string[] | null
          reason_id: string
          sof_approver_role_ids: string[] | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          checklist_item_ids?: string[] | null
          checklist_item_overrides?: Json | null
          created_at?: string | null
          created_by?: string | null
          default_pssr_lead_id?: string | null
          id?: string
          pssr_approver_role_ids?: string[] | null
          reason_id: string
          sof_approver_role_ids?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          checklist_item_ids?: string[] | null
          checklist_item_overrides?: Json | null
          created_at?: string | null
          created_by?: string | null
          default_pssr_lead_id?: string | null
          id?: string
          pssr_approver_role_ids?: string[] | null
          reason_id?: string
          sof_approver_role_ids?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pssr_reason_configuration_default_pssr_lead_id_fkey"
            columns: ["default_pssr_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pssr_reason_configuration_default_pssr_lead_id_fkey"
            columns: ["default_pssr_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pssr_reason_configuration_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: true
            referencedRelation: "pssr_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      pssr_reason_sub_options: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          parent_reason_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order: number
          id?: string
          is_active?: boolean
          name: string
          parent_reason_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          parent_reason_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pssr_reason_sub_options_parent_reason_id_fkey"
            columns: ["parent_reason_id"]
            isOneToOne: false
            referencedRelation: "pssr_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      pssr_reasons: {
        Row: {
          category: string | null
          category_id: string | null
          created_at: string
          delivery_party_id: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          reason_approver_role_ids: string[] | null
          requires_ati_scopes: boolean
          status: string | null
          sub_category: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          created_at?: string
          delivery_party_id?: string | null
          description?: string | null
          display_order: number
          id?: string
          is_active?: boolean
          name: string
          reason_approver_role_ids?: string[] | null
          requires_ati_scopes?: boolean
          status?: string | null
          sub_category?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          category_id?: string | null
          created_at?: string
          delivery_party_id?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          reason_approver_role_ids?: string[] | null
          requires_ati_scopes?: boolean
          status?: string | null
          sub_category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pssr_reasons_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "pssr_reason_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pssr_reasons_delivery_party_id_fkey"
            columns: ["delivery_party_id"]
            isOneToOne: false
            referencedRelation: "pssr_delivery_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      pssr_selected_ati_scopes: {
        Row: {
          ati_scope_id: string
          created_at: string | null
          id: string
          pssr_id: string
        }
        Insert: {
          ati_scope_id: string
          created_at?: string | null
          id?: string
          pssr_id: string
        }
        Update: {
          ati_scope_id?: string
          created_at?: string | null
          id?: string
          pssr_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pssr_selected_ati_scopes_ati_scope_id_fkey"
            columns: ["ati_scope_id"]
            isOneToOne: false
            referencedRelation: "pssr_tie_in_scopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pssr_selected_ati_scopes_pssr_id_fkey"
            columns: ["pssr_id"]
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
      pssr_tie_in_scopes: {
        Row: {
          code: string
          created_at: string
          description: string
          display_order: number
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          display_order: number
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      pssr_walkdown_attendees: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          response_time: string | null
          role: string | null
          rsvp_status: string | null
          source: string | null
          updated_at: string | null
          user_id: string | null
          walkdown_event_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          response_time?: string | null
          role?: string | null
          rsvp_status?: string | null
          source?: string | null
          updated_at?: string | null
          user_id?: string | null
          walkdown_event_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          response_time?: string | null
          role?: string | null
          rsvp_status?: string | null
          source?: string | null
          updated_at?: string | null
          user_id?: string | null
          walkdown_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pssr_walkdown_attendees_walkdown_event_id_fkey"
            columns: ["walkdown_event_id"]
            isOneToOne: false
            referencedRelation: "pssr_walkdown_events"
            referencedColumns: ["id"]
          },
        ]
      }
      pssr_walkdown_events: {
        Row: {
          attendees: Json | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          disciplines: Json | null
          id: string
          last_synced_at: string | null
          location: string | null
          outlook_event_id: string | null
          outlook_ical_uid: string | null
          pssr_id: string
          scheduled_date: string
          scheduled_time: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          attendees?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          disciplines?: Json | null
          id?: string
          last_synced_at?: string | null
          location?: string | null
          outlook_event_id?: string | null
          outlook_ical_uid?: string | null
          pssr_id: string
          scheduled_date: string
          scheduled_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          attendees?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          disciplines?: Json | null
          id?: string
          last_synced_at?: string | null
          location?: string | null
          outlook_event_id?: string | null
          outlook_ical_uid?: string | null
          pssr_id?: string
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pssr_walkdown_events_pssr_id_fkey"
            columns: ["pssr_id"]
            isOneToOne: false
            referencedRelation: "pssrs"
            referencedColumns: ["id"]
          },
        ]
      }
      pssr_walkdown_observations: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          linked_priority_action_id: string | null
          location_details: string | null
          observation_type: string
          photo_urls: string[] | null
          priority: string | null
          pssr_id: string
          updated_at: string | null
          walkdown_event_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          linked_priority_action_id?: string | null
          location_details?: string | null
          observation_type: string
          photo_urls?: string[] | null
          priority?: string | null
          pssr_id: string
          updated_at?: string | null
          walkdown_event_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          linked_priority_action_id?: string | null
          location_details?: string | null
          observation_type?: string
          photo_urls?: string[] | null
          priority?: string | null
          pssr_id?: string
          updated_at?: string | null
          walkdown_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_linked_priority_action"
            columns: ["linked_priority_action_id"]
            isOneToOne: false
            referencedRelation: "pssr_priority_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pssr_walkdown_observations_pssr_id_fkey"
            columns: ["pssr_id"]
            isOneToOne: false
            referencedRelation: "pssrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pssr_walkdown_observations_walkdown_event_id_fkey"
            columns: ["walkdown_event_id"]
            isOneToOne: false
            referencedRelation: "pssr_walkdown_events"
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
          draft_checklist_item_ids: string[] | null
          draft_item_overrides: Json | null
          draft_na_item_ids: string[] | null
          draft_pssr_approver_role_ids: string[] | null
          draft_sof_approver_role_ids: string[] | null
          field_id: string | null
          finalized_at: string | null
          id: string
          plant: string | null
          plant_id: string | null
          project_id: string | null
          project_name: string | null
          pssr_id: string
          pssr_lead_id: string | null
          reason: string
          reason_id: string | null
          scope: string | null
          scope_image_url: string | null
          station_id: string | null
          status: string
          title: string | null
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
          draft_checklist_item_ids?: string[] | null
          draft_item_overrides?: Json | null
          draft_na_item_ids?: string[] | null
          draft_pssr_approver_role_ids?: string[] | null
          draft_sof_approver_role_ids?: string[] | null
          field_id?: string | null
          finalized_at?: string | null
          id?: string
          plant?: string | null
          plant_id?: string | null
          project_id?: string | null
          project_name?: string | null
          pssr_id: string
          pssr_lead_id?: string | null
          reason: string
          reason_id?: string | null
          scope?: string | null
          scope_image_url?: string | null
          station_id?: string | null
          status?: string
          title?: string | null
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
          draft_checklist_item_ids?: string[] | null
          draft_item_overrides?: Json | null
          draft_na_item_ids?: string[] | null
          draft_pssr_approver_role_ids?: string[] | null
          draft_sof_approver_role_ids?: string[] | null
          field_id?: string | null
          finalized_at?: string | null
          id?: string
          plant?: string | null
          plant_id?: string | null
          project_id?: string | null
          project_name?: string | null
          pssr_id?: string
          pssr_lead_id?: string | null
          reason?: string
          reason_id?: string | null
          scope?: string | null
          scope_image_url?: string | null
          station_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pssrs_pssr_lead_id_fkey"
            columns: ["pssr_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pssrs_pssr_lead_id_fkey"
            columns: ["pssr_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pssrs_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "pssr_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      role_category: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          is_director: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          is_director?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          is_director?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "role_category"
            referencedColumns: ["id"]
          },
        ]
      }
      sof_allowed_approver_roles: {
        Row: {
          created_at: string
          id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sof_allowed_approver_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: true
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      sof_approvers: {
        Row: {
          approved_at: string | null
          approver_level: number
          approver_name: string
          approver_role: string
          comments: string | null
          created_at: string
          id: string
          pssr_id: string
          signature_data: string | null
          sof_certificate_id: string
          status: string
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approver_level?: number
          approver_name: string
          approver_role: string
          comments?: string | null
          created_at?: string
          id?: string
          pssr_id: string
          signature_data?: string | null
          sof_certificate_id: string
          status?: string
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approver_level?: number
          approver_name?: string
          approver_role?: string
          comments?: string | null
          created_at?: string
          id?: string
          pssr_id?: string
          signature_data?: string | null
          sof_certificate_id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sof_approvers_pssr_id_fkey"
            columns: ["pssr_id"]
            isOneToOne: false
            referencedRelation: "pssrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sof_approvers_sof_certificate_id_fkey"
            columns: ["sof_certificate_id"]
            isOneToOne: false
            referencedRelation: "sof_certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      sof_certificates: {
        Row: {
          certificate_number: string
          certificate_text: string
          created_at: string
          facility_name: string | null
          id: string
          issued_at: string | null
          plant_name: string | null
          project_name: string | null
          pssr_id: string
          pssr_reason: string
          status: string
          updated_at: string
        }
        Insert: {
          certificate_number: string
          certificate_text: string
          created_at?: string
          facility_name?: string | null
          id?: string
          issued_at?: string | null
          plant_name?: string | null
          project_name?: string | null
          pssr_id: string
          pssr_reason: string
          status?: string
          updated_at?: string
        }
        Update: {
          certificate_number?: string
          certificate_text?: string
          created_at?: string
          facility_name?: string | null
          id?: string
          issued_at?: string | null
          plant_name?: string | null
          project_name?: string | null
          pssr_id?: string
          pssr_reason?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sof_certificates_pssr_id_fkey"
            columns: ["pssr_id"]
            isOneToOne: true
            referencedRelation: "pssrs"
            referencedColumns: ["id"]
          },
        ]
      }
      station: {
        Row: {
          created_at: string
          description: string | null
          field_id: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          field_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          field_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "field"
            referencedColumns: ["id"]
          },
        ]
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
      task_dependencies: {
        Row: {
          created_at: string | null
          created_by: string | null
          depends_on_task_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          depends_on_task_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          depends_on_task_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "user_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "user_tasks"
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
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: unknown
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
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
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
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
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
          {
            foreignKeyName: "user_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
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
          {
            foreignKeyName: "user_privileges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
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
          {
            foreignKeyName: "user_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
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
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_signatures: {
        Row: {
          created_at: string
          id: string
          signature_data: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          signature_data: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          signature_data?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_tasks: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          due_date: string | null
          id: string
          metadata: Json | null
          priority: string
          status: string
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority: string
          status?: string
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_widget_configs: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          position: number
          settings: Json | null
          size: string
          updated_at: string
          user_id: string
          widget_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          position?: number
          settings?: Json | null
          size?: string
          updated_at?: string
          user_id: string
          widget_type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          position?: number
          settings?: Json | null
          size?: string
          updated_at?: string
          user_id?: string
          widget_type?: string
        }
        Relationships: []
      }
      vcr_item_categories: {
        Row: {
          code: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      vcr_items: {
        Row: {
          approving_party_role_ids: string[] | null
          category_id: string | null
          created_at: string
          delivering_party_role_id: string | null
          display_order: number
          guidance_notes: string | null
          id: string
          is_active: boolean
          supporting_evidence: string | null
          topic: string | null
          updated_at: string
          vcr_item: string
        }
        Insert: {
          approving_party_role_ids?: string[] | null
          category_id?: string | null
          created_at?: string
          delivering_party_role_id?: string | null
          display_order?: number
          guidance_notes?: string | null
          id?: string
          is_active?: boolean
          supporting_evidence?: string | null
          topic?: string | null
          updated_at?: string
          vcr_item: string
        }
        Update: {
          approving_party_role_ids?: string[] | null
          category_id?: string | null
          created_at?: string
          delivering_party_role_id?: string | null
          display_order?: number
          guidance_notes?: string | null
          id?: string
          is_active?: boolean
          supporting_evidence?: string | null
          topic?: string | null
          updated_at?: string
          vcr_item?: string
        }
        Relationships: [
          {
            foreignKeyName: "vcr_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vcr_item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vcr_items_delivering_party_role_id_fkey"
            columns: ["delivering_party_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      vcr_template_approvers: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          role_id: string
          template_id: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          role_id: string
          template_id: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          role_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vcr_template_approvers_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vcr_template_approvers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "vcr_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      vcr_template_items: {
        Row: {
          created_at: string
          id: string
          template_id: string
          vcr_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          template_id: string
          vcr_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          template_id?: string
          vcr_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vcr_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "vcr_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vcr_template_items_vcr_item_id_fkey"
            columns: ["vcr_item_id"]
            isOneToOne: false
            referencedRelation: "vcr_items"
            referencedColumns: ["id"]
          },
        ]
      }
      vcr_templates: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          delivering_party_role_id: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          receiving_party_role_id: string | null
          sample_evidence: string | null
          status: string
          summary: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          delivering_party_role_id?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          receiving_party_role_id?: string | null
          sample_evidence?: string | null
          status?: string
          summary: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          delivering_party_role_id?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          receiving_party_role_id?: string | null
          sample_evidence?: string | null
          status?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vcr_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "pac_prerequisite_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vcr_templates_delivering_party_role_id_fkey"
            columns: ["delivering_party_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vcr_templates_receiving_party_role_id_fkey"
            columns: ["receiving_party_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_layout_presets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          layout_config: Json
          name: string
          preset_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          layout_config: Json
          name: string
          preset_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          layout_config?: Json
          name?: string
          preset_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_safe: {
        Row: {
          account_status: string | null
          avatar_url: string | null
          commission: string | null
          company: Database["public"]["Enums"]["user_company"] | null
          country_code: string | null
          created_at: string | null
          department: string | null
          email: string | null
          field: string | null
          first_name: string | null
          full_name: string | null
          functional_email: boolean | null
          functional_email_address: string | null
          hub: string | null
          id: string | null
          is_active: boolean | null
          last_login_at: string | null
          last_name: string | null
          manager_id: string | null
          notification_preferences: Json | null
          phone_number: string | null
          plant: string | null
          position: string | null
          preferences: Json | null
          primary_phone: string | null
          role: string | null
          secondary_phone: string | null
          sso_enabled: boolean | null
          station: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          two_factor_enabled: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_status?: string | null
          avatar_url?: string | null
          commission?: string | null
          company?: Database["public"]["Enums"]["user_company"] | null
          country_code?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          field?: string | null
          first_name?: string | null
          full_name?: string | null
          functional_email?: boolean | null
          functional_email_address?: string | null
          hub?: string | null
          id?: string | null
          is_active?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          manager_id?: string | null
          notification_preferences?: Json | null
          phone_number?: string | null
          plant?: string | null
          position?: string | null
          preferences?: Json | null
          primary_phone?: string | null
          role?: string | null
          secondary_phone?: string | null
          sso_enabled?: boolean | null
          station?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_status?: string | null
          avatar_url?: string | null
          commission?: string | null
          company?: Database["public"]["Enums"]["user_company"] | null
          country_code?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          field?: string | null
          first_name?: string | null
          full_name?: string | null
          functional_email?: boolean | null
          functional_email_address?: string | null
          hub?: string | null
          id?: string | null
          is_active?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          manager_id?: string | null
          notification_preferences?: Json | null
          phone_number?: string | null
          plant?: string | null
          position?: string | null
          preferences?: Json | null
          primary_phone?: string | null
          role?: string | null
          secondary_phone?: string | null
          sso_enabled?: boolean | null
          station?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
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
            foreignKeyName: "profiles_field_fkey"
            columns: ["field"]
            isOneToOne: false
            referencedRelation: "field"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_hub_fkey"
            columns: ["hub"]
            isOneToOne: false
            referencedRelation: "hubs"
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
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
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
      projects_enriched: {
        Row: {
          completed_milestone_count: number | null
          created_at: string | null
          created_by: string | null
          document_count: number | null
          hub_id: string | null
          hub_name: string | null
          id: string | null
          is_active: boolean | null
          is_favorite: boolean | null
          is_scorecard: boolean | null
          milestone_count: number | null
          next_milestone_date: string | null
          next_milestone_name: string | null
          plant_id: string | null
          plant_name: string | null
          project_id_number: string | null
          project_id_prefix: string | null
          project_scope: string | null
          project_scope_image_url: string | null
          project_title: string | null
          region_id: string | null
          station_id: string | null
          station_name: string | null
          team_count: number | null
          team_lead_avatar: string | null
          team_lead_name: string | null
          team_lead_user_id: string | null
          updated_at: string | null
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
            foreignKeyName: "projects_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "project_region"
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
      pssr_checklist_items_ordered: {
        Row: {
          approvers: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          responsible: string | null
          sequence_number: number | null
          supporting_evidence: string | null
          topic: string | null
          updated_at: string | null
          updated_by: string | null
          version: number | null
        }
        Insert: {
          approvers?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          responsible?: string | null
          sequence_number?: number | null
          supporting_evidence?: string | null
          topic?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Update: {
          approvers?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          responsible?: string | null
          sequence_number?: number | null
          supporting_evidence?: string | null
          topic?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pssr_checklist_items_category_id_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "pssr_checklist_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_user_account: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      check_orm_plan_access: {
        Args: { plan_id: string; user_id: string }
        Returns: boolean
      }
      cleanup_expired_password_reset_tokens: { Args: never; Returns: number }
      create_password_reset_token: {
        Args: { target_user_id: string }
        Returns: string
      }
      delete_user_account: { Args: { target_user_id: string }; Returns: Json }
      find_deputy_plant_director: {
        Args: { plant_name_param: string }
        Returns: {
          avatar_url: string
          full_name: string
          user_id: string
        }[]
      }
      generate_pssr_code: { Args: { plant_code: string }; Returns: string }
      generate_vcr_code: { Args: { p_project_code: string }; Returns: string }
      get_active_roles: {
        Args: never
        Returns: {
          value: string
        }[]
      }
      get_active_ta2_commissions: {
        Args: never
        Returns: {
          value: string
        }[]
      }
      get_active_ta2_disciplines: {
        Args: never
        Returns: {
          value: string
        }[]
      }
      get_category_ref_id: { Args: { category_name: string }; Returns: string }
      get_enhanced_user_management_data: {
        Args: never
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
      get_roles_by_category: {
        Args: never
        Returns: {
          category_id: string
          category_name: string
          category_order: number
          role_description: string
          role_id: string
          role_name: string
        }[]
      }
      get_safe_profile_data: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          company: Database["public"]["Enums"]["user_company"]
          department: string
          email: string
          first_name: string
          full_name: string
          is_active: boolean
          last_name: string
          phone_number: string
          user_id: string
          user_position: string
        }[]
      }
      get_team_member_info: {
        Args: { member_user_id: string }
        Returns: {
          company: Database["public"]["Enums"]["user_company"]
          department: string
          full_name: string
          user_id: string
          user_position: string
        }[]
      }
      get_unique_topics: {
        Args: never
        Returns: {
          topic: string
        }[]
      }
      get_user_management_data: {
        Args: never
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
      initiate_password_reset: { Args: { user_email: string }; Returns: string }
      reject_user_account: {
        Args: { rejection_reason_text?: string; target_user_id: string }
        Returns: boolean
      }
      reorder_checklist_item: {
        Args: { item_unique_id: string; new_position: number }
        Returns: undefined
      }
      search_team_members: {
        Args: { search_term?: string }
        Returns: {
          company: Database["public"]["Enums"]["user_company"]
          department: string
          full_name: string
          user_id: string
          user_position: string
        }[]
      }
      soft_delete_checklist_item: {
        Args: { p_unique_id: string }
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
      user_is_admin: { Args: { user_uuid: string }; Returns: boolean }
      validate_password_reset_token: {
        Args: { reset_token: string }
        Returns: {
          is_valid: boolean
          token_id: string
          user_id: string
        }[]
      }
    }
    Enums: {
      ora_training_approval_status: "PENDING" | "APPROVED" | "REJECTED"
      ora_training_execution_stage:
        | "NOT_STARTED"
        | "MATERIALS_REQUESTED"
        | "MATERIALS_UNDER_REVIEW"
        | "MATERIALS_APPROVED"
        | "PO_ISSUED"
        | "TRAINEES_IDENTIFIED"
        | "SCHEDULED"
        | "IN_PROGRESS"
        | "COMPLETED"
      ora_training_status:
        | "DRAFT"
        | "PENDING_APPROVAL"
        | "APPROVED"
        | "IN_EXECUTION"
        | "COMPLETED"
        | "CANCELLED"
      orm_deliverable_type:
        | "ASSET_REGISTER"
        | "PREVENTIVE_MAINTENANCE"
        | "BOM_DEVELOPMENT"
        | "OPERATING_SPARES"
        | "IMS_UPDATE"
        | "PM_ACTIVATION"
      orm_workflow_stage:
        | "IN_PROGRESS"
        | "QAQC_REVIEW"
        | "LEAD_REVIEW"
        | "CENTRAL_TEAM_REVIEW"
        | "APPROVED"
        | "REJECTED"
      orp_approval_status: "PENDING" | "APPROVED" | "REJECTED"
      orp_deliverable_status:
        | "NOT_STARTED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "ON_HOLD"
      orp_phase: "ASSESS_SELECT" | "DEFINE" | "EXECUTE"
      orp_status:
        | "DRAFT"
        | "IN_PROGRESS"
        | "PENDING_APPROVAL"
        | "APPROVED"
        | "COMPLETED"
      p2a_approval_stage:
        | "PROJECT_TEAM_REVIEW"
        | "ASSET_TEAM_REVIEW"
        | "OPERATIONS_MANAGER_APPROVAL"
        | "FINAL_SIGNOFF"
      p2a_approval_status: "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED"
      p2a_deliverable_status:
        | "NOT_STARTED"
        | "IN_PROGRESS"
        | "BEHIND_SCHEDULE"
        | "COMPLETED"
        | "NOT_APPLICABLE"
      p2a_handover_point_status: "PENDING" | "IN_PROGRESS" | "READY" | "SIGNED"
      p2a_milestone_source: "MANUAL" | "PRIMAVERA_API"
      p2a_phase: "PAC" | "FAC"
      p2a_plan_status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
      p2a_qualification_status: "PENDING" | "APPROVED" | "REJECTED"
      p2a_status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
      p2a_subsystem_status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
      p2a_system_completion_status:
        | "NOT_STARTED"
        | "IN_PROGRESS"
        | "RFO"
        | "RFSU"
      p2a_system_source_type:
        | "MANUAL"
        | "EXCEL_IMPORT"
        | "API_GOCOMPLETIONS"
        | "API_HUB2"
      p2a_vcr_prerequisite_status:
        | "NOT_STARTED"
        | "IN_PROGRESS"
        | "READY_FOR_REVIEW"
        | "ACCEPTED"
        | "REJECTED"
        | "QUALIFICATION_REQUESTED"
        | "QUALIFICATION_APPROVED"
      pssr_action_status: "open" | "in_progress" | "closed"
      pssr_item_approval_status:
        | "pending"
        | "ready_for_review"
        | "approved"
        | "rejected"
        | "approved_with_action"
      pssr_priority_level: "A" | "B"
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
      ora_training_approval_status: ["PENDING", "APPROVED", "REJECTED"],
      ora_training_execution_stage: [
        "NOT_STARTED",
        "MATERIALS_REQUESTED",
        "MATERIALS_UNDER_REVIEW",
        "MATERIALS_APPROVED",
        "PO_ISSUED",
        "TRAINEES_IDENTIFIED",
        "SCHEDULED",
        "IN_PROGRESS",
        "COMPLETED",
      ],
      ora_training_status: [
        "DRAFT",
        "PENDING_APPROVAL",
        "APPROVED",
        "IN_EXECUTION",
        "COMPLETED",
        "CANCELLED",
      ],
      orm_deliverable_type: [
        "ASSET_REGISTER",
        "PREVENTIVE_MAINTENANCE",
        "BOM_DEVELOPMENT",
        "OPERATING_SPARES",
        "IMS_UPDATE",
        "PM_ACTIVATION",
      ],
      orm_workflow_stage: [
        "IN_PROGRESS",
        "QAQC_REVIEW",
        "LEAD_REVIEW",
        "CENTRAL_TEAM_REVIEW",
        "APPROVED",
        "REJECTED",
      ],
      orp_approval_status: ["PENDING", "APPROVED", "REJECTED"],
      orp_deliverable_status: [
        "NOT_STARTED",
        "IN_PROGRESS",
        "COMPLETED",
        "ON_HOLD",
      ],
      orp_phase: ["ASSESS_SELECT", "DEFINE", "EXECUTE"],
      orp_status: [
        "DRAFT",
        "IN_PROGRESS",
        "PENDING_APPROVAL",
        "APPROVED",
        "COMPLETED",
      ],
      p2a_approval_stage: [
        "PROJECT_TEAM_REVIEW",
        "ASSET_TEAM_REVIEW",
        "OPERATIONS_MANAGER_APPROVAL",
        "FINAL_SIGNOFF",
      ],
      p2a_approval_status: ["PENDING", "IN_PROGRESS", "APPROVED", "REJECTED"],
      p2a_deliverable_status: [
        "NOT_STARTED",
        "IN_PROGRESS",
        "BEHIND_SCHEDULE",
        "COMPLETED",
        "NOT_APPLICABLE",
      ],
      p2a_handover_point_status: ["PENDING", "IN_PROGRESS", "READY", "SIGNED"],
      p2a_milestone_source: ["MANUAL", "PRIMAVERA_API"],
      p2a_phase: ["PAC", "FAC"],
      p2a_plan_status: ["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"],
      p2a_qualification_status: ["PENDING", "APPROVED", "REJECTED"],
      p2a_status: ["DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      p2a_subsystem_status: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
      p2a_system_completion_status: [
        "NOT_STARTED",
        "IN_PROGRESS",
        "RFO",
        "RFSU",
      ],
      p2a_system_source_type: [
        "MANUAL",
        "EXCEL_IMPORT",
        "API_GOCOMPLETIONS",
        "API_HUB2",
      ],
      p2a_vcr_prerequisite_status: [
        "NOT_STARTED",
        "IN_PROGRESS",
        "READY_FOR_REVIEW",
        "ACCEPTED",
        "REJECTED",
        "QUALIFICATION_REQUESTED",
        "QUALIFICATION_APPROVED",
      ],
      pssr_action_status: ["open", "in_progress", "closed"],
      pssr_item_approval_status: [
        "pending",
        "ready_for_review",
        "approved",
        "rejected",
        "approved_with_action",
      ],
      pssr_priority_level: ["A", "B"],
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
