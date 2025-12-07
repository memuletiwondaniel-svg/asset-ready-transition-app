import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PSSRChecklistResponse {
  id: string;
  pssr_id: string;
  checklist_item_id: string;
  response: string | null;
  status: string;
  narrative: string | null;
  deviation_reason: string | null;
  potential_risk: string | null;
  mitigations: string | null;
  follow_up_action: string | null;
  action_owner: string | null;
  justification: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ChecklistItem {
  id?: string;
  unique_id: string | null;
  description: string;
  category: string;
  topic: string | null;
  responsible: string | null;
  Approver: string | null;
  sequence_number: number | null;
}

export const usePSSRChecklistResponses = (pssrId: string) => {
  // Fetch checklist responses for the PSSR
  const responsesQuery = useQuery({
    queryKey: ["pssr-checklist-responses", pssrId],
    queryFn: async () => {
      if (!pssrId) return [];
      
      const { data, error } = await supabase
        .from("pssr_checklist_responses")
        .select("*")
        .eq("pssr_id", pssrId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching PSSR checklist responses:", error);
        throw error;
      }

      return data as PSSRChecklistResponse[];
    },
    enabled: !!pssrId,
  });

  // Fetch all active checklist items
  const checklistItemsQuery = useQuery({
    queryKey: ["checklist-items-for-sof"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_items")
        .select("unique_id, description, category, topic, responsible, Approver, sequence_number")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("sequence_number", { ascending: true });

      if (error) {
        console.error("Error fetching checklist items:", error);
        throw error;
      }

      return data as ChecklistItem[];
    },
  });

  return {
    responses: responsesQuery.data || [],
    checklistItems: checklistItemsQuery.data || [],
    isLoading: responsesQuery.isLoading || checklistItemsQuery.isLoading,
    error: responsesQuery.error || checklistItemsQuery.error,
    refetch: () => {
      responsesQuery.refetch();
      checklistItemsQuery.refetch();
    },
  };
};
