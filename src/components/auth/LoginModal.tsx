import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DEMO_USERS } from '../../data/initialData';
import { CurrentUser, UserRole } from '../../types';
import { ShieldCheck, UserCheck, Briefcase, Lock, Mail, ArrowRight, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, setCurrentUser, employees } = useApp();
  const [activeTab, setActiveTab] = useState<'quick' | 'custom' | 'employee'>('quick');
  const [customEmail, setCustomEmail] = useState('');
  const [customRole, setCustomRole] = useState<UserRole>('staff');
  const [customName, setCustomName] = useState('');

  if (!isOpen) return null;

  const handleSelectDemoUser = (user: CurrentUser) => {
    setCurrentUser(user);
    onClose();
  };

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const user: CurrentUser = {
      id: `usr-${Date.now()}`,
      name: customName.trim(),
      email: customEmail.trim() || `${customName.toLowerCase().replace(/\s+/g, '.')}@company.ph`,
      role: customRole,
      department: customRole === 'admin' ? 'Executive / HR' : customRole === 'manager' ? 'Management' : 'Operations',
      position: customRole === 'admin' ? 'Administrator' : customRole === 'manager' ? 'Department Manager' : 'Team Associate',
    };

    setCurrentUser(user);
    onClose();
  };

  const handleEmployeeLogin = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const user: CurrentUser = {
      id: `usr-${emp.id}`,
      name: `${emp.firstName} ${emp.lastName}`,
      email: emp.email,
      role: emp.role,
      employeeId: emp.employeeNumber,
      department: emp.department,
      position: emp.position,
      avatarUrl: emp.avatarUrl,
    };

    setCurrentUser(user);
    onClose();
  };

  return (
    <AnimatePresence>
      <div key="login-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200"
          id="login-modal-wrapper"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Access Control & Sign In</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Switch role or authenticate as employee</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                id="login-close-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Active Badge */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Currently active session:</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200">{currentUser.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                    currentUser.role === 'admin'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : currentUser.role === 'manager'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3">
            <button
              onClick={() => setActiveTab('quick')}
              className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'quick'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              id="tab-quick-switch"
            >
              <Sparkles className="w-4 h-4" />
              Quick Switch
            </button>
            <button
              onClick={() => setActiveTab('employee')}
              className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'employee'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              id="tab-employee-list"
            >
              <UserCheck className="w-4 h-4" />
              Sign in as Employee
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'custom'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              id="tab-custom-user"
            >
              <Briefcase className="w-4 h-4" />
              Custom User
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'quick' && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Select a predefined demo account:
                </p>
                {DEMO_USERS.map((user, uIdx) => {
                  const isCurrent = currentUser.id === user.id;
                  return (
                    <button
                      key={`${user.id}-${uIdx}`}
                      onClick={() => handleSelectDemoUser(user)}
                      className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                        isCurrent
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                      }`}
                      id={`demo-user-btn-${user.role}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="w-11 h-11 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm">{user.name}</span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                user.role === 'admin'
                                  ? 'bg-rose-100 text-rose-700'
                                  : user.role === 'manager'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {user.role}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {user.position} • {user.department}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCurrent ? (
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-100/70 px-2.5 py-1 rounded-lg">
                            Active
                          </span>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Role-Based Access Permissions Guide:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-500 text-[11px]">
                    <li><strong className="text-slate-700">Admin:</strong> Full CRUD on Employee records, complete DTR oversight & overrides, Payroll generation/approval, and Audit Trail logs.</li>
                    <li><strong className="text-slate-700">Manager:</strong> Team employee profiles, DTR review & adjustments, Payroll summaries, and Audit Trail.</li>
                    <li><strong className="text-slate-700">Staff:</strong> Self-service Hub, personal timecard clock in/out, view & download own Payslips.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'employee' && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Sign in as any registered employee:
                </p>
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {employees.map((emp, empIdx) => (
                    <button
                      key={`${emp.id}-${empIdx}`}
                      onClick={() => handleEmployeeLogin(emp.id)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between hover:border-indigo-300 hover:bg-slate-50 ${
                        currentUser.name === `${emp.firstName} ${emp.lastName}`
                          ? 'border-indigo-500 bg-indigo-50/50'
                          : 'border-slate-200'
                      }`}
                      id={`emp-signin-${emp.employeeNumber}`}
                    >
                      <div className="flex items-center gap-3">
                        {emp.avatarUrl ? (
                          <img
                            src={emp.avatarUrl}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">
                            {emp.firstName[0]}{emp.lastName[0]}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-xs">
                              {emp.firstName} {emp.lastName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({emp.employeeNumber})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {emp.position} • {emp.department}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          emp.role === 'admin'
                            ? 'bg-rose-100 text-rose-700'
                            : emp.role === 'manager'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {emp.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'custom' && (
              <form onSubmit={handleCustomLogin} className="space-y-4" id="custom-login-form">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="e.g. Roberto Garcia"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    id="custom-user-name-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={customEmail}
                      onChange={e => setCustomEmail(e.target.value)}
                      placeholder="roberto.garcia@company.ph"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      id="custom-user-email-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['admin', 'manager', 'staff'] as UserRole[]).map((role, rIdx) => (
                      <button
                        key={`${role}-${rIdx}`}
                        type="button"
                        onClick={() => setCustomRole(role)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all ${
                          customRole === role
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                        id={`role-btn-${role}`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs"
                  id="custom-user-submit-btn"
                >
                  Authenticate Session
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
