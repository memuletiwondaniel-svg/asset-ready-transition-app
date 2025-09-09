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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
