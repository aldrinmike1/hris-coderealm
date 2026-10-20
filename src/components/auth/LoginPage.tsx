import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Shield, Lock, User, ArrowRight, Building2, KeyRound } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { systemUsers, login, companyProfile } = useApp();
  const [emailOrUser, setEmailOrUser] = useState('admin@hris-corp.ph');
  const [password, setPassword] = useState('admin');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    setTimeout(() => {
      const res = login(emailOrUser, password);
      setIsSubmitting(false);
      if (!res.success && res.message) {
        setErrorMsg(res.message);
      }
    }, 200);
  };

  const handleQuickSelect = (userEmail: string) => {
    setEmailOrUser(userEmail);
    setPassword('admin');
    setErrorMsg('');
    login(userEmail, 'admin');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      {/* Container */}
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 text-white text-center">
          <div className="inline-flex p-3 rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-300 mb-3">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{companyProfile.name}</h1>
          <p className="text-xs text-blue-200/80 mt-1 font-medium">Enterprise HRIS & Payroll Management System</p>
        </div>

        {/* Login Form Body */}
        <div className="p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-900">Sign in to your Account</h2>
            <p className="text-xs text-slate-500 mt-0.5">Authorized System Operators & Admins Only</p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email / Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={emailOrUser}
                  onChange={e => setEmailOrUser(e.target.value)}
                  placeholder="admin@hris-corp.ph"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Preset Selector for Easy Testing */}
          <div className="pt-4 border-t border-slate-200">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Quick One-Click Demo Accounts
            </div>
            <div className="space-y-2">
              {systemUsers.map((user, idx) => {
                const isSuper = user.role === 'super admin' || user.role === 'super_admin';
                return (
                  <button
                    key={`sys-user-${user.id}-${idx}`}
                    type="button"
                    onClick={() => handleQuickSelect(user.email)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 bg-slate-50 hover:bg-blue-50/50 text-left transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      {isSuper ? (
                        <Shield className="w-4 h-4 text-purple-600 shrink-0" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-800">{user.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{user.email}</div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isSuper ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {isSuper ? 'Super Admin' : 'Admin'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-500">
          Philippine Labor Law & Statutory Compliant • DOLE & BIR Aligned
        </div>
      </div>
    </div>
  );
};
