import { supabase } from '../lib/supabase';

export interface TimetableEntryDB {
  id?: string;
  user_id: string;
  day: string; // "Monday", "Tuesday", etc.
  period: number;
  subject: string;
  faculty?: string;
  room?: string;
}

export const timetableService = {
  async getTimetable(userId: string): Promise<TimetableEntryDB[]> {
    try {
      const { data, error } = await supabase
        .from('timetable')
        .select('*')
        .eq('user_id', userId)
        .order('day')
        .order('period');

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase timetable fetch exception, using localStorage fallback', err);
    }

    // Fallback to localStorage
    try {
      const local = localStorage.getItem(`attendance_app_timetable_${userId}`);
      if (local) {
        return JSON.parse(local);
      }
    } catch (e) {
      // ignore
    }
    return [];
  },

  async saveTimetableBatch(userId: string, entries: Omit<TimetableEntryDB, 'id' | 'user_id'>[]): Promise<void> {
    try {
      await supabase
        .from('timetable')
        .delete()
        .eq('user_id', userId);

      if (entries.length > 0) {
        const rows = entries.map(e => ({
          user_id: userId,
          day: e.day,
          period: e.period,
          subject: e.subject,
          faculty: e.faculty || null,
          room: e.room || null,
        }));

        await supabase
          .from('timetable')
          .insert(rows);
      }
    } catch (err) {
      console.warn('Supabase timetable batch save exception, saving to localStorage', err);
    }

    // Always save to localStorage as well for robust fallback
    try {
      const fullEntries = entries.map((e, idx) => ({
        id: `local_${idx}_${Date.now()}`,
        user_id: userId,
        ...e
      }));
      localStorage.setItem(`attendance_app_timetable_${userId}`, JSON.stringify(fullEntries));
    } catch (e) {
      // ignore
    }
  },

};
