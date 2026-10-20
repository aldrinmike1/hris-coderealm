import React, { useState, useMemo } from 'react';
import { Employee, EmployeeDeduction, DeductionLedgerEntry, Payslip } from '../../types';
import { useApp } from '../../context/AppContext';
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
} from 'lucide-react';
import { PayslipModal } from '../payroll/PayslipModal';
import { RecordPaymentModal } from './RecordPaymentModal';

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
  type: 'GRANT' | 'INTEREST' | 'PAYMENT' | 'CUTOFF_DEDUCTION';
  payslipId?: string;
  payPeriodId?: string;
  isManual?: boolean;
  reference?: string;
  rawEntryId?: string;
  deductionId?: string;
}

export const PaymentRecordsModal: React.FC<PaymentRecordsModalProps> = ({
  isOpen,
  onClose,
  employee,
  deduction: initialDeduction,
  allEmployeeDeductions = [],
  onSelectDeduction,
}) => {
  const { payslips, payPeriods, deleteDeductionLedgerEntry, isSuperAdmin, isAdmin } = useApp();

  // Active selected deduction inside this modal
  const [selectedDeductionId, setSelectedDeductionId] = useState<string>(
    initialDeduction?.id || (allEmployeeDeductions.length > 0 ? allEmployeeDeductions[0].id : '')
  );

  // Nested Modals state
  const [viewingPayslip, setViewingPayslip] = useState<Payslip | null>(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

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

    // 3. Payment / Cutoff Deduction Entries from the deduction's ledger
    const paymentEntries = currentDeduction.ledger
      .filter(entry => entry.type !== 'GRANT')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    paymentEntries.forEach((entry, idx) => {
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
        isManual: entry.isManual !== undefined ? entry.isManual : (entry.type === 'PAYMENT' && !connectedPayslipId),
        reference: entry.reference,
        rawEntryId: entry.id,
        deductionId: currentDeduction.id,
      });
    });

    return rows;
  }, [currentDeduction, payPeriods, payslips]);

  if (!isOpen) return null;

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

    if (targetSlip) {
      setViewingPayslip(targetSlip);
      setIsPayslipModalOpen(true);
    } else {
      // If payslip is not pre-cached, generate a quick fallback payslip representation from employee and period
      const matchedPeriod = payPeriods.find(p => p.id === row?.payPeriodId || p.id === row?.reference);
      if (currentDeduction && employee) {
        const fallbackSlip: Payslip = {
          id: payslipId || `PS-${row?.reference || 'CUTOFF'}-${employee.id}`,
          payPeriodId: matchedPeriod?.id || row?.reference || 'PP-2026-W34',
          employeeId: employee.id,
          employeeNumber: employee.employeeNumber,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          position: employee.position,
          dailyRate: employee.dailyRate,
          hourlyRate: employee.dailyRate / 8,
          daysWorked: 6,
          lateMinutes: 0,
          undertimeMinutes: 0,
          overtimeHours: 0,
          holidayDays: 0,
          regularHolidayDays: 0,
          specialHolidayDays: 0,
          wdoHours: 0,
          nightDiffHours: 0,
          nightDiffPay: 0,
          basicPay: employee.dailyRate * 6,
          overtimePay: 0,
          holidayPay: 0,
          wdoPay: 0,
          allowances: [],
          totalAllowances: 0,
          grossPay: employee.dailyRate * 6,
          lateUndertimeDeduction: 0,
          sssDeduction: 0,
          sssEmployerShare: 0,
          philhealthDeduction: 0,
          philhealthEmployerShare: 0,
          pagibigDeduction: 0,
          pagibigEmployerShare: 0,
          withholdingTax: 0,
          mlsDeduction: 0,
          cashAdvanceDeduction: 0,
          otherDeductions: [
            {
              name: `${currentDeduction.type}: ${currentDeduction.description}`,
              amount: Math.abs(row?.amount || currentDeduction.cutoffDeductionAmount),
            },
          ],
          totalOtherDeductions: Math.abs(row?.amount || currentDeduction.cutoffDeductionAmount),
          totalDeductions: Math.abs(row?.amount || currentDeduction.cutoffDeductionAmount),
          netPay: (employee.dailyRate * 6) - Math.abs(row?.amount || currentDeduction.cutoffDeductionAmount),
          status: 'Approved',
          generatedAt: new Date().toISOString(),
        };
        setViewingPayslip(fallbackSlip);
        setIsPayslipModalOpen(true);
      }
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
            <div className="flex items-center gap-2 self-end sm:self-auto">
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
          {/* PAYMENT RECORDS TABLE (Matching Spreadsheet Screenshot)  */}
          {/* ======================================================== */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-white" id="printable-payment-records-table">
            <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                {/* 
                  Table Header matching user screenshot:
                  - Gray background (#D4D4D8 / bg-slate-200)
                  - Bold text
                  - Date | Amount | Balance | Remarks
                */}
                <thead className="bg-[#D1D5DB] text-slate-900 font-bold border-b border-slate-300 select-none text-[13px]">
                  <tr>
                    <th className="py-2.5 px-4 border-r border-slate-300 w-32 sm:w-36 text-center">
                      Date
                    </th>
                    <th className="py-2.5 px-4 border-r border-slate-300 w-32 sm:w-36 text-right">
                      Amount
                    </th>
                    <th className="py-2.5 px-4 border-r border-slate-300 w-32 sm:w-36 text-right">
                      Balance
                    </th>
                    <th className="py-2.5 px-4 text-left">
                      Remarks
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-xs font-normal">
                  {formattedRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        No payment records found.
                      </td>
                    </tr>
                  ) : (
                    formattedRows.map((row, index) => {
                      const isGrantRow = row.type === 'GRANT';
                      const isInterestRow = row.type === 'INTEREST';
                      const isPaymentRow = !row.isPositive;

                      return (
                        <tr
                          key={row.key}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            index % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                          }`}
                        >
                          {/* ------------------------------------------- */}
                          {/* 1. DATE COLUMN                              */}
                          {/* ------------------------------------------- */}
                          <td className={`py-2 px-4 border-r border-slate-200 text-center whitespace-nowrap ${
                            isInterestRow
                              ? 'font-bold text-slate-800'
                              : 'font-mono text-slate-700'
                          }`}>
                            {row.dateLabel}
                          </td>

                          {/* ------------------------------------------- */}
                          {/* 2. AMOUNT COLUMN                            */}
                          {/* Positive additions green (10000, 2000),      */}
                          {/* Deductions negative with minus (-500)       */}
                          {/* ------------------------------------------- */}
                          <td className="py-2 px-4 border-r border-slate-200 text-right whitespace-nowrap font-mono text-[13px]">
                            {row.isPositive ? (
                              <span className="text-[#15803D] font-bold">
                                {row.amount}
                              </span>
                            ) : (
                              <span className="text-slate-800 font-semibold">
                                {row.amount}
                              </span>
                            )}
                          </td>

                          {/* ------------------------------------------- */}
                          {/* 3. BALANCE COLUMN                           */}
                          {/* ------------------------------------------- */}
                          <td className="py-2 px-4 border-r border-slate-200 text-right whitespace-nowrap font-mono font-medium text-slate-900 text-[13px]">
                            {row.balance}
                          </td>

                          {/* ------------------------------------------- */}
                          {/* 4. REMARKS COLUMN                           */}
                          {/* (deduction's description, payslip button)   */}
                          {/* ------------------------------------------- */}
                          <td className="py-2 px-4 text-left">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-slate-800">
                                  {row.remarks}
                                </span>

                                {row.reference && (
                                  <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {row.reference}
                                  </span>
                                )}

                                {row.isManual && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                    Manual Payment
                                  </span>
                                )}

                                {row.payslipId && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                                    Payroll Connected
                                  </span>
                                )}
                              </div>

                              {/* Action: Connected to Payslip -> View Payslip Button */}
                              <div className="flex items-center gap-1.5 shrink-0">
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

                                {/* Admin delete manual entry if needed */}
                                {row.isManual && row.rawEntryId && (isAdmin || isSuperAdmin) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (row.deductionId && row.rawEntryId) {
                                        if (window.confirm('Remove this manual payment entry and recalculate running balance?')) {
                                          deleteDeductionLedgerEntry(row.deductionId, row.rawEntryId);
                                        }
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                    title="Delete manual payment entry"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
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
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500 print:hidden flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Positive green amounts indicate granted loan obligations & charges</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-700"></span>
                <span>Negative amounts indicate payroll cutoff deductions and payments</span>
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
    </>
  );
};
