import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { NavigationTab } from '../../types';
import {
  Clock,
  Menu,
  X,
  Search,
  Plus,
  Fingerprint,
  RotateCcw,
  Shield,
  DollarSign,
  ChevronDown,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  activeTab: NavigationTab;
  onOpenMobileMenu: () => void;
  onOpenAddEmployee?: () => void;
  onOpenPunchModal?: () => void;
  onOpenLoginModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenMobileMenu,
  onOpenAddEmployee,
  onOpenPunchModal,
  onOpenLoginModal,
}) => {
  const { currentUser, isAdmin, isManager, resetAllData, logout } = useApp();

  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

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

  const tabLabels: Record<NavigationTab, { title: string; subtitle: string }> = {
    dashboard: { title: 'Executive Overview', subtitle: 'Workforce KPIs, Attendance & Payroll Health' },
    employees: { title: 'Employee Directory', subtitle: 'Master Records, Government Contributions, Biometrics & Rates' },
    dtr: { title: 'Daily Time Record', subtitle: 'Weekly Biometrics Tracking (Saturday–Friday Cutoff)' },
    payroll: { title: 'Payroll & Wages', subtitle: 'Weekly Payroll (Sat–Fri Cutoff, Sat Payday) & Statutory Remittances' },
    deductions: { title: 'Employee Deductions & Loans', subtitle: 'Loans, Salary Deductions, Amortization Schedules & Payment Records' },
    'thirteenth-month': { title: '13th Month Pay Overview', subtitle: 'Annual Statutory Bonus (PD 851) Generated Records & Vouchers' },
    users: { title: 'System Users Management', subtitle: 'Manage System Operators, Assign Super Admin / Admin Roles & Accounts' },
    audit: { title: 'System Audit Trail', subtitle: 'Tamper-Resistant Security Logs & Field Diff Inspector' },
    settings: { title: 'Administration Settings', subtitle: 'Company Profile, Organization Details & System Configurations' },
    'sss-matrix': { title: 'SSS Matrix Calculator', subtitle: 'View Contribution Matrix and Calculate Employee Contributions' },
  };

  const currentMeta = tabLabels[activeTab] || { title: 'HRIS Pro', subtitle: 'Enterprise Management' };

  return (
    <header
      className="h-14 bg-white border-b border-slate-300 flex items-center justify-between px-4 sm:px-6 shrink-0 z-20"
      id="high-density-header"
    >
      {/* Left: Mobile menu toggle + Current Context Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded md:hidden"
          id="mobile-menu-open-btn"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="text-sm font-bold text-slate-900 leading-none">
            {currentMeta.title}
          </div>
          <div className="hidden sm:block w-px h-4 bg-slate-300"></div>
          <span className="hidden sm:inline text-xs text-slate-500 truncate max-w-xs md:max-w-md">
            {currentMeta.subtitle}
          </span>
        </div>
      </div>

      {/* Right Action Bar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live System Time */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono bg-slate-100 border border-slate-300 px-2.5 py-1 rounded text-slate-700">
          <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span>{dateStr} • {timeStr || '08:00:00 AM'}</span>
        </div>

        {/* Quick Kiosk Punch Button */}
        {onOpenPunchModal && (
          <button
            onClick={onOpenPunchModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-xs transition-colors"
            id="header-punch-btn"
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Time Punch</span>
          </button>
        )}

        {/* Add Employee Button if in Employees tab */}
        {activeTab === 'employees' && onOpenAddEmployee && (isAdmin || isManager) && (
          <button
            onClick={onOpenAddEmployee}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-xs transition-colors"
            id="header-add-employee-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add New Employee</span>
          </button>
        )}

        {/* Role badge button */}
        <button
          onClick={onOpenLoginModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
          id="header-role-switcher"
          title="Switch Active User / Role"
        >
          <span className="text-[10px] font-bold uppercase text-slate-500">Role:</span>
          <span
            className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
              currentUser.role === 'admin' || currentUser.role === 'super admin' || currentUser.role === 'super_admin'
                ? 'bg-rose-100 text-rose-700'
                : currentUser.role === 'manager'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {currentUser.role}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {/* Logout Button Link */}
        <button
          onClick={logout}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors ml-1"
          id="header-logout-btn"
          title="Sign Out of Session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
