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
      agent_foundation_knowledge: {
        Row: {
          agent_code: string | null
          created_at: string | null
          document_type: string | null
          id: string
          is_active: boolean | null
          knowledge_card: Json | null
          prompt_fragment: string | null
          sort_order: number | null
          template_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          agent_code?: string | null
          created_at?: string | null
          document_type?: string | null
          id?: string
          is_active?: boolean | null
          knowledge_card?: Json | null
          prompt_fragment?: string | null
          sort_order?: number | null
          template_type: string
          title: string
          updated_at?: string | null
        }
        Update: {
          agent_code?: string | null
          created_at?: string | null
          document_type?: string | null
          id?: string
          is_active?: boolean | null
          knowledge_card?: Json | null
          prompt_fragment?: string | null
          sort_order?: number | null
          template_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_navigation_steps: {
        Row: {
          action_type: string
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          max_retries: number | null
          on_failure: string | null
          platform: string
          selector: string | null
          step_order: number
          updated_at: string | null
          value: string | null
          wait_ms: number | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          max_retries?: number | null
          on_failure?: string | null
          platform?: string
          selector?: string | null
          step_order: number
          updated_at?: string | null
          value?: string | null
          wait_ms?: number | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          max_retries?: number | null
          on_failure?: string | null
          platform?: string
          selector?: string | null
          step_order?: number
          updated_at?: string | null
          value?: string | null
          wait_ms?: number | null
        }
        Relationships: []
      }
      agent_training_sessions: {
        Row: {
          agent_code: string
          anonymization_rules: Json | null
          completed_at: string | null
          completeness_score: number | null
          completion_method: string | null
          confidence_level: string | null
          contradiction_flags: Json | null
          correction_history: Json | null
          created_at: string
          document_description: string | null
          document_domain: string | null
          document_name: string | null
          document_revision: string | null
          document_type: string | null
          extracted_tags: string[] | null
          file_mime_type: string | null
          file_path: string | null
          file_size_bytes: number | null
          id: string
          key_learnings: string | null
          knowledge_card: Json | null
          knowledge_status: string | null
          last_test_at: string | null
          last_test_score: number | null
          message_count: number | null
          open_questions_count: number | null
          stale_after: string | null
          status: string
          tags: string[] | null
          test_history: Json | null
          training_duration_seconds: number | null
          transcript: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_code: string
          anonymization_rules?: Json | null
          completed_at?: string | null
          completeness_score?: number | null
          completion_method?: string | null
          confidence_level?: string | null
          contradiction_flags?: Json | null
          correction_history?: Json | null
          created_at?: string
          document_description?: string | null
          document_domain?: string | null
          document_name?: string | null
          document_revision?: string | null
          document_type?: string | null
          extracted_tags?: string[] | null
          file_mime_type?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          key_learnings?: string | null
          knowledge_card?: Json | null
          knowledge_status?: string | null
          last_test_at?: string | null
          last_test_score?: number | null
          message_count?: number | null
          open_questions_count?: number | null
          stale_after?: string | null
          status?: string
          tags?: string[] | null
          test_history?: Json | null
          training_duration_seconds?: number | null
          transcript?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_code?: string
          anonymization_rules?: Json | null
          completed_at?: string | null
          completeness_score?: number | null
          completion_method?: string | null
          confidence_level?: string | null
          contradiction_flags?: Json | null
          correction_history?: Json | null
          created_at?: string
          document_description?: string | null
          document_domain?: string | null
          document_name?: string | null
          document_revision?: string | null
          document_type?: string | null
          extracted_tags?: string[] | null
          file_mime_type?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          key_learnings?: string | null
          knowledge_card?: Json | null
          knowledge_status?: string | null
          last_test_at?: string | null
          last_test_score?: number | null
          message_count?: number | null
          open_questions_count?: number | null
          stale_after?: string | null
          status?: string
          tags?: string[] | null
          test_history?: Json | null
          training_duration_seconds?: number | null
          transcript?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_agent_communications: {
        Row: {
          conversation_id: string | null
          correlation_id: string | null
          created_at: string | null
          id: string
          latency_ms: number | null
          message_type: string
          payload: Json
          source_agent: string
          status: string | null
          target_agent: string
        }
        Insert: {
          conversation_id?: string | null
          correlation_id?: string | null
          created_at?: string | null
          id?: string
          latency_ms?: number | null
          message_type: string
          payload?: Json
          source_agent: string
          status?: string | null
          target_agent: string
        }
        Update: {
          conversation_id?: string | null
          correlation_id?: string | null
          created_at?: string | null
          id?: string
          latency_ms?: number | null
          message_type?: string
          payload?: Json
          source_agent?: string
          status?: string | null
          target_agent?: string
        }
        Relationships: []
      }
      ai_agent_registry: {
        Row: {
          agent_code: string
          capabilities: Json | null
          configuration: Json | null
          created_at: string | null
          description: string | null
          display_name: string
          domain_tags: string[] | null
          id: string
          limitations: Json | null
          model_id: string
          status: string
          system_prompt_version: string | null
          tools_count: number | null
          updated_at: string | null
        }
        Insert: {
          agent_code: string
          capabilities?: Json | null
          configuration?: Json | null
          created_at?: string | null
          description?: string | null
          display_name: string
          domain_tags?: string[] | null
          id?: string
          limitations?: Json | null
          model_id?: string
          status?: string
          system_prompt_version?: string | null
          tools_count?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_code?: string
          capabilities?: Json | null
          configuration?: Json | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          domain_tags?: string[] | null
          id?: string
          limitations?: Json | null
          model_id?: string
          status?: string
          system_prompt_version?: string | null
          tools_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_edge_cases: {
        Row: {
          actual_behavior: string | null
          added_to_regression: boolean | null
          agent_code: string | null
          category: string | null
          created_at: string | null
          expected_behavior: string | null
          id: string
          is_resolved: boolean | null
          resolution: string | null
          resolved_at: string | null
          severity: string | null
          trigger_message: string
        }
        Insert: {
          actual_behavior?: string | null
          added_to_regression?: boolean | null
          agent_code?: string | null
          category?: string | null
          created_at?: string | null
          expected_behavior?: string | null
          id?: string
          is_resolved?: boolean | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string | null
          trigger_message: string
        }
        Update: {
          actual_behavior?: string | null
          added_to_regression?: boolean | null
          agent_code?: string | null
          category?: string | null
          created_at?: string | null
          expected_behavior?: string | null
          id?: string
          is_resolved?: boolean | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string | null
          trigger_message?: string
        }
        Relationships: []
      }
      ai_feedback: {
        Row: {
          agent_name: string
          created_at: string
          feedback_text: string | null
          id: string
          message_id: string | null
          rating: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          agent_name?: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          message_id?: string | null
          rating: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          agent_name?: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          message_id?: string | null
          rating?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_improvements: {
        Row: {
          agent_code: string
          applied_at: string | null
          created_at: string
          current_prompt_hash: string | null
          feedback_summary: Json
          id: string
          reviewed_by: string | null
          status: string
          suggested_changes: Json
        }
        Insert: {
          agent_code?: string
          applied_at?: string | null
          created_at?: string
          current_prompt_hash?: string | null
          feedback_summary?: Json
          id?: string
          reviewed_by?: string | null
          status?: string
          suggested_changes?: Json
        }
        Update: {
          agent_code?: string
          applied_at?: string | null
          created_at?: string
          current_prompt_hash?: string | null
          feedback_summary?: Json
          id?: string
          reviewed_by?: string | null
          status?: string
          suggested_changes?: Json
        }
        Relationships: []
      }
      ai_response_feedback: {
        Row: {
          agent_code: string | null
          conversation_id: string | null
          correction_text: string | null
          created_at: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          rating: string
          response_latency_ms: number | null
          tenant_id: string | null
          tool_calls_used: string[] | null
          user_id: string
        }
        Insert: {
          agent_code?: string | null
          conversation_id?: string | null
          correction_text?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          rating: string
          response_latency_ms?: number | null
          tenant_id?: string | null
          tool_calls_used?: string[] | null
          user_id: string
        }
        Update: {
          agent_code?: string | null
          conversation_id?: string | null
          correction_text?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          rating?: string
          response_latency_ms?: number | null
          tenant_id?: string | null
          tool_calls_used?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_response_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_response_feedback_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_training_log: {
        Row: {
          after_state: Json | null
          agent_code: string | null
          before_state: Json | null
          created_at: string | null
          description: string
          event_type: string
          id: string
          metadata: Json | null
          performed_by: string | null
          test_results: Json | null
          version_label: string | null
        }
        Insert: {
          after_state?: Json | null
          agent_code?: string | null
          before_state?: Json | null
          created_at?: string | null
          description: string
          event_type: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          test_results?: Json | null
          version_label?: string | null
        }
        Update: {
          after_state?: Json | null
          agent_code?: string | null
          before_state?: Json | null
          created_at?: string | null
          description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          test_results?: Json | null
          version_label?: string | null
        }
        Relationships: []
      }
      ai_user_context: {
        Row: {
          context_key: string
          context_value: Json
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context_key: string
          context_value?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context_key?: string
          context_value?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      annotation_replies: {
        Row: {
          annotation_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          annotation_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          annotation_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "annotation_replies_annotation_id_fkey"
            columns: ["annotation_id"]
            isOneToOne: false
            referencedRelation: "attachment_annotations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          allowed_ips: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          integration_type: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_rotated_at: string | null
          last_used_at: string | null
          name: string
          permissions: string[]
          rate_limit_per_minute: number
          rotation_reminder_days: number | null
          tenant_id: string | null
          total_requests: number | null
          updated_at: string
        }
        Insert: {
          allowed_ips?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          integration_type: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_rotated_at?: string | null
          last_used_at?: string | null
          name: string
          permissions?: string[]
          rate_limit_per_minute?: number
          rotation_reminder_days?: number | null
          tenant_id?: string | null
          total_requests?: number | null
          updated_at?: string
        }
        Update: {
          allowed_ips?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          integration_type?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_rotated_at?: string | null
          last_used_at?: string | null
          name?: string
          permissions?: string[]
          rate_limit_per_minute?: number
          rotation_reminder_days?: number | null
          tenant_id?: string | null
          total_requests?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          endpoint: string
          error_message: string | null
          id: string
          ip_address: string | null
          method: string
          request_metadata: Json | null
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method: string
          request_metadata?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method?: string
          request_metadata?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      attachment_annotations: {
        Row: {
          annotation_type: Database["public"]["Enums"]["annotation_type"]
          attachment_id: string
          color: string | null
          content: string | null
          created_at: string
          id: string
          page_number: number | null
          position_data: Json
          resolved: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          annotation_type: Database["public"]["Enums"]["annotation_type"]
          attachment_id: string
          color?: string | null
          content?: string | null
          created_at?: string
          id?: string
          page_number?: number | null
          position_data?: Json
          resolved?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          annotation_type?: Database["public"]["Enums"]["annotation_type"]
          attachment_id?: string
          color?: string | null
          content?: string | null
          created_at?: string
          id?: string
          page_number?: number | null
          position_data?: Json
          resolved?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          category: string
          description: string
          entity_id: string | null
          entity_label: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          severity: string
          tenant_id: string | null
          timestamp: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          category: string
          description: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          severity?: string
          tenant_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          category?: string
          description?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          severity?: string
          tenant_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      backlog_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          tenant_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          tenant_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      deployment_log: {
        Row: {
          changes_summary: Json | null
          created_at: string
          deployed_by: string | null
          deployed_by_name: string | null
          environment: string
          id: string
          release_notes: string | null
          rollback_version_id: string | null
          status: string
          tenant_id: string | null
          version_label: string | null
        }
        Insert: {
          changes_summary?: Json | null
          created_at?: string
          deployed_by?: string | null
          deployed_by_name?: string | null
          environment?: string
          id?: string
          release_notes?: string | null
          rollback_version_id?: string | null
          status?: string
          tenant_id?: string | null
          version_label?: string | null
        }
        Update: {
          changes_summary?: Json | null
          created_at?: string
          deployed_by?: string | null
          deployed_by_name?: string | null
          environment?: string
          id?: string
          release_notes?: string | null
          rollback_version_id?: string | null
          status?: string
          tenant_id?: string | null
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deployment_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      dms_disciplines: {
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
      dms_document_type_acronyms: {
        Row: {
          acronym: string
          created_at: string | null
          full_name: string
          id: string
          is_learned: boolean | null
          learned_from_user_id: string | null
          notes: string | null
          type_code: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          acronym: string
          created_at?: string | null
          full_name: string
          id?: string
          is_learned?: boolean | null
          learned_from_user_id?: string | null
          notes?: string | null
          type_code: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          acronym?: string
          created_at?: string | null
          full_name?: string
          id?: string
          is_learned?: boolean | null
          learned_from_user_id?: string | null
          notes?: string | null
          type_code?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      dms_document_type_secondary_disciplines: {
        Row: {
          created_at: string
          discipline_code: string
          discipline_name: string | null
          document_type_id: string
          id: string
        }
        Insert: {
          created_at?: string
          discipline_code: string
          discipline_name?: string | null
          document_type_id: string
          id?: string
        }
        Update: {
          created_at?: string
          discipline_code?: string
          discipline_name?: string | null
          document_type_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dms_document_type_secondary_disciplines_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "dms_document_types"
            referencedColumns: ["id"]
          },
        ]
      }
      dms_document_types: {
        Row: {
          acceptable_status: string | null
          code: string
          created_at: string
          discipline_code: string | null
          discipline_name: string | null
          display_order: number
          document_description: string | null
          document_name: string
          document_scope: string | null
          id: string
          is_active: boolean
          is_mdr: boolean | null
          is_vendor_document: boolean | null
          package_tag: string | null
          po_number: string | null
          rlmu: string | null
          tier: string | null
          updated_at: string
          vendor_po_sequence: string | null
        }
        Insert: {
          acceptable_status?: string | null
          code: string
          created_at?: string
          discipline_code?: string | null
          discipline_name?: string | null
          display_order?: number
          document_description?: string | null
          document_name: string
          document_scope?: string | null
          id?: string
          is_active?: boolean
          is_mdr?: boolean | null
          is_vendor_document?: boolean | null
          package_tag?: string | null
          po_number?: string | null
          rlmu?: string | null
          tier?: string | null
          updated_at?: string
          vendor_po_sequence?: string | null
        }
        Update: {
          acceptable_status?: string | null
          code?: string
          created_at?: string
          discipline_code?: string | null
          discipline_name?: string | null
          display_order?: number
          document_description?: string | null
          document_name?: string
          document_scope?: string | null
          id?: string
          is_active?: boolean
          is_mdr?: boolean | null
          is_vendor_document?: boolean | null
          package_tag?: string | null
          po_number?: string | null
          rlmu?: string | null
          tier?: string | null
          updated_at?: string
          vendor_po_sequence?: string | null
        }
        Relationships: []
      }
      dms_external_sync: {
        Row: {
          created_at: string | null
          discipline_code: string | null
          dms_platform: string
          document_number: string
          document_title: string | null
          external_url: string | null
          id: string
          last_synced_at: string | null
          metadata: Json | null
          package_tag: string | null
          project_id: string | null
          revision: string | null
          status_code: string | null
          sync_status: string | null
          tenant_id: string | null
          updated_at: string | null
          vendor_po_sequence: string | null
        }
        Insert: {
          created_at?: string | null
          discipline_code?: string | null
          dms_platform: string
          document_number: string
          document_title?: string | null
          external_url?: string | null
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          package_tag?: string | null
          project_id?: string | null
          revision?: string | null
          status_code?: string | null
          sync_status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          vendor_po_sequence?: string | null
        }
        Update: {
          created_at?: string | null
          discipline_code?: string | null
          dms_platform?: string
          document_number?: string
          document_title?: string | null
          external_url?: string | null
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          package_tag?: string | null
          project_id?: string | null
          revision?: string | null
          status_code?: string | null
          sync_status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          vendor_po_sequence?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dms_external_sync_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dms_external_sync_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      dms_field_mappings: {
        Row: {
          assai_field: string | null
          created_at: string | null
          id: string
          notes: string | null
          orsh_field: string
          platform: string
          tenant_id: string | null
        }
        Insert: {
          assai_field?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          orsh_field: string
          platform: string
          tenant_id?: string | null
        }
        Update: {
          assai_field?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          orsh_field?: string
          platform?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dms_field_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dms_numbering_segments: {
        Row: {
          created_at: string
          description: string | null
          example_value: string | null
          id: string
          is_active: boolean
          is_required: boolean
          label: string
          max_length: number
          min_length: number
          position: number
          segment_key: string
          separator: string
          source_code_column: string | null
          source_name_column: string | null
          source_table: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          example_value?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          label: string
          max_length?: number
          min_length?: number
          position?: number
          segment_key: string
          separator?: string
          source_code_column?: string | null
          source_name_column?: string | null
          source_table?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          example_value?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          label?: string
          max_length?: number
          min_length?: number
          position?: number
          segment_key?: string
          separator?: string
          source_code_column?: string | null
          source_name_column?: string | null
          source_table?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dms_numbering_segments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dms_originators: {
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
          display_order?: number
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
      dms_plants: {
        Row: {
          code: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          location: string | null
          plant_name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          location?: string | null
          plant_name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          location?: string | null
          plant_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      dms_projects: {
        Row: {
          cabinet: string | null
          code: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          proj_seq_nr: string | null
          project_id: string | null
          project_name: string
          updated_at: string
        }
        Insert: {
          cabinet?: string | null
          code: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          proj_seq_nr?: string | null
          project_id?: string | null
          project_name: string
          updated_at?: string
        }
        Update: {
          cabinet?: string | null
          code?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          proj_seq_nr?: string | null
          project_id?: string | null
          project_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      dms_reserved_numbers: {
        Row: {
          created_at: string | null
          discipline_code: string | null
          document_number: string
          document_type_code: string
          id: string
          package_tag: string | null
          project_id: string | null
          reserved_at: string | null
          reserved_by: string | null
          source_id: string | null
          source_table: string | null
          status: string | null
          tenant_id: string | null
          unit_code: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discipline_code?: string | null
          document_number: string
          document_type_code: string
          id?: string
          package_tag?: string | null
          project_id?: string | null
          reserved_at?: string | null
          reserved_by?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string | null
          tenant_id?: string | null
          unit_code?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discipline_code?: string | null
          document_number?: string
          document_type_code?: string
          id?: string
          package_tag?: string | null
          project_id?: string | null
          reserved_at?: string | null
          reserved_by?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string | null
          tenant_id?: string | null
          unit_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dms_reserved_numbers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dms_reserved_numbers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      dms_sites: {
        Row: {
          code: string
          comment: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          site_name: string
          updated_at: string
        }
        Insert: {
          code: string
          comment?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          site_name: string
          updated_at?: string
        }
        Update: {
          code?: string
          comment?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          site_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      dms_status_codes: {
        Row: {
          code: string
          created_at: string
          description: string
          display_order: number
          id: string
          is_active: boolean
          rev_suffix: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          display_order?: number
          id?: string
          is_active?: boolean
          rev_suffix?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_active?: boolean
          rev_suffix?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dms_sync_changes: {
        Row: {
          change_type: string
          detected_at: string | null
          document_number: string
          document_sync_id: string | null
          field_changed: string | null
          id: string
          is_vcr_critical: boolean | null
          new_value: string | null
          old_value: string | null
          project_code: string | null
          sync_log_id: string | null
          tenant_id: string | null
        }
        Insert: {
          change_type: string
          detected_at?: string | null
          document_number: string
          document_sync_id?: string | null
          field_changed?: string | null
          id?: string
          is_vcr_critical?: boolean | null
          new_value?: string | null
          old_value?: string | null
          project_code?: string | null
          sync_log_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          change_type?: string
          detected_at?: string | null
          document_number?: string
          document_sync_id?: string | null
          field_changed?: string | null
          id?: string
          is_vcr_critical?: boolean | null
          new_value?: string | null
          old_value?: string | null
          project_code?: string | null
          sync_log_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dms_sync_changes_document_sync_id_fkey"
            columns: ["document_sync_id"]
            isOneToOne: false
            referencedRelation: "dms_external_sync"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dms_sync_changes_sync_log_id_fkey"
            columns: ["sync_log_id"]
            isOneToOne: false
            referencedRelation: "dms_sync_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dms_sync_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dms_sync_credentials: {
        Row: {
          base_url: string | null
          created_at: string | null
          db_name: string | null
          dms_platform: string
          fallback_chain: Json | null
          id: string
          last_sync_at: string | null
          mdr_current_revision: string | null
          mdr_document_number: string | null
          mdr_last_fetched_at: string | null
          password_encrypted: string | null
          primary_method: string | null
          project_code_field: string | null
          sync_enabled: boolean | null
          tenant_id: string | null
          updated_at: string | null
          username_encrypted: string | null
        }
        Insert: {
          base_url?: string | null
          created_at?: string | null
          db_name?: string | null
          dms_platform: string
          fallback_chain?: Json | null
          id?: string
          last_sync_at?: string | null
          mdr_current_revision?: string | null
          mdr_document_number?: string | null
          mdr_last_fetched_at?: string | null
          password_encrypted?: string | null
          primary_method?: string | null
          project_code_field?: string | null
          sync_enabled?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
          username_encrypted?: string | null
        }
        Update: {
          base_url?: string | null
          created_at?: string | null
          db_name?: string | null
          dms_platform?: string
          fallback_chain?: Json | null
          id?: string
          last_sync_at?: string | null
          mdr_current_revision?: string | null
          mdr_document_number?: string | null
          mdr_last_fetched_at?: string | null
          password_encrypted?: string | null
          primary_method?: string | null
          project_code_field?: string | null
          sync_enabled?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
          username_encrypted?: string | null
        }
        Relationships: []
      }
      dms_sync_logs: {
        Row: {
          created_at: string | null
          credential_id: string | null
          dms_platform: string
          error_details: Json | null
          error_message: string | null
          failed_count: number | null
          id: string
          new_documents: number | null
          project_id: string | null
          status_changes: number | null
          sync_route_used: string | null
          sync_status: string | null
          synced_count: number | null
          tenant_id: string | null
          triggered_by: string | null
        }
        Insert: {
          created_at?: string | null
          credential_id?: string | null
          dms_platform: string
          error_details?: Json | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          new_documents?: number | null
          project_id?: string | null
          status_changes?: number | null
          sync_route_used?: string | null
          sync_status?: string | null
          synced_count?: number | null
          tenant_id?: string | null
          triggered_by?: string | null
        }
        Update: {
          created_at?: string | null
          credential_id?: string | null
          dms_platform?: string
          error_details?: Json | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          new_documents?: number | null
          project_id?: string | null
          status_changes?: number | null
          sync_route_used?: string | null
          sync_status?: string | null
          synced_count?: number | null
          tenant_id?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dms_sync_logs_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "dms_sync_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dms_sync_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dms_sync_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      dms_units: {
        Row: {
          code: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          unit_name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          unit_name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          unit_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      dms_vendor_packages: {
        Row: {
          created_at: string | null
          discovered_from_doc: string | null
          discovery_method: string | null
          discovery_source: string | null
          document_type_codes: string[] | null
          first_discovered_at: string | null
          id: string
          last_scanned_at: string | null
          latest_status: string | null
          package_scope: string | null
          package_tag: string | null
          po_number: string | null
          project_code: string | null
          project_id: string | null
          tenant_id: string | null
          total_documents_found: number | null
          updated_at: string | null
          vendor_code: string
          vendor_name: string | null
        }
        Insert: {
          created_at?: string | null
          discovered_from_doc?: string | null
          discovery_method?: string | null
          discovery_source?: string | null
          document_type_codes?: string[] | null
          first_discovered_at?: string | null
          id?: string
          last_scanned_at?: string | null
          latest_status?: string | null
          package_scope?: string | null
          package_tag?: string | null
          po_number?: string | null
          project_code?: string | null
          project_id?: string | null
          tenant_id?: string | null
          total_documents_found?: number | null
          updated_at?: string | null
          vendor_code: string
          vendor_name?: string | null
        }
        Update: {
          created_at?: string | null
          discovered_from_doc?: string | null
          discovery_method?: string | null
          discovery_source?: string | null
          document_type_codes?: string[] | null
          first_discovered_at?: string | null
          id?: string
          last_scanned_at?: string | null
          latest_status?: string | null
          package_scope?: string | null
          package_tag?: string | null
          po_number?: string | null
          project_code?: string | null
          project_id?: string | null
          tenant_id?: string | null
          total_documents_found?: number | null
          updated_at?: string | null
          vendor_code?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dms_vendor_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dms_vendor_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dms_vendor_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_ingest_queue: {
        Row: {
          created_at: string | null
          document_type_id: string | null
          id: string
          priority: number | null
          processed_at: string | null
          project_id: string | null
          status: string | null
          tenant_id: string | null
          vcr_id: string | null
        }
        Insert: {
          created_at?: string | null
          document_type_id?: string | null
          id?: string
          priority?: number | null
          processed_at?: string | null
          project_id?: string | null
          status?: string | null
          tenant_id?: string | null
          vcr_id?: string | null
        }
        Update: {
          created_at?: string | null
          document_type_id?: string | null
          id?: string
          priority?: number | null
          processed_at?: string | null
          project_id?: string | null
          status?: string | null
          tenant_id?: string | null
          vcr_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_ingest_queue_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "dms_document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ingest_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ingest_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      document_packages: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          package_name: string
          package_tag: string
          po_number: string | null
          project_id: string | null
          tenant_id: string | null
          vendor_name: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          package_name: string
          package_tag: string
          po_number?: string | null
          project_id?: string | null
          tenant_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          package_name?: string
          package_tag?: string
          po_number?: string | null
          project_id?: string | null
          tenant_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      document_po_structure: {
        Row: {
          created_at: string | null
          id: string
          package_tag: string | null
          po_description: string | null
          po_number: string | null
          project_id: string | null
          tenant_id: string | null
          vendor_po_sequence: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          package_tag?: string | null
          po_description?: string | null
          po_number?: string | null
          project_id?: string | null
          tenant_id?: string | null
          vendor_po_sequence?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          package_tag?: string | null
          po_description?: string | null
          po_number?: string | null
          project_id?: string | null
          tenant_id?: string | null
          vendor_po_sequence?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_po_structure_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_po_structure_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
        ]
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
      fred_domain_knowledge: {
        Row: {
          category: Database["public"]["Enums"]["fred_training_category"]
          confidence: number
          content: Json
          created_at: string
          id: string
          knowledge_type: Database["public"]["Enums"]["fred_knowledge_type"]
          source_file: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["fred_training_category"]
          confidence?: number
          content?: Json
          created_at?: string
          id?: string
          knowledge_type: Database["public"]["Enums"]["fred_knowledge_type"]
          source_file?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["fred_training_category"]
          confidence?: number
          content?: Json
          created_at?: string
          id?: string
          knowledge_type?: Database["public"]["Enums"]["fred_knowledge_type"]
          source_file?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      fred_interaction_metrics: {
        Row: {
          cascade_depth: number | null
          created_at: string
          error_details: string | null
          id: string
          latency_ms: number | null
          outcome: string
          project_code: string | null
          query_text: string | null
          result_count: number | null
          strategies_tried: string[] | null
          subsystem_code: string | null
          tool_used: string | null
          user_id: string | null
        }
        Insert: {
          cascade_depth?: number | null
          created_at?: string
          error_details?: string | null
          id?: string
          latency_ms?: number | null
          outcome?: string
          project_code?: string | null
          query_text?: string | null
          result_count?: number | null
          strategies_tried?: string[] | null
          subsystem_code?: string | null
          tool_used?: string | null
          user_id?: string | null
        }
        Update: {
          cascade_depth?: number | null
          created_at?: string
          error_details?: string | null
          id?: string
          latency_ms?: number | null
          outcome?: string
          project_code?: string | null
          query_text?: string | null
          result_count?: number | null
          strategies_tried?: string[] | null
          subsystem_code?: string | null
          tool_used?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      fred_kpi_snapshots: {
        Row: {
          created_at: string
          id: string
          kpi_name: string
          kpi_value: number
          metadata: Json | null
          period_end: string
          period_start: string
          period_type: string
          sample_size: number
        }
        Insert: {
          created_at?: string
          id?: string
          kpi_name: string
          kpi_value?: number
          metadata?: Json | null
          period_end: string
          period_start: string
          period_type?: string
          sample_size?: number
        }
        Update: {
          created_at?: string
          id?: string
          kpi_name?: string
          kpi_value?: number
          metadata?: Json | null
          period_end?: string
          period_start?: string
          period_type?: string
          sample_size?: number
        }
        Relationships: []
      }
      fred_resolution_failures: {
        Row: {
          cleaned_query: string
          closest_matches: Json | null
          created_at: string
          first_seen: string
          id: string
          last_seen: string
          occurrence_count: number
          query_text: string
          resolved: boolean
          resolved_as: string | null
        }
        Insert: {
          cleaned_query: string
          closest_matches?: Json | null
          created_at?: string
          first_seen?: string
          id?: string
          last_seen?: string
          occurrence_count?: number
          query_text: string
          resolved?: boolean
          resolved_as?: string | null
        }
        Update: {
          cleaned_query?: string
          closest_matches?: Json | null
          created_at?: string
          first_seen?: string
          id?: string
          last_seen?: string
          occurrence_count?: number
          query_text?: string
          resolved?: boolean
          resolved_as?: string | null
        }
        Relationships: []
      }
      fred_training_documents: {
        Row: {
          category: Database["public"]["Enums"]["fred_training_category"]
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["fred_training_category"]
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["fred_training_category"]
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      fred_training_queue: {
        Row: {
          category: Database["public"]["Enums"]["fred_training_category"]
          created_at: string
          error_details: string | null
          file_path: string
          id: string
          priority: number
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["fred_training_category"]
          created_at?: string
          error_details?: string | null
          file_path: string
          id?: string
          priority?: number
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["fred_training_category"]
          created_at?: string
          error_details?: string | null
          file_path?: string
          id?: string
          priority?: number
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
      mdr_completeness_snapshots: {
        Row: {
          created_at: string | null
          gap_summary: Json | null
          id: string
          project_id: string
          snapshot_date: string
          tenant_id: string | null
          tier1_complete: number | null
          tier1_expected: number | null
          tier2_complete: number | null
          tier2_expected: number | null
          total_at_final_status: number | null
          total_expected: number | null
          total_found: number | null
        }
        Insert: {
          created_at?: string | null
          gap_summary?: Json | null
          id?: string
          project_id: string
          snapshot_date?: string
          tenant_id?: string | null
          tier1_complete?: number | null
          tier1_expected?: number | null
          tier2_complete?: number | null
          tier2_expected?: number | null
          total_at_final_status?: number | null
          total_expected?: number | null
          total_found?: number | null
        }
        Update: {
          created_at?: string | null
          gap_summary?: Json | null
          id?: string
          project_id?: string
          snapshot_date?: string
          tenant_id?: string | null
          tier1_complete?: number | null
          tier1_expected?: number | null
          tier2_complete?: number | null
          tier2_expected?: number | null
          total_at_final_status?: number | null
          total_expected?: number | null
          total_found?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mdr_completeness_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mdr_completeness_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mdr_completeness_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mdr_register: {
        Row: {
          created_at: string | null
          current_revision: string | null
          current_status: string | null
          discipline_code: string | null
          document_number: string
          document_type_code: string | null
          final_rev_requirement: string | null
          id: string
          is_found_in_dms: boolean | null
          is_tier1: boolean | null
          is_tier2: boolean | null
          last_checked_at: string | null
          mdr_source_doc: string | null
          originator_code: string | null
          project_id: string
          tenant_id: string | null
          title: string | null
          unit_code: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_revision?: string | null
          current_status?: string | null
          discipline_code?: string | null
          document_number: string
          document_type_code?: string | null
          final_rev_requirement?: string | null
          id?: string
          is_found_in_dms?: boolean | null
          is_tier1?: boolean | null
          is_tier2?: boolean | null
          last_checked_at?: string | null
          mdr_source_doc?: string | null
          originator_code?: string | null
          project_id: string
          tenant_id?: string | null
          title?: string | null
          unit_code?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_revision?: string | null
          current_status?: string | null
          discipline_code?: string | null
          document_number?: string
          document_type_code?: string | null
          final_rev_requirement?: string | null
          id?: string
          is_found_in_dms?: boolean | null
          is_tier1?: boolean | null
          is_tier2?: boolean | null
          last_checked_at?: string | null
          mdr_source_doc?: string | null
          originator_code?: string | null
          project_id?: string
          tenant_id?: string | null
          title?: string | null
          unit_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mdr_register_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mdr_register_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mdr_register_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      moc_register: {
        Row: {
          actions_complete: number | null
          actions_total: number | null
          change_type: string | null
          created_at: string | null
          description: string | null
          id: string
          ivan_closeout_assessment: string | null
          moc_number: string | null
          new_hazard_introduced: boolean | null
          project_id: string | null
          startup_risk_flag: boolean | null
          status: string | null
          tenant_id: string | null
          title: string | null
        }
        Insert: {
          actions_complete?: number | null
          actions_total?: number | null
          change_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ivan_closeout_assessment?: string | null
          moc_number?: string | null
          new_hazard_introduced?: boolean | null
          project_id?: string | null
          startup_risk_flag?: boolean | null
          status?: string | null
          tenant_id?: string | null
          title?: string | null
        }
        Update: {
          actions_complete?: number | null
          actions_total?: number | null
          change_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ivan_closeout_assessment?: string | null
          moc_number?: string | null
          new_hazard_introduced?: boolean | null
          project_id?: string | null
          startup_risk_flag?: boolean | null
          status?: string | null
          tenant_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moc_register_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moc_register_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          activity: string
          activity_code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          duration_high: number | null
          duration_low: number | null
          duration_med: number | null
          id: string
          is_active: boolean | null
          parent_activity_id: string | null
          phase_id: string | null
          updated_at: string | null
        }
        Insert: {
          activity: string
          activity_code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          duration_high?: number | null
          duration_low?: number | null
          duration_med?: number | null
          id?: string
          is_active?: boolean | null
          parent_activity_id?: string | null
          phase_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activity?: string
          activity_code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          duration_high?: number | null
          duration_low?: number | null
          duration_med?: number | null
          id?: string
          is_active?: boolean | null
          parent_activity_id?: string | null
          phase_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ora_activity_catalog_parent_activity_id_fkey"
            columns: ["parent_activity_id"]
            isOneToOne: false
            referencedRelation: "ora_activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ora_activity_catalog_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "orp_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      ora_activity_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          ora_plan_activity_id: string
          orp_plan_id: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          ora_plan_activity_id: string
          orp_plan_id: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          ora_plan_activity_id?: string
          orp_plan_id?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ora_activity_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      ora_plan_activities: {
        Row: {
          activity_code: string
          assigned_to: string | null
          completion_percentage: number | null
          created_at: string | null
          description: string | null
          duration_days: number | null
          end_date: string | null
          id: string
          name: string
          orp_plan_id: string
          parent_id: string | null
          source_ref_id: string | null
          source_ref_table: string | null
          source_type: string
          start_date: string | null
          status: string
          task_id: string | null
          updated_at: string | null
        }
        Insert: {
          activity_code: string
          assigned_to?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          name: string
          orp_plan_id: string
          parent_id?: string | null
          source_ref_id?: string | null
          source_ref_table?: string | null
          source_type?: string
          start_date?: string | null
          status?: string
          task_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_code?: string
          assigned_to?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          name?: string
          orp_plan_id?: string
          parent_id?: string | null
          source_ref_id?: string | null
          source_ref_table?: string | null
          source_type?: string
          start_date?: string | null
          status?: string
          task_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ora_plan_activities_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ora_plan_activities_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ora_plan_activities_orp_plan_id_fkey"
            columns: ["orp_plan_id"]
            isOneToOne: false
            referencedRelation: "orp_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ora_plan_activities_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ora_plan_activities"
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
      ori_scores: {
        Row: {
          at_risk_count: number | null
          blocked_count: number | null
          calculated_at: string
          calculated_by: string | null
          completed_count: number | null
          confidence_level: string | null
          critical_path_score: number | null
          critical_path_stability_index: number | null
          dimension_scores: Json | null
          id: string
          module_scores: Json
          node_count: number | null
          notes: string | null
          overall_score: number
          project_id: string
          risk_penalty_total: number | null
          schedule_adherence_index: number | null
          schedule_variance_days: number | null
          snapshot_type: string
          startup_confidence_score: number | null
          tenant_id: string | null
          weight_profile_id: string | null
        }
        Insert: {
          at_risk_count?: number | null
          blocked_count?: number | null
          calculated_at?: string
          calculated_by?: string | null
          completed_count?: number | null
          confidence_level?: string | null
          critical_path_score?: number | null
          critical_path_stability_index?: number | null
          dimension_scores?: Json | null
          id?: string
          module_scores?: Json
          node_count?: number | null
          notes?: string | null
          overall_score?: number
          project_id: string
          risk_penalty_total?: number | null
          schedule_adherence_index?: number | null
          schedule_variance_days?: number | null
          snapshot_type?: string
          startup_confidence_score?: number | null
          tenant_id?: string | null
          weight_profile_id?: string | null
        }
        Update: {
          at_risk_count?: number | null
          blocked_count?: number | null
          calculated_at?: string
          calculated_by?: string | null
          completed_count?: number | null
          confidence_level?: string | null
          critical_path_score?: number | null
          critical_path_stability_index?: number | null
          dimension_scores?: Json | null
          id?: string
          module_scores?: Json
          node_count?: number | null
          notes?: string | null
          overall_score?: number
          project_id?: string
          risk_penalty_total?: number | null
          schedule_adherence_index?: number | null
          schedule_variance_days?: number | null
          snapshot_type?: string
          startup_confidence_score?: number | null
          tenant_id?: string | null
          weight_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ori_scores_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ori_scores_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ori_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ori_scores_weight_profile_id_fkey"
            columns: ["weight_profile_id"]
            isOneToOne: false
            referencedRelation: "ori_weight_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ori_weight_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          tenant_id: string | null
          updated_at: string
          weights: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          tenant_id?: string | null
          updated_at?: string
          weights?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          tenant_id?: string | null
          updated_at?: string
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ori_weight_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "orm_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      orp_approval_history: {
        Row: {
          approved_at: string | null
          comments: string | null
          created_at: string | null
          cycle: number
          display_order: number | null
          id: string
          original_approval_id: string | null
          orp_plan_id: string
          role_name: string
          status: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          comments?: string | null
          created_at?: string | null
          cycle?: number
          display_order?: number | null
          id?: string
          original_approval_id?: string | null
          orp_plan_id: string
          role_name: string
          status?: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          comments?: string | null
          created_at?: string | null
          cycle?: number
          display_order?: number | null
          id?: string
          original_approval_id?: string | null
          orp_plan_id?: string
          role_name?: string
          status?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orp_approval_history_orp_plan_id_fkey"
            columns: ["orp_plan_id"]
            isOneToOne: false
            referencedRelation: "orp_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orp_approval_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      orp_phases: {
        Row: {
          code: string
          created_at: string | null
          display_order: number
          id: string
          is_active: boolean | null
          label: string
          prefix: string
        }
        Insert: {
          code: string
          created_at?: string | null
          display_order: number
          id?: string
          is_active?: boolean | null
          label: string
          prefix: string
        }
        Update: {
          code?: string
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          label?: string
          prefix?: string
        }
        Relationships: []
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
          last_rejected_at: string | null
          last_rejected_by_name: string | null
          last_rejected_by_role: string | null
          last_rejection_comment: string | null
          ora_engineer_id: string
          phase: Database["public"]["Enums"]["orp_phase"]
          project_id: string
          status: Database["public"]["Enums"]["orp_status"]
          tenant_id: string | null
          updated_at: string
          wizard_state: Json | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          last_rejected_at?: string | null
          last_rejected_by_name?: string | null
          last_rejected_by_role?: string | null
          last_rejection_comment?: string | null
          ora_engineer_id: string
          phase: Database["public"]["Enums"]["orp_phase"]
          project_id: string
          status?: Database["public"]["Enums"]["orp_status"]
          tenant_id?: string | null
          updated_at?: string
          wizard_state?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          last_rejected_at?: string | null
          last_rejected_by_name?: string | null
          last_rejected_by_role?: string | null
          last_rejection_comment?: string | null
          ora_engineer_id?: string
          phase?: Database["public"]["Enums"]["orp_phase"]
          project_id?: string
          status?: Database["public"]["Enums"]["orp_status"]
          tenant_id?: string | null
          updated_at?: string
          wizard_state?: Json | null
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
          {
            foreignKeyName: "orp_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      override_register: {
        Row: {
          actual_removal_date: string | null
          authorised_by: string | null
          created_at: string | null
          expected_removal_date: string | null
          id: string
          override_description: string | null
          override_reason: string | null
          project_id: string | null
          raised_by: string | null
          raised_date: string | null
          risk_level: string | null
          sif_tag: string | null
          status: string | null
          system_name: string | null
          tenant_id: string | null
        }
        Insert: {
          actual_removal_date?: string | null
          authorised_by?: string | null
          created_at?: string | null
          expected_removal_date?: string | null
          id?: string
          override_description?: string | null
          override_reason?: string | null
          project_id?: string | null
          raised_by?: string | null
          raised_date?: string | null
          risk_level?: string | null
          sif_tag?: string | null
          status?: string | null
          system_name?: string | null
          tenant_id?: string | null
        }
        Update: {
          actual_removal_date?: string | null
          authorised_by?: string | null
          created_at?: string | null
          expected_removal_date?: string | null
          id?: string
          override_description?: string | null
          override_reason?: string | null
          project_id?: string | null
          raised_by?: string | null
          raised_date?: string | null
          risk_level?: string | null
          sif_tag?: string | null
          status?: string | null
          system_name?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "override_register_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "override_register_project_id_fkey"
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
      p2a_approver_history: {
        Row: {
          approved_at: string | null
          archived_at: string | null
          comments: string | null
          created_at: string | null
          cycle: number
          display_order: number
          handover_id: string
          id: string
          original_approver_id: string | null
          role_name: string
          status: string
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          archived_at?: string | null
          comments?: string | null
          created_at?: string | null
          cycle?: number
          display_order?: number
          handover_id: string
          id?: string
          original_approver_id?: string | null
          role_name: string
          status: string
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          archived_at?: string | null
          comments?: string | null
          created_at?: string | null
          cycle?: number
          display_order?: number
          handover_id?: string
          id?: string
          original_approver_id?: string | null
          role_name?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "p2a_approver_history_handover_id_fkey"
            columns: ["handover_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_plans"
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
          dms_platforms: string[] | null
          id: string
          last_rejected_at: string | null
          last_rejected_by_name: string | null
          last_rejected_by_role: string | null
          last_rejection_comment: string | null
          name: string
          ora_plan_id: string | null
          plant_code: string | null
          project_code: string | null
          project_id: string | null
          status: Database["public"]["Enums"]["p2a_plan_status"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          dms_platforms?: string[] | null
          id?: string
          last_rejected_at?: string | null
          last_rejected_by_name?: string | null
          last_rejected_by_role?: string | null
          last_rejection_comment?: string | null
          name: string
          ora_plan_id?: string | null
          plant_code?: string | null
          project_code?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["p2a_plan_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          dms_platforms?: string[] | null
          id?: string
          last_rejected_at?: string | null
          last_rejected_by_name?: string | null
          last_rejected_by_role?: string | null
          last_rejection_comment?: string | null
          name?: string
          ora_plan_id?: string | null
          plant_code?: string | null
          project_code?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["p2a_plan_status"]
          tenant_id?: string | null
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
          {
            foreignKeyName: "p2a_handover_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "p2a_handovers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          dms_document_type_id: string | null
          doc_code: string | null
          handover_point_id: string
          id: string
          notes: string | null
          responsible_person: string | null
          rlmu_required: boolean
          rlmu_status: string | null
          status: string
          system_id: string | null
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
          dms_document_type_id?: string | null
          doc_code?: string | null
          handover_point_id: string
          id?: string
          notes?: string | null
          responsible_person?: string | null
          rlmu_required?: boolean
          rlmu_status?: string | null
          status?: string
          system_id?: string | null
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
          dms_document_type_id?: string | null
          doc_code?: string | null
          handover_point_id?: string
          id?: string
          notes?: string | null
          responsible_person?: string | null
          rlmu_required?: boolean
          rlmu_status?: string | null
          status?: string
          system_id?: string | null
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
          {
            foreignKeyName: "p2a_vcr_critical_docs_dms_document_type_id_fkey"
            columns: ["dms_document_type_id"]
            isOneToOne: false
            referencedRelation: "dms_document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2a_vcr_critical_docs_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "p2a_systems"
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
          dms_status: string | null
          document_number: string | null
          document_type_code: string | null
          handover_point_id: string
          id: string
          notes: string | null
          responsible_person: string | null
          rlmu_file_path: string | null
          rlmu_status: string | null
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
          dms_status?: string | null
          document_number?: string | null
          document_type_code?: string | null
          handover_point_id: string
          id?: string
          notes?: string | null
          responsible_person?: string | null
          rlmu_file_path?: string | null
          rlmu_status?: string | null
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
          dms_status?: string | null
          document_number?: string | null
          document_type_code?: string | null
          handover_point_id?: string
          id?: string
          notes?: string | null
          responsible_person?: string | null
          rlmu_file_path?: string | null
          rlmu_status?: string | null
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
          dms_status: string | null
          document_number: string | null
          document_type_code: string | null
          handover_point_id: string
          id: string
          name: string | null
          notes: string | null
          register_type: string | null
          responsible_person: string | null
          rlmu_file_path: string | null
          rlmu_status: string | null
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
          dms_status?: string | null
          document_number?: string | null
          document_type_code?: string | null
          handover_point_id: string
          id?: string
          name?: string | null
          notes?: string | null
          register_type?: string | null
          responsible_person?: string | null
          rlmu_file_path?: string | null
          rlmu_status?: string | null
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
          dms_status?: string | null
          document_number?: string | null
          document_type_code?: string | null
          handover_point_id?: string
          id?: string
          name?: string | null
          notes?: string | null
          register_type?: string | null
          responsible_person?: string | null
          rlmu_file_path?: string | null
          rlmu_status?: string | null
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
      permission_review_campaigns: {
        Row: {
          completed_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          scheduled_date: string
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          scheduled_date: string
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          scheduled_date?: string
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_review_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_review_items: {
        Row: {
          campaign_id: string
          created_at: string
          current_permissions: string[] | null
          current_role_id: string | null
          decision: string | null
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          current_permissions?: string[] | null
          current_role_id?: string | null
          decision?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          current_permissions?: string[] | null
          current_role_id?: string | null
          decision?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_review_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "permission_review_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_review_items_current_role_id_fkey"
            columns: ["current_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_backlog: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string
          group_id: string | null
          id: string
          priority: string
          sort_order: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description: string
          group_id?: string | null
          id?: string
          priority?: string
          sort_order?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string
          group_id?: string | null
          id?: string
          priority?: string
          sort_order?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_backlog_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "backlog_groups"
            referencedColumns: ["id"]
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
          offboard_notes: string | null
          offboarded_at: string | null
          offboarded_by: string | null
          onboarding_completed: boolean | null
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
          stale_flagged_at: string | null
          station: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          temporary_password: string | null
          tenant_id: string | null
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
          offboard_notes?: string | null
          offboarded_at?: string | null
          offboarded_by?: string | null
          onboarding_completed?: boolean | null
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
          stale_flagged_at?: string | null
          station?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          temporary_password?: string | null
          tenant_id?: string | null
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
          offboard_notes?: string | null
          offboarded_at?: string | null
          offboarded_by?: string | null
          onboarding_completed?: boolean | null
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
          stale_flagged_at?: string | null
          station?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          temporary_password?: string | null
          tenant_id?: string | null
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
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_lead?: boolean | null
          project_id: string
          role: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_lead?: boolean | null
          project_id?: string
          role?: string
          tenant_id?: string | null
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
          {
            foreignKeyName: "project_team_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          approving_role: string | null
          approving_user_id: string | null
          checklist_item_id: string
          created_at: string
          delivering_role: string | null
          delivering_user_id: string | null
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
          approving_role?: string | null
          approving_user_id?: string | null
          checklist_item_id: string
          created_at?: string
          delivering_role?: string | null
          delivering_user_id?: string | null
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
          approving_role?: string | null
          approving_user_id?: string | null
          checklist_item_id?: string
          created_at?: string
          delivering_role?: string | null
          delivering_user_id?: string | null
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
            foreignKeyName: "pssr_checklist_responses_approving_user_id_fkey"
            columns: ["approving_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pssr_checklist_responses_approving_user_id_fkey"
            columns: ["approving_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pssr_checklist_responses_delivering_user_id_fkey"
            columns: ["delivering_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pssr_checklist_responses_delivering_user_id_fkey"
            columns: ["delivering_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
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
          default_pssr_lead_role_id: string | null
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
          default_pssr_lead_role_id?: string | null
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
          default_pssr_lead_role_id?: string | null
          id?: string
          pssr_approver_role_ids?: string[] | null
          reason_id?: string
          sof_approver_role_ids?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pssr_reason_configuration_default_pssr_lead_role_id_fkey"
            columns: ["default_pssr_lead_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
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
          category_progress: Json | null
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
          key_activity_dates: Json | null
          moc_number: string | null
          plant: string | null
          plant_id: string | null
          progress_percentage: number
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
          tenant_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          asset: string
          category_progress?: Json | null
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
          key_activity_dates?: Json | null
          moc_number?: string | null
          plant?: string | null
          plant_id?: string | null
          progress_percentage?: number
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
          tenant_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          asset?: string
          category_progress?: Json | null
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
          key_activity_dates?: Json | null
          moc_number?: string | null
          plant?: string | null
          plant_id?: string | null
          progress_percentage?: number
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "pssrs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      publish_checklist_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_required: boolean
          label: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_required?: boolean
          label: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_required?: boolean
          label?: string
        }
        Relationships: []
      }
      readiness_dependencies: {
        Row: {
          created_at: string
          created_by: string | null
          dependency_type: Database["public"]["Enums"]["dependency_type"]
          description: string | null
          from_node_id: string
          id: string
          is_critical: boolean | null
          project_id: string
          to_node_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dependency_type?: Database["public"]["Enums"]["dependency_type"]
          description?: string | null
          from_node_id: string
          id?: string
          is_critical?: boolean | null
          project_id: string
          to_node_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dependency_type?: Database["public"]["Enums"]["dependency_type"]
          description?: string | null
          from_node_id?: string
          id?: string
          is_critical?: boolean | null
          project_id?: string
          to_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "readiness_dependencies_from_node_id_fkey"
            columns: ["from_node_id"]
            isOneToOne: false
            referencedRelation: "readiness_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "readiness_dependencies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "readiness_dependencies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "readiness_dependencies_to_node_id_fkey"
            columns: ["to_node_id"]
            isOneToOne: false
            referencedRelation: "readiness_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      readiness_nodes: {
        Row: {
          completion_pct: number | null
          confidence_factor: number | null
          created_at: string
          description: string | null
          dimension_id: string | null
          id: string
          label: string
          metadata: Json | null
          module: string
          node_type: Database["public"]["Enums"]["readiness_node_type"]
          phase: string | null
          project_id: string
          risk_severity: string | null
          source_id: string
          source_table: string
          status: Database["public"]["Enums"]["readiness_node_status"]
          tenant_id: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          completion_pct?: number | null
          confidence_factor?: number | null
          created_at?: string
          description?: string | null
          dimension_id?: string | null
          id?: string
          label: string
          metadata?: Json | null
          module: string
          node_type: Database["public"]["Enums"]["readiness_node_type"]
          phase?: string | null
          project_id: string
          risk_severity?: string | null
          source_id: string
          source_table: string
          status?: Database["public"]["Enums"]["readiness_node_status"]
          tenant_id?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          completion_pct?: number | null
          confidence_factor?: number | null
          created_at?: string
          description?: string | null
          dimension_id?: string | null
          id?: string
          label?: string
          metadata?: Json | null
          module?: string
          node_type?: Database["public"]["Enums"]["readiness_node_type"]
          phase?: string | null
          project_id?: string
          risk_severity?: string | null
          source_id?: string
          source_table?: string
          status?: Database["public"]["Enums"]["readiness_node_status"]
          tenant_id?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "readiness_nodes_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "vcr_item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "readiness_nodes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "readiness_nodes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "readiness_nodes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rlmu_reviews: {
        Row: {
          created_at: string | null
          file_path: string
          findings: Json | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string
          source_table: string
          verdict: string
        }
        Insert: {
          created_at?: string | null
          file_path: string
          findings?: Json | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id: string
          source_table: string
          verdict: string
        }
        Update: {
          created_at?: string | null
          file_path?: string
          findings?: Json | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string
          source_table?: string
          verdict?: string
        }
        Relationships: []
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
      role_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["app_permission"]
          role_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission: Database["public"]["Enums"]["app_permission"]
          role_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
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
          parent_role_id: string | null
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
          parent_role_id?: string | null
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
          parent_role_id?: string | null
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
          {
            foreignKeyName: "roles_parent_role_id_fkey"
            columns: ["parent_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_completeness_snapshots: {
        Row: {
          created_at: string | null
          gap_summary: Json | null
          id: string
          overdue_count: number | null
          po_number: string | null
          project_id: string
          snapshot_date: string
          tenant_id: string | null
          total_at_required_status: number | null
          total_expected: number | null
          total_found: number | null
          vendor_code: string | null
        }
        Insert: {
          created_at?: string | null
          gap_summary?: Json | null
          id?: string
          overdue_count?: number | null
          po_number?: string | null
          project_id: string
          snapshot_date?: string
          tenant_id?: string | null
          total_at_required_status?: number | null
          total_expected?: number | null
          total_found?: number | null
          vendor_code?: string | null
        }
        Update: {
          created_at?: string | null
          gap_summary?: Json | null
          id?: string
          overdue_count?: number | null
          po_number?: string | null
          project_id?: string
          snapshot_date?: string
          tenant_id?: string | null
          total_at_required_status?: number | null
          total_expected?: number | null
          total_found?: number | null
          vendor_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sdr_completeness_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_completeness_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_completeness_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_register: {
        Row: {
          created_at: string | null
          current_revision: string | null
          current_status: string | null
          discipline_code: string | null
          document_number: string
          document_type_code: string | null
          id: string
          is_found_in_dms: boolean | null
          last_checked_at: string | null
          originator_code: string | null
          planned_submission_date: string | null
          po_number: string | null
          project_id: string
          sdr_source_doc: string | null
          sdrl_code: string | null
          supplier_document_number: string | null
          tenant_id: string | null
          title: string | null
          unit_code: string | null
          updated_at: string | null
          vendor_code: string | null
        }
        Insert: {
          created_at?: string | null
          current_revision?: string | null
          current_status?: string | null
          discipline_code?: string | null
          document_number: string
          document_type_code?: string | null
          id?: string
          is_found_in_dms?: boolean | null
          last_checked_at?: string | null
          originator_code?: string | null
          planned_submission_date?: string | null
          po_number?: string | null
          project_id: string
          sdr_source_doc?: string | null
          sdrl_code?: string | null
          supplier_document_number?: string | null
          tenant_id?: string | null
          title?: string | null
          unit_code?: string | null
          updated_at?: string | null
          vendor_code?: string | null
        }
        Update: {
          created_at?: string | null
          current_revision?: string | null
          current_status?: string | null
          discipline_code?: string | null
          document_number?: string
          document_type_code?: string | null
          id?: string
          is_found_in_dms?: boolean | null
          last_checked_at?: string | null
          originator_code?: string | null
          planned_submission_date?: string | null
          po_number?: string | null
          project_id?: string
          sdr_source_doc?: string | null
          sdrl_code?: string | null
          supplier_document_number?: string | null
          tenant_id?: string | null
          title?: string | null
          unit_code?: string | null
          updated_at?: string | null
          vendor_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sdr_register_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_register_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_register_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      selma_config_snapshot: {
        Row: {
          config_data: Json
          config_hash: string | null
          config_type: string
          id: string
          last_synced_at: string | null
          tenant_id: string | null
        }
        Insert: {
          config_data?: Json
          config_hash?: string | null
          config_type: string
          id?: string
          last_synced_at?: string | null
          tenant_id?: string | null
        }
        Update: {
          config_data?: Json
          config_hash?: string | null
          config_type?: string
          id?: string
          last_synced_at?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "selma_config_snapshot_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      selma_document_type_knowledge: {
        Row: {
          avg_page_count: number | null
          common_statuses: Json | null
          confidence: number | null
          created_at: string
          cross_references: Json | null
          documents_analyzed: number | null
          handover_relevance: string | null
          id: string
          key_themes: Json | null
          last_trained_at: string | null
          purpose: string | null
          sample_projects: Json | null
          selma_tips: string | null
          type_code: string
          type_name: string
          typical_structure: Json | null
          updated_at: string
        }
        Insert: {
          avg_page_count?: number | null
          common_statuses?: Json | null
          confidence?: number | null
          created_at?: string
          cross_references?: Json | null
          documents_analyzed?: number | null
          handover_relevance?: string | null
          id?: string
          key_themes?: Json | null
          last_trained_at?: string | null
          purpose?: string | null
          sample_projects?: Json | null
          selma_tips?: string | null
          type_code: string
          type_name: string
          typical_structure?: Json | null
          updated_at?: string
        }
        Update: {
          avg_page_count?: number | null
          common_statuses?: Json | null
          confidence?: number | null
          created_at?: string
          cross_references?: Json | null
          documents_analyzed?: number | null
          handover_relevance?: string | null
          id?: string
          key_themes?: Json | null
          last_trained_at?: string | null
          purpose?: string | null
          sample_projects?: Json | null
          selma_tips?: string | null
          type_code?: string
          type_name?: string
          typical_structure?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      selma_interaction_metrics: {
        Row: {
          agent_routed: string | null
          analysis_completed: boolean | null
          analysis_latency_ms: number | null
          cascade_depth: number | null
          conversation_id: string | null
          created_at: string
          document_number: string | null
          documents_found: number | null
          download_attempted: boolean | null
          download_latency_ms: number | null
          download_success: boolean | null
          error_details: string | null
          id: string
          intent_detected: string | null
          outcome: string | null
          pages_processed: number | null
          query_text: string | null
          routing_method: string | null
          search_latency_ms: number | null
          search_strategy_used: Json | null
          tenant_id: string | null
          tool_calls: string[] | null
          total_latency_ms: number | null
          user_feedback: string | null
          user_id: string
        }
        Insert: {
          agent_routed?: string | null
          analysis_completed?: boolean | null
          analysis_latency_ms?: number | null
          cascade_depth?: number | null
          conversation_id?: string | null
          created_at?: string
          document_number?: string | null
          documents_found?: number | null
          download_attempted?: boolean | null
          download_latency_ms?: number | null
          download_success?: boolean | null
          error_details?: string | null
          id?: string
          intent_detected?: string | null
          outcome?: string | null
          pages_processed?: number | null
          query_text?: string | null
          routing_method?: string | null
          search_latency_ms?: number | null
          search_strategy_used?: Json | null
          tenant_id?: string | null
          tool_calls?: string[] | null
          total_latency_ms?: number | null
          user_feedback?: string | null
          user_id: string
        }
        Update: {
          agent_routed?: string | null
          analysis_completed?: boolean | null
          analysis_latency_ms?: number | null
          cascade_depth?: number | null
          conversation_id?: string | null
          created_at?: string
          document_number?: string | null
          documents_found?: number | null
          download_attempted?: boolean | null
          download_latency_ms?: number | null
          download_success?: boolean | null
          error_details?: string | null
          id?: string
          intent_detected?: string | null
          outcome?: string | null
          pages_processed?: number | null
          query_text?: string | null
          routing_method?: string | null
          search_latency_ms?: number | null
          search_strategy_used?: Json | null
          tenant_id?: string | null
          tool_calls?: string[] | null
          total_latency_ms?: number | null
          user_feedback?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selma_interaction_metrics_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selma_interaction_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      selma_kpi_snapshots: {
        Row: {
          created_at: string
          id: string
          kpi_name: string
          kpi_value: number
          metadata: Json | null
          period_end: string
          period_start: string
          sample_size: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          kpi_name: string
          kpi_value: number
          metadata?: Json | null
          period_end: string
          period_start: string
          sample_size?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          kpi_name?: string
          kpi_value?: number
          metadata?: Json | null
          period_end?: string
          period_start?: string
          sample_size?: number | null
        }
        Relationships: []
      }
      selma_learned_strategies: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          is_active: boolean | null
          learned_value: Json
          source: string | null
          strategy_type: string
          success_rate: number | null
          times_applied: number | null
          trigger_pattern: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          learned_value?: Json
          source?: string | null
          strategy_type: string
          success_rate?: number | null
          times_applied?: number | null
          trigger_pattern: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          learned_value?: Json
          source?: string | null
          strategy_type?: string
          success_rate?: number | null
          times_applied?: number | null
          trigger_pattern?: string
          updated_at?: string
        }
        Relationships: []
      }
      selma_resolution_failures: {
        Row: {
          cleaned_query: string
          created_at: string
          first_seen: string
          id: string
          last_seen: string
          levenshtein_top3: Json | null
          occurrence_count: number
          query_text: string
          resolved: boolean
          resolved_as: string | null
        }
        Insert: {
          cleaned_query: string
          created_at?: string
          first_seen?: string
          id?: string
          last_seen?: string
          levenshtein_top3?: Json | null
          occurrence_count?: number
          query_text: string
          resolved?: boolean
          resolved_as?: string | null
        }
        Update: {
          cleaned_query?: string
          created_at?: string
          first_seen?: string
          id?: string
          last_seen?: string
          levenshtein_top3?: Json | null
          occurrence_count?: number
          query_text?: string
          resolved?: boolean
          resolved_as?: string | null
        }
        Relationships: []
      }
      selma_training_queue: {
        Row: {
          created_at: string
          documents_sampled: Json | null
          error_details: string | null
          id: string
          last_attempt: string | null
          priority: number
          status: string
          type_code: string
          type_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          documents_sampled?: Json | null
          error_details?: string | null
          id?: string
          last_attempt?: string | null
          priority?: number
          status?: string
          type_code: string
          type_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          documents_sampled?: Json | null
          error_details?: string | null
          id?: string
          last_attempt?: string | null
          priority?: number
          status?: string
          type_code?: string
          type_name?: string | null
          updated_at?: string
        }
        Relationships: []
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
      stq_register: {
        Row: {
          created_at: string | null
          description: string | null
          design_deviation_impact: string | null
          discipline: string | null
          id: string
          ivan_adequacy_assessment: string | null
          project_id: string | null
          raised_by: string | null
          raised_date: string | null
          risk_score: number | null
          status: string | null
          stq_number: string | null
          technical_response: string | null
          tenant_id: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          design_deviation_impact?: string | null
          discipline?: string | null
          id?: string
          ivan_adequacy_assessment?: string | null
          project_id?: string | null
          raised_by?: string | null
          raised_date?: string | null
          risk_score?: number | null
          status?: string | null
          stq_number?: string | null
          technical_response?: string | null
          tenant_id?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          design_deviation_impact?: string | null
          discipline?: string | null
          id?: string
          ivan_adequacy_assessment?: string | null
          project_id?: string | null
          raised_by?: string | null
          raised_date?: string | null
          risk_score?: number | null
          status?: string | null
          stq_number?: string | null
          technical_response?: string | null
          tenant_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stq_register_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stq_register_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string
          description: string | null
          id: string
          key: string
          label: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          description?: string | null
          id?: string
          key: string
          label: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          key?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string | null
          id: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          file_type?: string | null
          id?: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string | null
          id?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "user_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          comment: string
          comment_type: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          comment: string
          comment_type?: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          comment?: string
          comment_type?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "user_tasks"
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
      task_document_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          position_data: Json | null
          resolved: boolean
          selection_text: string | null
          task_document_id: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          position_data?: Json | null
          resolved?: boolean
          selection_text?: string | null
          task_document_id: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          position_data?: Json | null
          resolved?: boolean
          selection_text?: string | null
          task_document_id?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_document_comments_task_document_id_fkey"
            columns: ["task_document_id"]
            isOneToOne: false
            referencedRelation: "task_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_document_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_documents: {
        Row: {
          content: string
          created_at: string
          id: string
          last_edited_by: string | null
          task_id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          last_edited_by?: string | null
          task_id: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          last_edited_by?: string | null
          task_id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_documents_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "user_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_reviewers: {
        Row: {
          comments: string | null
          created_at: string | null
          decided_at: string | null
          display_order: number
          id: string
          role_label: string
          status: string
          task_id: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          decided_at?: string | null
          display_order?: number
          id?: string
          role_label: string
          status?: string
          task_id: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          decided_at?: string | null
          display_order?: number
          id?: string
          role_label?: string
          status?: string
          task_id?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_reviewers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "user_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_reviewers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled_at: string | null
          enabled_by: string | null
          feature_key: string
          feature_label: string
          id: string
          is_enabled: boolean
          metadata: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled_at?: string | null
          enabled_by?: string | null
          feature_key: string
          feature_label: string
          id?: string
          is_enabled?: boolean
          metadata?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled_at?: string | null
          enabled_by?: string | null
          feature_key?: string
          feature_label?: string
          id?: string
          is_enabled?: boolean
          metadata?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_sso_configs: {
        Row: {
          button_label: string | null
          configured_by: string | null
          created_at: string
          display_name: string
          id: string
          idp_certificate: string | null
          idp_entity_id: string | null
          idp_metadata_url: string | null
          idp_sso_url: string | null
          is_active: boolean
          is_configured: boolean
          provider_type: string
          supabase_sso_provider_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          button_label?: string | null
          configured_by?: string | null
          created_at?: string
          display_name?: string
          id?: string
          idp_certificate?: string | null
          idp_entity_id?: string | null
          idp_metadata_url?: string | null
          idp_sso_url?: string | null
          is_active?: boolean
          is_configured?: boolean
          provider_type?: string
          supabase_sso_provider_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          button_label?: string | null
          configured_by?: string | null
          created_at?: string
          display_name?: string
          id?: string
          idp_certificate?: string | null
          idp_entity_id?: string | null
          idp_metadata_url?: string | null
          idp_sso_url?: string | null
          is_active?: boolean
          is_configured?: boolean
          provider_type?: string
          supabase_sso_provider_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_sso_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          sso_enforcement: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          sso_enforcement?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          sso_enforcement?: string
          updated_at?: string
        }
        Relationships: []
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
      user_onboarding_progress: {
        Row: {
          checklist_key: string
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          checklist_key: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          checklist_key?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
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
          progress_percentage: number | null
          status: string
          sub_items: Json | null
          tenant_id: string | null
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
          progress_percentage?: number | null
          status?: string
          sub_items?: Json | null
          tenant_id?: string | null
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
          progress_percentage?: number | null
          status?: string
          sub_items?: Json | null
          tenant_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      vcr_discipline_assurance: {
        Row: {
          assurance_statement: string
          created_at: string | null
          discipline_role_id: string | null
          discipline_role_name: string
          handover_point_id: string
          id: string
          reviewer_user_id: string | null
          statement_type: string
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          assurance_statement: string
          created_at?: string | null
          discipline_role_id?: string | null
          discipline_role_name: string
          handover_point_id: string
          id?: string
          reviewer_user_id?: string | null
          statement_type?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          assurance_statement?: string
          created_at?: string | null
          discipline_role_id?: string | null
          discipline_role_name?: string
          handover_point_id?: string
          id?: string
          reviewer_user_id?: string | null
          statement_type?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vcr_discipline_assurance_discipline_role_id_fkey"
            columns: ["discipline_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vcr_discipline_assurance_handover_point_id_fkey"
            columns: ["handover_point_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_points"
            referencedColumns: ["id"]
          },
        ]
      }
      vcr_document_requirements: {
        Row: {
          assigned_document_number: string | null
          created_at: string | null
          discipline_code: string | null
          dms_status: string | null
          document_scope: string | null
          document_type_id: string | null
          id: string
          identified_at: string | null
          identified_by: string | null
          is_mdr: boolean | null
          package_tag: string | null
          po_number: string | null
          rlmu_file_path: string | null
          rlmu_review_findings: Json | null
          rlmu_reviewed_at: string | null
          rlmu_status: string | null
          status: string | null
          tenant_id: string | null
          vcr_id: string | null
          vendor_po_sequence: string | null
        }
        Insert: {
          assigned_document_number?: string | null
          created_at?: string | null
          discipline_code?: string | null
          dms_status?: string | null
          document_scope?: string | null
          document_type_id?: string | null
          id?: string
          identified_at?: string | null
          identified_by?: string | null
          is_mdr?: boolean | null
          package_tag?: string | null
          po_number?: string | null
          rlmu_file_path?: string | null
          rlmu_review_findings?: Json | null
          rlmu_reviewed_at?: string | null
          rlmu_status?: string | null
          status?: string | null
          tenant_id?: string | null
          vcr_id?: string | null
          vendor_po_sequence?: string | null
        }
        Update: {
          assigned_document_number?: string | null
          created_at?: string | null
          discipline_code?: string | null
          dms_status?: string | null
          document_scope?: string | null
          document_type_id?: string | null
          id?: string
          identified_at?: string | null
          identified_by?: string | null
          is_mdr?: boolean | null
          package_tag?: string | null
          po_number?: string | null
          rlmu_file_path?: string | null
          rlmu_review_findings?: Json | null
          rlmu_reviewed_at?: string | null
          rlmu_status?: string | null
          status?: string | null
          tenant_id?: string | null
          vcr_id?: string | null
          vendor_po_sequence?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vcr_document_requirements_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "dms_document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vcr_document_requirements_vcr_id_fkey"
            columns: ["vcr_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_points"
            referencedColumns: ["id"]
          },
        ]
      }
      vcr_item_categories: {
        Row: {
          code: string
          confidence_factor_default: number | null
          created_at: string
          default_weight: number | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_readiness_dimension: boolean | null
          name: string
          risk_severity_multiplier: number | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          confidence_factor_default?: number | null
          created_at?: string
          default_weight?: number | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_readiness_dimension?: boolean | null
          name: string
          risk_severity_multiplier?: number | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          confidence_factor_default?: number | null
          created_at?: string
          default_weight?: number | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_readiness_dimension?: boolean | null
          name?: string
          risk_severity_multiplier?: number | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vcr_item_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vcr_item_delivering_parties: {
        Row: {
          added_by: string | null
          created_at: string
          handover_point_id: string | null
          id: string
          prerequisite_id: string | null
          user_id: string
          vcr_item_id: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          handover_point_id?: string | null
          id?: string
          prerequisite_id?: string | null
          user_id: string
          vcr_item_id?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string
          handover_point_id?: string | null
          id?: string
          prerequisite_id?: string | null
          user_id?: string
          vcr_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vcr_item_delivering_parties_handover_point_id_fkey"
            columns: ["handover_point_id"]
            isOneToOne: false
            referencedRelation: "p2a_handover_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vcr_item_delivering_parties_prerequisite_id_fkey"
            columns: ["prerequisite_id"]
            isOneToOne: false
            referencedRelation: "p2a_vcr_prerequisites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vcr_item_delivering_parties_vcr_item_id_fkey"
            columns: ["vcr_item_id"]
            isOneToOne: false
            referencedRelation: "vcr_items"
            referencedColumns: ["id"]
          },
        ]
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
      webhook_configs: {
        Row: {
          created_at: string
          created_by: string | null
          endpoint_path: string
          header_name: string
          id: string
          is_active: boolean
          last_received_at: string | null
          name: string
          signing_algorithm: string
          signing_secret_hash: string
          source_system: string
          tenant_id: string | null
          total_failed: number | null
          total_received: number | null
          total_verified: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          endpoint_path: string
          header_name?: string
          id?: string
          is_active?: boolean
          last_received_at?: string | null
          name: string
          signing_algorithm?: string
          signing_secret_hash: string
          source_system: string
          tenant_id?: string | null
          total_failed?: number | null
          total_received?: number | null
          total_verified?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          endpoint_path?: string
          header_name?: string
          id?: string
          is_active?: boolean
          last_received_at?: string | null
          name?: string
          signing_algorithm?: string
          signing_secret_hash?: string
          source_system?: string
          tenant_id?: string | null
          total_failed?: number | null
          total_received?: number | null
          total_verified?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          backup_email: string | null
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
          password_change_required: boolean | null
          password_reset_required: boolean | null
          personal_email: string | null
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
          tenant_id: string | null
          two_factor_enabled: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_status?: string | null
          avatar_url?: string | null
          backup_email?: string | null
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
          password_change_required?: boolean | null
          password_reset_required?: boolean | null
          personal_email?: string | null
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
          tenant_id?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_status?: string | null
          avatar_url?: string | null
          backup_email?: string | null
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
          password_change_required?: boolean | null
          password_reset_required?: boolean | null
          personal_email?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      backfill_missing_reviewer_tasks: { Args: never; Returns: number }
      calculate_ori_score: {
        Args: {
          p_project_id: string
          p_snapshot_type?: string
          p_weight_profile_id?: string
        }
        Returns: Json
      }
      check_account_lockout: { Args: { user_email: string }; Returns: Json }
      check_api_rate_limit: {
        Args: { p_key_prefix: string }
        Returns: {
          api_key_id: string
          is_allowed: boolean
          key_integration: string
          key_permissions: string[]
          remaining_requests: number
        }[]
      }
      check_orm_plan_access: {
        Args: { plan_id: string; user_id: string }
        Returns: boolean
      }
      cleanup_expired_password_reset_tokens: { Args: never; Returns: number }
      cleanup_old_api_request_logs: { Args: never; Returns: number }
      create_password_reset_token: {
        Args: { target_user_id: string }
        Returns: string
      }
      create_user_task: {
        Args: {
          p_description?: string
          p_due_date?: string
          p_metadata?: Json
          p_priority?: string
          p_status?: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      delete_user_account: { Args: { target_user_id: string }; Returns: Json }
      ensure_reviewer_tasks_for_task: {
        Args: { p_task_id: string }
        Returns: number
      }
      find_deputy_plant_director: {
        Args: { plant_name_param: string }
        Returns: {
          avatar_url: string
          full_name: string
          user_id: string
        }[]
      }
      flag_stale_accounts: {
        Args: { days_threshold?: number }
        Returns: number
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
          functional_email: boolean
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
          personal_email: string
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
      get_inherited_permissions: {
        Args: { _role_id: string }
        Returns: string[]
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
      get_user_permissions: { Args: { _user_id: string }; Returns: string[] }
      get_user_tenant_id: { Args: never; Returns: string }
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["app_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_acronym_usage: {
        Args: { acronym_text: string }
        Returns: undefined
      }
      initiate_password_reset: { Args: { user_email: string }; Returns: string }
      is_feature_enabled: { Args: { p_feature_key: string }; Returns: boolean }
      offboard_user: {
        Args: {
          admin_user_id: string
          p_notes?: string
          target_user_id: string
        }
        Returns: Json
      }
      purge_old_audit_logs: {
        Args: { retention_days_param?: number }
        Returns: number
      }
      reject_user_account: {
        Args: { rejection_reason_text?: string; target_user_id: string }
        Returns: boolean
      }
      reopen_task: {
        Args: { p_reason: string; p_task_id: string; p_user_id?: string }
        Returns: undefined
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
      submit_task_for_approval: {
        Args: { p_comment: string; p_task_id: string; p_user_id?: string }
        Returns: undefined
      }
      sync_readiness_nodes: { Args: { p_project_id: string }; Returns: number }
      track_failed_login:
        | { Args: { ip_addr?: unknown; user_uuid: string }; Returns: undefined }
        | { Args: { ip_addr?: string; user_uuid: string }; Returns: Json }
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
      write_audit_log: {
        Args: {
          p_action: string
          p_category: string
          p_description: string
          p_entity_id: string
          p_entity_label: string
          p_entity_type: string
          p_metadata?: Json
          p_new_values?: Json
          p_old_values?: Json
          p_severity: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      annotation_type:
        | "highlight"
        | "comment_pin"
        | "text_box"
        | "drawing"
        | "stamp"
        | "signature"
      app_permission:
        | "create_project"
        | "create_vcr"
        | "create_pssr"
        | "approve_pssr"
        | "approve_sof"
        | "manage_users"
        | "access_admin"
        | "view_reports"
        | "create_ora_plan"
        | "manage_p2a"
        | "manage_orm"
        | "create_p2a_plan"
      dependency_type: "blocks" | "gates" | "informs" | "requires"
      fred_knowledge_type:
        | "procedure"
        | "lesson"
        | "itr_template"
        | "test_criteria"
        | "incident"
        | "failure_pattern"
        | "risk_pattern"
        | "plan_template"
        | "acceptance_criteria"
      fred_training_category:
        | "losh_drawings"
        | "completions_procedure"
        | "logic_way"
        | "csu_masterclass"
        | "blank_itrs"
        | "repetitive_failure"
        | "lessons_learnt"
        | "flaws_database"
        | "csi_database"
        | "ctps"
        | "sat_fat_sit"
        | "csu_plans"
        | "hazop_omar"
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
      readiness_node_status:
        | "not_started"
        | "in_progress"
        | "completed"
        | "blocked"
        | "at_risk"
        | "na"
      readiness_node_type:
        | "ora_activity"
        | "p2a_handover_point"
        | "p2a_system"
        | "pssr"
        | "pssr_checklist_item"
        | "orm_deliverable"
        | "orm_milestone"
        | "training_item"
        | "certificate"
        | "custom"
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
      annotation_type: [
        "highlight",
        "comment_pin",
        "text_box",
        "drawing",
        "stamp",
        "signature",
      ],
      app_permission: [
        "create_project",
        "create_vcr",
        "create_pssr",
        "approve_pssr",
        "approve_sof",
        "manage_users",
        "access_admin",
        "view_reports",
        "create_ora_plan",
        "manage_p2a",
        "manage_orm",
        "create_p2a_plan",
      ],
      dependency_type: ["blocks", "gates", "informs", "requires"],
      fred_knowledge_type: [
        "procedure",
        "lesson",
        "itr_template",
        "test_criteria",
        "incident",
        "failure_pattern",
        "risk_pattern",
        "plan_template",
        "acceptance_criteria",
      ],
      fred_training_category: [
        "losh_drawings",
        "completions_procedure",
        "logic_way",
        "csu_masterclass",
        "blank_itrs",
        "repetitive_failure",
        "lessons_learnt",
        "flaws_database",
        "csi_database",
        "ctps",
        "sat_fat_sit",
        "csu_plans",
        "hazop_omar",
      ],
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
      readiness_node_status: [
        "not_started",
        "in_progress",
        "completed",
        "blocked",
        "at_risk",
        "na",
      ],
      readiness_node_type: [
        "ora_activity",
        "p2a_handover_point",
        "p2a_system",
        "pssr",
        "pssr_checklist_item",
        "orm_deliverable",
        "orm_milestone",
        "training_item",
        "certificate",
        "custom",
      ],
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
