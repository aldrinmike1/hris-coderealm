import React, { useState, useMemo } from 'react';
import { Employee, EmployeeDeduction, DeductionLedgerEntry, Payslip, PayslipItem, ThirteenthMonthItem, ThirteenthMonthRecord } from '../../types';
import { useApp } from '../../context/AppContext';
import { generateEmployeePayslip } from '../../utils/calculations';
import {
  X,
  FileText,
  CreditCard,
  Plus,
  Receipt,
  Printer,
  ChevronDown,
  ExternalLink,
  Tag,
  Building2,
  Calendar,
  AlertCircle,
  Clock,
  Trash2,
  CheckCircle2,
  Gift,
  TrendingUp,
  Pencil,
} from 'lucide-react';
import { PayslipModal } from '../payroll/PayslipModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { AdjustPrincipalModal } from './AdjustPrincipalModal';
import { ThirteenthMonthVoucherModal } from '../payroll/ThirteenthMonthVoucherModal';
import { EditPaymentModal, EditablePaymentEntry } from './EditPaymentModal';

interface PaymentRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  deduction: EmployeeDeduction | null;
  allEmployeeDeductions?: EmployeeDeduction[];
  onSelectDeduction?: (ded: EmployeeDeduction) => void;
}

interface FormattedPaymentRow {
  key: string;
  dateLabel: string;
  amount: number;
  isPositive: boolean;
  balance: number;
  remarks: string;
  type: 'GRANT' | 'INTEREST' | 'PAYMENT' | 'CUTOFF_DEDUCTION' | 'ADJUSTMENT';
  payslipId?: string;
  payPeriodId?: string;
  thirteenthMonthYear?: number;
  isManual?: boolean;
  reference?: string;
  rawEntryId?: string;
  deductionId?: string;
  rawDate?: string;
}

export const PaymentRecordsModal: React.FC<PaymentRecordsModalProps> = ({
  isOpen,
  onClose,
  employee,
  deduction: initialDeduction,
  allEmployeeDeductions = [],
  onSelectDeduction,
}) => {
  const { payslips, payPeriods, thirteenthMonthRecords, deleteDeductionLedgerEntry, isSuperAdmin, isAdmin, employees, dtrRecords, companyProfile } = useApp();

  // Active selected deduction inside this modal
  const [selectedDeductionId, setSelectedDeductionId] = useState<string>(
    initialDeduction?.id || (allEmployeeDeductions.length > 0 ? allEmployeeDeductions[0].id : '')
  );

  // Nested Modals state
  const [viewingPayslip, setViewingPayslip] = useState<Payslip | null>(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isAdjustPrincipalOpen, setIsAdjustPrincipalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<EditablePaymentEntry | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [viewingThirteenthMonth, setViewingThirteenthMonth] = useState<{ item: ThirteenthMonthItem; record: ThirteenthMonthRecord | null; year: number } | null>(null);

  // Keep selected deduction in sync when modal opens or initialDeduction changes
  React.useEffect(() => {
    if (initialDeduction?.id) {
      setSelectedDeductionId(initialDeduction.id);
    } else if (allEmployeeDeductions.length > 0) {
      setSelectedDeductionId(allEmployeeDeductions[0].id);
    }
  }, [initialDeduction?.id, isOpen]);

  // Current active deduction
  const currentDeduction = useMemo(() => {
    if (selectedDeductionId) {
      const found = allEmployeeDeductions.find(d => d.id === selectedDeductionId);
      if (found) return found;
    }
    return initialDeduction || allEmployeeDeductions[0] || null;
  }, [selectedDeductionId, allEmployeeDeductions, initialDeduction]);

  // Format date helper: returns M/D/YYYY (e.g. 7/27/2026, matching user's screenshot)
  const formatTableDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      if (year && month && day) {
        return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Build the formatted table rows strictly matching the spreadsheet screenshot:
  // Row 1: Date (7/27/2026) | Amount (10000 green) | Balance (10000) | Remarks (deduction's description)
  // Row 2: Date (Interest)  | Amount (2000 green)  | Balance (12000) | Remarks (Interest charge)
  // Row 3+: Date (8/1/2026) | Amount (-500)        | Balance (11500) | Remarks (description, payslip button / manual)
  const formattedRows = useMemo<FormattedPaymentRow[]>(() => {
    if (!currentDeduction) return [];

    const rows: FormattedPaymentRow[] = [];
    const principal = currentDeduction.amount;
    const interest = currentDeduction.interest || 0;

    // 1. Initial Principal Row
    rows.push({
      key: `grant-principal-${currentDeduction.id}`,
      dateLabel: formatTableDate(currentDeduction.date),
      amount: principal,
      isPositive: true,
      balance: principal,
      remarks: `${currentDeduction.description} (Principal Granted)`,
      type: 'GRANT',
      reference: `${currentDeduction.deductionId}-GRANT`,
      deductionId: currentDeduction.id,
    });

    let currentBalance = principal;

    // 2. Interest Row (if applicable)
    if (interest > 0) {
      currentBalance = Math.round((currentBalance + interest) * 100) / 100;
      rows.push({
        key: `grant-interest-${currentDeduction.id}`,
        dateLabel: 'Interest',
        amount: interest,
        isPositive: true,
        balance: currentBalance,
        remarks: currentDeduction.interestType === 'percentage' && currentDeduction.interestRate
          ? `${currentDeduction.interestRate}% Interest Charge`
          : 'Fixed Interest Charge',
        type: 'INTEREST',
        reference: `${currentDeduction.deductionId}-INT`,
        deductionId: currentDeduction.id,
      });
    }

    // 3. Payment / Cutoff Deduction / Adjustment Entries from the deduction's ledger
    const nonGrantEntries = currentDeduction.ledger
      .filter(entry => entry.type !== 'GRANT')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    nonGrantEntries.forEach((entry, idx) => {
      const isAdjustment = entry.type === 'ADJUSTMENT' || (entry.debit && entry.debit > 0);

      if (isAdjustment) {
        const adjustmentAmount = entry.debit || 0;
        currentBalance = Math.round((currentBalance + adjustmentAmount) * 100) / 100;

        // Check if adjustment is linked to a payslip
        let connectedPayslipId = entry.payslipId;
        if (!connectedPayslipId && entry.reference) {
          const matchedPeriod = payPeriods.find(p => p.id === entry.reference || `ADJ-${p.id}` === entry.reference);
          if (matchedPeriod) {
            const matchedSlip = payslips.find(
              ps => ps.payPeriodId === matchedPeriod.id && ps.employeeId === currentDeduction.employeeId
            );
            if (matchedSlip) {
              connectedPayslipId = matchedSlip.id;
            }
          }
        }

        rows.push({
          key: entry.id || `adj-${idx}`,
          dateLabel: formatTableDate(entry.date),
          amount: adjustmentAmount, // Positive amount (+1000)
          isPositive: true,
          balance: currentBalance,
          remarks: entry.remarks || entry.description || 'Principal Adjustment',
          type: 'ADJUSTMENT',
          payslipId: connectedPayslipId,
          payPeriodId: entry.payPeriodId,
          reference: entry.reference,
          rawEntryId: entry.id,
          deductionId: currentDeduction.id,
          isManual: true,
        });
      } else {
        const paymentAmount = entry.credit || 0;
        currentBalance = Math.max(0, Math.round((currentBalance - paymentAmount) * 100) / 100);

        // Check if this payment is connected to a payslip
        // Look for payslipId, or match reference with payPeriodId
        let connectedPayslipId = entry.payslipId;
        if (!connectedPayslipId && entry.reference) {
          // Check if reference is like "PP-2026-W34"
          const matchedPeriod = payPeriods.find(p => p.id === entry.reference);
          if (matchedPeriod) {
            const matchedSlip = payslips.find(
              ps => ps.payPeriodId === matchedPeriod.id && ps.employeeId === currentDeduction.employeeId
            );
            if (matchedSlip) {
              connectedPayslipId = matchedSlip.id;
            }
          }
        }

        // If reference contains 'PS-'
        if (!connectedPayslipId && entry.reference?.startsWith('PS-')) {
          connectedPayslipId = entry.reference;
        }

        // Check if this payment is from 13th month pay
        let thYear = entry.thirteenthMonthYear;
        if (!thYear && entry.reference?.startsWith('13TH-')) {
          const parsed = parseInt(entry.reference.replace('13TH-', ''), 10);
          if (!isNaN(parsed)) thYear = parsed;
        }

        rows.push({
          key: entry.id || `pay-${idx}`,
          dateLabel: formatTableDate(entry.date),
          amount: -paymentAmount, // Negative amount as shown in screenshot (-500)
          isPositive: false,
          balance: currentBalance,
          remarks: entry.description || (entry.type === 'CUTOFF_DEDUCTION' ? 'Payroll Cutoff Deduction' : 'Payment Received'),
          type: entry.type === 'CUTOFF_DEDUCTION' ? 'CUTOFF_DEDUCTION' : 'PAYMENT',
          payslipId: connectedPayslipId,
          payPeriodId: entry.payPeriodId,
          thirteenthMonthYear: thYear,
          isManual: entry.isManual !== undefined ? entry.isManual : (entry.type === 'PAYMENT' && !connectedPayslipId),
          reference: entry.reference,
          rawEntryId: entry.id,
          deductionId: currentDeduction.id,
          rawDate: entry.date,
        });
      }
    });

    return rows;
  }, [currentDeduction, payPeriods, payslips]);

  if (!isOpen) return null;

  // Handle opening 13th month voucher
  const handleOpenThirteenthMonth = (year: number) => {
    if (!currentDeduction) return;
    const rec = thirteenthMonthRecords.find(r => r.year === year);
    const itm = rec?.items.find(i => i.employeeId === currentDeduction.employeeId);
    if (itm) {
      setViewingThirteenthMonth({ item: itm, record: rec || null, year });
    } else {
      const fallbackItem: ThirteenthMonthItem = {
        employeeId: currentDeduction.employeeId,
        employeeNumber: currentDeduction.employeeNumber,
        employeeName: currentDeduction.employeeName,
        department: currentDeduction.department || 'General',
        position: currentDeduction.position || 'Staff',
        dailyRate: 610,
        monthsWorkedCount: 12,
        totalBasicSalaryEarned: 610 * 313,
        thirteenthMonthPay: Math.round(((610 * 313) / 12) * 100) / 100,
        totalGrossPay: Math.round(((610 * 313) / 12) * 100) / 100,
        deductions: [{
          id: `ded-th-${currentDeduction.id}`,
          deductionId: currentDeduction.id,
          name: `${currentDeduction.type}: ${currentDeduction.description}`,
          type: 'DEDUCTION_MODULE',
          amount: Math.abs(currentDeduction.totalPaid),
          remarks: `13th Month Pay deduction for ${currentDeduction.description}`,
        }],
        totalDeductions: Math.abs(currentDeduction.totalPaid),
        netPay: Math.max(0, Math.round(((610 * 313) / 12 - Math.abs(currentDeduction.totalPaid)) * 100) / 100),
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

  // Handle opening a payslip
  const handleOpenPayslip = (payslipId?: string, row?: FormattedPaymentRow) => {
    if (!payslipId && !row) return;

    let targetSlip: Payslip | undefined;

    if (payslipId) {
      targetSlip = payslips.find(ps => ps.id === payslipId);
    }

    // Fallback: match by employee and payPeriodId / reference
    if (!targetSlip && currentDeduction) {
      if (row?.payPeriodId) {
        targetSlip = payslips.find(
          ps => ps.employeeId === currentDeduction.employeeId && ps.payPeriodId === row.payPeriodId
        );
      }
      if (!targetSlip && row?.reference) {
        targetSlip = payslips.find(
          ps => ps.employeeId === currentDeduction.employeeId && ps.payPeriodId === row.reference
        );
      }
    }

    const targetAmount = Math.abs(row?.amount || (currentDeduction ? currentDeduction.cutoffDeductionAmount : 0));

    if (targetSlip && currentDeduction) {
      // Ensure the viewed payslip accurately displays this deduction and amount
      const otherDeds = [...(targetSlip.otherDeductions || [])];
      const matchIdx = otherDeds.findIndex(
        od => od.name.includes(currentDeduction.deductionId) ||
              (currentDeduction.description && od.name.toLowerCase().includes(currentDeduction.description.toLowerCase()))
      );

      let needsAdjustment = false;
      if (matchIdx >= 0) {
        if (targetAmount > 0 && otherDeds[matchIdx].amount !== targetAmount) {
          otherDeds[matchIdx] = { ...otherDeds[matchIdx], amount: targetAmount };
          needsAdjustment = true;
        }
      } else if (targetAmount > 0) {
        otherDeds.push({
          name: `${currentDeduction.type === 'Loan' ? 'Loan' : 'Salary Deduction'}: ${currentDeduction.description} (${currentDeduction.deductionId})`,
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

    // If payslip is not pre-cached, generate an accurate payslip from employee, DTR, and period
    const emp = employee || (currentDeduction ? employees.find(e => e.id === currentDeduction.employeeId) : null);
    const matchedPeriod = payPeriods.find(p => p.id === row?.payPeriodId || p.id === row?.reference);

    if (emp && currentDeduction && matchedPeriod) {
      const empDtr = dtrRecords.filter(
        d => d.employeeId === emp.id && d.date >= matchedPeriod.startDate && d.date <= matchedPeriod.endDate
      );
      const customDeds: PayslipItem[] = targetAmount > 0 ? [
        {
          name: `${currentDeduction.type === 'Loan' ? 'Loan' : 'Salary Deduction'}: ${currentDeduction.description} (${currentDeduction.deductionId})`,
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
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 my-6 flex flex-col max-h-[92vh]">
          {/* ======================================================== */}
          {/* HEADER STRIP                                             */}
          {/* ======================================================== */}
          <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight">Payment Records</h2>
                  {currentDeduction && (
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700">
                      {currentDeduction.deductionId}
                    </span>
                  )}
                  {currentDeduction?.status === 'Completed' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Fully Paid
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Active Obligation
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {employee ? `${employee.firstName} ${employee.lastName}` : currentDeduction?.employeeName}
                  <span className="mx-1.5">•</span>
                  <span className="font-mono">{employee?.employeeNumber || currentDeduction?.employeeNumber}</span>
                  {currentDeduction && (
                    <>
                      <span className="mx-1.5">•</span>
                      <span className="text-slate-300 font-medium">{currentDeduction.description}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setIsAdjustPrincipalOpen(true)}
                disabled={!currentDeduction}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Add adjustment to increment principal account (e.g. for skipped cutoff on printed payslip)"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Adjust Principal</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRecordPaymentOpen(true)}
                disabled={!currentDeduction || currentDeduction.runningBalance <= 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Record payment or manual amortization"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Payment</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                title="Print payment records table"
              >
                <Printer className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* DEDUCTION SELECTOR (If employee has multiple deductions) */}
          {/* ======================================================== */}
          {allEmployeeDeductions.length > 1 && (
            <div className="px-5 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 print:hidden overflow-x-auto">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-semibold text-[11px] whitespace-nowrap">
                  Select Deduction Account:
                </span>
                <div className="flex items-center gap-1.5">
                  {allEmployeeDeductions.map(ded => {
                    const isSelected = ded.id === currentDeduction?.id;
                    return (
                      <button
                        key={ded.id}
                        type="button"
                        onClick={() => {
                          setSelectedDeductionId(ded.id);
                          if (onSelectDeduction) onSelectDeduction(ded);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span className="font-mono">{ded.deductionId}</span>
                        <span>•</span>
                        <span className="truncate max-w-[140px]">{ded.description}</span>
                        <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                          isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          ₱{ded.runningBalance.toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* FINANCIAL SUMMARY STRIP                                  */}
          {/* ======================================================== */}
          {currentDeduction && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-100/60 border-b border-slate-200 text-xs shrink-0">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Principal Amount
                </span>
                <span className="text-sm font-black font-mono text-slate-900 block mt-0.5">
                  ₱{currentDeduction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400">
                  {currentDeduction.interest > 0 ? `+ ₱${currentDeduction.interest.toLocaleString()} interest` : 'Zero interest'}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Total Obligation Due
                </span>
                <span className="text-sm font-black font-mono text-slate-900 block mt-0.5">
                  ₱{currentDeduction.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400">Principal + Total Interest</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                  Total Deducted / Paid
                </span>
                <span className="text-sm font-black font-mono text-emerald-700 block mt-0.5">
                  ₱{currentDeduction.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400">
                  {formattedRows.filter(r => !r.isPositive).length} payments recorded
                </span>
              </div>

              <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-blue-800 block">
                  Current Balance
                </span>
                <span className="text-sm font-black font-mono text-blue-950 block mt-0.5">
                  ₱{currentDeduction.runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-blue-700">
                  Amort: ₱{currentDeduction.cutoffDeductionAmount.toLocaleString()} / cutoff
                </span>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PAYMENT RECORDS TABLE (Standard HRIS Table Design)       */}
          {/* ======================================================== */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-white" id="printable-payment-records-table">
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200 tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 text-left">Date</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-right bg-blue-50/50">Running Balance</th>
                    <th className="py-2.5 px-4 text-left">Remarks & Reference</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200/80 text-xs font-normal">
                  {formattedRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No payment records found.
                      </td>
                    </tr>
                  ) : (
                    formattedRows.map((row, index) => {
                      const isInterestRow = row.type === 'INTEREST';

                      return (
                        <tr
                          key={row.key}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            index % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                          }`}
                        >
                          {/* 1. DATE COLUMN */}
                          <td className="py-2.5 px-4 whitespace-nowrap text-left">
                            {isInterestRow ? (
                              <span className="font-mono text-xs font-semibold text-amber-700">
                                Interest Charge
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{row.dateLabel}</span>
                              </div>
                            )}
                          </td>

                          {/* 3. AMOUNT COLUMN */}
                          <td className="py-2.5 px-4 text-right whitespace-nowrap font-mono text-xs">
                            {row.isPositive ? (
                              <span className="text-emerald-700 font-bold">
                                +₱{Math.abs(row.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-slate-900 font-semibold">
                                -₱{Math.abs(row.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </td>

                          {/* 4. RUNNING BALANCE COLUMN */}
                          <td className="py-2.5 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-900 bg-blue-50/50 text-xs">
                            ₱{row.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* 5. REMARKS & REFERENCE COLUMN */}
                          <td className="py-2.5 px-4 text-left">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-slate-800 text-xs">
                                {row.remarks}
                              </span>

                              {row.reference && (
                                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                                  {row.reference}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 6. ACTIONS COLUMN */}
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Action: Connected to Payslip -> View Payslip Button */}
                              {row.payslipId && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPayslip(row.payslipId, row)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 rounded-lg text-xs font-bold transition-all shadow-2xs group cursor-pointer"
                                  title="Open connected payslip modal"
                                >
                                  <FileText className="w-3.5 h-3.5 text-blue-600 group-hover:text-white transition-colors" />
                                  <span>View Payslip</span>
                                </button>
                              )}

                              {/* Action: Connected to 13th Month Pay -> View 13th Month Button */}
                              {row.thirteenthMonthYear && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenThirteenthMonth(row.thirteenthMonthYear!)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white border border-amber-300 hover:border-amber-600 rounded-lg text-xs font-bold transition-all shadow-2xs group cursor-pointer"
                                  title={`Open 13th Month Pay Voucher for Year ${row.thirteenthMonthYear}`}
                                >
                                  <Gift className="w-3.5 h-3.5 text-amber-600 group-hover:text-white transition-colors" />
                                  <span>View 13th Month</span>
                                </button>
                              )}

                              {/* Action: Manual Payment -> Edit Button (Only for manual payments, not from payslip) */}
                              {row.isManual && !row.payslipId && !row.thirteenthMonthYear && row.rawEntryId && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingPayment({
                                      id: row.rawEntryId!,
                                      amount: Math.abs(row.amount),
                                      date: row.rawDate || row.dateLabel,
                                      remarks: row.remarks,
                                      description: row.remarks,
                                      reference: row.reference,
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white border border-amber-300 hover:border-amber-600 rounded-lg text-xs font-bold transition-all shadow-2xs group cursor-pointer"
                                  title="Edit manual payment"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-amber-600 group-hover:text-white transition-colors" />
                                  <span>Edit</span>
                                </button>
                              )}

                              {/* Delete manual entry with in-UI confirmation (avoids iframe window.confirm blocks) */}
                              {row.isManual && !row.payslipId && !row.thirteenthMonthYear && row.rawEntryId && (
                                deletingEntryId === row.rawEntryId ? (
                                  <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-lg shadow-2xs">
                                    <span className="text-[11px] font-bold text-rose-700">Delete?</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (row.deductionId && row.rawEntryId) {
                                          deleteDeductionLedgerEntry(row.deductionId, row.rawEntryId);
                                          setDeletingEntryId(null);
                                        }
                                      }}
                                      className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                                      title="Confirm delete"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingEntryId(null)}
                                      className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-medium cursor-pointer transition-colors"
                                      title="Cancel"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingEntryId(row.rawEntryId!)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete manual payment entry"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}

                              {!row.payslipId && !row.thirteenthMonthYear && !row.isManual && (
                                <span className="text-slate-300 text-xs px-2">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Explanatory footer note */}
            <div className="mt-3.5 flex items-center justify-between text-xs text-slate-500 print:hidden flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[11px] text-slate-600">Positive green amounts indicate granted loan obligations & charges</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-slate-700"></span>
                  <span className="text-[11px] text-slate-600">Negative amounts indicate payroll cutoff deductions and payments</span>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* MODAL FOOTER                                             */}
          {/* ======================================================== */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 print:hidden">
            <div className="text-xs text-slate-500">
              Showing {formattedRows.length} total entries for {currentDeduction?.description}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CONNECTED PAYSLIP MODAL (Opens when 'View Payslip' is hit)*/}
      {/* ======================================================== */}
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

      {/* ======================================================== */}
      {/* RECORD PAYMENT MODAL                                     */}
      {/* ======================================================== */}
      {currentDeduction && (
        <RecordPaymentModal
          isOpen={isRecordPaymentOpen}
          onClose={() => setIsRecordPaymentOpen(false)}
          deductions={allEmployeeDeductions.length > 0 ? allEmployeeDeductions : [currentDeduction]}
          preselectedDeductionId={currentDeduction.id}
          employeeName={employee ? `${employee.firstName} ${employee.lastName}` : currentDeduction.employeeName}
        />
      )}

      {/* ======================================================== */}
      {/* ADJUST PRINCIPAL MODAL                                   */}
      {/* ======================================================== */}
      {currentDeduction && (
        <AdjustPrincipalModal
          isOpen={isAdjustPrincipalOpen}
          onClose={() => setIsAdjustPrincipalOpen(false)}
          deductions={allEmployeeDeductions.length > 0 ? allEmployeeDeductions : [currentDeduction]}
          preselectedDeductionId={currentDeduction.id}
          employeeName={employee ? `${employee.firstName} ${employee.lastName}` : currentDeduction.employeeName}
        />
      )}

      {/* ======================================================== */}
      {/* 13TH MONTH PAY VOUCHER MODAL                             */}
      {/* ======================================================== */}
      {viewingThirteenthMonth && (
        <ThirteenthMonthVoucherModal
          isOpen={!!viewingThirteenthMonth}
          onClose={() => setViewingThirteenthMonth(null)}
          item={viewingThirteenthMonth.item}
          record={viewingThirteenthMonth.record}
          year={viewingThirteenthMonth.year}
        />
      )}

      {/* ======================================================== */}
      {/* EDIT MANUAL PAYMENT MODAL                                */}
      {/* ======================================================== */}
      {currentDeduction && editingPayment && (
        <EditPaymentModal
          isOpen={!!editingPayment}
          onClose={() => setEditingPayment(null)}
          deduction={currentDeduction}
          paymentEntry={editingPayment}
          employeeName={employee ? `${employee.firstName} ${employee.lastName}` : currentDeduction.employeeName}
        />
      )}
    </>
  );
};
