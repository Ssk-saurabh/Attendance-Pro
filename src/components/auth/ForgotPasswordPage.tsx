import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const savedSettings = localStorage.getItem('att_settings');
  const settings = savedSettings ? JSON.parse(savedSettings) : { theme: 'dark' };
  const isLight = settings.theme === 'light';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login',
      });
      if (resetError) {
        throw resetError;
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
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
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-500/25 mb-3">
            A
          </div>
          <h1 className={`text-xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Reset Password
          </h1>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
            Enter your email and we'll send you a password reset link
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-500 font-medium text-center">
            {error}
          </div>
        )}

        {submitted ? (
          <div className="space-y-6 text-center">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-500 flex flex-col items-center gap-2">
              <CheckCircle2 size={32} />
              <p className="text-xs font-medium">
                Password reset link has been successfully sent to <span className="font-bold">{email}</span>.
              </p>
            </div>
            <Link
              to="/login"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-xs uppercase tracking-wider transition-all inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} /> Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className={`text-xs font-medium inline-flex items-center gap-1.5 hover:underline ${isLight ? 'text-slate-600' : 'text-white/70'}`}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
