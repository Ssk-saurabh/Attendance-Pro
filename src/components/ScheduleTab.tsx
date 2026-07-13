import React, { useState, useEffect } from 'react';
import { Subject, AppSettings } from '../types';
import { timetableService, TimetableEntryDB } from '../services/timetableService';
import { extraClassesService, ExtraClassDB } from '../services/extraClassesService';
import { Plus, MapPin, User, X, BookOpen } from 'lucide-react';

interface ScheduleTabProps {
  subjects: Subject[];
  settings: AppSettings;
  userId?: string | null;
}

export default function ScheduleTab({
  subjects,
  settings,
  userId,
}: ScheduleTabProps) {
  const isLight = settings.theme === 'light';

  const [timetableEntries, setTimetableEntries] = useState<TimetableEntryDB[]>([]);
  const [extraClasses, setExtraClasses] = useState<ExtraClassDB[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal for adding Extra Class
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [extraDay, setExtraDay] = useState('Monday');
  const [extraDate, setExtraDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [extraSubject, setExtraSubject] = useState(subjects[0]?.name || '');
  const [extraPeriods, setExtraPeriods] = useState(1);
  const [extraStartTime, setExtraStartTime] = useState('');
  const [extraEndTime, setExtraEndTime] = useState('');
  const [extraFaculty, setExtraFaculty] = useState('');
  const [extraRoom, setExtraRoom] = useState('');
  const [extraNotes, setExtraNotes] = useState('');

  const loadData = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const [tt, ec] = await Promise.all([
        timetableService.getTimetable(userId),
        extraClassesService.getExtraClasses(userId),
      ]);
      setTimetableEntries(tt);
      setExtraClasses(ec);
    } catch (err) {
      console.error('Error loading schedule data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleSaveExtraClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !extraSubject.trim()) return;

    try {
      await extraClassesService.addExtraClass({
        user_id: userId,
        day: extraDay,
        date: extraDate,
        subject: extraSubject.trim(),
        periods: Number(extraPeriods) || 1,
        start_time: extraStartTime || undefined,
        end_time: extraEndTime || undefined,
        faculty: extraFaculty || undefined,
        room: extraRoom || undefined,
        notes: extraNotes || undefined,
      });

      setShowExtraModal(false);
      // Reset form
      setExtraSubject(subjects[0]?.name || '');
      setExtraPeriods(1);
      setExtraStartTime('');
      setExtraEndTime('');
      setExtraFaculty('');
      setExtraRoom('');
      setExtraNotes('');
      await loadData();
    } catch (err) {
      console.error('Error saving extra class:', err);
      alert('Failed to save extra class.');
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#0d0d0d] border-white/10 text-white'} rounded-2xl p-6 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors`}>
        <div>
          <h2 className={`text-xl font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Class Schedule & Timetable</h2>
          <p className={`text-xs font-mono mt-1 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
            Read-only weekly schedule extracted from your AI syllabus scanner
          </p>
        </div>
      </div>

      {/* Main Weekly Timetable (Read-Only) */}
      <div className="space-y-6">
        <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-white/80'}`}>
          Weekly Timetable (Read-Only)
        </h3>

        {timetableEntries.length === 0 ? (
          <div className={`${isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-[#0d0d0d] border-white/10 text-white/50'} rounded-2xl p-8 border text-center text-xs space-y-2`}>
            <BookOpen size={32} className="mx-auto text-blue-500 opacity-60 mb-2" />
            <p className="font-semibold">No timetable entries found.</p>
            <p className="text-[11px] opacity-70">Use the AI Scanner tab to upload and scan your syllabus/timetable document.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {days.map((day) => {
              const daySlots = timetableEntries.filter((t) => t.day.toLowerCase() === day.toLowerCase()).sort((a, b) => a.period - b.period);
              const dayExtras = extraClasses.filter((e) => e.day.toLowerCase() === day.toLowerCase());

              if (daySlots.length === 0 && dayExtras.length === 0) return null;

              return (
                <div key={day} className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0d0d0d] border-white/10'} rounded-2xl p-5 border space-y-3`}>
                  <div className="flex items-center justify-between border-b pb-3 border-inherit">
                    <span className={`font-bold font-sans text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{day}</span>
                    <span className="text-[10px] font-mono bg-blue-500/15 text-blue-500 px-2 py-0.5 rounded font-medium">
                      {daySlots.length + dayExtras.length} classes
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {daySlots.map((slot, idx) => (
                      <div key={idx} className={`p-3 rounded-xl border text-xs space-y-1 ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-white/[0.02] border-white/5'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-blue-500 font-bold">Period {slot.period}</span>
                        </div>
                        <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{slot.subject}</div>
                        {(slot.faculty || slot.room) && (
                          <div className={`text-[10px] flex items-center gap-3 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                            {slot.faculty && <span className="flex items-center gap-1"><User size={10} /> {slot.faculty}</span>}
                            {slot.room && <span className="flex items-center gap-1"><MapPin size={10} /> {slot.room}</span>}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Extra classes appended at the end of that day's schedule */}
                    {dayExtras.map((extra, idx) => (
                      <div key={`extra_${idx}`} className={`p-3 rounded-xl border border-dashed border-amber-500/40 text-xs space-y-1 ${isLight ? 'bg-amber-50/50' : 'bg-amber-500/5'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-amber-500 font-bold">Extra Class ({extra.date})</span>
                        </div>
                        <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{extra.subject}</div>
                        <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                          Duration: {extra.periods} period(s) {extra.start_time ? `• ${extra.start_time}` : ''}
                        </div>
                        {extra.faculty && <div className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Faculty: {extra.faculty}</div>}
                        {extra.room && <div className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Room: {extra.room}</div>}
                        {extra.notes && <div className={`text-[10px] italic ${isLight ? 'text-slate-500' : 'text-white/60'}`}>Note: {extra.notes}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Extra Classes Section */}
      <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#0d0d0d] border-white/10 text-white'} rounded-2xl p-6 border space-y-4 transition-colors`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-inherit">
          <div>
            <h3 className={`text-md font-bold font-sans tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Extra Classes</h3>
            <p className={`text-xs font-sans mt-0.5 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
              One-time classes appended at the end of specific days without modifying your original timetable
            </p>
          </div>
          <button
            onClick={() => setShowExtraModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus size={16} /> Add Extra Class
          </button>
        </div>

        {extraClasses.length === 0 ? (
          <p className={`text-xs py-4 text-center ${isLight ? 'text-slate-400' : 'text-white/40'}`}>No extra classes scheduled.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {extraClasses.map((item) => (
              <div key={item.id} className={`p-4 rounded-xl border flex flex-col justify-between space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'}`}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] font-bold text-amber-500 uppercase">{item.day} • {item.date}</span>
                    <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">{item.periods} Period(s)</span>
                  </div>
                  <h4 className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{item.subject}</h4>
                  {item.faculty && <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-white/60'}`}>Faculty: {item.faculty}</p>}
                  {item.room && <p className={`text-[11px] font-mono ${isLight ? 'text-slate-400' : 'text-white/50'}`}>Room: {item.room}</p>}
                  {item.notes && <p className={`text-[11px] italic mt-1 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>Notes: {item.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Extra Class Modal */}
      {showExtraModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${isLight ? 'bg-white text-slate-900 border-slate-200' : 'bg-[#121212] text-white border-white/10'} w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200`}>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Plus size={18} className="text-blue-500" /> Schedule Extra Class
              </h3>
              <button 
                onClick={() => setShowExtraModal(false)}
                className={`p-1 rounded-lg ${isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/10 text-white/50'}`}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveExtraClass} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[10px] font-mono uppercase mb-1 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>Day</label>
                  <select
                    value={extraDay}
                    onChange={(e) => setExtraDay(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-blue-500 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'}`}
                  >
                    {days.map((d) => (
                      <option key={d} value={d} className={isLight ? 'bg-white text-slate-900' : 'bg-[#090909] text-white'}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-[10px] font-mono uppercase mb-1 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>Date (One-time)</label>
                  <input
                    type="date"
                    value={extraDate}
                    onChange={(e) => setExtraDate(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-blue-500 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'}`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-mono uppercase mb-1 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>Subject</label>
                <select
                  value={extraSubject}
                  onChange={(e) => setExtraSubject(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-blue-500 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'}`}
                  required
                >
                  <option value="" disabled>Select Subject</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.name} className={isLight ? 'bg-white text-slate-900' : 'bg-[#090909] text-white'}>{sub.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`block text-[10px] font-mono uppercase mb-1 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>Number of Periods</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={extraPeriods}
                    onChange={(e) => setExtraPeriods(Number(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-blue-500 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-mono uppercase mb-1 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>Start Time (Opt)</label>
                  <input
                    type="time"
                    value={extraStartTime}
                    onChange={(e) => setExtraStartTime(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-blue-500 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-mono uppercase mb-1 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>End Time (Opt)</label>
                  <input
                    type="time"
                    value={extraEndTime}
                    onChange={(e) => setExtraEndTime(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-blue-500 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[10px] font-mono uppercase mb-1 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>Faculty (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Smith"
                    value={extraFaculty}
                    onChange={(e) => setExtraFaculty(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-blue-500 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-mono uppercase mb-1 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>Room (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Hall 4"
                    value={extraRoom}
                    onChange={(e) => setExtraRoom(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-blue-500 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-mono uppercase mb-1 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Makeup lecture for missed Friday"
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-blue-500 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'}`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExtraModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Save Extra Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
