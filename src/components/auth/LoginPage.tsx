import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { GraduationCap, Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check saved theme
  const savedSettings = localStorage.getItem('att_settings');
  const settings = savedSettings ? JSON.parse(savedSettings) : { theme: 'dark' };
  const isLight = settings.theme === 'light';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      if (data.session) {
        localStorage.setItem('att_logged_in', 'true');
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 font-sans transition-colors ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#090909] text-white'}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`w-full max-w-md p-8 rounded-2xl border shadow-xl ${
          isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-[#0d0d0d] border-white/10 shadow-black/50'
        }`}
      >
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-500/25 mb-3">
            S
          </div>
          <h1 className={`text-xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Attendance Pro
          </h1>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
            Sign in to access your academic dashboard & AI analytics
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-500 font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
              Email Address
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
                className={`w-full pl-10 pr-4 py-3 rounded-xl text-xs border focus:outline-hidden focus:border-blue-500 transition-all ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-white/5 border-white/15 text-white placeholder:text-white/30'
                }`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`block text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-blue-500 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <span className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className={`w-full pl-10 pr-10 py-3 rounded-xl text-xs border focus:outline-hidden focus:border-blue-500 transition-all ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-white/5 border-white/15 text-white placeholder:text-white/30'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute inset-y-0 right-0 pr-3.5 flex items-center cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-white/40 hover:text-white'}`}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
              />
              <span className={isLight ? 'text-slate-600' : 'text-white/70'}>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{loading ? 'Signing in...' : 'Sign In to Dashboard'}</span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div className={`mt-8 pt-6 border-t text-center text-xs ${isLight ? 'border-slate-100 text-slate-500' : 'border-white/10 text-white/50'}`}>
          Don't have an account yet?{' '}
          <Link to="/register" className="font-semibold text-blue-500 hover:underline">
            Create Account
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
