import { supabase } from '@/integrations/supabase/client';

/**
 * Utility functions for safely accessing profile information
 * These functions respect the new security policies that restrict profile access
 */

export interface PublicProfileInfo {
  user_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  department: string | null;
}

/**
 * Get limited public profile information for a specific user
 * This can be used for team member selection, etc.
 * Only returns non-sensitive information
 */
export async function getPublicProfileInfo(userId: string): Promise<PublicProfileInfo | null> {
  try {
    const { data, error } = await supabase.rpc('get_public_profile_info', {
      target_user_id: userId
    });

    if (error) {
      console.error('Error fetching public profile info:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Error fetching public profile info:', error);
    return null;
  }
}

/**
 * Get the current user's full profile
 * Users can always access their own complete profile
 */
export async function getCurrentUserProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching current user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching current user profile:', error);
    return null;
  }
}

/**
 * Get all user management data (admin only)
 * This uses the existing get_user_management_data function
 * which includes role and permission checks
 */
export async function getUserManagementData() {
  try {
    const { data, error } = await supabase.rpc('get_user_management_data');

    if (error) {
      console.error('Error fetching user management data:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user management data:', error);
    return [];
  }
}

/**
 * Update the current user's profile
 * Users can only update their own profile
 */
export async function updateCurrentUserProfile(updates: Partial<any>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}