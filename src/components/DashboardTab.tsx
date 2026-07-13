import React, { useState, useEffect } from 'react';
import { Subject, AttendanceRecord, AppSettings, AttendanceStatus } from '../types';
import { calculateOverallStats, calculateSubjectStats } from '../utils/calculator';
import { 
  ShieldCheck, AlertTriangle, ShieldAlert, Target, GraduationCap, 
  CheckCircle2, Save, CalendarDays, ClipboardCheck, Edit3, Lock, X
} from 'lucide-react';

interface DashboardTabProps {
  subjects: Subject[];
  records: AttendanceRecord[];
  settings: AppSettings;
  userId?: string | null;
  onChangeOverallGoal: (goal: number) => void;
  onAddRecord: (record: Omit<AttendanceRecord, 'id'>) => void;
  onDeleteRecord: (id: string) => void;
  onSaveDayAttendance: (date: string, list: { subjectId: string; status: AttendanceStatus | 'Unmarked' }[]) => void;
}

export default function DashboardTab({
  subjects,
  records,
  settings,
  userId,
  onChangeOverallGoal,
  onAddRecord,
  onDeleteRecord,
  onSaveDayAttendance,
}: DashboardTabProps) {
  const isLight = settings.theme === 'light';
  const overallStats = calculateOverallStats(subjects, records, settings.overallGoal);

  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const fullDate = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const todayStr = today.toISOString().split('T')[0];

  // Local draft statuses state for today's session
  const [draftStatuses, setDraftStatuses] = useState<Record<string, AttendanceStatus | 'Unmarked'>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Sync draft statuses with saved records for today, and determine default mode
  useEffect(() => {
    const initial: Record<string, AttendanceStatus | 'Unmarked'> = {};
    let hasSavedForToday = false;
    subjects.forEach((s) => {
      const existing = records.find((r) => r.subjectId === s.id && r.date === todayStr);
      if (existing) {
        initial[s.id] = existing.status;
        hasSavedForToday = true;
      } else {
        initial[s.id] = 'Unmarked';
      }
    });
    setDraftStatuses(initial);
    setIsEditing(!hasSavedForToday);
  }, [subjects, records, todayStr]);

  const handleMarkAllPresent = () => {
    const updated = { ...draftStatuses };
    subjects.forEach((s) => {
      updated[s.id] = 'Present';
    });
    setDraftStatuses(updated);
  };

  const handleMarkAllAbsent = () => {
    const updated = { ...draftStatuses };
    subjects.forEach((s) => {
      updated[s.id] = 'Absent';
    });
    setDraftStatuses(updated);
  };

  const handleMarkSingleSubject = (subjId: string, status: AttendanceStatus | 'Unmarked') => {
    setDraftStatuses((prev) => ({
      ...prev,
      [subjId]: status,
    }));
  };

  const handleSaveDraft = () => {
    const list = Object.entries(draftStatuses).map(([subjectId, status]) => ({
      subjectId,
      status: status as AttendanceStatus | 'Unmarked',
    }));
    onSaveDayAttendance(todayStr, list);
    setSaveSuccess(true);
    setIsEditing(false);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
  };

  const handleCancelEdit = () => {
    const initial: Record<string, AttendanceStatus | 'Unmarked'> = {};
    subjects.forEach((s) => {
      const existing = records.find((r) => r.subjectId === s.id && r.date === todayStr);
      initial[s.id] = existing ? existing.status : 'Unmarked';
    });
    setDraftStatuses(initial);
    setIsEditing(false);
  };

  // Circular progress math
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallStats.percentage / 100) * circumference;

  return (
    <div className="space-y-6">
      
      {/* Top Welcome Card */}
      <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#0d0d0d] border-white/10 text-white'} rounded-2xl p-6 border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors`}>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${isLight ? 'bg-slate-100 text-slate-800' : 'bg-white/5 text-white/90'}`}>
            <GraduationCap size={24} />
          </div>
          <div>
            <h2 className={`text-xl font-bold font-sans tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Welcome back, {settings.studentName || 'Student'}
            </h2>
            <p className={`text-sm font-sans mt-0.5 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
              Today is <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-white'}`}>{dayName}, {fullDate}</span> • Currently tracking at <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-white'}`}>{settings.institutionName || 'your Academic Institution'}</span>
            </p>
          </div>
        </div>

        {/* Quick overall KPI pills */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-emerald-500/15 text-emerald-500 px-3 py-1.5 rounded-lg border border-emerald-500/30 font-medium">
            Present: {overallStats.present}
          </div>
          <div className="bg-rose-500/15 text-rose-500 px-3 py-1.5 rounded-lg border border-rose-500/30 font-medium">
            Absent: {overallStats.absent}
          </div>
          {overallStats.cancelled > 0 && (
            <div className="bg-amber-500/15 text-amber-500 px-3 py-1.5 rounded-lg border border-amber-500/30 font-medium">
              Cancelled: {overallStats.cancelled}
            </div>
          )}
        </div>
      </div>

      {/* Analytics Overview Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overall Circular Chart */}
        <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#0d0d0d] border-white/10 text-white'} rounded-2xl p-6 border flex flex-col items-center justify-center text-center transition-colors`}>
          <h3 className={`text-sm font-semibold font-sans tracking-tight mb-4 self-start ${isLight ? 'text-slate-500' : 'text-white/50'}`}>Overall Attendance</h3>
          
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={radius}
                className={isLight ? 'stroke-slate-100' : 'stroke-white/5'}
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                className={`transition-all duration-500 ${
                  overallStats.percentage >= settings.overallGoal ? 'stroke-emerald-500' : 'stroke-rose-500'
                }`}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {overallStats.percentage.toFixed(1)}%
              </span>
              <span className={`text-[10px] font-mono uppercase font-semibold ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                Goal: {settings.overallGoal}%
              </span>
            </div>
          </div>

          <p className={`text-xs mt-4 max-w-[200px] ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
            {overallStats.percentage >= settings.overallGoal ? (
              <span className="text-emerald-500 font-medium flex items-center justify-center gap-1">
                <ShieldCheck size={14} /> Maintaining Goal Zone
              </span>
            ) : (
              <span className="text-rose-500 font-medium flex items-center justify-center gap-1">
                <ShieldAlert size={14} /> Action Required
              </span>
            )}
          </p>
        </div>

        {/* Dynamic Goal Adjuster & Core Safe limits */}
        <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#0d0d0d] border-white/10 text-white'} rounded-2xl p-6 border flex flex-col justify-between transition-colors`}>
          <div>
            <h3 className={`text-sm font-semibold font-sans tracking-tight mb-1 flex items-center gap-1.5 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
              <Target size={15} className={isLight ? 'text-slate-400' : 'text-white/40'} /> Goal Threshold Adjuster
            </h3>
            <p className={`text-xs mb-4 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Recalculate safety margins instantly by altering your target attendance.</p>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className={`text-xs font-sans ${isLight ? 'text-slate-500' : 'text-white/60'}`}>Target Attendance Goal:</span>
                <span className={`text-sm font-bold font-mono px-2 py-0.5 rounded-md ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-white/5 text-white'}`}>
                  {settings.overallGoal}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={settings.overallGoal}
                onChange={(e) => onChangeOverallGoal(Number(e.target.value))}
                className={`w-full accent-blue-500 cursor-pointer h-1.5 rounded-lg appearance-none ${isLight ? 'bg-slate-100' : 'bg-white/10'}`}
              />
              <div className={`flex justify-between text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>

              {/* Dynamic Sentence displaying how many classes can be missed */}
              <div className={`mt-4 p-3 rounded-xl border text-xs font-medium font-sans ${isLight ? 'bg-slate-50 border-slate-100 text-slate-700' : 'bg-white/[0.02] border-white/5 text-white/80'}`}>
                {overallStats.total === 0 ? (
                  <div className={`flex items-center gap-1.5 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                    <CalendarDays size={14} className={isLight ? 'text-slate-400' : 'text-white/40'} />
                    <span>Start marking attendance to calculate your bunk margins and goal thresholds. Currently 0 classes logged.</span>
                  </div>
                ) : overallStats.percentage >= settings.overallGoal ? (
                  <div className="space-y-2">
                    <div className="text-emerald-500 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                      <span>You can skip/bunk <strong className="font-mono text-emerald-500 text-sm">{overallStats.canMiss}</strong> class(es) safely to stay at or above your <strong className="font-mono">{settings.overallGoal}%</strong> goal.</span>
                    </div>
                    <div className={`text-[11px] pl-5 font-normal leading-relaxed ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                      ⚠ Bunking <strong className={`font-mono font-bold ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>{overallStats.canMiss + 1}</strong> class(es) will drop your attendance to <strong className={`font-mono font-bold ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>{(((overallStats.present) / (overallStats.total + overallStats.canMiss + 1)) * 100).toFixed(1)}%</strong>, which is below your target threshold.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-rose-500 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                      <span>You are below your <strong className="font-mono">{settings.overallGoal}%</strong> goal! You must attend <strong className="font-mono text-rose-500 text-sm">{overallStats.needToAttend}</strong> consecutive class(es) to recover.</span>
                    </div>
                    <div className={`text-[11px] pl-5 font-normal leading-relaxed ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                      ⚠ Any further bunking will drag your current attendance (<strong className={isLight ? 'text-rose-600' : 'text-rose-400'}>{overallStats.percentage.toFixed(1)}%</strong>) further down.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`pt-4 border-t grid grid-cols-2 gap-4 ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
            <div className={`p-3 rounded-xl ${isLight ? 'bg-slate-50' : 'bg-white/5'}`}>
              <span className={`block text-[10px] font-mono uppercase font-semibold ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Can Skip Safely</span>
              <span className="text-xl font-bold font-mono text-emerald-500">
                {overallStats.canMiss} <span className={`text-xs font-sans font-normal ${isLight ? 'text-slate-500' : 'text-white/50'}`}>classes</span>
              </span>
            </div>
            <div className={`p-3 rounded-xl ${isLight ? 'bg-slate-50' : 'bg-white/5'}`}>
              <span className={`block text-[10px] font-mono uppercase font-semibold ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Must Attend</span>
              <span className={`text-xl font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {overallStats.needToAttend} <span className={`text-xs font-sans font-normal ${isLight ? 'text-slate-500' : 'text-white/50'}`}>classes</span>
              </span>
            </div>
          </div>
        </div>
      </div>



      {/* Today's Live Attendance Sheet with Explicit Read-only saved mode and Edit options */}
      <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#0d0d0d] border-white/10 text-white'} rounded-2xl p-6 border space-y-4 transition-colors`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
          <div>
            <h3 className={`text-md font-bold font-sans tracking-tight flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <ClipboardCheck className={isLight ? 'text-slate-500' : 'text-white/60'} size={18} /> Today's Live Attendance Sheet
            </h3>
            <p className={`text-xs font-sans mt-0.5 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
              Record or adjust your session states for <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-white'}`}>{dayName}, {fullDate}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Edit3 size={13} /> Edit Today's Attendance
              </button>
            ) : (
              <>
                <button
                  onClick={handleMarkAllPresent}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 text-xs font-semibold cursor-pointer transition-all border border-emerald-500/30"
                >
                  Mark All Present
                </button>
                <button
                  onClick={handleMarkAllAbsent}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 text-xs font-semibold cursor-pointer transition-all border border-rose-500/30"
                >
                  Mark All Absent
                </button>
              </>
            )}
          </div>
        </div>

        {subjects.length === 0 ? (
          <p className={`text-sm text-center py-4 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>No attendance data yet. Start by adding your first subject.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map((subj) => {
                const currentStatus = draftStatuses[subj.id] || 'Unmarked';
                return (
                  <div key={subj.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border gap-3 ${isLight ? 'border-slate-100 bg-slate-50/50' : 'border-white/5 bg-white/[0.02]'}`}>
                    <div className="truncate max-w-[200px]">
                      <span className={`text-sm font-semibold block truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>{subj.name}</span>
                      <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                        Status:{' '}
                        <span className={`font-semibold ${
                          currentStatus === 'Present' ? 'text-emerald-500' :
                          currentStatus === 'Absent' ? 'text-rose-500' :
                          currentStatus === 'Cancelled' ? 'text-amber-500' : isLight ? 'text-slate-400' : 'text-white/40'
                        }`}>
                          {currentStatus}
                        </span>
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMarkSingleSubject(subj.id, 'Present')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                            currentStatus === 'Present'
                              ? 'bg-emerald-600 text-white font-semibold'
                              : isLight ? 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200' : 'bg-white/5 hover:bg-white/10 text-white/60 border border-white/10'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleMarkSingleSubject(subj.id, 'Absent')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                            currentStatus === 'Absent'
                              ? 'bg-rose-600 text-white font-semibold'
                              : isLight ? 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200' : 'bg-white/5 hover:bg-white/10 text-white/60 border border-white/10'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => handleMarkSingleSubject(subj.id, 'Cancelled')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                            currentStatus === 'Cancelled'
                              ? 'bg-amber-500 text-white font-semibold'
                              : isLight ? 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200' : 'bg-white/5 hover:bg-white/10 text-white/60 border border-white/10'
                          }`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleMarkSingleSubject(subj.id, 'Unmarked')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                            currentStatus === 'Unmarked'
                              ? isLight ? 'bg-slate-200 text-slate-800 font-semibold' : 'bg-white/20 text-white font-semibold'
                              : isLight ? 'bg-white hover:bg-slate-100 text-slate-500 border border-slate-200' : 'bg-white/5 hover:bg-white/10 text-white/50 border border-white/10'
                          }`}
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className={`text-xs font-mono px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                          currentStatus === 'Present' ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' :
                          currentStatus === 'Absent' ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30' :
                          currentStatus === 'Cancelled' ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30' :
                          isLight ? 'bg-slate-100 text-slate-400 border border-slate-200' : 'bg-white/5 text-white/30 border border-white/10'
                        }`}>
                          {currentStatus}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className={`flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t gap-3 ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="text-xs font-medium text-emerald-500 bg-emerald-500/15 px-3 py-1.5 rounded-lg border border-emerald-500/30 animate-pulse flex items-center gap-1">
                    <CheckCircle2 size={14} /> ✓ Attendance for {dayName} saved successfully!
                  </span>
                )}
                {!isEditing && (
                  <span className={`text-xs flex items-center gap-1 font-medium px-3 py-1.5 rounded-lg border ${isLight ? 'text-slate-400 bg-slate-50 border-slate-100' : 'text-white/40 bg-white/5 border-white/5'}`}>
                    <Lock size={13} className={isLight ? 'text-slate-400' : 'text-white/40'} /> Saved and locked. Click 'Edit Today's Attendance' above to modify.
                  </span>
                )}
              </div>

              {isEditing && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleCancelEdit}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all border ${isLight ? 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200' : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10'}`}
                  >
                    <X size={15} /> Cancel
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-95"
                  >
                    <Save size={16} /> Save Today's Attendance
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Individual Subject Bento Cards */}
      <div className="space-y-4">
        <h3 className={`text-md font-semibold tracking-tight ${isLight ? 'text-slate-800' : 'text-white/90'}`}>Tracked Subjects ({subjects.length})</h3>
        
        {subjects.length === 0 ? (
          <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#0d0d0d] border-white/10 text-white'} rounded-2xl border py-12 text-center transition-colors`}>
            <p className={`font-sans text-sm font-medium ${isLight ? 'text-slate-500' : 'text-white/50'}`}>No attendance data yet. Start by adding your first subject.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjects.map((subject) => {
              const stats = calculateSubjectStats(subject, records, settings.overallGoal);

              return (
                <div
                  key={subject.id}
                  className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#0d0d0d] border-white/10 text-white'} rounded-xl border p-5 transition-all flex flex-col justify-between ${
                    stats.status === 'critical' ? 'border-l-4 border-l-rose-500' :
                    stats.status === 'danger' ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-emerald-500'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className={`font-semibold text-sm font-sans truncate max-w-[160px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {subject.name}
                        </h4>
                        <p className={`text-xs font-mono ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                          Conducted: {stats.total} periods
                        </p>
                      </div>

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-bold flex items-center gap-1 ${
                        stats.status === 'critical' ? 'bg-rose-500/15 text-rose-500' :
                        stats.status === 'danger' ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'
                      }`}>
                        {stats.status === 'critical' && <ShieldAlert size={10} />}
                        {stats.status === 'danger' && <AlertTriangle size={10} />}
                        {stats.status === 'safe' && <ShieldCheck size={10} />}
                        {stats.status}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 mt-3">
                      <div className="flex justify-between text-xs">
                        <span className={`font-sans ${isLight ? 'text-slate-500' : 'text-white/50'}`}>Attendance:</span>
                        <span className={`font-bold font-mono ${isLight ? 'text-slate-800' : 'text-white'}`}>{stats.percentage.toFixed(0)}%</span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-white/10'}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            stats.status === 'critical' ? 'bg-rose-500' :
                            stats.status === 'danger' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(stats.percentage, 100)}%` }}
                        />
                      </div>
                      <div className={`flex justify-between text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                        <span>Min Goal: {stats.goal}%</span>
                        <span>{stats.present}/{stats.total} classes</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
