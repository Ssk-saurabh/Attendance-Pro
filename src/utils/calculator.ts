import { Subject, AttendanceRecord, SubjectStats, OverallStats } from '../types';

/**
 * Calculates attendance statistics for a single subject.
 */
export function calculateSubjectStats(
  subject: Subject,
  records: AttendanceRecord[],
  overallGoal: number
): SubjectStats {
  const subjectRecords = records.filter((r) => r.subjectId === subject.id);
  
  let present = 0;
  let absent = 0;
  let cancelled = 0;

  for (const record of subjectRecords) {
    if (record.status === 'Present') {
      present++;
    } else if (record.status === 'Absent') {
      absent++;
    } else if (record.status === 'Cancelled') {
      cancelled++;
    }
  }

  const total = present + absent;
  const percentage = total > 0 ? (present / total) * 100 : 0;
  const goal = subject.minAttendanceGoal || overallGoal;

  let canMiss = 0;
  let needToAttend = 0;

  if (percentage >= goal) {
    // Math logic: (present * 100) / (total + m) >= goal
    // present * 100 >= goal * total + goal * m
    // m <= (present * 100 - goal * total) / goal
    if (goal > 0) {
      canMiss = Math.floor((present * 100 - goal * total) / goal);
    } else {
      canMiss = 0;
    }
    if (canMiss < 0) canMiss = 0;
  } else {
    // Math logic: (present + a) * 100 / (total + a) >= goal
    // present * 100 + 100a >= goal * total + goal * a
    // (100 - goal) * a >= goal * total - present * 100
    // a >= (goal * total - present * 100) / (100 - goal)
    if (goal < 100) {
      needToAttend = Math.ceil((goal * total - present * 100) / (100 - goal));
    } else {
      needToAttend = present < total ? Infinity : 0;
    }
    if (needToAttend < 0) needToAttend = 0;
  }

  let status: 'safe' | 'danger' | 'critical' = 'safe';
  if (percentage < goal) {
    status = 'critical';
  } else if (percentage - goal < 10) {
    status = 'danger';
  }

  return {
    subjectId: subject.id,
    subjectName: subject.name,
    present,
    absent,
    cancelled,
    total,
    percentage,
    goal,
    status,
    canMiss,
    needToAttend,
  };
}

/**
 * Calculates aggregate statistics for all subjects.
 */
export function calculateOverallStats(
  subjects: Subject[],
  records: AttendanceRecord[],
  overallGoal: number
): OverallStats {
  if (subjects.length === 0) {
    return {
      present: 0,
      absent: 0,
      cancelled: 0,
      total: 0,
      percentage: 0,
      goal: overallGoal,
      canMiss: 0,
      needToAttend: 0,
    };
  }

  let present = 0;
  let absent = 0;
  let cancelled = 0;

  // Aggregate stats over ALL tracked records for subjects that actually exist
  const activeSubjectIds = new Set(subjects.map((s) => s.id));
  const validRecords = records.filter((r) => activeSubjectIds.has(r.subjectId));

  for (const record of validRecords) {
    if (record.status === 'Present') {
      present++;
    } else if (record.status === 'Absent') {
      absent++;
    } else if (record.status === 'Cancelled') {
      cancelled++;
    }
  }

  const total = present + absent;
  const percentage = total > 0 ? (present / total) * 100 : 0;

  let canMiss = 0;
  let needToAttend = 0;

  if (percentage >= overallGoal) {
    if (overallGoal > 0) {
      canMiss = Math.floor((present * 100 - overallGoal * total) / overallGoal);
    } else {
      canMiss = 0;
    }
    if (canMiss < 0) canMiss = 0;
  } else {
    if (overallGoal < 100) {
      needToAttend = Math.ceil((overallGoal * total - present * 100) / (100 - overallGoal));
    } else {
      needToAttend = present < total ? Infinity : 0;
    }
    if (needToAttend < 0) needToAttend = 0;
  }

  return {
    present,
    absent,
    cancelled,
    total,
    percentage,
    goal: overallGoal,
    canMiss,
    needToAttend,
  };
}


