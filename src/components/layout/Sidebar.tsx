import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NavigationTab } from '../../types';
import {
  LayoutDashboard,
  Users,
  Clock,
  DollarSign,
  History,
  Fingerprint,
  RotateCcw,
  Shield,
  Building2,
  ChevronRight,
  ChevronDown,
  Settings,
  Gift,
  FileText,
  ReceiptText,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenLoginModal: () => void;
  onOpenPunchModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenLoginModal,
  onOpenPunchModal,
}) => {
  const {
    currentUser,
    systemUsers,
    employees,
    employeeDeductions,
    dtrRecords,
    auditLogs,
    isAdmin,
    isManager,
    resetAllData,
    logout,
  } = useApp();

  const [isPayrollExpanded, setIsPayrollExpanded] = useState<boolean>(true);

  const recordNavItems: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }>; count?: number }[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'employees', label: 'Employees', icon: Users, count: employees.length },
    { id: 'dtr', label: 'Daily Time Record', icon: Clock },
    { id: 'payroll', label: 'Payroll & Wages', icon: DollarSign },
    { id: 'sss-matrix', label: 'SSS Matrix', icon: Shield },
  ];

  const adminNavItems: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }>; count?: number }[] = [
    { id: 'users', label: 'Users', icon: ShieldCheck, count: systemUsers.length },
    { id: 'audit', label: 'Audit Trails', icon: History, count: auditLogs.length },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className="w-60 lg:w-64 border-r border-slate-700 bg-slate-900 text-white flex flex-col shrink-0 select-none"
      id="high-density-sidebar"
    >
      {/* Brand Header */}
      <div className="p-4 lg:p-5 border-b border-slate-700 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
              HR
            </div>
            <h1 className="text-lg lg:text-xl font-bold tracking-tight">
              HRIS <span className="text-blue-400">PRO</span>
            </h1>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-semibold">
            Enterprise Management
          </p>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 p-3 lg:p-4 space-y-4 overflow-y-auto">
        {/* Quick Kiosk Launcher */}
        <div className="px-1">
          <button
            onClick={onOpenPunchModal}
            className="w-full flex items-center justify-between px-3 py-2 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-semibold transition-all group"
            id="sidebar-quick-punch-btn"
          >
            <div className="flex items-center gap-2.5">
              <Fingerprint className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Biometric Punch Clock</span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
              Live
            </span>
          </button>
        </div>

        {/* Section 1: Records */}
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-1.5">
            Records
          </div>
          <div className="space-y-1">
            {recordNavItems.map((item, idx) => {
              const Icon = item.icon;
              
              if (item.id === 'payroll') {
                const isPayrollActive = activeTab === 'payroll' || activeTab === 'deductions' || activeTab === 'thirteenth-month';
                const activeDeductionsCount = employeeDeductions?.filter(d => d.status === 'Active').length || 0;
                return (
                  <div key={`payroll-group-${idx}`} className="space-y-1">
                    <button
                      onClick={() => {
                        setIsPayrollExpanded(!isPayrollExpanded);
                        if (activeTab !== 'payroll' && activeTab !== 'deductions' && activeTab !== 'thirteenth-month') {
                          onTabChange('payroll');
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-all ${
                        isPayrollActive
                          ? 'bg-blue-900/60 text-white border border-blue-700/60'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                      id="sidebar-nav-payroll-parent"
                    >
                      <div className="flex items-center gap-3">
                        <DollarSign className={`w-4 h-4 ${isPayrollActive ? 'text-blue-400' : 'text-slate-400'}`} />
                        <span>Payroll & Wages</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {isPayrollExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Submenu for Payroll & Wages */}
                    {isPayrollExpanded && (
                      <div className="ml-3 pl-2.5 border-l border-slate-700/80 space-y-1 py-0.5">
                        <button
                          onClick={() => onTabChange('payroll')}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] font-medium transition-all ${
                            activeTab === 'payroll'
                              ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                          id="sidebar-nav-payroll-cutoffs"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className={`w-3.5 h-3.5 ${activeTab === 'payroll' ? 'text-white' : 'text-slate-400'}`} />
                            <span>Weekly Cutoffs & Register</span>
                          </div>
                        </button>

                        <button
                          onClick={() => onTabChange('deductions')}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] font-medium transition-all ${
                            activeTab === 'deductions'
                              ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                          id="sidebar-nav-deductions"
                        >
                          <div className="flex items-center gap-2">
                            <ReceiptText className={`w-3.5 h-3.5 ${activeTab === 'deductions' ? 'text-white' : 'text-slate-400'}`} />
                            <span>Deductions</span>
                          </div>
                          {activeDeductionsCount > 0 && (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                              activeTab === 'deductions'
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {activeDeductionsCount}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => onTabChange('thirteenth-month')}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] font-medium transition-all ${
                            activeTab === 'thirteenth-month'
                              ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                          id="sidebar-nav-13th-month"
                        >
                          <div className="flex items-center gap-2">
                            <Gift className={`w-3.5 h-3.5 ${activeTab === 'thirteenth-month' ? 'text-amber-300' : 'text-amber-400'}`} />
                            <span>13th Month Pay</span>
                          </div>
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-mono font-bold">
                            Annual
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = activeTab === item.id;
              return (
                <button
                  key={`${item.id}-${idx}`}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  id={`sidebar-nav-${item.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        isActive
                          ? 'bg-blue-800/80 text-blue-100'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Administration */}
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-1.5">
            Administration
          </div>
          <div className="space-y-1">
            {adminNavItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={`${item.id}-${idx}`}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  id={`sidebar-nav-${item.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        isActive
                          ? 'bg-blue-800/80 text-blue-100'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Philippine Statutory Info Pill */}
        <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400 space-y-1">
          <div className="font-bold text-slate-300 uppercase tracking-wider">
            PH Compliance
          </div>
          <div className="text-slate-400 leading-tight">
            SSS • PhilHealth • Pag-IBIG HDMF • BIR TRAIN Law
          </div>
        </div>
      </nav>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-slate-700 bg-slate-950 flex items-center justify-between gap-2">
        <button
          onClick={onOpenLoginModal}
          className="flex items-center gap-2.5 text-left flex-1 min-w-0 group hover:opacity-90 transition-opacity"
          title="Click to Switch User Role / Employee Account"
          id="sidebar-user-role-btn"
        >
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-8 h-8 rounded bg-blue-500 object-cover border border-slate-600 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-xs shrink-0 text-white">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate group-hover:text-blue-300">
              {currentUser.name}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider truncate font-mono">
              Role: <span className="text-blue-400 font-bold">{currentUser.role}</span>
            </div>
          </div>
        </button>

        <button
          onClick={logout}
          title="Log Out of System"
          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
          id="sidebar-logout-btn"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => {
            if (window.confirm('Reset all demo records (employees, DTR, payroll, audit logs) to initial sample state?')) {
              resetAllData();
            }
          }}
          title="Reset Demo Records"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          id="sidebar-reset-btn"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
