import { supabase } from '../lib/supabase';
import { SyllabusRecordDB } from './database';

export const syllabusService = {
  async getSyllabusRecords(userId: string): Promise<SyllabusRecordDB[]> {
    try {
      const { data, error } = await supabase
        .from('syllabus')
        .select('*')
        .eq('user_id', userId);

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase getSyllabusRecords exception', err);
    }

    try {
      const local = localStorage.getItem(`attendance_app_syllabus_${userId}`);
      if (local) {
        return JSON.parse(local);
      }
    } catch (e) {
      // ignore
    }
    return [];
  },

  async addSyllabusRecord(record: SyllabusRecordDB): Promise<SyllabusRecordDB | null> {
    try {
      const { data, error } = await supabase
        .from('syllabus')
        .insert({
          ...record,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase addSyllabusRecord exception', err);
    }

    const localRecord = { ...record, id: `local_syl_${Date.now()}`, created_at: new Date().toISOString() };
    try {
      const current = await this.getSyllabusRecords(record.user_id);
      localStorage.setItem(`attendance_app_syllabus_${record.user_id}`, JSON.stringify([...current, localRecord]));
    } catch (e) {
      // ignore
    }
    return localRecord;
  }
};
