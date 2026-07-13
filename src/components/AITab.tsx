import React, { useState, useRef } from 'react';
import { Subject, AttendanceStatus, AppSettings } from '../types';
import { Sparkles, Upload, FileText, CheckCircle2, AlertCircle, Loader2, ArrowRight, Plus, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { syllabusService } from '../services/syllabusService';
import { attendanceService } from '../services/attendanceService';
import { timetableService } from '../services/timetableService';

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORTED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
];

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const MODELS_TO_TRY = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-001',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

async function callGeminiREST(
  apiKey: string,
  modelName: string,
  fileBase64: string,
  fileMime: string,
  promptText: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{
      parts: [
        { 
          inline_data: { 
            mime_type: fileMime, 
            data: fileBase64 
          } 
        },
        { text: promptText },
      ],
    }],
    generationConfig: {
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = errData?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

// ─── Day normalizer ───────────────────────────────────────────────────────────

function normalizeDay(dayInput: any): string | null {
  if (dayInput == null) return null;
  const numMap: Record<number, string> = {
    1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
    4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday',
  };
  if (typeof dayInput === 'number' && numMap[dayInput]) return numMap[dayInput];
  const str = String(dayInput).trim().toLowerCase();
  const dayMap: Record<string, string> = {
    '1': 'Monday',    mon: 'Monday',    monday: 'Monday',
    '2': 'Tuesday',   tue: 'Tuesday',   tuesday: 'Tuesday',
    '3': 'Wednesday', wed: 'Wednesday', wednesday: 'Wednesday',
    '4': 'Thursday',  thu: 'Thursday',  thursday: 'Thursday',
    '5': 'Friday',    fri: 'Friday',    friday: 'Friday',
    '6': 'Saturday',  sat: 'Saturday',  saturday: 'Saturday',
    '7': 'Sunday',    sun: 'Sunday',    sunday: 'Sunday',
  };
  return dayMap[str] ||
    (['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].includes(String(dayInput))
      ? String(dayInput) : null);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AITabProps {
  settings: AppSettings;
  userId?: string | null;
  onRefreshData?: () => void;
  onImportAIResults: (data: {
    subjects: Omit<Subject, 'id'>[];
    timetable: { subjectName: string; dayOfWeek: number; period: number }[];
    attendance: { subjectName: string; date: string; status: AttendanceStatus; period: number }[];
  }) => void;
  onClearAllData?: () => void;
  hasData?: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AITab({ settings, userId, onRefreshData, onImportAIResults }: AITabProps) {
  const isLight = settings.theme === 'light';

  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileMime, setFileMime] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [aiParseFailed, setAiParseFailed] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedData, setParsedData] = useState<{
    subjects: { name: string; code?: string; facultyName?: string; credits?: string; semester?: string; minGoal: number }[];
    timetable: { day: string; period: number; subject: string; faculty?: string; room?: string }[];
    attendance?: { subjectName: string; date: string; status: AttendanceStatus; period: number }[];
  } | null>(null);

  const [uncertainEntries, setUncertainEntries] = useState<any[]>([]);

  // Manual modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualSubjectName, setManualSubjectName] = useState('');
  const [manualFacultyName, setManualFacultyName] = useState('');
  const [manualCredits, setManualCredits] = useState('');
  const [manualSubjectCode, setManualSubjectCode] = useState('');

  // ─── File Handling ────────────────────────────────────────────────────────

  const processFile = (file: File) => {
    setError(null);
    setAiParseFailed(false);
    setSyncSuccess(false);

    if (!SUPPORTED_MIMES.includes(file.type)) {
      setError(`Unsupported file type: "${file.type || 'unknown'}". Please upload a PDF, JPEG, PNG, WEBP, or GIF.`);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`);
      return;
    }

    setFileName(file.name);
    setFileMime(file.type);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const parts = result?.split(',');
      if (!parts || parts.length < 2 || !parts[1]) {
        setError('Failed to encode the file. Please try a different file.');
        return;
      }
      setFileBase64(parts[1]);
    };
    reader.onerror = () => setError('Failed to read the file. Please try again.');
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  // ─── Core AI Scan (Backend API integration) ──────────────────────────────

  const handleScanWithAI = async () => {
    if (!fileBase64 || !fileMime) {
      setError('Please select a syllabus PDF, Word, Excel, or image first.');
      return;
    }

    setLoading(true);
    setError(null);
    setAiParseFailed(false);
    setSyncSuccess(false);
    setParsedData(null);

    try {
      setUploadProgress('Uploading...');
      await new Promise(r => setTimeout(r, 200));

      setUploadProgress('Reading file...');
      await new Promise(r => setTimeout(r, 200));

      setUploadProgress('Calling AI...');

      if (!GEMINI_API_KEY) {
        setError(
          'Gemini API key not set. Add VITE_GEMINI_API_KEY to your ' +
          '.env file locally, or Vercel Environment Variables for production.'
        );
        setAiParseFailed(true);
        setLoading(false);
        return;
      }

      const promptText = `
        You are an expert academic organizer and syllabus parser.
        Analyze the provided syllabus PDF or timetable image and extract subjects and schedule.
        Today's date: ${new Date().toISOString().split('T')[0]}.

        Extract:
        1. All distinct academic subjects. For each:
           - name (full subject name)
           - code (subject code if visible, e.g. CS-301)
           - facultyName (professor/teacher name if visible)
           - credits (e.g. "4 Credits")
           - semester (e.g. "Semester 3")
           - minGoal (minimum attendance %, default 75)

        2. Weekly timetable slots. For each slot:
           - subjectName (matching a subject above)
           - dayOfWeek (integer: 1=Monday ... 7=Sunday)
           - period (integer starting from 1)

        3. Any attendance records already visible in the document (optional).

        Be accurate. Expand abbreviations to full names.
      `;

      let rawData: any = null;
      let lastError: any = null;

      for (const modelName of MODELS_TO_TRY) {
        try {
          const text = await callGeminiREST(
            GEMINI_API_KEY,
            modelName,
            fileBase64,
            fileMime,
            promptText
          );

          if (!text) { 
            lastError = new Error('Empty response from model'); 
            continue; 
          }

          const cleaned = text
            .replace(/^```json\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();
          rawData = JSON.parse(cleaned);
          break; // success — stop trying other models

        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${modelName} failed:`, err?.message);
        }
      }

      if (!rawData) {
        throw new Error(
          `Gemini Error: ${lastError?.message || 'All models failed. Please try again.'}`
        );
      }

      if (!Array.isArray(rawData.subjects) || rawData.subjects.length === 0) {
        throw new Error("AI couldn't extract any subjects. Try a clearer image or document.");
      }

      setUploadProgress('Saving...');
      await new Promise(r => setTimeout(r, 300));

      // ── Step 3: Normalize timetable slots ─────────────────────────────────
      const structuredTimetable: any[] = [];
      const uncertain: any[] = [];

      for (const slot of (rawData.timetable || [])) {
        const day = normalizeDay(slot.dayOfWeek ?? slot.dayName ?? slot.day);
        const period = Number(slot.period);
        const subject = (slot.subjectName || slot.subject || '').trim();

        if (day && !isNaN(period) && period > 0 && period <= 12 && subject) {
          structuredTimetable.push({ day, period, subject });
        } else {
          uncertain.push({
            original: slot,
            reason: !day ? 'Unrecognized day' : !subject ? 'Missing subject' : 'Invalid period',
            guessedDay: day || 'Monday',
            guessedPeriod: (!isNaN(period) && period > 0) ? period : 1,
            guessedSubject: subject || rawData.subjects[0]?.name || 'Unknown',
          });
        }
      }

      // ── Step 4: Save to Supabase Storage & DB ─────────────────────────────
      let fileUrl = '';
      if (userId && fileInputRef.current?.files?.[0]) {
        const file = fileInputRef.current.files[0];
        const filePath = `${userId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('syllabus').upload(filePath, file, { upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('syllabus').getPublicUrl(filePath);
          fileUrl = publicUrl;
        }
      }

      if (userId) {
        for (const sub of rawData.subjects) {
          try {
            await syllabusService.addSyllabusRecord({
              user_id: userId,
              subject_name: sub.name,
              subject_code: sub.code,
              faculty_name: sub.facultyName,
              credits: sub.credits,
              semester: sub.semester,
              uploaded_file_url: fileUrl || undefined,
            });
            await attendanceService.upsertAttendanceRecord({
              user_id: userId,
              subject_name: sub.name,
              present: 0, total: 0, percentage: 0,
            });
          } catch (e) {
            console.warn(`Failed to save "${sub.name}":`, e);
          }
        }
      }

      setUploadProgress('Completed');
      await new Promise(r => setTimeout(r, 400));

      // ── Step 5: Show results ───────────────────────────────────────────────
      setParsedData({
        subjects: rawData.subjects,
        timetable: structuredTimetable,
        attendance: Array.isArray(rawData.attendance) ? rawData.attendance : [],
      });
      setUncertainEntries(uncertain);

    } catch (err: any) {
      console.error('[AI Scanner]', err);
      setError(err.message || "Couldn't analyze the syllabus. Please try again.");
      setAiParseFailed(true);
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  // ─── Sync results to Dashboard ────────────────────────────────────────────

  const handleApplyAIResults = async () => {
    if (!parsedData) return;

    const dayNameToNum = (d: string) =>
      ({ Monday:1,Tuesday:2,Wednesday:3,Thursday:4,Friday:5,Saturday:6,Sunday:7 }[d] ?? 1);

    onImportAIResults({
      subjects: parsedData.subjects.map(s => ({
        name: s.name,
        minAttendanceGoal: s.minGoal || 75,
      })),
      timetable: (parsedData.timetable || []).map(t => ({
        subjectName: t.subject,
        dayOfWeek: dayNameToNum(t.day),
        period: t.period,
      })),
      attendance: parsedData.attendance || [],
    });

    if (userId) {
      try { await timetableService.saveTimetableBatch(userId, parsedData.timetable); }
      catch (e) { console.error('Timetable batch save failed:', e); }
    }

    if (onRefreshData) onRefreshData();
    setParsedData(null);
    setUncertainEntries([]);
    setFileBase64(null);
    setFileName('');
    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 4000);
  };

  // ─── Manual subject entry ─────────────────────────────────────────────────

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSubjectName.trim() || !userId) return;
    try {
      setLoading(true);
      await syllabusService.addSyllabusRecord({
        user_id: userId,
        subject_name: manualSubjectName.trim(),
        faculty_name: manualFacultyName.trim() || undefined,
        credits: manualCredits.trim() || undefined,
        subject_code: manualSubjectCode.trim() || undefined,
      });
      await attendanceService.upsertAttendanceRecord({
        user_id: userId,
        subject_name: manualSubjectName.trim(),
        present: 0, total: 0, percentage: 0,
      });
      setManualSubjectName(''); setManualFacultyName('');
      setManualCredits(''); setManualSubjectCode('');
      setShowManualModal(false);
      if (onRefreshData) onRefreshData();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to add subject.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm text-slate-900' : 'bg-[#0d0d0d] border-white/10 text-white'} rounded-2xl p-6 border flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <h2 className={`text-xl font-semibold tracking-tight flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Sparkles size={20} className="text-blue-500 animate-pulse" /> AI Syllabus Scanner
          </h2>
          <p className={`text-xs font-mono mt-1 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
            Upload your syllabus PDF or timetable to securely populate your account
          </p>
        </div>
        <button
          onClick={() => setShowManualModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-blue-500/20"
        >
          <Plus size={14} /> Manual Subject Entry
        </button>
      </div>

      {/* Success banner */}
      {syncSuccess && (
        <div className="p-4 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-xs flex items-center gap-2 font-semibold">
          <CheckCircle2 size={16} /> Syllabus scanned and saved to your account successfully!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm text-slate-900' : 'bg-[#0d0d0d] border-white/10 text-white'} border rounded-2xl p-6`}>
            <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${isLight ? 'text-slate-800' : 'text-white/80'}`}>
              1. Upload Syllabus PDF
            </h3>
            <p className={`text-xs mb-4 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
              Stored securely in your private user storage folder.
            </p>

            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag} onDragOver={handleDrag}
              onDragLeave={handleDrag} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragActive ? 'border-blue-500 bg-blue-500/10'
                : isLight ? 'border-slate-200 hover:border-slate-300 bg-slate-50'
                : 'border-white/10 hover:border-white/20'
              }`}
            >
              <input ref={fileInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFileChange} />
              <Upload size={32} className={`mx-auto mb-3 ${isLight ? 'text-slate-400' : 'text-white/20'}`} />
              <p className={`text-xs ${isLight ? 'text-slate-700' : 'text-white/70'}`}>
                Drag & drop your syllabus here or <span className="text-blue-500 font-semibold underline">browse</span>
              </p>
              <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-400' : 'text-white/30'}`}>PDF, JPEG, PNG, WEBP — max 10 MB</p>
              {fileName && (
                <div className={`mt-4 p-2 border rounded-lg flex items-center justify-center gap-2 text-xs font-mono text-blue-500 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/5'}`}>
                  <FileText size={14} />
                  <span className="truncate max-w-[180px]">{fileName}</span>
                </div>
              )}
            </div>

            {/* Progress */}
            {loading && uploadProgress && (
              <div className="mt-4 p-3 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-xl text-xs flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />{uploadProgress}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs space-y-3">
                <div className="flex items-start gap-2 font-semibold">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
                {aiParseFailed && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleScanWithAI} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer">
                      Retry Scan
                    </button>
                    <button onClick={() => setShowManualModal(true)} className={`px-3 py-1.5 border rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${isLight ? 'border-red-300 hover:bg-red-50 text-red-700' : 'border-red-500/30 hover:bg-red-500/10 text-red-300'}`}>
                      Manual Entry
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Scan Button */}
            <button
              onClick={handleScanWithAI}
              disabled={!fileBase64 || loading}
              className={`w-full mt-5 py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${
                !fileBase64 || loading
                  ? isLight ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 cursor-pointer'
              }`}
            >
              {loading ? <><Loader2 size={14} className="animate-spin" />Analyzing with AI...</> : <><Sparkles size={14} />Initiate AI Scan</>}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-7">
          <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm text-slate-900' : 'bg-[#0d0d0d] border-white/10 text-white'} border rounded-2xl p-6 min-h-[300px] flex flex-col justify-between`}>
            <div>
              <div className={`flex items-center justify-between mb-4 pb-3 border-b ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                <h3 className={`text-sm font-semibold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-white/80'}`}>
                  2. Review AI Extracted Syllabus
                </h3>
                {parsedData && (
                  <button onClick={handleApplyAIResults} className="px-3.5 py-1.5 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 hover:bg-emerald-500/30 transition-colors cursor-pointer">
                    Sync to Dashboard <ArrowRight size={12} />
                  </button>
                )}
              </div>

              {!parsedData ? (
                <div className={`py-12 text-center flex flex-col items-center justify-center ${isLight ? 'text-slate-400' : 'text-white/20'}`}>
                  <Sparkles size={36} className={`mb-2 ${isLight ? 'text-slate-300' : 'text-white/10'}`} />
                  <p className="text-xs max-w-sm">No scan performed yet. Upload your syllabus PDF above or add subjects manually.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Subjects */}
                  <div>
                    <h4 className={`text-[10px] font-mono uppercase mb-2 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
                      Subjects Extracted ({parsedData.subjects.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {parsedData.subjects.map((s, i) => (
                        <div key={i} className={`p-3 border rounded-xl text-xs space-y-1 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                          <div className="font-bold flex items-center justify-between">
                            <span>{s.name}</span>
                            {s.code && <span className="font-mono text-[10px] text-blue-500">{s.code}</span>}
                          </div>
                          <div className={`text-[10px] flex flex-wrap gap-2 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                            {s.facultyName && <span>Faculty: {s.facultyName}</span>}
                            {s.credits && <span>Credits: {s.credits}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timetable */}
                  {parsedData.timetable.length > 0 && (
                    <div>
                      <h4 className={`text-[10px] font-mono uppercase mb-2 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
                        Schedule Slots ({parsedData.timetable.length})
                      </h4>
                      <div className="max-h-[160px] overflow-y-auto space-y-1.5">
                        {parsedData.timetable.map((t, i) => (
                          <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs ${isLight ? 'bg-slate-50' : 'bg-white/[0.02]'}`}>
                            <span className="font-semibold">{t.subject}</span>
                            <span className={`font-mono ${isLight ? 'text-slate-500' : 'text-white/40'}`}>{t.day} • Period {t.period}{t.room ? ` • ${t.room}` : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Uncertain entries */}
                  {uncertainEntries.length > 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                      <p className="flex items-center gap-1.5 text-amber-500 text-xs font-bold">
                        <HelpCircle size={14} /> Uncertain Entries ({uncertainEntries.length}) — Please Confirm
                      </p>
                      <div className="space-y-2 max-h-[140px] overflow-y-auto">
                        {uncertainEntries.map((ue, i) => (
                          <div key={i} className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${isLight ? 'bg-white border-amber-200' : 'bg-black/40 border-amber-500/20'}`}>
                            <span className="font-semibold truncate">{ue.reason}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <select value={ue.guessedDay} onChange={e => { const u=[...uncertainEntries]; u[i].guessedDay=e.target.value; setUncertainEntries(u); }} className={`text-xs px-2 py-1 rounded border ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-white/10 border-white/20 text-white'}`}>
                                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d=><option key={d}>{d}</option>)}
                              </select>
                              <input type="number" min={1} max={10} value={ue.guessedPeriod} onChange={e => { const u=[...uncertainEntries]; u[i].guessedPeriod=Number(e.target.value); setUncertainEntries(u); }} className={`w-14 text-xs px-2 py-1 rounded border ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-white/10 border-white/20 text-white'}`} />
                              <button type="button" onClick={() => {
                                if (parsedData) setParsedData({ ...parsedData, timetable: [...parsedData.timetable, { day: ue.guessedDay, period: ue.guessedPeriod, subject: ue.guessedSubject }] });
                                setUncertainEntries(uncertainEntries.filter((_,j)=>j!==i));
                              }} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold cursor-pointer">
                                Confirm
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {parsedData && (
              <p className={`text-[10px] italic mt-4 ${isLight ? 'text-slate-400' : 'text-white/30'}`}>
                * Subjects and records saved to your account. Click "Sync to Dashboard" to apply.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#121212] border-white/10 text-white'} w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-5`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
              <h3 className="text-base font-bold">Manual Subject Entry</h3>
              <button onClick={() => setShowManualModal(false)} className={`text-xs px-2 py-1 rounded ${isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/10 text-white/50'}`}>✕</button>
            </div>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-mono uppercase mb-1.5 ${isLight ? 'text-slate-700' : 'text-white/70'}`}>Subject Name *</label>
                <input required type="text" placeholder="e.g. Advanced Data Structures" value={manualSubjectName} onChange={e=>setManualSubjectName(e.target.value)} className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-white/5 border-white/10 text-white focus:border-blue-500'}`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-mono uppercase mb-1.5 ${isLight ? 'text-slate-700' : 'text-white/70'}`}>Subject Code</label>
                  <input type="text" placeholder="e.g. CS-301" value={manualSubjectCode} onChange={e=>setManualSubjectCode(e.target.value)} className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-white/5 border-white/10 text-white focus:border-blue-500'}`} />
                </div>
                <div>
                  <label className={`block text-xs font-mono uppercase mb-1.5 ${isLight ? 'text-slate-700' : 'text-white/70'}`}>Credits</label>
                  <input type="text" placeholder="e.g. 4 Credits" value={manualCredits} onChange={e=>setManualCredits(e.target.value)} className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-white/5 border-white/10 text-white focus:border-blue-500'}`} />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-mono uppercase mb-1.5 ${isLight ? 'text-slate-700' : 'text-white/70'}`}>Faculty Name</label>
                <input type="text" placeholder="e.g. Dr. Robert Smith" value={manualFacultyName} onChange={e=>setManualFacultyName(e.target.value)} className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-white/5 border-white/10 text-white focus:border-blue-500'}`} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setShowManualModal(false)} className={`px-4 py-2.5 rounded-xl text-xs font-semibold ${isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>Cancel</button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer">
                  {loading ? 'Saving...' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
