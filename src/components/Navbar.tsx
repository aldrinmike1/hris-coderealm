import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { NavigationTab } from '../types';
import {
  Clock,
  Shield,
  User,
  RotateCcw,
  LogIn,
  ChevronDown,
  Sparkles,
  Building2,
  Calendar,
  LayoutDashboard,
  Users,
  Fingerprint,
  DollarSign,
  History,
  Gift,
  Menu,
  X,
} from 'lucide-react';

interface NavbarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenLoginModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenLoginModal,
}) => {
  const {
    currentUser,
    employees,
    dtrRecords,
    auditLogs,
    isAdmin,
    isManager,
    isStaff,
    resetAllData,
    companyProfile,
  } = useApp();

  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }>; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees', label: 'Employees', icon: Users, count: employees.length },
    { id: 'dtr', label: 'DTR & Biometrics', icon: Fingerprint },
    { id: 'payroll', label: 'Payroll Cutoffs', icon: DollarSign },
    { id: 'thirteenth-month', label: '13th Month Pay', icon: Gift },
    { id: 'audit', label: 'Audit Trail', icon: History, count: auditLogs.length },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs" id="app-main-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo and Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onTabChange('dashboard')}
              className="flex items-center gap-3 text-left group"
              id="brand-home-btn"
            >
              {companyProfile.logoUrl ? (
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 shadow-sm group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                  <img
                    src={companyProfile.logoUrl}
                    alt={companyProfile.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-base tracking-tight leading-none truncate max-w-[180px] sm:max-w-xs">
                    {companyProfile.name || 'HRIS & Payroll'}
                  </span>
                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider shrink-0">
                    PH Statutory
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                  Records • DTR • Payroll • Audit
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Tab Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={`${item.id}-${idx}`}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  id={`nav-tab-${item.id}`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isActive
                          ? 'bg-indigo-200/70 text-indigo-900'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Live Clock Display */}
            <div className="hidden lg:flex items-center gap-2 text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-700">
              <Clock className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span>{timeStr || '08:00 AM'}</span>
            </div>

            {/* Role Switcher Button */}
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-2 p-1.5 pl-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all text-left group shadow-xs"
              id="user-profile-button"
              title="Click to Switch Role or Employee Account"
            >
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-lg object-cover border border-slate-200"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-xs font-bold text-slate-900 max-w-[100px] truncate">
                    {currentUser.name}
                  </span>
                  <span
                    className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-sm ${
                      currentUser.role === 'admin'
                        ? 'bg-rose-100 text-rose-700'
                        : currentUser.role === 'manager'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
            </button>

            {/* Reset Demo State Button */}
            <button
              onClick={() => {
                if (window.confirm('Reset all demo records (employees, DTR, payroll, audit logs) to initial sample state?')) {
                  resetAllData();
                }
              }}
              title="Reset Demo Data"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors hidden xl:flex"
              id="reset-demo-data-btn"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl md:hidden"
              id="mobile-menu-toggle"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-200 space-y-1">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={`${item.id}-mobile-${idx}`}
                  onClick={() => {
                    onTabChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
