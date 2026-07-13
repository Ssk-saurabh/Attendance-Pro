import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Subject, TimetableSlot, AttendanceRecord, AppSettings, AttendanceStatus } from './types';
import DashboardTab from './components/DashboardTab';
import ScheduleTab from './components/ScheduleTab';
import RecordTab from './components/RecordTab';
import SettingsTab from './components/SettingsTab';
import AITab from './components/AITab';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { calculateOverallStats, calculateSubjectStats } from './utils/calculator';
import { supabase } from './lib/supabase';
import { profileService } from './services/profileService';
import { attendanceService } from './services/attendanceService';
import { syllabusService } from './services/syllabusService';
import { 
  LayoutDashboard, Calendar, History, Settings, Sparkles, Check, LogOut
} from 'lucide-react';

function AttendanceApp() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'record' | 'ai' | 'settings'>('dashboard');

  // Start with empty account (no demo/mock data)
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('att_settings');
    return saved ? JSON.parse(saved) : {
      overallGoal: 75,
      studentName: 'Alex Morgan',
      institutionName: 'Stanford Institute of Technology',
      phoneNumber: '+1 (555) 382-9104',
      branch: 'Computer Science & Engineering',
      section: 'A-2',
      semester: 'Semester 6',
      rollNumber: 'CS-2026-884',
      academicYear: '2025 - 2026',
    };
  });

  const [currentDate, setCurrentDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);

  const loadData = async (currentUserId?: string) => {
    const targetUserId = currentUserId || userId;
    if (!targetUserId) return;
    try {
      const profile = await profileService.getProfile(targetUserId);
      const dbAttendance = await attendanceService.getAttendanceRecords(targetUserId);
      if (dbAttendance && dbAttendance.length > 0) {
        const loadedSubjects: Subject[] = [];
        const loadedRecords: AttendanceRecord[] = [];

        dbAttendance.forEach((row, idx) => {
          const subjId = `sub_db_${idx}`;
          loadedSubjects.push({
            id: subjId,
            name: row.subject_name,
            minAttendanceGoal: profile?.attendance_goal ?? settings.overallGoal,
          });

          for (let i = 0; i < row.present; i++) {
            loadedRecords.push({
              id: `rec_p_${idx}_${i}`,
              subjectId: subjId,
              date: row.last_updated ? row.last_updated.split('T')[0] : new Date().toISOString().split('T')[0],
              status: 'Present',
              period: 1,
            });
          }
          const absentCount = Math.max(0, row.total - row.present);
          for (let i = 0; i < absentCount; i++) {
            loadedRecords.push({
              id: `rec_a_${idx}_${i}`,
              subjectId: subjId,
              date: row.last_updated ? row.last_updated.split('T')[0] : new Date().toISOString().split('T')[0],
              status: 'Absent',
              period: 1,
            });
          }
        });

        setSubjects(loadedSubjects);
        setRecords(loadedRecords);
      } else {
        setSubjects([]);
        setRecords([]);
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  // Load user profile and attendance from Supabase on mount
  useEffect(() => {
    async function loadSupabaseData() {
      try {
        setLoading(true);
        setDbError(null);
        let userIdToUse = 'local_guest_user';
        try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (!userError && user) {
            userIdToUse = user.id;
          }
        } catch (netErr) {
          console.warn('Supabase offline / network error, falling back to local guest mode:', netErr);
        }

        setUserId(userIdToUse);

        // 1. Load Profile
        const profile = await profileService.getProfile(userIdToUse);
        if (profile) {
          setSettings((prev) => ({
            ...prev,
            studentName: profile.full_name || prev.studentName,
            semester: profile.semester || prev.semester,
            course: profile.course || prev.course,
            branch: profile.branch || prev.branch,
            overallGoal: profile.attendance_goal ?? prev.overallGoal,
          }));
        }

        // 1.5. Check Onboarding
        const onboardingCompleted = await profileService.getOnboardingStatus(userIdToUse);
        if (!onboardingCompleted) {
          setShowOnboardingModal(true);
        }

        // 2. Load Attendance from attendance table / local storage
        await loadData(userIdToUse);
      } catch (err: any) {
        console.error('Error loading data:', err);
        setUserId('local_guest_user');
        await loadData('local_guest_user');
      } finally {
        setLoading(false);
      }
    }

    loadSupabaseData();
  }, []);

  // Sync attendance to Supabase immediately
  const syncAttendanceToSupabase = async (updatedRecords: AttendanceRecord[], currentSubjects: Subject[], currentGoal: number) => {
    if (!userId) return;
    try {
      for (const subj of currentSubjects) {
        const stats = calculateSubjectStats(subj, updatedRecords, currentGoal);
        await attendanceService.upsertAttendanceRecord({
          user_id: userId,
          subject_name: subj.name,
          present: stats.present,
          total: stats.total,
          percentage: stats.percentage,
        });
      }
    } catch (err) {
      console.error('Failed to sync attendance to Supabase:', err);
    }
  };

  // Keep Local Storage in sync
  useEffect(() => {
    localStorage.setItem('att_subjects', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('att_timetable', JSON.stringify(timetable));
  }, [timetable]);

  useEffect(() => {
    localStorage.setItem('att_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('att_settings', JSON.stringify(settings));
  }, [settings]);

  // DB Mutators
  const handleAddSubject = (name: string, minGoal: number) => {
    const newSub: Subject = {
      id: `subj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name,
      minAttendanceGoal: minGoal,
    };
    setSubjects((prev) => [...prev, newSub]);
  };

  const handleDeleteSubject = (id: string) => {
    if (confirm("Deleting this subject will also delete all its scheduled routine slots and historic attendance records. Proceed?")) {
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      setTimetable((prev) => prev.filter((t) => t.subjectId !== id));
      setRecords((prev) => prev.filter((r) => r.subjectId !== id));
    }
  };

  const handleAddSlot = (subjectId: string, dayOfWeek: number, period: number) => {
    const newSlot: TimetableSlot = {
      id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      subjectId,
      dayOfWeek,
      period,
    };
    setTimetable((prev) => [...prev, newSlot]);
  };

  const handleDeleteSlot = (id: string) => {
    setTimetable((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddRecord = (record: Omit<AttendanceRecord, 'id'>) => {
    const newRecord: AttendanceRecord = {
      ...record,
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    };
    setRecords((prev) => [...prev, newRecord]);
  };

  const handleUpdateRecordStatus = (id: string, newStatus: AttendanceStatus) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSaveDayAttendance = (date: string, list: { subjectId: string; status: AttendanceStatus | 'Unmarked' }[]) => {
    setRecords((prev) => {
      const subjectIdsToUpdate = new Set(list.map((item) => item.subjectId));
      const filtered = prev.filter((r) => !(r.date === date && subjectIdsToUpdate.has(r.subjectId)));

      const newRecords: AttendanceRecord[] = [];
      list.forEach((item) => {
        if (item.status !== 'Unmarked') {
          newRecords.push({
            id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${item.subjectId}`,
            date,
            subjectId: item.subjectId,
            status: item.status,
            period: 1,
          });
        }
      });

      return [...filtered, ...newRecords];
    });
  };

  const handleClearAllRecords = () => {
    setRecords([]);
  };

  const handleClearAllData = () => {
    localStorage.removeItem('att_subjects');
    localStorage.removeItem('att_timetable');
    localStorage.removeItem('att_records');
    setSubjects([]);
    setTimetable([]);
    setRecords([]);
  };

  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings,
    }));

    if (userId && newSettings.overallGoal !== undefined) {
      try {
        await profileService.updateProfile(userId, { attendance_goal: newSettings.overallGoal });
      } catch (err) {
        console.error('Failed to update attendance goal in profile:', err);
      }
    }
  };

  const handleImportBackup = (imported: {
    subjects: Subject[];
    timetable: TimetableSlot[];
    records: AttendanceRecord[];
    settings: AppSettings;
  }) => {
    setSubjects(imported.subjects);
    setTimetable(imported.timetable);
    setRecords(imported.records);
    setSettings(imported.settings);
  };

  const handleSeedDemoData = () => {
    const demoSubjects: Subject[] = [
      { id: 'sub_1', name: 'Mathematics (Advanced Calculus)', minAttendanceGoal: 75 },
      { id: 'sub_2', name: 'Applied AI & Neural Networks', minAttendanceGoal: 80 },
      { id: 'sub_3', name: 'Systems Design Philosophy', minAttendanceGoal: 75 },
      { id: 'sub_4', name: 'Fluid Dynamics & Thermal Physics', minAttendanceGoal: 75 },
      { id: 'sub_5', name: 'Humanities & Art Criticism', minAttendanceGoal: 60 },
    ];

    const demoSlots: TimetableSlot[] = [
      { id: 'slot_1', subjectId: 'sub_1', dayOfWeek: 1, period: 1 },
      { id: 'slot_2', subjectId: 'sub_2', dayOfWeek: 1, period: 2 },
      { id: 'slot_3', subjectId: 'sub_3', dayOfWeek: 1, period: 3 },
      { id: 'slot_4', subjectId: 'sub_4', dayOfWeek: 2, period: 1 },
      { id: 'slot_5', subjectId: 'sub_1', dayOfWeek: 2, period: 2 },
      { id: 'slot_6', subjectId: 'sub_2', dayOfWeek: 3, period: 1 },
      { id: 'slot_7', subjectId: 'sub_5', dayOfWeek: 3, period: 4 },
      { id: 'slot_8', subjectId: 'sub_3', dayOfWeek: 4, period: 2 },
      { id: 'slot_9', subjectId: 'sub_4', dayOfWeek: 4, period: 3 },
      { id: 'slot_10', subjectId: 'sub_1', dayOfWeek: 5, period: 1 },
      { id: 'slot_11', subjectId: 'sub_2', dayOfWeek: 5, period: 2 },
      { id: 'slot_12', subjectId: 'sub_5', dayOfWeek: 5, period: 3 },
    ];

    const demoRecords: AttendanceRecord[] = [];
    const statusPool: AttendanceStatus[] = ['Present', 'Present', 'Present', 'Present', 'Absent'];
    const dates = [
      '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25', '2026-06-26',
      '2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03',
    ];

    dates.forEach((dt) => {
      const d = new Date(dt);
      const dayVal = d.getDay();
      const daySlots = demoSlots.filter(s => s.dayOfWeek === dayVal);

      daySlots.forEach(sl => {
        const randStatus = statusPool[Math.floor(Math.random() * statusPool.length)];
        demoRecords.push({
          id: `demo_rec_${Math.random().toString(36).substr(2, 5)}`,
          date: dt,
          subjectId: sl.subjectId,
          status: randStatus,
          period: sl.period,
        });
      });
    });

    setSubjects(demoSubjects);
    setTimetable(demoSlots);
    setRecords(demoRecords);
    setSettings({
      overallGoal: 75,
      studentName: 'Alex Mercer',
      institutionName: 'Stanford Polytech',
      theme: settings.theme,
    });
  };

  const handleImportAIResults = (aiData: {
    subjects: Omit<Subject, 'id'>[];
    timetable: { subjectName: string; dayOfWeek: number; period: number }[];
    attendance: { subjectName: string; date: string; status: AttendanceStatus; period: number }[];
  }) => {
    const updatedSubjects = [...subjects];
    const subjectNameToIdMap: { [name: string]: string } = {};

    subjects.forEach((s) => {
      subjectNameToIdMap[s.name.toLowerCase()] = s.id;
    });

    aiData.subjects.forEach((aiSubj) => {
      const lowerName = aiSubj.name.toLowerCase();
      if (!subjectNameToIdMap[lowerName]) {
        const newId = `subj_ai_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        updatedSubjects.push({
          id: newId,
          name: aiSubj.name,
          minAttendanceGoal: aiSubj.minAttendanceGoal,
        });
        subjectNameToIdMap[lowerName] = newId;
      }
    });

    const updatedTimetable = [...timetable];
    aiData.timetable.forEach((aiSlot) => {
      const matchedId = subjectNameToIdMap[aiSlot.subjectName.toLowerCase()];
      if (matchedId) {
        const dup = updatedTimetable.some(
          (t) => t.subjectId === matchedId && t.dayOfWeek === aiSlot.dayOfWeek && t.period === aiSlot.period
        );
        if (!dup) {
          updatedTimetable.push({
            id: `slot_ai_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            subjectId: matchedId,
            dayOfWeek: aiSlot.dayOfWeek,
            period: aiSlot.period,
          });
        }
      }
    });

    const updatedRecords = [...records];
    aiData.attendance.forEach((aiRec) => {
      const matchedId = subjectNameToIdMap[aiRec.subjectName.toLowerCase()];
      if (matchedId) {
        const dup = updatedRecords.some(
          (r) => r.subjectId === matchedId && r.date === aiRec.date && r.period === aiRec.period
        );
        if (!dup) {
          updatedRecords.push({
            id: `rec_ai_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            date: aiRec.date,
            subjectId: matchedId,
            status: aiRec.status,
            period: aiRec.period,
          });
        }
      }
    });

    setSubjects(updatedSubjects);
    setTimetable(updatedTimetable);
    setRecords(updatedRecords);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const overallStats = calculateOverallStats(subjects, records, settings.overallGoal);
  const isLight = settings.theme === 'light';

  return (
    <div className={`w-full h-screen font-sans flex flex-col overflow-hidden select-none ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#090909] text-[#e0e0e0]'}`}>
      
      {/* 1. Header Line */}
      <header className={`h-16 border-b flex items-center justify-between px-8 shrink-0 ${isLight ? 'border-slate-200 bg-white text-slate-900 shadow-sm' : 'border-white/10 bg-[#0d0d0d] text-white'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-md shadow-md shadow-blue-500/20">
            S
          </div>
          <div>
            <h1 className={`text-sm font-semibold tracking-widest uppercase ${isLight ? 'text-slate-800' : 'text-white/90'}`}>Attendance Pro</h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className={`text-[10px] uppercase tracking-tighter ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Syllabus Status</span>
            <span className="text-xs font-mono text-blue-500">
              {subjects.length} Tracked • {records.length} Logs Marked
            </span>
          </div>
          <div className={`w-40 h-1.5 rounded-full overflow-hidden hidden sm:block ${isLight ? 'bg-slate-200' : 'bg-white/5'}`}>
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${Math.min(overallStats.percentage, 100)}%` }}
            ></div>
          </div>
          <button
            onClick={handleLogout}
            className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
              isLight ? 'bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border-slate-200' : 'bg-white/5 hover:bg-rose-500/20 text-white/80 hover:text-rose-400 border-white/10'
            }`}
            title="Log out"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* 2. Main Area */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Side Navigation bar */}
        <aside className={`w-64 border-r flex flex-col justify-between py-6 shrink-0 hidden md:flex ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#0b0b0b]'}`}>
          <div className="space-y-6">
            <div className="px-4">
              <div className={`text-[10px] px-4 mb-2 uppercase tracking-widest font-mono ${isLight ? 'text-slate-400' : 'text-white/30'}`}>Operations</div>
              
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-semibold cursor-pointer ${
                    activeTab === 'dashboard'
                      ? isLight ? 'bg-slate-100 text-blue-600 border-l-2 border-blue-600 font-bold' : 'bg-white/5 text-white border-l-2 border-blue-500'
                      : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' : 'text-white/50 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <LayoutDashboard size={16} className={activeTab === 'dashboard' ? 'text-blue-500' : isLight ? 'text-slate-400' : 'text-white/40'} />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-semibold cursor-pointer ${
                    activeTab === 'schedule'
                      ? isLight ? 'bg-slate-100 text-blue-600 border-l-2 border-blue-600 font-bold' : 'bg-white/5 text-white border-l-2 border-blue-500'
                      : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' : 'text-white/50 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <Calendar size={16} className={activeTab === 'schedule' ? 'text-blue-500' : isLight ? 'text-slate-400' : 'text-white/40'} />
                  <span>Schedule</span>
                </button>

                <button
                  onClick={() => setActiveTab('record')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-semibold cursor-pointer ${
                    activeTab === 'record'
                      ? isLight ? 'bg-slate-100 text-blue-600 border-l-2 border-blue-600 font-bold' : 'bg-white/5 text-white border-l-2 border-blue-500'
                      : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' : 'text-white/50 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <History size={16} className={activeTab === 'record' ? 'text-blue-500' : isLight ? 'text-slate-400' : 'text-white/40'} />
                  <span>Record</span>
                </button>

                <button
                  onClick={() => setActiveTab('ai')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-semibold cursor-pointer ${
                    activeTab === 'ai'
                      ? isLight ? 'bg-slate-100 text-blue-600 border-l-2 border-blue-600 font-bold' : 'bg-white/5 text-white border-l-2 border-blue-500'
                      : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' : 'text-white/50 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <Sparkles size={16} className={activeTab === 'ai' ? 'text-blue-500' : isLight ? 'text-slate-400' : 'text-white/40'} />
                  <span>AI Scanner</span>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-semibold cursor-pointer ${
                    activeTab === 'settings'
                      ? isLight ? 'bg-slate-100 text-blue-600 border-l-2 border-blue-600 font-bold' : 'bg-white/5 text-white border-l-2 border-blue-500'
                      : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' : 'text-white/50 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <Settings size={16} className={activeTab === 'settings' ? 'text-blue-500' : isLight ? 'text-slate-400' : 'text-white/40'} />
                  <span>Settings</span>
                </button>
              </nav>
            </div>
          </div>
        </aside>

        {/* 3. Center panel for actual view content */}
        <div className={`flex-1 flex flex-col overflow-y-auto ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#090909] text-white'} p-4 sm:p-8 space-y-6`}>
          
          {/* Mobile responsive navigation buttons (when screen is narrow) */}
          <div className={`md:hidden flex flex-wrap gap-1.5 p-2 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0d0d0d] border-white/5'}`}>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : isLight ? 'text-slate-600' : 'text-white/55'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${activeTab === 'schedule' ? 'bg-blue-600 text-white' : isLight ? 'text-slate-600' : 'text-white/55'}`}
            >
              Schedule
            </button>
            <button
              onClick={() => setActiveTab('record')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${activeTab === 'record' ? 'bg-blue-600 text-white' : isLight ? 'text-slate-600' : 'text-white/55'}`}
            >
              Record
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${activeTab === 'ai' ? 'bg-blue-600 text-white' : isLight ? 'text-slate-600' : 'text-white/55'}`}
            >
              AI Scanner
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${activeTab === 'settings' ? 'bg-blue-600 text-white' : isLight ? 'text-slate-600' : 'text-white/55'}`}
            >
              Settings
            </button>
          </div>

          {/* Conditional rendering depending on tab */}
          {activeTab === 'dashboard' && (
            <DashboardTab
              subjects={subjects}
              records={records}
              settings={settings}
              userId={userId}
              onChangeOverallGoal={(g) => handleUpdateSettings({ overallGoal: g })}
              onAddRecord={handleAddRecord}
              onDeleteRecord={handleDeleteRecord}
              onSaveDayAttendance={handleSaveDayAttendance}
            />
          )}

          {activeTab === 'schedule' && (
            <ScheduleTab
              subjects={subjects}
              settings={settings}
              userId={userId}
            />
          )}

          {activeTab === 'record' && (
            <RecordTab
              subjects={subjects}
              records={records}
              settings={settings}
            />
          )}

          {activeTab === 'ai' && (
            <AITab 
              settings={settings}
              userId={userId}
              onRefreshData={loadData}
              onImportAIResults={handleImportAIResults} 
              onClearAllData={handleClearAllData}
              hasData={subjects.length > 0 || timetable.length > 0 || records.length > 0}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              settings={settings}
              subjects={subjects}
              timetable={timetable}
              records={records}
              userId={userId}
              onUpdateSettings={handleUpdateSettings}
              onImportBackup={handleImportBackup}
              onSeedDemoData={handleSeedDemoData}
              onClearAllData={handleClearAllData}
            />
          )}
        </div>
      </main>

      {/* Onboarding Modal for New Users */}
      {showOnboardingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${isLight ? 'bg-white text-slate-900 border-slate-200' : 'bg-[#121212] text-white border-white/10'} w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200`}>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center mx-auto mb-3">
                <Sparkles size={24} />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Welcome 👋</h2>
              <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-white/60'}`}>
                Let's personalize your Attendance Tracker.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => {
                  setShowOnboardingModal(false);
                  setActiveTab('ai');
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles size={16} /> Scan Syllabus Now
              </button>
              <button
                onClick={async () => {
                  if (userId) {
                    await profileService.updateOnboardingStatus(userId, true);
                  }
                  setShowOnboardingModal(false);
                }}
                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 text-white/70'
                }`}
              >
                Skip For Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={`h-10 border-t flex items-center justify-center px-8 text-xs tracking-wider shrink-0 ${isLight ? 'border-slate-200 bg-white text-slate-600' : 'border-white/5 bg-[#070707] text-white/50'}`}>
        <div className="flex items-center gap-1.5 font-sans">
          <span>Made by SSK</span>
          <span className="text-red-500 text-sm">♥</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<AttendanceApp />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
