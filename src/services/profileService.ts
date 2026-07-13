import { supabase } from '../lib/supabase';
import { ProfileRecord } from './database';

export const profileService = {
  async getProfile(userId: string): Promise<ProfileRecord | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        // Try to get auth user metadata and upsert profile if missing
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === userId) {
          const meta = user.user_metadata || {};
          const newProfile: ProfileRecord = {
            id: userId,
            full_name: meta.full_name || user.email?.split('@')[0] || 'Student',
            email: user.email || '',
            institution_name: meta.institution_name || 'University Institute',
            semester: meta.semester || 'Semester 6',
            course: meta.course || 'B.Tech Computer Science',
            branch: meta.branch || 'Computer Science & Engineering',
            year: meta.year || 'Third Year',
            attendance_goal: 75,
          };
          await supabase.from('profiles').upsert(newProfile);
          return newProfile;
        }
        return null;
      }
      return data;
    } catch (err) {
      console.warn('Profile fetch warning:', err);
      return null;
    }
  },

  async updateProfile(userId: string, updates: Partial<ProfileRecord>): Promise<ProfileRecord | null> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
    return data;
  },

  async getOnboardingStatus(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('onboarding')
        .select('completed')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        return false;
      }
      return !!data?.completed;
    } catch {
      return false;
    }
  },

  async updateOnboardingStatus(userId: string, completed: boolean): Promise<void> {
    const { error } = await supabase
      .from('onboarding')
      .upsert({
        user_id: userId,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      });

    if (error) {
      console.error('Error updating onboarding status:', error);
      throw error;
    }
  },

  async deleteAccount(userId: string): Promise<void> {
    // 1. Delete attendance
    await supabase.from('attendance').delete().eq('user_id', userId);
    // 2. Delete syllabus
    await supabase.from('syllabus').delete().eq('user_id', userId);
    // 3. Delete onboarding
    await supabase.from('onboarding').delete().eq('user_id', userId);
    // 4. Delete profile
    await supabase.from('profiles').delete().eq('id', userId);
    // 5. Delete storage files
    const { data: files } = await supabase.storage.from('syllabus').list(userId);
    if (files && files.length > 0) {
      const filePaths = files.map(f => `${userId}/${f.name}`);
      await supabase.storage.from('syllabus').remove(filePaths);
    }
    // 6. Sign out
    await supabase.auth.signOut();
  }
};
