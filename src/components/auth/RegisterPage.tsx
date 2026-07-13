import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, Mail, Lock, BookOpen, GraduationCap, ArrowRight, CheckSquare, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [semester, setSemester] = useState('Semester 6');
  const [course, setCourse] = useState('B.Tech Computer Science');
  const [branch, setBranch] = useState('Computer Science & Engineering');
  const [year, setYear] = useState('2025-2026');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const savedSettings = localStorage.getItem('att_settings');
  const settings = savedSettings ? JSON.parse(savedSettings) : { theme: 'dark' };
  const isLight = settings.theme === 'light';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword || !institutionName || !semester || !course) {
      setError('Please fill in all required fields (including Institution Name).');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setError('You must agree to the Privacy Policy & Terms.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            institution_name: institutionName,
            semester,
            course,
            branch,
            academic_year: year,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      // Save profile to settings locally as well
      const updatedSettings = {
        ...settings,
        studentName: fullName,
        institutionName,
        semester,
        branch,
        academicYear: year,
      };
      localStorage.setItem('att_settings', JSON.stringify(updatedSettings));

      if (data.session) {
        localStorage.setItem('att_logged_in', 'true');
        navigate('/dashboard');
      } else {
        setSuccessMessage('Registration successful! Please check your email to verify your account before logging in.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 font-sans transition-colors py-12 ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#090909] text-white'}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`w-full max-w-lg p-8 rounded-2xl border shadow-xl ${
          isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-[#0d0d0d] border-white/10 shadow-black/50'
        }`}
      >
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-500/25 mb-3">
            S
          </div>
          <h1 className={`text-xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Create Student Account
          </h1>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
            Join Attendance Pro to track your academic performance
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-500 font-medium text-center">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs text-emerald-500 font-medium text-center flex flex-col items-center gap-2">
            <CheckCircle2 size={24} />
            <p>{successMessage}</p>
            <Link to="/login" className="underline font-bold mt-1">Proceed to Sign In</Link>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                Full Name *
              </label>
              <div className="relative">
                <span className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Morgan"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border focus:outline-hidden focus:border-blue-500 transition-all ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-white/5 border-white/15 text-white placeholder:text-white/30'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                Email *
              </label>
              <div className="relative">
                <span className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border focus:outline-hidden focus:border-blue-500 transition-all ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-white/5 border-white/15 text-white placeholder:text-white/30'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                Password *
              </label>
              <div className="relative">
                <span className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border focus:outline-hidden focus:border-blue-500 transition-all ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-white/5 border-white/15 text-white placeholder:text-white/30'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                Confirm Password *
              </label>
              <div className="relative">
                <span className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border focus:outline-hidden focus:border-blue-500 transition-all ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-white/5 border-white/15 text-white placeholder:text-white/30'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                Institution Name *
              </label>
              <input
                type="text"
                required
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="University Institute of Technology"
                className={`w-full px-4 py-2.5 rounded-xl text-xs border focus:outline-hidden focus:border-blue-500 transition-all ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-white/5 border-white/15 text-white placeholder:text-white/30'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                Semester *
              </label>
              <input
                type="text"
                required
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="Semester 6"
                className={`w-full px-4 py-2.5 rounded-xl text-xs border focus:outline-hidden focus:border-blue-500 transition-all ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-white/5 border-white/15 text-white placeholder:text-white/30'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                Course *
              </label>
              <input
                type="text"
                required
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="B.Tech Computer Science"
                className={`w-full px-4 py-2.5 rounded-xl text-xs border focus:outline-hidden focus:border-blue-500 transition-all ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-white/5 border-white/15 text-white placeholder:text-white/30'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                Branch (Optional)
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="Computer Science & Engineering"
                className={`w-full px-4 py-2.5 rounded-xl text-xs border focus:outline-hidden focus:border-blue-500 transition-all ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-white/5 border-white/15 text-white placeholder:text-white/30'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                Year (Optional)
              </label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2025-2026"
                className={`w-full px-4 py-2.5 rounded-xl text-xs border focus:outline-hidden focus:border-blue-500 transition-all ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-white/5 border-white/15 text-white placeholder:text-white/30'
                }`}
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                required
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
              />
              <span className={isLight ? 'text-slate-600' : 'text-white/70'}>
                I agree to Privacy Policy & Terms of Service for academic attendance tracking.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div className={`mt-6 pt-4 border-t text-center text-xs ${isLight ? 'border-slate-100 text-slate-500' : 'border-white/10 text-white/50'}`}>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-blue-500 hover:underline">
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
