export interface Subject {
  id: string;
  name: string;
  minAttendanceGoal: number; // e.g., 75 for 75%
}

export interface TimetableSlot {
  id: string;
  subjectId: string;
  dayOfWeek: number; // 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday, 7 = Sunday
  period: number; // 1 = 1st, 2 = 2nd, etc.
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Cancelled';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  subjectId: string;
  status: AttendanceStatus;
  period: number;
}

export interface AppSettings {
  overallGoal: number; // e.g., 75
  studentName: string;
  institutionName: string;
  phoneNumber?: string;
  branch?: string;
  section?: string;
  semester?: string;
  rollNumber?: string;
  academicYear?: string;
  theme?: 'dark' | 'light';
}

export interface SubjectStats {
  subjectId: string;
  subjectName: string;
  present: number;
  absent: number;
  cancelled: number;
  total: number;
  percentage: number;
  goal: number;
  status: 'safe' | 'danger' | 'critical';
  canMiss: number;
  needToAttend: number;
}

export interface OverallStats {
  present: number;
  absent: number;
  cancelled: number;
  total: number;
  percentage: number;
  goal: number;
  canMiss: number;
  needToAttend: number;
}
