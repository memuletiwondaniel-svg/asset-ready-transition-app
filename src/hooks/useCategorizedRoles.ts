import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RoleCategory {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
}

export interface CategorizedRole {
  category_id: string;
  category_name: string;
  category_order: number;
  role_id: string | null;
  role_name: string | null;
  role_description: string | null;
}

export interface GroupedRoles {
  category: RoleCategory;
  roles: Role[];
}

export const useRoleCategories = () => {
  return useQuery({
    queryKey: ['role-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_category')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('Error fetching role categories:', error);
        throw error;
      }

      return data as RoleCategory[];
    },
  });
};

export const useCategorizedRoles = () => {
  return useQuery({
    queryKey: ['categorized-roles'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_roles_by_category');

      if (error) {
        console.error('Error fetching categorized roles:', error);
        throw error;
      }

      // Group roles by category
      const grouped: Record<string, GroupedRoles> = {};
      
      (data as CategorizedRole[]).forEach((item) => {
        if (!grouped[item.category_id]) {
          grouped[item.category_id] = {
            category: {
              id: item.category_id,
              name: item.category_name,
              description: null,
              display_order: item.category_order,
              is_active: true,
            },
            roles: [],
          };
        }
        
        if (item.role_id) {
          grouped[item.category_id].roles.push({
            id: item.role_id,
            name: item.role_name!,
            description: item.role_description,
            category_id: item.category_id,
          });
        }
      });

      // Sort by category order
      return Object.values(grouped).sort((a, b) => a.category.display_order - b.category.display_order);
    },
  });
};

export const useAddRole = () => {
  const addRole = async (name: string, description: string, categoryId: string) => {
    // Check if a soft-deleted role with this name exists — reactivate it
    const { data: existing } = await supabase
      .from('roles')
      .select('id, is_active')
      .eq('name', name)
      .maybeSingle();

    if (existing && !existing.is_active) {
      const { data, error } = await supabase
        .from('roles')
        .update({ is_active: true, description, category_id: categoryId })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    if (existing && existing.is_active) {
      throw new Error(`A role named "${name}" already exists`);
    }

    const { data, error } = await supabase
      .from('roles')
      .insert({ name, description, category_id: categoryId, is_active: true })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  return { addRole };
};

export const useAddRoleCategory = () => {
  const addCategory = async (name: string, description: string, displayOrder: number) => {
    const { data, error } = await supabase
      .from('role_category')
      .insert({
        name,
        description,
        display_order: displayOrder,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  };

  return { addCategory };
};

export const useUpdateRoleCategory = () => {
  const updateCategory = async (id: string, name: string, description: string, displayOrder: number) => {
    const { data, error } = await supabase
      .from('role_category')
      .update({
        name,
        description,
        display_order: displayOrder,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  };

  return { updateCategory };
};

export const useDeleteRoleCategory = () => {
  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('role_category')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw error;
    }
  };

  return { deleteCategory };
};

export const useUpdateRole = () => {
  const updateRole = async (id: string, name: string, description: string, categoryId: string) => {
    const { data, error } = await supabase
      .from('roles')
      .update({
        name,
        description,
        category_id: categoryId,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  };

  return { updateRole };
};

export const useDeleteRole = () => {
  const deleteRole = async (id: string) => {
    const { error } = await supabase
      .from('roles')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw error;
    }
  };

  return { deleteRole };
};
