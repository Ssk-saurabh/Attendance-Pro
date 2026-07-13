import React, { useState, useEffect } from 'react';
import { AppSettings, Subject, AttendanceRecord, TimetableSlot } from '../types';
import { User, Lock, Key, LogOut, Check, AlertOctagon, Sun, Moon, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { profileService } from '../services/profileService';
import { ProfileRecord } from '../services/database';
import { useNavigate } from 'react-router-dom';

interface SettingsTabProps {
  settings: AppSettings;
  subjects: Subject[];
  timetable: TimetableSlot[];
  records: AttendanceRecord[];
  userId?: string | null;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  onImportBackup: (importedState: {
    subjects: Subject[];
    timetable: TimetableSlot[];
    records: AttendanceRecord[];
    settings: AppSettings;
  }) => void;
  onSeedDemoData: () => void;
  onClearAllData?: () => void;
}

export default function SettingsTab({
  settings,
  userId,
  onUpdateSettings,
  onClearAllData,
}: SettingsTabProps) {
  const isLight = settings.theme === 'light';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  // Editable fields
  const [semester, setSemester] = useState(settings.semester || '');
  const [attendanceGoal, setAttendanceGoal] = useState<number>(settings.overallGoal || 75);

  const [savedStatus, setSavedStatus] = useState(false);

  // Change password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadProfileData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || '');
          const targetUserId = userId || user.id;
          if (targetUserId) {
            const p = await profileService.getProfile(targetUserId);
            if (p) {
              setProfile(p);
              setSemester(p.semester || settings.semester || '');
              setAttendanceGoal(p.attendance_goal ?? settings.overallGoal ?? 75);
            }
          }
        }
      } catch (err) {
        console.error('Error loading profile in settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfileData();
  }, [userId]);

  const handleSaveProfileUpdates = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!targetUserId) return;

    try {
      setLoading(true);
      await profileService.updateProfile(targetUserId, {
        semester,
        attendance_goal: attendanceGoal,
      });

      onUpdateSettings({
        semester,
        overallGoal: attendanceGoal,
      });

      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    try {
      setChangingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordSuccess('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password. Please check your current session.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out of your session?')) {
      try {
        await supabase.auth.signOut();
        navigate('/login');
      } catch (err) {
        console.error('Logout error:', err);
        navigate('/login');
      }
    }
  };

  const handleDeleteAccountConfirm = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert('Please type DELETE to confirm account deletion.');
      return;
    }

    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!targetUserId) return;

    try {
      setDeleting(true);
      await profileService.deleteAccount(targetUserId);
      if (onClearAllData) onClearAllData();
      navigate('/login');
    } catch (err: any) {
      alert(err.message || 'Failed to delete account.');
      setDeleting(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-12 animate-pulse">
        <div className={`h-64 rounded-2xl ${isLight ? 'bg-slate-200' : 'bg-white/5'}`} />
        <div className={`h-48 rounded-2xl ${isLight ? 'bg-slate-200' : 'bg-white/5'}`} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Account & Profile Section */}
      <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#0d0d0d] border-white/10 text-white'} border rounded-2xl p-6 transition-colors`}>
        <div className={`flex items-center justify-between mb-6 pb-4 border-b ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-lg">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : <User size={24} />}
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight">Account Profile</h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/40'}`}>Personal information & academic credentials</p>
            </div>
          </div>
          {savedStatus && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-mono bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <Check size={14} /> Saved
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfileUpdates} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name (Locked) */}
            <div>
              <label className={`block text-xs font-mono mb-1.5 uppercase tracking-wider flex items-center justify-between ${isLight ? 'text-slate-600' : 'text-white/50'}`}>
                <span>Full Name</span>
                <span className="text-[10px] text-amber-500 flex items-center gap-1"><Lock size={10} /> Locked</span>
              </label>
              <input
                type="text"
                disabled
                value={profile?.full_name || settings.studentName || ''}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm font-sans cursor-not-allowed ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white/5 border-white/5 text-white/50'
                }`}
              />
            </div>

            {/* Email (Locked) */}
            <div>
              <label className={`block text-xs font-mono mb-1.5 uppercase tracking-wider flex items-center justify-between ${isLight ? 'text-slate-600' : 'text-white/50'}`}>
                <span>Email Address</span>
                <span className="text-[10px] text-amber-500 flex items-center gap-1"><Lock size={10} /> Locked</span>
              </label>
              <input
                type="text"
                disabled
                value={userEmail || profile?.email || ''}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm font-mono cursor-not-allowed ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white/5 border-white/5 text-white/50'
                }`}
              />
            </div>

            {/* Institution Name (Locked) */}
            <div>
              <label className={`block text-xs font-mono mb-1.5 uppercase tracking-wider flex items-center justify-between ${isLight ? 'text-slate-600' : 'text-white/50'}`}>
                <span>Institution Name</span>
                <span className="text-[10px] text-amber-500 flex items-center gap-1"><Lock size={10} /> Locked</span>
              </label>
              <input
                type="text"
                disabled
                value={profile?.course || settings.institutionName || 'University Institute'}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm cursor-not-allowed ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white/5 border-white/5 text-white/50'
                }`}
              />
            </div>

            {/* Course (Locked) */}
            <div>
              <label className={`block text-xs font-mono mb-1.5 uppercase tracking-wider flex items-center justify-between ${isLight ? 'text-slate-600' : 'text-white/50'}`}>
                <span>Course</span>
                <span className="text-[10px] text-amber-500 flex items-center gap-1"><Lock size={10} /> Locked</span>
              </label>
              <input
                type="text"
                disabled
                value={profile?.course || settings.branch || 'B.Tech'}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm cursor-not-allowed ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white/5 border-white/5 text-white/50'
                }`}
              />
            </div>

            {/* Branch (Locked) */}
            <div>
              <label className={`block text-xs font-mono mb-1.5 uppercase tracking-wider flex items-center justify-between ${isLight ? 'text-slate-600' : 'text-white/50'}`}>
                <span>Branch</span>
                <span className="text-[10px] text-amber-500 flex items-center gap-1"><Lock size={10} /> Locked</span>
              </label>
              <input
                type="text"
                disabled
                value={profile?.branch || settings.branch || 'Computer Science & Engineering'}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm cursor-not-allowed ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white/5 border-white/5 text-white/50'
                }`}
              />
            </div>

            {/* Year (Locked) */}
            <div>
              <label className={`block text-xs font-mono mb-1.5 uppercase tracking-wider flex items-center justify-between ${isLight ? 'text-slate-600' : 'text-white/50'}`}>
                <span>Year</span>
                <span className="text-[10px] text-amber-500 flex items-center gap-1"><Lock size={10} /> Locked</span>
              </label>
              <input
                type="text"
                disabled
                value={profile?.year || settings.academicYear || 'Third Year'}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm cursor-not-allowed ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white/5 border-white/5 text-white/50'
                }`}
              />
            </div>

            {/* Semester (Editable) */}
            <div>
              <label className={`block text-xs font-mono mb-1.5 uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-white/50'}`}>
                Semester <span className="text-blue-500 font-sans font-normal">(Editable)</span>
              </label>
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="e.g. Semester 6"
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'
                }`}
              />
            </div>

            {/* Attendance Goal (Editable) */}
            <div>
              <label className={`block text-xs font-mono mb-1.5 uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-white/50'}`}>
                Minimum Attendance Goal % <span className="text-blue-500 font-sans font-normal">(Editable)</span>
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={attendanceGoal}
                onChange={(e) => setAttendanceGoal(Number(e.target.value))}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500 transition-colors ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'
                }`}
              />
            </div>
          </div>

          <div className={`pt-4 flex items-center justify-between border-t ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs tracking-wider uppercase transition-colors cursor-pointer shadow-lg shadow-blue-500/20"
            >
              {loading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Section */}
      <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#0d0d0d] border-white/10 text-white'} border rounded-2xl p-6 transition-colors`}>
        <div className={`flex items-center gap-3 mb-6 pb-4 border-b ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
          <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
            <Key size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight">Change Password</h3>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/40'}`}>Update your account password securely</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
          {passwordError && (
            <div className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs">
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-xs flex items-center gap-2">
              <Check size={16} /> {passwordSuccess}
            </div>
          )}

          <div>
            <label className={`block text-xs font-mono mb-1.5 uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-white/50'}`}>New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-amber-500 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-mono mb-1.5 uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-white/50'}`}>Confirm New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-amber-500 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={changingPassword}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs tracking-wider uppercase transition-colors cursor-pointer"
          >
            {changingPassword ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Theme Appearance */}
      <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#0d0d0d] border-white/10 text-white'} border rounded-2xl p-6 transition-colors`}>
        <div className={`flex items-center gap-3 mb-6 pb-4 border-b ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
          <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
            <Sun size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight">Appearance & Theme</h3>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/40'}`}>Switch between dark mode and light mode interface</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onUpdateSettings({ theme: 'dark' })}
            className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all cursor-pointer ${
              (!settings.theme || settings.theme === 'dark')
                ? 'bg-blue-600/10 border-blue-500 text-blue-600 dark:text-white'
                : isLight ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Moon size={24} className="text-blue-500" />
            <div className="text-center">
              <div className="text-sm font-semibold">Dark Mode</div>
              <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-white/40'}`}>Sleek obsidian palette</div>
            </div>
            {(!settings.theme || settings.theme === 'dark') && (
              <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-mono">Active</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ theme: 'light' })}
            className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all cursor-pointer ${
              settings.theme === 'light'
                ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-white'
                : isLight ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Sun size={24} className="text-amber-500" />
            <div className="text-center">
              <div className="text-sm font-semibold">Light Mode</div>
              <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-white/40'}`}>Luminous daylight palette</div>
            </div>
            {settings.theme === 'light' && (
              <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-mono">Active</span>
            )}
          </button>
        </div>
      </div>

      {/* Danger Zone: Delete Account */}
      <div className="bg-gradient-to-br from-red-500/5 to-transparent border border-red-500/20 rounded-2xl p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-red-500 mb-2 flex items-center gap-2">
          <AlertOctagon size={16} /> Danger Zone - Delete Account
        </h3>
        <p className={`text-xs mb-4 leading-relaxed ${isLight ? 'text-slate-600' : 'text-white/50'}`}>
          Permanently delete your account, attendance logs, syllabus PDFs, storage files, and profile. This action cannot be undone.
        </p>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-red-500/20"
        >
          Delete Account
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${isLight ? 'bg-white text-slate-900 border-slate-200' : 'bg-[#121212] text-white border-red-500/30'} w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200`}>
            <div className="flex items-center gap-3 text-red-500 pb-3 border-b border-red-500/20">
              <ShieldAlert size={24} />
              <h3 className="text-base font-bold tracking-tight">Delete Account Permanently</h3>
            </div>

            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
              Deleting your account will permanently remove:
            </p>
            <ul className={`text-xs list-disc pl-5 space-y-1 ${isLight ? 'text-slate-600' : 'text-white/60'}`}>
              <li>Attendance records & statistics</li>
              <li>Syllabus PDFs & uploaded storage files</li>
              <li>History logs & timetable slots</li>
              <li>Profile information</li>
            </ul>
            <p className="text-xs font-semibold text-red-500">
              This action cannot be undone.
            </p>

            <div className="space-y-2 pt-2">
              <label className={`block text-xs font-mono uppercase ${isLight ? 'text-slate-600' : 'text-white/50'}`}>
                Type <span className="text-red-500 font-bold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className={`w-full px-4 py-2.5 border rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:border-red-500 ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'
                }`}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold ${isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                onClick={handleDeleteAccountConfirm}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  deleteConfirmText === 'DELETE' && !deleting
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'
                    : 'bg-red-500/20 text-red-400/50 cursor-not-allowed'
                }`}
              >
                {deleting ? 'Deleting Account...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
