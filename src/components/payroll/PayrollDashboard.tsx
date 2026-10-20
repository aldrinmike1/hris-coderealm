import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PayPeriod, Payslip } from '../../types';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';
import { printPayslip, printAllPayslips, printPayrollSummary } from '../../utils/printHelper';
import {
  DollarSign,
  Calendar,
  Download,
  Plus,
  Edit2,
  CheckCircle,
  FileText,
  Calculator,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Users,
  Building2,
  ShieldCheck,
  Printer,
  Trash2,
  CheckSquare,
  Square,
  Eye,
  Filter,
  ChevronLeft,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PayslipModal } from './PayslipModal';
import { PayslipEditModal } from './PayslipEditModal';
import { NewPayPeriodModal } from './NewPayPeriodModal';
import { EditPayPeriodModal } from './EditPayPeriodModal';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface EditableTableDeductionCellProps {
  payslip: Payslip;
  field: 'cashAdvanceDeduction' | 'totalOtherDeductions' | 'mlsDeduction';
  label: string;
  colorClass: string;
  disabled?: boolean;
  onUpdate: (payslipId: string, updates: Partial<Payslip>, reason?: string) => void;
}

const EditableTableDeductionCell: React.FC<EditableTableDeductionCellProps> = ({
  payslip,
  field,
  label,
  colorClass,
  disabled = false,
  onUpdate,
}) => {
  const currentValue = (payslip[field] as number) || 0;
  const [isEditing, setIsEditing] = useState(false);
  const [textValue, setTextValue] = useState<string>(currentValue > 0 ? String(currentValue) : '');

  // Keep in sync with external payslip changes
  useEffect(() => {
    if (!isEditing) {
      setTextValue(currentValue > 0 ? String(currentValue) : '');
    }
  }, [currentValue, isEditing]);

  const handleCommit = () => {
    setIsEditing(false);
    const parsed = parseFloat(textValue);
    const validNumber = isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 100) / 100;
    if (validNumber !== currentValue) {
      const updates: Partial<Payslip> = { [field]: validNumber };
      if (field === 'totalOtherDeductions') {
        updates.otherDeductions = validNumber > 0 ? [{ name: 'Other Deductions', amount: validNumber }] : [];
      }
      onUpdate(
        payslip.id,
        updates,
        `Adjusted ${label} for ${payslip.employeeName} to ₱${validNumber.toLocaleString()}`
      );
    } else {
      setTextValue(currentValue > 0 ? String(currentValue) : '');
    }
  };

  if (disabled) {
    return (
      <td className={`py-2.5 px-3 text-right font-mono font-medium ${colorClass}`}>
        {currentValue > 0 ? `-${formatCurrency(currentValue)}` : '—'}
      </td>
    );
  }

  const getActiveBgBorder = () => {
    if (field === 'cashAdvanceDeduction') {
      return 'bg-amber-50/80 border-amber-300/80 hover:border-amber-500';
    }
    if (field === 'totalOtherDeductions') {
      return 'bg-rose-50/80 border-rose-200/90 hover:border-rose-400';
    }
    return 'bg-slate-50 border-slate-300 hover:border-slate-400';
  };

  return (
    <td className="py-1.5 px-2 text-right">
      <div className="flex items-center justify-end">
        <input
          type="number"
          step="any"
          min="0"
          value={isEditing ? textValue : (currentValue > 0 ? currentValue : '')}
          placeholder="—"
          onFocus={() => {
            setIsEditing(true);
            setTextValue(currentValue > 0 ? String(currentValue) : '');
          }}
          onChange={e => setTextValue(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              setTextValue(currentValue > 0 ? String(currentValue) : '');
              setIsEditing(false);
            }
          }}
          className={`w-20 text-right font-mono text-xs py-1 px-1.5 rounded transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white cursor-pointer focus:cursor-text border ${
            currentValue > 0
              ? `${colorClass} font-semibold ${getActiveBgBorder()}`
              : 'bg-transparent border-transparent hover:border-slate-300 text-slate-400 hover:bg-white hover:text-slate-700'
          }`}
          title={`Click to edit ${label}. Auto-saves and recalculates on focus out.`}
          id={`editable-${field}-${payslip.employeeNumber}`}
        />
      </div>
    </td>
  );
};

export const PayrollDashboard: React.FC = () => {
  const {
    payPeriods,
    payslips,
    employees,
    generatePayrollForPeriod,
    updatePayPeriodStatus,
    updatePayslip,
    deletePayPeriod,
    deletePayslip,
    deletePayslips,
    isAdmin,
    isManager,
    currentUser,
    companyProfile,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayslipIds, setSelectedPayslipIds] = useState<Set<string>>(new Set());
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('ALL');

  // Sorted pay periods: strictly Recent to Old
  const sortedPeriods = useMemo(() => {
    return [...payPeriods].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [payPeriods]);

  // Available months list extracted from payPeriods (Green Filter)
  const availableMonths = useMemo(() => {
    const monthsMap = new Map<string, string>(); // key: 'YYYY-MM', label: 'Month Year'
    payPeriods.forEach(p => {
      if (p.startDate) {
        const parts = p.startDate.split('-');
        if (parts.length >= 2) {
          const key = `${parts[0]}-${parts[1]}`;
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
          const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          monthsMap.set(key, label);
        }
      }
    });
    return Array.from(monthsMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [payPeriods]);

  // Filtered pay periods according to month selection
  const filteredPeriods = useMemo(() => {
    if (selectedMonthFilter === 'ALL') return sortedPeriods;
    return sortedPeriods.filter(p => p.startDate.startsWith(selectedMonthFilter));
  }, [sortedPeriods, selectedMonthFilter]);

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  // Clear selections when period changes
  useEffect(() => {
    setSelectedPayslipIds(new Set());
  }, [selectedPeriodId]);

  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [editingPayslip, setEditingPayslip] = useState<Payslip | null>(null);
  const [editingPeriod, setEditingPeriod] = useState<PayPeriod | null>(null);
  const [periodToDelete, setPeriodToDelete] = useState<PayPeriod | null>(null);
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmRecalculate, setConfirmRecalculate] = useState(false);
  const [confirmDeletePeriod, setConfirmDeletePeriod] = useState(false);
  const [payslipToDelete, setPayslipToDelete] = useState<Payslip | null>(null);
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Active Period (selected cutoff)
  const currentPeriod = useMemo(() => {
    if (!selectedPeriodId) return null;
    return sortedPeriods.find(p => p.id === selectedPeriodId) || null;
  }, [sortedPeriods, selectedPeriodId]);

  // Select cutoff
  const handleSelectCutoff = (periodId: string) => {
    setSelectedPeriodId(periodId);
  };

  // Click row in payslips table to view employee payslip (Red Row Click requirement)
  const handlePayslipRowClick = (e: React.MouseEvent, ps: Payslip) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('input') ||
      target.closest('button') ||
      target.closest('a')
    ) {
      return;
    }
    setSelectedPayslip(ps);
  };

  // Grand totals across displayed cutoffs (Blue Totals requirement)
  const cutoffTotals = useMemo(() => {
    let employeesCount = 0;
    let totalBasic = 0;
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    filteredPeriods.forEach(period => {
      const periodSlips = payslips.filter(ps => ps.payPeriodId === period.id);
      employeesCount += periodSlips.filter(ps => (ps.basicPay || 0) > 0).length;
      totalBasic += periodSlips.reduce((sum, ps) => sum + (ps.basicPay || 0), 0);
      totalGross += periodSlips.reduce((sum, ps) => sum + (ps.grossPay || 0), 0);
      totalDeductions += periodSlips.reduce((sum, ps) => sum + (ps.totalDeductions || 0), 0);
      totalNet += periodSlips.reduce((sum, ps) => sum + (ps.netPay || 0), 0);
    });

    return {
      count: filteredPeriods.length,
      employeesCount,
      totalBasic,
      totalGross,
      totalDeductions,
      totalNet,
    };
  }, [filteredPeriods, payslips]);

  // Payslips for active period
  const periodPayslips = useMemo(() => {
    if (!currentPeriod) return [];
    const all = payslips.filter(ps => ps.payPeriodId === currentPeriod.id);
    if (!searchQuery.trim()) return all;
    const q = searchQuery.toLowerCase();
    return all.filter(
      ps =>
        ps.employeeName.toLowerCase().includes(q) ||
        ps.employeeNumber.toLowerCase().includes(q) ||
        ps.department.toLowerCase().includes(q)
    );
  }, [payslips, currentPeriod, searchQuery]);

  // Checkbox Selection state helpers
  const allPeriodPayslipIds = useMemo(() => periodPayslips.map(ps => ps.id), [periodPayslips]);
  const isAllSelected = useMemo(() => {
    if (allPeriodPayslipIds.length === 0) return false;
    return allPeriodPayslipIds.every(id => selectedPayslipIds.has(id));
  }, [allPeriodPayslipIds, selectedPayslipIds]);

  const isSomeSelected = useMemo(() => {
    return selectedPayslipIds.size > 0 && !isAllSelected;
  }, [selectedPayslipIds, isAllSelected]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedPayslipIds(new Set());
    } else {
      setSelectedPayslipIds(new Set(allPeriodPayslipIds));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedPayslipIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirmDeleteSelectedPayslips = () => {
    const idsToDelete = Array.from(selectedPayslipIds);
    if (idsToDelete.length === 0) return;
    deletePayslips(idsToDelete);
    setSelectedPayslipIds(new Set());
    setConfirmDeleteSelected(false);
  };

  // Totals
  const totals = useMemo(() => {
    let gross = 0;
    let sssEE = 0;
    let sssER = 0;
    let phEE = 0;
    let phER = 0;
    let hdmfEE = 0;
    let hdmfER = 0;
    let tax = 0;
    let mlsDeds = 0;
    let cashAdvanceDeds = 0;
    let otherDeds = 0;
    let lateDeds = 0;
    let totalDeds = 0;
    let net = 0;

    periodPayslips.forEach(ps => {
      gross += ps.grossPay;
      sssEE += ps.sssDeduction;
      sssER += ps.sssEmployerShare;
      phEE += ps.philhealthDeduction;
      phER += ps.philhealthEmployerShare;
      hdmfEE += ps.pagibigDeduction;
      hdmfER += ps.pagibigEmployerShare;
      tax += ps.withholdingTax;
      mlsDeds += ps.mlsDeduction || 0;
      cashAdvanceDeds += ps.cashAdvanceDeduction || 0;
      otherDeds += ps.totalOtherDeductions || 0;
      lateDeds += ps.lateUndertimeDeduction;
      totalDeds += ps.totalDeductions;
      net += ps.netPay;
    });

    return {
      gross,
      sssEE,
      sssER,
      phEE,
      phER,
      hdmfEE,
      hdmfER,
      tax,
      mlsDeds,
      cashAdvanceDeds,
      otherDeds,
      lateDeds,
      totalDeds,
      net,
      totalStatutoryGovRemittance: sssEE + sssER + phEE + phER + hdmfEE + hdmfER + tax,
    };
  }, [periodPayslips]);

  const handleRecalculatePayroll = () => {
    if (!currentPeriod) return;
    setIsRecalculating(true);
    generatePayrollForPeriod(currentPeriod.id);
    setConfirmRecalculate(false);
    setTimeout(() => {
      setIsRecalculating(false);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }, 300);
  };

  const handleApprovePayroll = () => {
    if (!currentPeriod) return;
    updatePayPeriodStatus(currentPeriod.id, 'Approved');
    setConfirmApprove(false);
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  };

  const handleDeleteCurrentPeriod = () => {
    if (!currentPeriod) return;
    deletePayPeriod(currentPeriod.id);
    setConfirmDeletePeriod(false);
    setSelectedPeriodId(null);
  };

  const handleConfirmDeleteSpecificPeriod = () => {
    if (!periodToDelete) return;
    const targetId = periodToDelete.id;
    deletePayPeriod(targetId);
    setPeriodToDelete(null);
    if (selectedPeriodId === targetId) {
      setSelectedPeriodId(null);
    }
  };

  const handleConfirmDeletePayslip = () => {
    if (!payslipToDelete) return;
    deletePayslip(payslipToDelete.id);
    setPayslipToDelete(null);
  };

  const handleExportPayrollRegister = () => {
    if (!currentPeriod) return;
    const rows = periodPayslips.map(ps => ({
      'Employee Number': ps.employeeNumber,
      'Employee Name': ps.employeeName,
      'Department': ps.department,
      'Position': ps.position,
      'Daily Rate (PHP)': ps.dailyRate,
      'Days Worked': ps.daysWorked,
      'OT Hours': ps.overtimeHours,
      'WDO Hours': ps.wdoHours || 0,
      'Basic Pay': ps.basicPay,
      'Overtime Pay': ps.overtimePay,
      'WDO Pay': ps.wdoPay || 0,
      'Holiday Pay': ps.holidayPay,
      'Total Allowances': ps.totalAllowances,
      'Gross Pay': ps.grossPay,
      'Late/UT Deduction': ps.lateUndertimeDeduction,
      'SSS EE': ps.sssDeduction,
      'SSS ER': ps.sssEmployerShare,
      'PhilHealth EE': ps.philhealthDeduction,
      'PhilHealth ER': ps.philhealthEmployerShare,
      'Pag-IBIG EE': ps.pagibigDeduction,
      'Pag-IBIG ER': ps.pagibigEmployerShare,
      'Withholding Tax': ps.withholdingTax,
      'Cash Advance (Vale)': ps.cashAdvanceDeduction || 0,
      'Other Deductions': ps.totalOtherDeductions || 0,
      'MLS Deduction': ps.mlsDeduction || 0,
      'Total Deductions': ps.totalDeductions,
      'Net Pay': ps.netPay,
      'Status': ps.status,
    }));
    exportToCSV(`Payroll_Register_${currentPeriod.name.replace(/\s+/g, '_')}`, rows);
  };

  return (
    <div className="space-y-4" id="payroll-management-view">
      {!selectedPeriodId || !currentPeriod ? (
        /* OVERVIEW MODE */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden" id="payroll-overview-mode">
          {/* Header Toolbar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Weekly Cutoffs & Register Overview
                </h3>
                <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {filteredPeriods.length} Cutoffs
                </span>
              </div>

              {/* Month Filter */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 shadow-2xs">
                <Filter className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Month:</span>
                <select
                  value={selectedMonthFilter}
                  onChange={e => setSelectedMonthFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
                  id="month-filter-cutoff-select"
                  title="Filter cutoffs by calendar month"
                >
                  <option value="ALL">All Months ({sortedPeriods.length} Cutoffs)</option>
                  {availableMonths.map(([mKey, label], idx) => (
                    <option key={`month-opt-${mKey}-${idx}`} value={mKey}>{label}</option>
                  ))}
                </select>
                {selectedMonthFilter !== 'ALL' && (
                  <button
                    onClick={() => setSelectedMonthFilter('ALL')}
                    className="text-[10px] text-indigo-600 font-bold hover:underline ml-1"
                    title="Show all cutoffs"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={() => setShowNewPeriodModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer w-fit"
                id="tab-new-period-btn"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Cutoff</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Cutoff Description</th>
                  <th className="py-3 px-4">Payday</th>
                  <th className="py-3 px-4 text-center">Employees</th>
                  <th className="py-3 px-4 text-right">Total Basic Pay</th>
                  <th className="py-3 px-4 text-right">Total Gross Pay</th>
                  <th className="py-3 px-4 text-right">Total Deduction</th>
                  <th className="py-3 px-4 text-right">Net Pay</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPeriods.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-medium">
                      {selectedMonthFilter !== 'ALL'
                        ? 'No pay period cutoffs found for the selected month.'
                        : 'No pay period cutoffs created yet. Click "Create New Cutoff" to start.'}
                    </td>
                  </tr>
                ) : (
                  filteredPeriods.map((period, pIdx) => {
                    const periodSlips = payslips.filter(ps => ps.payPeriodId === period.id);
                    const nonZeroBasicCount = periodSlips.filter(ps => (ps.basicPay || 0) > 0).length;
                    const totalBasic = periodSlips.reduce((sum, ps) => sum + (ps.basicPay || 0), 0);
                    const totalGross = periodSlips.reduce((sum, ps) => sum + (ps.grossPay || 0), 0);
                    const totalDeduction = periodSlips.reduce((sum, ps) => sum + (ps.totalDeductions || 0), 0);
                    const totalNet = periodSlips.reduce((sum, ps) => sum + (ps.netPay || 0), 0);

                    return (
                      <tr
                        key={`cutoff-row-${period.id}-${pIdx}`}
                        onClick={() => setSelectedPeriodId(period.id)}
                        className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                        title="Click row to view employee payslips register"
                      >
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-2 h-2 rounded-full shrink-0 bg-indigo-600" />
                            <span className="font-bold text-slate-900 text-sm group-hover:text-indigo-700">{period.name}</span>
                            {period.isLastCutoffOfMonth && (
                              <span className="text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                🏁 Month-End True-Up
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                period.status === 'Approved'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : period.status === 'Pending Review'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {period.status}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono text-xs whitespace-nowrap">
                          {formatDate(period.payoutDate)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-700 font-mono">
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-0.5 rounded text-slate-800 font-mono text-xs">
                            {nonZeroBasicCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                          {formatCurrency(totalBasic)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(totalGross)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-rose-600 whitespace-nowrap">
                          -{formatCurrency(totalDeduction)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 text-sm whitespace-nowrap">
                          {formatCurrency(totalNet)}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedPeriodId(period.id)}
                              className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              title="View employee payslips register"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Payslips</span>
                            </button>

                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => setEditingPeriod(period)}
                                  title="Edit Cutoff Name / Dates"
                                  className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                  id={`edit-cutoff-${period.id}`}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setPeriodToDelete(period)}
                                  title="Delete Cutoff"
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  id={`delete-cutoff-${period.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredPeriods.length > 0 && (
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900 text-xs">
                  <tr>
                    <td className="py-3.5 px-4 uppercase text-[11px] font-bold text-slate-800 tracking-wider">
                      Total
                    </td>
                    <td className="py-3.5 px-4"></td>
                    <td className="py-3.5 px-4 text-center"></td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(cutoffTotals.totalBasic)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(cutoffTotals.totalGross)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-rose-600">
                      -{formatCurrency(cutoffTotals.totalDeductions)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(cutoffTotals.totalNet)}
                    </td>
                    <td className="py-3.5 px-4"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : (
        /* CUTOFF DETAIL VIEW */
        <div className="space-y-4" id="cutoff-detail-register-view">
          {/* Top Navigation Row: Back Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedPeriodId(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
              id="back-to-cutoffs-list-btn"
            >
              <ChevronLeft className="w-4 h-4 text-indigo-600" />
              <span>Back to Cutoffs List</span>
            </button>
          </div>

          {/* Header Bar with Cutoff Info & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  {currentPeriod.name}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Cutoff: Sat – Fri
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                    currentPeriod.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : currentPeriod.status === 'Pending Review'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {currentPeriod.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Coverage: <strong>{formatDate(currentPeriod.startDate)}</strong> – <strong>{formatDate(currentPeriod.endDate)}</strong> • Payday: <strong className="text-indigo-700">{formatDate(currentPeriod.payoutDate)}</strong>
              </p>
            </div>

            {/* Cutoff Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportPayrollRegister}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                id="export-payroll-csv-btn"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              {periodPayslips.length > 0 && (
                <>
                  <button
                    onClick={() => printAllPayslips(periodPayslips, companyProfile, currentPeriod.name)}
                    className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    id="print-all-payslips-btn"
                    title="Print all payslips in this cutoff formatted as compact slips fitting 3 per row and 6 per page on A4"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Print All Payslips</span>
                  </button>

                  <button
                    onClick={() => printPayrollSummary(periodPayslips, currentPeriod, employees, companyProfile)}
                    className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    id="print-payroll-summary-btn"
                    title="Print spreadsheet-style Payroll Summary for this cutoff"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Print Payroll Summary</span>
                  </button>
                </>
              )}

              {(isAdmin || isManager) && (
                <button
                  onClick={() => setConfirmRecalculate(true)}
                  disabled={isRecalculating}
                  className="px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-75"
                  id="recalculate-payroll-btn"
                  title="Recalculate all employees in this cutoff using latest DTR records and rates"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
                  <span>{isRecalculating ? 'Recalculating...' : 'Recalculate Payroll'}</span>
                </button>
              )}

              {isAdmin && currentPeriod.status === 'Pending Review' && (
                <button
                  onClick={() => setConfirmApprove(true)}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs cursor-pointer"
                  id="approve-payroll-btn"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Approve Payroll</span>
                </button>
              )}
            </div>
          </div>

          {/* High Density Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
                <span className="font-semibold uppercase tracking-wider">Gross Payroll</span>
                <DollarSign className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-base font-bold font-mono text-slate-900">{formatCurrency(totals.gross)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {periodPayslips.length} active staff computed
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
                <span className="font-semibold uppercase tracking-wider">Total Deductions</span>
                <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div className="text-base font-bold font-mono text-rose-700">-{formatCurrency(totals.totalDeds)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Gov: {formatCurrency(totals.sssEE + totals.phEE + totals.hdmfEE + totals.tax)} • MLS: {formatCurrency(totals.mlsDeds)}
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
                <span className="font-semibold uppercase tracking-wider">Net Take-Home Pay</span>
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-base font-bold font-mono text-emerald-800">{formatCurrency(totals.net)}</div>
              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                Disbursement amount for {formatDate(currentPeriod.payoutDate)}
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
                <span className="font-semibold uppercase tracking-wider">Gov. Remittance</span>
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="text-base font-bold font-mono text-indigo-900">{formatCurrency(totals.totalStatutoryGovRemittance)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                SSS, PHIC, HDMF (EE+ER) & BIR
              </div>
            </div>
          </div>

          {/* Employee Payslips Table */}
          <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden" id="master-payslip-register-container">
            {/* Search and Bulk Actions Bar */}
            <div className="p-3 bg-white border-b border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Filter employee by name, ID, department..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-64"
                  id="search-employee-payroll-input"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                  >
                    Clear
                  </button>
                )}

                {/* Bulk Selected Actions */}
                {(isAdmin || isManager) && selectedPayslipIds.size > 0 && (
                  <div className="flex items-center gap-2 pl-2 border-l border-slate-300">
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                      {selectedPayslipIds.size} selected
                    </span>
                    <button
                      onClick={() => setConfirmDeleteSelected(true)}
                      className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                      id="bulk-delete-payslips-btn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Selected ({selectedPayslipIds.size})</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 text-slate-600 font-mono text-[11px] shrink-0 flex-wrap">
                <span>Coverage: <strong>{formatDate(currentPeriod.startDate)}</strong> – <strong>{formatDate(currentPeriod.endDate)}</strong></span>
                <span>Payday: <strong className="text-indigo-700 font-bold">{formatDate(currentPeriod.payoutDate)}</strong></span>
                {currentPeriod.isLastCutoffOfMonth && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-bold">
                    🏁 Month-End Final Cutoff (True-Up)
                  </span>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-300">
                  <tr>
                    {(isAdmin || isManager) && (
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={input => {
                            if (input) {
                              input.indeterminate = isSomeSelected;
                            }
                          }}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          title="Select / Deselect all payslips"
                          id="select-all-payslips-checkbox"
                        />
                      </th>
                    )}
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Daily Rate</th>
                    <th className="py-2.5 px-3 text-center">Days / OT</th>
                    <th className="py-2.5 px-3 text-right">Basic Pay</th>
                    <th className="py-2.5 px-3 text-right">Gross Pay</th>
                    <th className="py-2.5 px-3 text-right text-rose-700">Gov. Contribution</th>
                    <th className="py-2.5 px-3 text-right text-amber-700">Cash Adv.</th>
                    <th className="py-2.5 px-3 text-right text-rose-700">Others</th>
                    <th className="py-2.5 px-3 text-right text-slate-700">MLS</th>
                    <th className="py-2.5 px-3 text-right text-rose-800">Total Deductions</th>
                    <th className="py-2.5 px-3 text-right text-emerald-800 font-bold">Net Pay (PHP)</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {periodPayslips.length === 0 ? (
                    <tr>
                      <td colSpan={(isAdmin || isManager) ? 13 : 12} className="text-center py-10 text-slate-400">
                        <Calculator className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                        <p className="font-semibold text-xs text-slate-600">No payroll entries computed yet for this period.</p>
                        <button
                          onClick={() => setConfirmRecalculate(true)}
                          className="mt-2 text-xs text-indigo-600 font-semibold hover:underline"
                        >
                          Click here to calculate cutoff payroll
                        </button>
                      </td>
                    </tr>
                  ) : (
                    periodPayslips.map((ps, psIdx) => {
                      const isSelected = selectedPayslipIds.has(ps.id);
                      return (
                        <tr
                          key={`ps-row-${ps.id}-${psIdx}`}
                          onClick={(e) => handlePayslipRowClick(e, ps)}
                          className={`transition-colors cursor-pointer border-l-2 ${
                            isSelected
                              ? 'bg-indigo-50/70 border-l-indigo-600'
                              : 'hover:bg-blue-50/60 border-l-transparent hover:border-l-blue-600'
                          }`}
                          id={`payroll-row-${ps.employeeNumber}`}
                          title="Click row to view employee payslip"
                        >
                          {(isAdmin || isManager) && (
                            <td className="py-2.5 px-3 text-center w-10">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectOne(ps.id)}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                id={`select-payslip-${ps.employeeNumber}`}
                              />
                            </td>
                          )}

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{ps.employeeName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {ps.employeeNumber} • {ps.department}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 font-mono font-medium">
                            {formatCurrency(ps.dailyRate)}
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-[10px]">
                            <div><strong>{ps.daysWorked}</strong> days</div>
                            {ps.overtimeHours > 0 && <div className="text-blue-600 text-[9px]">+{ps.overtimeHours}h OT</div>}
                            {(ps.wdoHours || 0) > 0 && <div className="text-emerald-700 font-semibold text-[9px]">+{ps.wdoHours}h WDO</div>}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono">
                            {formatCurrency(ps.basicPay)}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(ps.grossPay)}
                          </td>

                          <td className="py-2 px-3 text-right whitespace-nowrap font-mono text-[10px] leading-tight">
                            <div className="text-slate-600">
                              SSS: <span className="text-rose-700 font-semibold">{ps.sssDeduction > 0 ? `-${formatCurrency(ps.sssDeduction)}` : '₱0.00'}</span>
                            </div>
                            <div className="text-slate-600">
                              PHIC: <span className="text-rose-700 font-semibold">{ps.philhealthDeduction > 0 ? `-${formatCurrency(ps.philhealthDeduction)}` : '₱0.00'}</span>
                            </div>
                            <div className="text-slate-600">
                              HDMF: <span className="text-rose-700 font-semibold">{ps.pagibigDeduction > 0 ? `-${formatCurrency(ps.pagibigDeduction)}` : '₱0.00'}</span>
                            </div>
                            <div className="text-[9px] font-bold text-rose-800 border-t border-slate-200/90 pt-0.5 mt-0.5">
                              Total: -{formatCurrency(ps.sssDeduction + ps.philhealthDeduction + ps.pagibigDeduction)}
                            </div>
                          </td>

                          <EditableTableDeductionCell
                            payslip={ps}
                            field="cashAdvanceDeduction"
                            label="Cash Advance (Vale)"
                            colorClass="text-amber-700"
                            disabled={!isAdmin && !isManager}
                            onUpdate={updatePayslip}
                          />

                          <EditableTableDeductionCell
                            payslip={ps}
                            field="totalOtherDeductions"
                            label="Other Deductions"
                            colorClass="text-rose-700"
                            disabled={!isAdmin && !isManager}
                            onUpdate={updatePayslip}
                          />

                          <EditableTableDeductionCell
                            payslip={ps}
                            field="mlsDeduction"
                            label="MLS Loan"
                            colorClass="text-slate-700"
                            disabled={!isAdmin && !isManager}
                            onUpdate={updatePayslip}
                          />

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                            -{formatCurrency(ps.totalDeductions)}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-xs text-emerald-800 bg-emerald-50/50">
                            {formatCurrency(ps.netPay)}
                          </td>

                          <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1">
                            <button
                              onClick={() => setSelectedPayslip(ps)}
                              title="View Payslip"
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              id={`view-payslip-${ps.employeeNumber}`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => printPayslip(ps, companyProfile, currentPeriod.name)}
                              title="Quick Print Payslip"
                              className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                              id={`print-row-payslip-${ps.employeeNumber}`}
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {(isAdmin || isManager) && (
                              <button
                                onClick={() => setEditingPayslip(ps)}
                                title="Manual Adjustment"
                                className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                id={`adjust-payslip-${ps.employeeNumber}`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {(isAdmin || isManager) && (
                              <button
                                onClick={() => setPayslipToDelete(ps)}
                                title={`Delete payslip for ${ps.employeeName}`}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                id={`delete-payslip-${ps.employeeNumber}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {periodPayslips.length > 0 && (
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-300 text-slate-900 text-[11px]">
                    <tr>
                      <td colSpan={(isAdmin || isManager) ? 4 : 3} className="py-2.5 px-3 uppercase text-[10px]">Grand Totals:</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(periodPayslips.reduce((s, p) => s + p.basicPay, 0))}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">{formatCurrency(totals.gross)}</td>
                      <td className="py-2 px-3 text-right font-mono text-rose-700 text-[10px] leading-tight">
                        <div>SSS: -{formatCurrency(totals.sssEE)}</div>
                        <div>PHIC: -{formatCurrency(totals.phEE)}</div>
                        <div>HDMF: -{formatCurrency(totals.hdmfEE)}</div>
                        <div className="font-bold text-rose-800 border-t border-slate-300 pt-0.5 mt-0.5">
                          Total: -{formatCurrency(totals.sssEE + totals.phEE + totals.hdmfEE)}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700 font-bold">
                        {totals.cashAdvanceDeds > 0 ? `-${formatCurrency(totals.cashAdvanceDeds)}` : '₱0.00'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-bold">
                        {totals.otherDeds > 0 ? `-${formatCurrency(totals.otherDeds)}` : '₱0.00'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 font-bold">
                        {totals.mlsDeds > 0 ? `-${formatCurrency(totals.mlsDeds)}` : '₱0.00'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-700">-{formatCurrency(totals.totalDeds)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-emerald-800 bg-emerald-100/60 font-bold">
                        {formatCurrency(totals.net)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Payslip View Modal */}
      {selectedPayslip && (
        <PayslipModal
          isOpen={!!selectedPayslip}
          payslip={selectedPayslip}
          onClose={() => setSelectedPayslip(null)}
          onEditPayslip={ps => {
            setSelectedPayslip(null);
            setEditingPayslip(ps);
          }}
        />
      )}

      {/* Payslip Adjustment Modal */}
      {editingPayslip && (
        <PayslipEditModal
          isOpen={!!editingPayslip}
          payslip={editingPayslip}
          onClose={() => setEditingPayslip(null)}
        />
      )}

      {/* New Cutoff Modal */}
      <NewPayPeriodModal
        isOpen={showNewPeriodModal}
        onClose={() => setShowNewPeriodModal(false)}
        onCreated={(createdPeriod) => {
          setSelectedMonthFilter('ALL');
          setSelectedPeriodId(createdPeriod.id);
        }}
      />

      {/* Edit Cutoff Modal */}
      <EditPayPeriodModal
        isOpen={!!editingPeriod}
        period={editingPeriod}
        onClose={() => setEditingPeriod(null)}
      />

      {/* Confirm Delete Cutoff Row Dialog */}
      <ConfirmDialog
        key="confirm-dialog-period-to-delete"
        isOpen={!!periodToDelete}
        title="Delete Payroll Cutoff"
        message={`Are you sure you want to delete the cutoff "${periodToDelete?.name}"? This action will permanently remove this period and all associated payslips. This cannot be undone.`}
        confirmText="Delete Cutoff"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeleteSpecificPeriod}
        onCancel={() => setPeriodToDelete(null)}
      />

      {/* Confirm Approve Dialog */}
      <ConfirmDialog
        key="confirm-dialog-approve-payroll"
        isOpen={confirmApprove}
        title="Approve Payroll Cutoff"
        message={`Confirm approval of payroll for ${currentPeriod?.name}? This verifies all DTR hours, overtime, and deductions for disbursement.`}
        confirmText="Approve Payroll"
        variant="primary"
        onConfirm={handleApprovePayroll}
        onCancel={() => setConfirmApprove(false)}
      />

      {/* Confirm Recalculate Payroll Dialog */}
      <ConfirmDialog
        key="confirm-dialog-recalculate-payroll"
        isOpen={confirmRecalculate}
        title="Recalculate Payroll for Cutoff"
        message={`Recalculate payroll for ${currentPeriod?.name}? This will pull the latest DTR attendance logs, apply statutory contribution formulas, and recalculate gross & net pay for all active employees in this period.`}
        confirmText="Recalculate Now"
        cancelText="Cancel"
        variant="warning"
        onConfirm={handleRecalculatePayroll}
        onCancel={() => setConfirmRecalculate(false)}
      />

      {/* Confirm Delete Cutoff Dialog */}
      <ConfirmDialog
        key="confirm-dialog-delete-current-period"
        isOpen={confirmDeletePeriod}
        title="Delete Payroll Cutoff"
        message={`Are you sure you want to delete the cutoff "${currentPeriod?.name}"? This action will permanently remove this period and all ${periodPayslips.length} computed payslip(s). This cannot be undone.`}
        confirmText="Delete Cutoff"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteCurrentPeriod}
        onCancel={() => setConfirmDeletePeriod(false)}
      />

      {/* Confirm Delete Payslip Dialog */}
      <ConfirmDialog
        key="confirm-dialog-delete-payslip"
        isOpen={!!payslipToDelete}
        title="Delete Employee Payslip"
        message={`Are you sure you want to delete the payslip for ${payslipToDelete?.employeeName} (${payslipToDelete?.employeeNumber}) from this cutoff? The cutoff gross, deductions, and net totals will be updated automatically.`}
        confirmText="Delete Payslip"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeletePayslip}
        onCancel={() => setPayslipToDelete(null)}
      />

      {/* Confirm Bulk Delete Selected Payslips Dialog */}
      <ConfirmDialog
        key="confirm-dialog-delete-selected-payslips"
        isOpen={confirmDeleteSelected}
        title="Delete Selected Payslips"
        message={`Are you sure you want to delete ${selectedPayslipIds.size} selected payslip(s) from "${currentPeriod?.name}"? The cutoff gross pay, statutory deductions, and net disbursements will be recalculated automatically.`}
        confirmText={`Delete ${selectedPayslipIds.size} Payslip(s)`}
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeleteSelectedPayslips}
        onCancel={() => setConfirmDeleteSelected(false)}
      />
    </div>
  );
};
