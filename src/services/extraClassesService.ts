import { supabase } from '../lib/supabase';

export interface ExtraClassDB {
  id?: string;
  user_id: string;
  day: string;
  date: string;
  subject: string;
  periods: number;
  start_time?: string;
  end_time?: string;
  faculty?: string;
  room?: string;
  notes?: string;
  created_at?: string;
}

export const extraClassesService = {
  async getExtraClasses(userId: string): Promise<ExtraClassDB[]> {
    try {
      const { data, error } = await supabase
        .from('extra_classes')
        .select('*')
        .eq('user_id', userId)
        .order('date');

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase getExtraClasses exception', err);
    }

    try {
      const local = localStorage.getItem(`attendance_app_extra_classes_${userId}`);
      if (local) {
        return JSON.parse(local);
      }
    } catch (e) {
      // ignore
    }
    return [];
  },

  async addExtraClass(entry: ExtraClassDB): Promise<ExtraClassDB | null> {
    try {
      const { data, error } = await supabase
        .from('extra_classes')
        .insert({
          ...entry,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase addExtraClass exception', err);
    }

    const localEntry = { ...entry, id: `local_extra_${Date.now()}`, created_at: new Date().toISOString() };
    try {
      const current = await this.getExtraClasses(entry.user_id);
      localStorage.setItem(`attendance_app_extra_classes_${entry.user_id}`, JSON.stringify([...current, localEntry]));
    } catch (e) {
      // ignore
    }
    return localEntry;
  }
};
