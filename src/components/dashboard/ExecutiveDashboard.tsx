import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, formatDateTime, formatTime } from '../../utils/formatters';
import {
  Users,
  Clock,
  DollarSign,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Fingerprint,
  FileText,
  Calendar,
  Building,
  TrendingUp,
  Activity,
  Plus,
} from 'lucide-react';

interface ExecutiveDashboardProps {
  onNavigate: (tab: any) => void;
  onOpenPunchModal: () => void;
  onOpenAddEmployee: () => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  onNavigate,
  onOpenPunchModal,
  onOpenAddEmployee,
}) => {
  const { employees, dtrRecords, payslips, auditLogs, payPeriods, currentUser, isAdmin, isManager } = useApp();

  const activeEmployees = employees.filter(e => e.status === 'active');
  const inactiveEmployees = employees.filter(e => e.status === 'inactive');

  const totalDailyRateActive = activeEmployees.reduce((sum, e) => sum + (e.dailyRate || 0), 0);
  const totalMonthlyPayrollEst = totalDailyRateActive * 22;

  // Today's DTR punches
  const todayStr = '2026-08-15'; // aligned with seed cutoff
  const todayPunches = dtrRecords.filter(r => r.date === todayStr);

  const presentToday = todayPunches.filter(r => r.status === 'Present' || r.status === 'Late').length;
  const lateToday = todayPunches.filter(r => r.status === 'Late').length;

  const currentPayPeriod = payPeriods[0];
  const currentPeriodPayslips = payslips.filter(p => p.payPeriodId === currentPayPeriod?.id);
  const totalNetCurrentPeriod = currentPeriodPayslips.reduce((sum, p) => sum + p.netPay, 0);

  const recentAudits = auditLogs.slice(0, 6);

  return (
    <div className="space-y-4" id="executive-dashboard-view">
      {/* High Density Banner Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded p-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-blue-600/30 text-blue-300 border border-blue-500/40">
              Session: {currentUser.role}
            </span>
            <span className="text-xs text-slate-400">Authenticated: {currentUser.name}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Philippine HRIS & Statutory Payroll Operations
          </h1>
          <p className="text-xs text-slate-400">
            Real-time biometric attendance, automated SSS/PhilHealth/Pag-IBIG/TRAIN deductions, and tamper-resistant audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenPunchModal}
            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
            id="dash-punch-btn"
          >
            <Fingerprint className="w-3.5 h-3.5" />
            Biometric Punch Kiosk
          </button>

          {(isAdmin || isManager) && (
            <button
              onClick={onOpenAddEmployee}
              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
              id="dash-add-employee-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Primary 4-Stat KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Active Headcount */}
        <div
          onClick={() => onNavigate('employees')}
          className="bg-white p-3.5 sm:p-4 rounded border border-slate-300 shadow-xs hover:border-blue-500 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Active Personnel
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
              EMP
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">{activeEmployees.length}</span>
            <span className="text-xs text-slate-500 font-normal">/ {employees.length} total</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-medium group-hover:text-blue-700">
            <span>Manage Records</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* DTR Attendance Today */}
        <div
          onClick={() => onNavigate('dtr')}
          className="bg-white p-3.5 sm:p-4 rounded border border-slate-300 shadow-xs hover:border-emerald-500 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              DTR Today
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              LIVE
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700 font-mono">
              {presentToday || activeEmployees.length}
            </span>
            <span className="text-xs text-emerald-600 font-medium">Logged In</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-medium group-hover:text-emerald-800">
            <span>Daily Time Records</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Current Cutoff Net Payroll */}
        <div
          onClick={() => onNavigate('payroll')}
          className="bg-white p-3.5 sm:p-4 rounded border border-slate-300 shadow-xs hover:border-amber-500 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Net Payroll (Current Cutoff)
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
              PH-PHP
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
              {formatCurrency(totalNetCurrentPeriod)}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-amber-700 font-medium group-hover:text-amber-800">
            <span>{currentPayPeriod?.name || 'Payroll Register'}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Audit Trail Events */}
        <div
          onClick={() => onNavigate('audit')}
          className="bg-white p-3.5 sm:p-4 rounded border border-slate-300 shadow-xs hover:border-rose-500 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Audit Trail Entries
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
              LOGS
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">{auditLogs.length}</span>
            <span className="text-xs text-slate-500 font-medium">recorded events</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-rose-700 font-medium group-hover:text-rose-800">
            <span>View Diff Log</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Two Column High Density Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Directory & Statutory Matrix */}
        <div className="lg:col-span-2 space-y-4">
          {/* Personnel Quick Table */}
          <div className="bg-white rounded border border-slate-300 shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Personnel Directory Quick Table
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-semibold">
                  ({employees.length} Records)
                </span>
              </div>
              <button
                onClick={() => onNavigate('employees')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Full Masterlist <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-2.5">ID</th>
                    <th className="p-2.5">Employee Name</th>
                    <th className="p-2.5">Department</th>
                    <th className="p-2.5">Biometrix ID</th>
                    <th className="p-2.5 text-right">Daily Rate</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {employees.slice(0, 5).map((emp, empIdx) => (
                    <tr
                      key={`${emp.id}-${empIdx}`}
                      onClick={() => onNavigate('employees')}
                      className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                    >
                      <td className="p-2.5 font-mono text-slate-600 font-semibold">{emp.employeeNumber}</td>
                      <td className="p-2.5">
                        <div className="font-medium text-slate-900">
                          {emp.lastName}, {emp.firstName}
                        </div>
                        <div className="text-[10px] text-slate-400">{emp.position}</div>
                      </td>
                      <td className="p-2.5 text-slate-600">{emp.department}</td>
                      <td className="p-2.5 font-mono text-blue-600 font-semibold">{emp.biometrixId}</td>
                      <td className="p-2.5 text-right font-mono font-medium text-slate-900">
                        {formatCurrency(emp.dailyRate)}
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            emp.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statutory Matrix Card */}
          <div className="bg-white rounded border border-slate-300 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Philippine Statutory Deduction Rates (2026 Engine)
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                  SSS Contribution
                </span>
                <span className="font-semibold text-slate-800 block">14.0% Total MSC</span>
                <span className="text-[10px] text-slate-500 font-mono block">4.5% EE • 9.5% ER (Max ₱30k MSC)</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                  PhilHealth Premium
                </span>
                <span className="font-semibold text-slate-800 block">5.0% Premium Rate</span>
                <span className="text-[10px] text-slate-500 font-mono block">50-50 EE/ER Split (₱10k-100k)</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                  Pag-IBIG / HDMF
                </span>
                <span className="font-semibold text-slate-800 block">2% EE / 2% ER</span>
                <span className="text-[10px] text-slate-500 font-mono block">₱200/mo Mandatory Share</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Audit Log Stream */}
        <div className="space-y-4">
          <div className="bg-white rounded border border-slate-300 shadow-xs flex flex-col h-full">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Live Audit Activity
                </span>
              </div>
              <button
                onClick={() => onNavigate('audit')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Inspect All
              </button>
            </div>

            <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[440px]">
              {recentAudits.map((log, lIdx) => (
                <div
                  key={`${log.id}-${lIdx}`}
                  className="p-2.5 rounded border border-slate-200 bg-slate-50/60 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                        log.module === 'EMPLOYEE'
                          ? 'bg-blue-100 text-blue-800'
                          : log.module === 'DTR'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {log.module} • {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatTime(log.timestamp.split('T')[1]?.slice(0, 5) || '08:00')}
                    </span>
                  </div>

                  <p className="text-slate-800 font-medium text-[11px] leading-tight">
                    {log.description}
                  </p>

                  <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-500">
                    <span>Actor: <strong className="text-slate-700">{log.actorName}</strong></span>
                    {log.changes && log.changes.length > 0 && (
                      <span className="text-blue-600 font-bold font-mono">{log.changes.length} diffs</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
