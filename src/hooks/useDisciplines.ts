import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Discipline {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useDisciplines = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: disciplines = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["disciplines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discipline")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching disciplines:", error);
        throw error;
      }

      return data as Discipline[];
    },
  });

  const addDisciplineMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("discipline")
        .insert([{ name }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disciplines"] });
      toast({
        title: "Success",
        description: "Discipline added successfully",
      });
    },
    onError: (error: any) => {
      console.error("Error adding discipline:", error);
      toast({
        title: "Error",
        description: "Failed to add discipline",
        variant: "destructive",
      });
    },
  });

  const addDiscipline = (name: string) => {
    addDisciplineMutation.mutate(name);
  };

  return {
    disciplines,
    isLoading,
    error,
    addDiscipline,
  };
};