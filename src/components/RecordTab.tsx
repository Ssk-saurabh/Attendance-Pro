import React, { useState } from 'react';
import { Subject, AttendanceRecord, AppSettings } from '../types';
import { calculateSubjectStats } from '../utils/calculator';
import { FileText, Search, Filter } from 'lucide-react';

interface RecordTabProps {
  subjects: Subject[];
  records: AttendanceRecord[];
  settings: AppSettings;
}

export default function RecordTab({
  subjects,
  records,
  settings,
}: RecordTabProps) {
  const isLight = settings.theme === 'light';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [filterDateMonth, setFilterDateMonth] = useState(''); // e.g. "2026-07" or specific date "2026-07-08"

  const filteredRecords = records.filter((rec) => {
    const subject = subjects.find((s) => s.id === rec.subjectId);
    const subjectName = subject?.name || '';

    // Search query matches subject name or date
    const matchSearch = searchTerm.trim() === '' || 
      subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.date.includes(searchTerm) ||
      rec.status.toLowerCase().includes(searchTerm.toLowerCase());

    const matchSubject = filterSubjectId ? rec.subjectId === filterSubjectId : true;

    // Date/Month filter: if filterDateMonth is YYYY-MM or YYYY-MM-DD
    const matchDateMonth = filterDateMonth ? rec.date.startsWith(filterDateMonth) : true;

    return matchSearch && matchSubject && matchDateMonth;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.period - a.period);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#0d0d0d] border-white/10 text-white'} rounded-2xl p-6 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors`}>
        <div>
          <h2 className={`text-xl font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Attendance Record Ledger</h2>
          <p className={`text-xs font-mono mt-1 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
            Strictly read-only historical attendance logs ({records.length} total entries)
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#0d0d0d] border-white/10 text-white'} rounded-2xl p-5 border grid grid-cols-1 md:grid-cols-3 gap-4 items-center transition-colors`}>
        {/* Search */}
        <div className="relative">
          <label className={`block text-[10px] font-mono mb-1.5 uppercase ${isLight ? 'text-slate-600' : 'text-white/40'}`}>Search Records</label>
          <div className="relative">
            <Search size={14} className={`absolute left-3.5 top-3 ${isLight ? 'text-slate-400' : 'text-white/40'}`} />
            <input
              type="text"
              placeholder="Search by subject, status, date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-blue-500 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'}`}
            />
          </div>
        </div>

        {/* Filter by Subject */}
        <div>
          <label className={`block text-[10px] font-mono mb-1.5 uppercase ${isLight ? 'text-slate-600' : 'text-white/40'}`}>Filter Subject</label>
          <select
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-blue-500 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'}`}
          >
            <option value="" className={isLight ? 'bg-white text-slate-900' : 'bg-[#090909] text-white'}>-- All Subjects --</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id} className={isLight ? 'bg-white text-slate-900' : 'bg-[#090909] text-white'}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Date/Month */}
        <div>
          <label className={`block text-[10px] font-mono mb-1.5 uppercase ${isLight ? 'text-slate-600' : 'text-white/40'}`}>Filter Date or Month (YYYY-MM)</label>
          <input
            type="text"
            placeholder="e.g. 2026-07 or 2026-07-08"
            value={filterDateMonth}
            onChange={(e) => setFilterDateMonth(e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-blue-500 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'}`}
          />
        </div>
      </div>

      {/* Read-Only History Table */}
      <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#0d0d0d] border-white/10 text-white'} border rounded-2xl overflow-hidden transition-colors`}>
        {filteredRecords.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <FileText size={40} className={`mx-auto mb-3 ${isLight ? 'text-slate-300' : 'text-white/10'}`} />
            <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-white/50'}`}>No attendance records found matching filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full border-collapse text-left text-xs ${isLight ? 'text-slate-800' : 'text-white/80'}`}>
              <thead>
                <tr className={`border-b text-[10px] font-mono uppercase ${isLight ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-white/10 bg-white/[0.02] text-white/40'}`}>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Subject</th>
                  <th className="py-3 px-5">Period</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Subject Attendance %</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-white/5'}`}>
                {filteredRecords.map((record) => {
                  const subject = subjects.find((s) => s.id === record.subjectId);
                  const stats = subject ? calculateSubjectStats(subject, records, settings.overallGoal) : { percentage: 0 };

                  return (
                    <tr key={record.id} className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]'}`}>
                      <td className="py-3.5 px-5 font-mono text-xs">{record.date}</td>
                      <td className="py-3.5 px-5 font-semibold">{subject?.name || 'Unknown Subject'}</td>
                      <td className="py-3.5 px-5 font-mono text-xs">Period {record.period || 1}</td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                          record.status === 'Present'
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                            : record.status === 'Absent'
                            ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-xs font-semibold">
                        {stats.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
