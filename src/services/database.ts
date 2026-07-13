import { supabase } from '../lib/supabase';

export interface ProfileRecord {
  id: string;
  full_name: string;
  email: string;
  institution_name?: string;
  semester?: string;
  course?: string;
  branch?: string;
  year?: string;
  attendance_goal?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceRecordDB {
  id?: string;
  user_id: string;
  subject_name: string;
  present: number;
  total: number;
  percentage: number;
  last_updated?: string;
}

export interface SyllabusRecordDB {
  id?: string;
  user_id: string;
  subject_name: string;
  subject_code?: string;
  faculty_name?: string;
  credits?: string;
  semester?: string;
  uploaded_file_url?: string;
  created_at?: string;
}

export interface OnboardingRecord {
  user_id: string;
  completed: boolean;
  completed_at?: string;
}
