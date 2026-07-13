import { supabase } from '../lib/supabase';
import { AttendanceRecordDB } from './database';

export const attendanceService = {
  async getAttendanceRecords(userId: string): Promise<AttendanceRecordDB[]> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.warn('Attendance fetch warning:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('Attendance fetch error:', err);
      return [];
    }
  },

  async upsertAttendanceRecord(record: AttendanceRecordDB): Promise<AttendanceRecordDB | null> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .upsert({
          ...record,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'user_id,subject_name'
        })
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      // Fallback below
    }

    // Fallback: check if record exists for user_id and subject_name
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('user_id', record.user_id)
      .eq('subject_name', record.subject_name)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await supabase
        .from('attendance')
        .update({
          present: record.present,
          total: record.total,
          percentage: record.percentage,
          last_updated: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating attendance record:', error);
        throw error;
      }
      return data;
    } else {
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          ...record,
          last_updated: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting attendance record:', error);
        throw error;
      }
      return data;
    }
  }
};
