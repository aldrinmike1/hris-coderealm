import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  EmployeeDeduction,
  DeductionType,
  DeductionStatus,
  EmployeeWithDeductionSummary,
  Payslip,
  PayslipItem,
  ThirteenthMonthItem,
  ThirteenthMonthRecord,
} from '../../types';
import { generateEmployeePayslip } from '../../utils/calculations';
import {
  Plus,
  Search,
  Filter,
  DollarSign,
  CreditCard,
  Receipt,
  User,
  ChevronRight,
  ArrowLeft,
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Building2,
  Layers,
  ArrowUpDown,
  FileText,
  History,
  Calendar,
  CheckCheck,
  Gift,
  TrendingUp,
} from 'lucide-react';
import { AddDeductionModal } from './AddDeductionModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { AdjustPrincipalModal } from './AdjustPrincipalModal';
import { PaymentRecordsModal } from './PaymentRecordsModal';
import { PayslipModal } from '../payroll/PayslipModal';
import { ThirteenthMonthVoucherModal } from '../payroll/ThirteenthMonthVoucherModal';
import { PaymentSummaryTab } from './PaymentSummaryTab';

export const DeductionsDashboard: React.FC = () => {
  const {
    employees,
    employeeDeductions,
    deleteEmployeeDeduction,
    payslips,
    payPeriods,
    thirteenthMonthRecords,
    dtrRecords,
    companyProfile,
    showToast,
  } = useApp();

  // Navigation tabs on the Deduction Dashboard
  const [activeDashboardTab, setActiveDashboardTab] = useState<'employees' | 'summary' | 'history'>('employees');

  // Search and filter states for "Employees with Deductions" tab
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Search and filter states for "Deduction History" tab
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('ALL');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('ALL');
  const [historyViewMode, setHistoryViewMode] = useState<'transactions' | 'accounts'>('transactions');

  // Modal triggers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<EmployeeDeduction | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [preselectedDeductionForPayment, setPreselectedDeductionForPayment] = useState<string | undefined>(undefined);
  const [isAdjustPrincipalOpen, setIsAdjustPrincipalOpen] = useState(false);
  const [preselectedDeductionForAdjustment, setPreselectedDeductionForAdjustment] = useState<string | undefined>(undefined);

  // Payment Records Modal triggers
  const [isPaymentRecordsModalOpen, setIsPaymentRecordsModalOpen] = useState(false);
  const [selectedDeductionForRecords, setSelectedDeductionForRecords] = useState<EmployeeDeduction | null>(null);

  // Payslip Modal triggers (from history view or payslip button)
  const [viewingPayslip, setViewingPayslip] = useState<Payslip | null>(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);

  // 13th Month Voucher Modal trigger
  const [viewingThirteenthMonth, setViewingThirteenthMonth] = useState<{ item: ThirteenthMonthItem; record: ThirteenthMonthRecord | null; year: number } | null>(null);

  // 1. Group deductions by employee for the "List of employees who have a deduction"
  const employeesWithDeductions: EmployeeWithDeductionSummary[] = useMemo(() => {
    const map = new Map<string, EmployeeDeduction[]>();

    employeeDeductions.forEach(d => {
      if (!map.has(d.employeeId)) {
        map.set(d.employeeId, []);
      }
      map.get(d.employeeId)!.push(d);
    });

    const list: EmployeeWithDeductionSummary[] = [];

    map.forEach((deds, empId) => {
      const emp = employees.find(e => e.id === empId);
      const activeCount = deds.filter(d => d.status === 'Active' && d.runningBalance > 0).length;
      const totalOrig = deds.reduce((sum, d) => sum + d.totalAmount, 0);
      const totalPaid = deds.reduce((sum, d) => sum + d.totalPaid, 0);
      const totalBalance = deds.reduce((sum, d) => sum + d.runningBalance, 0);
      const totalCutoff = deds
        .filter(d => d.status === 'Active' && d.runningBalance > 0)
        .reduce((sum, d) => sum + d.cutoffDeductionAmount, 0);

      list.push({
        employeeId: empId,
        employeeNumber: emp?.employeeNumber || deds[0]?.employeeNumber || 'EMP-UNKNOWN',
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : deds[0]?.employeeName || 'Unknown Employee',
        department: emp?.department || deds[0]?.department || 'General',
        position: emp?.position || deds[0]?.position || 'Staff',
        avatarUrl: emp?.avatarUrl,
        totalDeductionsCount: deds.length,
        activeDeductionsCount: activeCount,
        totalOriginalAmount: totalOrig,
        totalPaid: totalPaid,
        totalRunningBalance: totalBalance,
        totalCutoffDeductionAmount: totalCutoff,
        deductions: deds,
      });
    });

    // Sort by largest running balance first, then name
    return list.sort((a, b) => b.totalRunningBalance - a.totalRunningBalance);
  }, [employeeDeductions, employees]);

  // Overall KPI metrics
  const stats = useMemo(() => {
    const totalDeds = employeeDeductions.length;
    const activeDeds = employeeDeductions.filter(d => d.status === 'Active' && d.runningBalance > 0).length;
    const employeesCount = employeesWithDeductions.length;
    const totalOutstanding = employeeDeductions.reduce((sum, d) => sum + d.runningBalance, 0);
    const totalPaid = employeeDeductions.reduce((sum, d) => sum + d.totalPaid, 0);
    const totalCutoffWeekly = employeeDeductions
      .filter(d => d.status === 'Active' && d.runningBalance > 0)
      .reduce((sum, d) => sum + d.cutoffDeductionAmount, 0);

    return {
      totalDeds,
      activeDeds,
      employeesCount,
      totalOutstanding,
      totalPaid,
      totalCutoffWeekly,
    };
  }, [employeeDeductions, employeesWithDeductions]);

  // Filtered list of employees who have deductions
  const filteredEmployeesWithDeductions = useMemo(() => {
    return employeesWithDeductions.filter(empSummary => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        empSummary.employeeName.toLowerCase().includes(q) ||
        empSummary.employeeNumber.toLowerCase().includes(q) ||
        empSummary.department.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Type filter
      if (selectedTypeFilter !== 'ALL') {
        const hasType = empSummary.deductions.some(d => d.type === selectedTypeFilter);
        if (!hasType) return false;
      }

      // Status filter
      if (selectedStatusFilter === 'ACTIVE') {
        if (empSummary.totalRunningBalance <= 0 || empSummary.activeDeductionsCount === 0) return false;
      } else if (selectedStatusFilter === 'COMPLETED') {
        if (empSummary.totalRunningBalance > 0) return false;
      }

      return true;
    });
  }, [employeesWithDeductions, searchQuery, selectedTypeFilter, selectedStatusFilter]);

  // -------------------------------------------------------------
  // 2. DEDUCTION HISTORY: Processed transactions & deductions log
  // -------------------------------------------------------------
  const allProcessedHistoryEntries = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      deductionId: string;
      deductionCode: string;
      deductionTitle: string;
      type: DeductionType;
      employeeId: string;
      employeeName: string;
      employeeNumber: string;
      department: string;
      position: string;
      avatarUrl?: string;
      amount: number;
      runningBalance: number;
      reference: string;
      remarks?: string;
      status: DeductionStatus;
      payslipId?: string;
      payPeriodId?: string;
      thirteenthMonthYear?: number;
      isManual?: boolean;
      transactionType: 'CUTOFF_DEDUCTION' | 'PAYMENT';
      rawDeduction: EmployeeDeduction;
    }> = [];

    employeeDeductions.forEach(ded => {
      const emp = employees.find(e => e.id === ded.employeeId);
      const empName = emp ? `${emp.firstName} ${emp.lastName}` : ded.employeeName;
      const empNum = emp?.employeeNumber || ded.employeeNumber;
      const dept = emp?.department || ded.department || 'General';
      const pos = emp?.position || ded.position || 'Staff';
      const avatar = emp?.avatarUrl;

      // Filter for all processed deduction events (CUTOFF_DEDUCTION or PAYMENT)
      const processedEntries = ded.ledger.filter(entry => entry.type !== 'GRANT');

      processedEntries.forEach(entry => {
        // Resolve connected payslipId if available
        let connectedPayslipId = entry.payslipId;
        if (!connectedPayslipId && entry.reference) {
          const matchedPeriod = payPeriods.find(p => p.id === entry.reference);
          if (matchedPeriod) {
            const matchedSlip = payslips.find(
              ps => ps.payPeriodId === matchedPeriod.id && ps.employeeId === ded.employeeId
            );
            if (matchedSlip) {
              connectedPayslipId = matchedSlip.id;
            }
          }
        }
        if (!connectedPayslipId && entry.reference?.startsWith('PS-')) {
          connectedPayslipId = entry.reference;
        }

        let thYear = entry.thirteenthMonthYear;
        if (!thYear && entry.reference?.startsWith('13TH-')) {
          const parsed = parseInt(entry.reference.replace('13TH-', ''), 10);
          if (!isNaN(parsed)) thYear = parsed;
        }

        list.push({
          id: entry.id,
          date: entry.date,
          deductionId: ded.id,
          deductionCode: ded.deductionId,
          deductionTitle: ded.description,
          type: ded.type,
          employeeId: ded.employeeId,
          employeeName: empName,
          employeeNumber: empNum,
          department: dept,
          position: pos,
          avatarUrl: avatar,
          amount: entry.credit,
          runningBalance: entry.runningBalance,
          reference: entry.reference,
          remarks: entry.description || entry.remarks,
          status: entry.runningBalance <= 0 ? 'Completed' : ded.status,
          payslipId: connectedPayslipId,
          payPeriodId: entry.payPeriodId,
          thirteenthMonthYear: thYear,
          isManual: entry.isManual,
          transactionType: entry.type === 'CUTOFF_DEDUCTION' ? 'CUTOFF_DEDUCTION' : 'PAYMENT',
          rawDeduction: ded,
        });
      });
    });

    // Sort chronologically descending (most recent first)
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [employeeDeductions, employees, payPeriods, payslips]);

  // Count of unique Date + Deduction Type groups for the Payment Summary tab badge
  const paymentSummaryCount = useMemo(() => {
    const keys = new Set<string>();
    employeeDeductions.forEach(ded => {
      (ded.ledger || []).forEach(entry => {
        if (
          entry.type !== 'GRANT' &&
          (entry.credit > 0 || entry.type === 'PAYMENT' || entry.type === 'CUTOFF_DEDUCTION')
        ) {
          const date = entry.date || 'Unknown';
          const type = ded.type || 'Others';
          keys.add(`${date}___${type}`);
        }
      });
    });
    return keys.size;
  }, [employeeDeductions]);

  // Filtered Deduction History
  const filteredHistoryEntries = useMemo(() => {
    return allProcessedHistoryEntries.filter(item => {
      // Search query
      const q = historySearchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.employeeName.toLowerCase().includes(q) ||
        item.employeeNumber.toLowerCase().includes(q) ||
        item.deductionCode.toLowerCase().includes(q) ||
        item.deductionTitle.toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Type filter
      if (historyTypeFilter !== 'ALL' && item.type !== historyTypeFilter) {
        return false;
      }

      // Status filter
      if (historyStatusFilter !== 'ALL') {
        if (historyStatusFilter === 'Completed' && item.status !== 'Completed') return false;
        if (historyStatusFilter === 'Active' && item.status !== 'Active') return false;
        if (historyStatusFilter === 'Paused' && item.status !== 'Paused') return false;
      }

      return true;
    });
  }, [allProcessedHistoryEntries, historySearchQuery, historyTypeFilter, historyStatusFilter]);

  // History stats
  const historyStats = useMemo(() => {
    const totalTransactions = allProcessedHistoryEntries.length;
    const totalAmountProcessed = allProcessedHistoryEntries.reduce((sum, item) => sum + item.amount, 0);
    const completedDeductionsCount = employeeDeductions.filter(d => d.status === 'Completed' || d.runningBalance <= 0).length;
    const activeDeductionsCount = employeeDeductions.filter(d => d.status === 'Active' && d.runningBalance > 0).length;

    return {
      totalTransactions,
      totalAmountProcessed,
      completedDeductionsCount,
      activeDeductionsCount,
    };
  }, [allProcessedHistoryEntries, employeeDeductions]);

  // Currently viewed employee in detail view
  const viewingEmployeeData = useMemo(() => {
    if (!selectedEmployeeId) return null;
    const emp = employees.find(e => e.id === selectedEmployeeId);
    const summary = employeesWithDeductions.find(s => s.employeeId === selectedEmployeeId);
    const deds = employeeDeductions.filter(d => d.employeeId === selectedEmployeeId);

    return {
      employee: emp,
      summary,
      deductions: deds,
    };
  }, [selectedEmployeeId, employees, employeesWithDeductions, employeeDeductions]);

  // Handlers
  const handleOpenAdd = (empId?: string) => {
    setEditingDeduction(null);
    setIsAddModalOpen(true);
  };

  const handleEditDeduction = (ded: EmployeeDeduction) => {
    setEditingDeduction(ded);
    setIsAddModalOpen(true);
  };

  const handleDeleteDeduction = (id: string, code: string) => {
    if (window.confirm(`Are you sure you want to delete deduction ${code}? This will remove all associated payment records.`)) {
      deleteEmployeeDeduction(id);
    }
  };

  const handleOpenPayment = (dedId?: string) => {
    setPreselectedDeductionForPayment(dedId);
    setIsPaymentModalOpen(true);
  };

  const handleOpenAdjustPrincipal = (dedId?: string) => {
    setPreselectedDeductionForAdjustment(dedId);
    setIsAdjustPrincipalOpen(true);
  };

  const handleOpenPaymentRecords = (ded: EmployeeDeduction | null) => {
    setSelectedDeductionForRecords(ded);
    setIsPaymentRecordsModalOpen(true);
  };

  // Open connected payslip
  const handleOpenPayslip = (payslipId?: string, historyItem?: any) => {
    let targetSlip: Payslip | undefined;

    if (payslipId) {
      targetSlip = payslips.find(ps => ps.id === payslipId);
    }

    if (!targetSlip && historyItem) {
      if (historyItem.payPeriodId) {
        targetSlip = payslips.find(
          ps => ps.employeeId === historyItem.employeeId && ps.payPeriodId === historyItem.payPeriodId
        );
      }
      if (!targetSlip && historyItem.reference) {
        targetSlip = payslips.find(
          ps => ps.employeeId === historyItem.employeeId && ps.payPeriodId === historyItem.reference
        );
      }
    }

    const targetAmount = Math.abs(historyItem?.amount || 0);

    if (targetSlip && historyItem) {
      const otherDeds = [...(targetSlip.otherDeductions || [])];
      const matchIdx = otherDeds.findIndex(
        od => od.name.includes(historyItem.deductionCode) ||
              (historyItem.deductionTitle && od.name.toLowerCase().includes(historyItem.deductionTitle.toLowerCase()))
      );

      let needsAdjustment = false;
      if (matchIdx >= 0) {
        if (targetAmount > 0 && otherDeds[matchIdx].amount !== targetAmount) {
          otherDeds[matchIdx] = { ...otherDeds[matchIdx], amount: targetAmount };
          needsAdjustment = true;
        }
      } else if (targetAmount > 0) {
        otherDeds.push({
          name: `${historyItem.type === 'Loan' ? 'Loan' : 'Salary Deduction'}: ${historyItem.deductionTitle} (${historyItem.deductionCode})`,
          amount: targetAmount,
        });
        needsAdjustment = true;
      }

      if (needsAdjustment) {
        const totOther = otherDeds.reduce((s, it) => s + it.amount, 0);
        const withholdingTaxAmount = companyProfile?.enableWithholdingTax ? (targetSlip.withholdingTax || 0) : 0;
        const totDeds = Math.round(
          ((targetSlip.lateUndertimeDeduction || 0) +
            (targetSlip.sssDeduction || 0) +
            (targetSlip.philhealthDeduction || 0) +
            (targetSlip.pagibigDeduction || 0) +
            withholdingTaxAmount +
            (targetSlip.cashAdvanceDeduction || 0) +
            totOther) * 100
        ) / 100;
        const net = Math.max(0, Math.round((targetSlip.grossPay - totDeds) * 100) / 100);

        targetSlip = {
          ...targetSlip,
          otherDeductions: otherDeds,
          totalOtherDeductions: totOther,
          totalDeductions: totDeds,
          netPay: net,
        };
      }

      setViewingPayslip(targetSlip);
      setIsPayslipModalOpen(true);
      return;
    }

    if (historyItem) {
      const emp = employees.find(e => e.id === historyItem.employeeId);
      const matchedPeriod = payPeriods.find(p => p.id === historyItem.payPeriodId || p.id === historyItem.reference);
      if (emp && matchedPeriod) {
        const empDtr = dtrRecords.filter(
          d => d.employeeId === emp.id && d.date >= matchedPeriod.startDate && d.date <= matchedPeriod.endDate
        );
        const customDeds: PayslipItem[] = targetAmount > 0 ? [
          {
            name: `${historyItem.type === 'Loan' ? 'Loan' : 'Salary Deduction'}: ${historyItem.deductionTitle} (${historyItem.deductionCode})`,
            amount: targetAmount,
          },
        ] : [];
        const calculatedSlip = generateEmployeePayslip(
          emp,
          matchedPeriod.id,
          empDtr,
          [],
          customDeds,
          matchedPeriod.holidays || [],
          {
            enableLateDeduction: companyProfile?.enableLateDeduction !== false,
            enableNightShiftPay: companyProfile?.enableNightShiftPay,
            enableWithholdingTax: companyProfile?.enableWithholdingTax,
          }
        );
        calculatedSlip.status = 'Approved';
        setViewingPayslip(calculatedSlip);
        setIsPayslipModalOpen(true);
      }
    }
  };

  // Open connected 13th month voucher
  const handleOpenThirteenthMonth = (year: number, employeeId: string) => {
    const rec = thirteenthMonthRecords.find(r => r.year === year);
    const itm = rec?.items.find(i => i.employeeId === employeeId);
    if (itm) {
      setViewingThirteenthMonth({ item: itm, record: rec || null, year });
    } else {
      const emp = employees.find(e => e.id === employeeId);
      const fallbackItem: ThirteenthMonthItem = {
        employeeId: employeeId,
        employeeNumber: emp?.employeeNumber || '',
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Employee',
        department: emp?.department || 'General',
        position: emp?.position || 'Staff',
        dailyRate: emp?.dailyRate || 610,
        monthsWorkedCount: 12,
        totalBasicSalaryEarned: (emp?.dailyRate || 610) * 313,
        thirteenthMonthPay: Math.round(((emp?.dailyRate || 610) * 313 / 12) * 100) / 100,
        totalGrossPay: Math.round(((emp?.dailyRate || 610) * 313 / 12) * 100) / 100,
        taxableAmount: 0,
        status: 'Approved',
      };
      setViewingThirteenthMonth({
        item: fallbackItem,
        record: rec || null,
        year,
      });
    }
  };

  return (
    <div className="space-y-5" id="deductions-module-container">
      {/* ======================================================== */}
      {/* 1. TOP OVERVIEW METRICS BAR                             */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Outstanding Balance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Outstanding Balance
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
              ₱{stats.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Total Obligation Remaining
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Active Deductions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Active Deductions
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
              {stats.activeDeds}{' '}
              <span className="text-sm font-normal text-slate-400">/ {stats.totalDeds} total</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Currently being amortized
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Employees with Deductions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Employees with Deductions
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
              {stats.employeesCount}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Holding loans or salary deductions
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600">
            <User className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Weekly Cutoff Deductions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Weekly Cutoff Deductions
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 font-mono mt-1">
              ₱{stats.totalCutoffWeekly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Automated weekly payroll amort.
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. DASHBOARD VIEW TABS SWITCHER                          */}
      {/* ======================================================== */}
      {!selectedEmployeeId && (
        <div className="flex items-center justify-between border-b border-slate-200 px-1 pt-1 gap-4 flex-wrap">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveDashboardTab('employees')}
              className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeDashboardTab === 'employees'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Employees with Deductions</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                activeDashboardTab === 'employees' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {employeesWithDeductions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDashboardTab('summary')}
              className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeDashboardTab === 'summary'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Payment Summary</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                activeDashboardTab === 'summary' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {paymentSummaryCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDashboardTab('history')}
              className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeDashboardTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Deduction History</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                activeDashboardTab === 'history' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {allProcessedHistoryEntries.length}
              </span>
            </button>
          </div>

          <div className="pb-2">
            <button
              type="button"
              onClick={() => handleOpenAdd()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Deduction</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MAIN CONTENT: BASED ON ACTIVE VIEW / TAB              */}
      {/* ======================================================== */}
      {selectedEmployeeId ? (
        /* ====================================================== */
        /* A. INDIVIDUAL EMPLOYEE DEDUCTIONS VIEW                 */
        /* ====================================================== */
        viewingEmployeeData && (
          <div className="space-y-4">
            {/* Top Navigation & Profile Strip */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeId(null)}
                  className="p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Back to All Employees with Deductions"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                {viewingEmployeeData.employee?.avatarUrl ? (
                  <img
                    src={viewingEmployeeData.employee.avatarUrl}
                    alt={viewingEmployeeData.employee.firstName}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-base">
                    {viewingEmployeeData.employee?.firstName?.charAt(0) || 'E'}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-slate-900">
                      {viewingEmployeeData.employee
                        ? `${viewingEmployeeData.employee.firstName} ${viewingEmployeeData.employee.lastName}`
                        : viewingEmployeeData.summary?.employeeName || 'Employee'}
                    </h2>
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {viewingEmployeeData.employee?.employeeNumber || viewingEmployeeData.summary?.employeeNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {viewingEmployeeData.employee?.department} • {viewingEmployeeData.employee?.position} • Daily Rate: ₱{viewingEmployeeData.employee?.dailyRate.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons for this employee */}
              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDeductionForRecords(viewingEmployeeData.deductions[0] || null);
                    setIsPaymentRecordsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-blue-600/20 cursor-pointer"
                  title="Open Payment Records modal"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Payment Records</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenPayment()}
                  disabled={viewingEmployeeData.summary?.totalRunningBalance === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAdjustPrincipal()}
                  disabled={!viewingEmployeeData?.deductions?.length}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs shadow-indigo-600/20 transition-all cursor-pointer"
                  title="Adjust principal or increment balance (e.g. for skipped cutoff deduction)"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Adjust Principal</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAdd(selectedEmployeeId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Deduction</span>
                </button>
              </div>
            </div>

            {/* Employee Financial Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Total Granted Obligation
                </span>
                <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                  ₱{viewingEmployeeData.summary?.totalOriginalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                </span>
                <span className="text-[10px] text-slate-400">Principal + Total Interest</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                  Total Deducted / Paid
                </span>
                <span className="text-base font-black text-emerald-700 font-mono mt-0.5 block">
                  ₱{viewingEmployeeData.summary?.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                </span>
                <span className="text-[10px] text-slate-400">Payroll cutoffs & payments</span>
              </div>

              <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-blue-800 block">
                  Current Running Balance
                </span>
                <span className="text-base font-black text-blue-950 font-mono mt-0.5 block">
                  ₱{viewingEmployeeData.summary?.totalRunningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                </span>
                <span className="text-[10px] text-blue-700">Remaining unpaid balance</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-indigo-700 block">
                  Cutoff Amortization
                </span>
                <span className="text-base font-black text-indigo-900 font-mono mt-0.5 block">
                  ₱{viewingEmployeeData.summary?.totalCutoffDeductionAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                </span>
                <span className="text-[10px] text-slate-400">Weekly payroll deduction</span>
              </div>
            </div>

            {/* Deductions Accounts Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Deduction Accounts ({viewingEmployeeData.deductions.length})
                  </h3>
                </div>
                <div className="text-xs text-slate-500">
                  Click <span className="font-semibold text-blue-600">Payment Records</span> on any deduction to view its date, amount, running balance, and connected payslips.
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/80 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Deduction Details</th>
                      <th className="py-2.5 px-3">Date Granted</th>
                      <th className="py-2.5 px-3 text-right">Principal</th>
                      <th className="py-2.5 px-3 text-right">Interest</th>
                      <th className="py-2.5 px-3 text-right">Total Due</th>
                      <th className="py-2.5 px-3 text-right">Cutoff Amort.</th>
                      <th className="py-2.5 px-3 text-right">Total Paid</th>
                      <th className="py-2.5 px-3 text-right bg-blue-50/50">Running Balance</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80">
                    {viewingEmployeeData.deductions.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">
                              {d.deductionId}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.type === 'Loan'
                                ? 'bg-purple-100 text-purple-800'
                                : d.type === 'Salary Deduction'
                                ? 'bg-amber-100 text-amber-800'
                                : d.type === 'MLS'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {d.type}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-700 text-xs mt-0.5">
                            {d.description}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{d.date}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                          ₱{d.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                          ₱{d.interest.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          ₱{d.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                          ₱{d.cutoffDeductionAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-medium whitespace-nowrap">
                          ₱{d.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 bg-blue-50/50 whitespace-nowrap">
                          <span className={d.runningBalance > 0 ? 'text-blue-950 font-black' : 'text-slate-400'}>
                            ₱{d.runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.status === 'Paused'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentRecords(d)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200/80 hover:border-blue-600 rounded-lg text-xs font-bold transition-all shadow-2xs group cursor-pointer"
                              title="Open Payment Records modal"
                            >
                              <Receipt className="w-3.5 h-3.5 text-blue-600 group-hover:text-white transition-colors" />
                              <span>Payment Records</span>
                            </button>

                            {d.runningBalance > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOpenPayment(d.id)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Record Payment / Deduction"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenAdjustPrincipal(d.id)}
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Adjust Principal / Increment Balance (e.g. Skipped Cutoff)"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEditDeduction(d)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Deduction"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteDeduction(d.id, d.deductionId)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Deduction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      ) : activeDashboardTab === 'employees' ? (
        /* ====================================================== */
        /* B. TAB 1: EMPLOYEES WITH DEDUCTIONS                    */
        /* ====================================================== */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Header & Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Employees with Deductions
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 font-mono">
                  {filteredEmployeesWithDeductions.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of employees holding active loans and salary deductions. Click any employee to view their individual accounts and payment records.
              </p>
            </div>
          </div>

          {/* Search & Filters Strip */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search employee name, number, or department..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 text-[11px] font-semibold">Type:</span>
                <select
                  value={selectedTypeFilter}
                  onChange={e => setSelectedTypeFilter(e.target.value)}
                  className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="ALL">All Types</option>
                  <option value="Loan">Loans Only</option>
                  <option value="Salary Deduction">Salary Deductions Only</option>
                  <option value="MLS">MLS Only</option>
                  <option value="Others">Others Only</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 text-[11px] font-semibold">Status:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={e => setSelectedStatusFilter(e.target.value)}
                  className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">With Remaining Balance</option>
                  <option value="COMPLETED">Fully Settled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Employees List Table */}
          {filteredEmployeesWithDeductions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Employee Deductions Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery || selectedTypeFilter !== 'ALL' || selectedStatusFilter !== 'ALL'
                  ? 'No employees match the selected search or filter criteria.'
                  : 'No employees currently have registered loans or salary deductions. Click "+ New Deduction" to grant a loan or create a salary deduction.'}
              </p>
              <button
                onClick={() => handleOpenAdd()}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Deduction</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 text-[11px] uppercase font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3">Deduction Accounts</th>
                    <th className="py-3 px-3 text-right">Total Obligation</th>
                    <th className="py-3 px-3 text-right">Total Paid</th>
                    <th className="py-3 px-3 text-right bg-blue-50/50">Running Balance</th>
                    <th className="py-3 px-3 text-right">Cutoff Amort.</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {filteredEmployeesWithDeductions.map((row) => (
                    <tr
                      key={row.employeeId}
                      onClick={() => setSelectedEmployeeId(row.employeeId)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Employee Column */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          {row.avatarUrl ? (
                            <img
                              src={row.avatarUrl}
                              alt={row.employeeName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs shrink-0">
                              {row.employeeName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {row.employeeName}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {row.employeeNumber}
                            </div>
                          </div>
                        </div>
                      </td>


                      {/* Deduction Accounts Pills */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {row.totalDeductionsCount} {row.totalDeductionsCount === 1 ? 'account' : 'accounts'}
                          </span>
                          {row.deductions.map((d) => (
                            <span
                              key={d.id}
                              className={`text-[10px] px-1.5 py-0.2 rounded font-semibold whitespace-nowrap ${
                                d.type === 'Loan'
                                  ? 'bg-purple-100 text-purple-800'
                                  : d.type === 'Salary Deduction'
                                  ? 'bg-amber-100 text-amber-800'
                                  : d.type === 'MLS'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                              title={`${d.deductionId}: ${d.description}`}
                            >
                              {d.type}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Total Obligation */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                        ₱{row.totalOriginalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Total Paid */}
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 font-semibold whitespace-nowrap">
                        ₱{row.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Running Balance */}
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900 bg-blue-50/50 whitespace-nowrap">
                        <span className={row.totalRunningBalance > 0 ? 'text-blue-950 font-black' : 'text-slate-400'}>
                          ₱{row.totalRunningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Cutoff Amortization */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                        {row.totalCutoffDeductionAmount > 0 ? (
                          <span>₱{row.totalCutoffDeductionAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} / wk</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>


                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEmployeeId(row.employeeId);
                              setSelectedDeductionForRecords(row.deductions[0] || null);
                              setIsPaymentRecordsModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200/80 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            title="Open Payment Records Modal"
                          >
                            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Payment Records</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEmployeeId(row.employeeId);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            title="View Deductions"
                          >
                            <span>View</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeDashboardTab === 'summary' ? (
        /* ====================================================== */
        /* C. TAB 2: PAYMENT SUMMARY TAB (NEW)                    */
        /* ====================================================== */
        <PaymentSummaryTab />
      ) : (
        /* ====================================================== */
        /* D. TAB 3: DEDUCTION HISTORY TAB                        */
        /* ====================================================== */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Header & Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            <div>
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Deduction History Log
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 font-mono">
                  {filteredHistoryEntries.length} entries
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit trail and historical log of previously processed employee deductions, weekly cutoff amortizations, and settled loans.
              </p>
            </div>

            {/* Quick Metrics Bar inside History */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Deducted</span>
                <span className="font-mono font-bold text-slate-900">
                  ₱{historyStats.totalAmountProcessed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs">
                <span className="text-[10px] text-emerald-700 uppercase font-bold block">Completed Accounts</span>
                <span className="font-mono font-bold text-emerald-800">
                  {historyStats.completedDeductionsCount} settled
                </span>
              </div>
            </div>
          </div>

          {/* Search & Filters Strip */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by employee, deduction code, reference, or description..."
                value={historySearchQuery}
                onChange={e => setHistorySearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 text-[11px] font-semibold">Type:</span>
                <select
                  value={historyTypeFilter}
                  onChange={e => setHistoryTypeFilter(e.target.value)}
                  className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="ALL">All Types</option>
                  <option value="Loan">Loans Only</option>
                  <option value="Salary Deduction">Salary Deductions Only</option>
                  <option value="MLS">MLS Only</option>
                  <option value="Others">Others Only</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 text-[11px] font-semibold">Status:</span>
                <select
                  value={historyStatusFilter}
                  onChange={e => setHistoryStatusFilter(e.target.value)}
                  className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active / In Progress</option>
                  <option value="Completed">Completed / Settled</option>
                  <option value="Paused">Paused</option>
                </select>
              </div>

              {/* Reset filter button if active */}
              {(historySearchQuery || historyTypeFilter !== 'ALL' || historyStatusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setHistorySearchQuery('');
                    setHistoryTypeFilter('ALL');
                    setHistoryStatusFilter('ALL');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline px-1"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* History Log Table */}
          {filteredHistoryEntries.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                <History className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Deduction History Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {historySearchQuery || historyTypeFilter !== 'ALL' || historyStatusFilter !== 'ALL'
                  ? 'No deduction history logs match your search and filter criteria.'
                  : 'No deductions have been processed yet. Process weekly cutoffs or record deduction payments to populate this history log.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 text-[11px] uppercase font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date Processed</th>
                    <th className="py-3 px-3">Employee</th>
                    <th className="py-3 px-3">Deduction ID & Description</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3 text-right">Amount Deducted</th>
                    <th className="py-3 px-3 text-right bg-blue-50/50">Balance After</th>
                    <th className="py-3 px-3">Reference / Payslip</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {filteredHistoryEntries.map((item, idx) => (
                    <tr
                      key={`${item.id}-${idx}`}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Date Processed */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono font-medium text-slate-800">
                            {item.date}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {item.transactionType === 'CUTOFF_DEDUCTION' ? 'Payroll Cutoff' : 'Manual Payment'}
                        </span>
                      </td>

                      {/* Employee */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {item.avatarUrl ? (
                            <img
                              src={item.avatarUrl}
                              alt={item.employeeName}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-[11px] shrink-0">
                              {item.employeeName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                              onClick={() => setSelectedEmployeeId(item.employeeId)}
                            >
                              {item.employeeName}
                            </div>
                            <div className="font-mono text-[10px] text-slate-500">
                              {item.employeeNumber} • {item.department}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Deduction ID & Description */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-800">
                          {item.deductionCode}
                        </div>
                        <div className="text-slate-600 text-[11px] font-medium truncate max-w-[200px]" title={item.deductionTitle}>
                          {item.deductionTitle}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                            item.type === 'Loan'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : item.type === 'Salary Deduction'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : item.type === 'MLS'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>

                      {/* Amount Deducted */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="text-emerald-700">
                          -₱{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Balance After */}
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900 bg-blue-50/50 whitespace-nowrap">
                        <span className={item.runningBalance > 0 ? 'text-blue-950 font-black' : 'text-slate-400'}>
                          ₱{item.runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Reference & Payslip / 13th Month Link */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.reference}
                          </span>

                          {item.payslipId && (
                            <button
                              type="button"
                              onClick={() => handleOpenPayslip(item.payslipId, item)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 rounded text-[11px] font-bold transition-all shadow-2xs group cursor-pointer"
                              title="Inspect connected payslip"
                            >
                              <FileText className="w-3 h-3 text-blue-600 group-hover:text-white transition-colors" />
                              <span>View Payslip</span>
                            </button>
                          )}

                          {item.thirteenthMonthYear && (
                            <button
                              type="button"
                              onClick={() => handleOpenThirteenthMonth(item.thirteenthMonthYear, item.employeeId)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white border border-amber-300 hover:border-amber-600 rounded text-[11px] font-bold transition-all shadow-2xs group cursor-pointer"
                              title={`Inspect connected 13th month voucher (${item.thirteenthMonthYear})`}
                            >
                              <Gift className="w-3 h-3 text-amber-600 group-hover:text-white transition-colors" />
                              <span>View 13th Month</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {item.status === 'Completed' || item.runningBalance <= 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCheck className="w-3 h-3 text-emerald-600" />
                            Completed
                          </span>
                        ) : item.status === 'Paused' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Paused
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Active
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentRecords(item.rawDeduction)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200/80 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            title="Open full payment records for this deduction"
                          >
                            <Receipt className="w-3 h-3 text-emerald-600" />
                            <span>Payment Records</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedEmployeeId(item.employeeId)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            title="View Employee Deductions"
                          >
                            <span>View</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODALS                                                */}
      {/* ======================================================== */}

      {/* Add / Edit Deduction Modal */}
      <AddDeductionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        preselectedEmployeeId={selectedEmployeeId || undefined}
        editingDeduction={editingDeduction}
      />

      {/* Record Payment Modal */}
      {viewingEmployeeData && (
        <RecordPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          deductions={viewingEmployeeData.deductions}
          preselectedDeductionId={preselectedDeductionForPayment}
          employeeName={
            viewingEmployeeData.employee
              ? `${viewingEmployeeData.employee.firstName} ${viewingEmployeeData.employee.lastName}`
              : undefined
          }
        />
      )}

      {/* Payment Records Modal */}
      <PaymentRecordsModal
        isOpen={isPaymentRecordsModalOpen}
        onClose={() => {
          setIsPaymentRecordsModalOpen(false);
          setSelectedDeductionForRecords(null);
        }}
        employee={
          selectedDeductionForRecords
            ? employees.find(e => e.id === selectedDeductionForRecords.employeeId) || null
            : viewingEmployeeData?.employee || null
        }
        deduction={selectedDeductionForRecords}
        allEmployeeDeductions={
          selectedDeductionForRecords
            ? employeeDeductions.filter(d => d.employeeId === selectedDeductionForRecords.employeeId)
            : viewingEmployeeData?.deductions || []
        }
        onSelectDeduction={(ded) => setSelectedDeductionForRecords(ded)}
      />

      {/* Adjust Principal Modal */}
      {isAdjustPrincipalOpen && (
        <AdjustPrincipalModal
          isOpen={isAdjustPrincipalOpen}
          onClose={() => setIsAdjustPrincipalOpen(false)}
          deductions={
            viewingEmployeeData
              ? viewingEmployeeData.deductions
              : employeeDeductions
          }
          preselectedDeductionId={preselectedDeductionForAdjustment}
          employeeName={
            viewingEmployeeData?.employee
              ? `${viewingEmployeeData.employee.firstName} ${viewingEmployeeData.employee.lastName}`
              : undefined
          }
        />
      )}

      {/* Payslip Modal (linked from history view or payment records) */}
      {viewingPayslip && (
        <PayslipModal
          isOpen={isPayslipModalOpen}
          payslip={viewingPayslip}
          onClose={() => {
            setIsPayslipModalOpen(false);
            setViewingPayslip(null);
          }}
        />
      )}

      {/* 13th Month Voucher Modal (linked from history view or payment records) */}
      {viewingThirteenthMonth && (
        <ThirteenthMonthVoucherModal
          isOpen={!!viewingThirteenthMonth}
          onClose={() => setViewingThirteenthMonth(null)}
          item={viewingThirteenthMonth.item}
          record={viewingThirteenthMonth.record}
          year={viewingThirteenthMonth.year}
        />
      )}
    </div>
  );
};
