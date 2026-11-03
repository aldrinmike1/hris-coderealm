import React, { useState, useMemo } from 'react';
import { DeductionType } from '../../types';
import {
  X,
  CreditCard,
  Receipt,
  Layers,
  FileText,
  Search,
  Calendar,
  Building2,
  User,
  ArrowDownLeft,
  CheckCircle2,
  Printer,
  Download,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EmployeeDeduction } from '../../types';
import { EditPaymentModal, EditablePaymentEntry } from './EditPaymentModal';

export interface IndividualPaymentItem {
  id: string;
  entryId: string;
  date: string; // YYYY-MM-DD
  deductionId: string;
  deductionCode: string;
  deductionTitle: string;
  deductionType: DeductionType;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  position: string;
  avatarUrl?: string;
  amount: number;
  runningBalanceAfter: number;
  reference: string;
  remarks?: string;
  transactionType: 'CUTOFF_DEDUCTION' | 'PAYMENT' | 'ADJUSTMENT';
  isManual?: boolean;
  payslipId?: string;
  payPeriodId?: string;
  thirteenthMonthYear?: number;
}

export interface PaymentSummaryGroup {
  key: string;
  date: string; // YYYY-MM-DD
  deductionType: DeductionType;
  totalPaid: number;
  paymentCount: number;
  uniqueEmployeesCount: number;
  payments: IndividualPaymentItem[];
}

interface PaymentSummaryListModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryGroup: PaymentSummaryGroup | null;
}

export const PaymentSummaryListModal: React.FC<PaymentSummaryListModalProps> = ({
  isOpen,
  onClose,
  summaryGroup,
}) => {
  const { employeeDeductions, deleteDeductionLedgerEntry } = useApp();
  const [modalSearch, setModalSearch] = useState('');
  const [editingTarget, setEditingTarget] = useState<{
    deduction: EmployeeDeduction;
    entry: EditablePaymentEntry;
    employeeName: string;
  } | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset search when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setModalSearch('');
    }
  }, [isOpen]);

  const filteredPayments = useMemo(() => {
    if (!summaryGroup) return [];
    const q = modalSearch.toLowerCase().trim();
    if (!q) return summaryGroup.payments;

    return summaryGroup.payments.filter(
      p =>
        p.employeeName.toLowerCase().includes(q) ||
        p.employeeNumber.toLowerCase().includes(q) ||
        p.deductionTitle.toLowerCase().includes(q) ||
        p.deductionCode.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        (p.reference && p.reference.toLowerCase().includes(q)) ||
        (p.remarks && p.remarks.toLowerCase().includes(q))
    );
  }, [summaryGroup, modalSearch]);

  if (!isOpen || !summaryGroup) return null;

  // Format currency
  const formatCurrency = (val: number) => {
    return '₱' + (val || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format date helper
  const formatDateFull = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-');
      if (y && m && d) {
        const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        return dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const getTypeIcon = (type: DeductionType) => {
    switch (type) {
      case 'Loan':
        return <CreditCard className="w-5 h-5 text-indigo-600" />;
      case 'Salary Deduction':
        return <Receipt className="w-5 h-5 text-blue-600" />;
      case 'MLS':
        return <Layers className="w-5 h-5 text-emerald-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-600" />;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!summaryGroup || summaryGroup.payments.length === 0) return;

    const headers = [
      'Date',
      'Deduction Type',
      'Employee Number',
      'Employee Name',
      'Department',
      'Deduction Code',
      'Deduction Description',
      'Payment Type',
      'Reference',
      'Amount Paid',
      'Remaining Balance',
      'Remarks',
    ];

    const rows = summaryGroup.payments.map(p => [
      `"${p.date}"`,
      `"${p.deductionType}"`,
      `"${p.employeeNumber}"`,
      `"${p.employeeName.replace(/"/g, '""')}"`,
      `"${p.department.replace(/"/g, '""')}"`,
      `"${p.deductionCode}"`,
      `"${p.deductionTitle.replace(/"/g, '""')}"`,
      `"${p.isManual ? 'Manual/Over-the-Counter' : 'Payroll Cutoff Deduction'}"`,
      `"${p.reference || ''}"`,
      p.amount.toFixed(2),
      p.runningBalanceAfter.toFixed(2),
      `"${(p.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Payment_Summary_${summaryGroup.deductionType}_${summaryGroup.date}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-6 flex items-start justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700/60 shrink-0">
              {getTypeIcon(summaryGroup.deductionType)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Payment List Breakdown
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {summaryGroup.deductionType}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-300 flex-wrap">
                <span className="flex items-center gap-1 text-slate-200 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  {formatDateFull(summaryGroup.date)}
                </span>
                <span className="text-slate-500">•</span>
                <span>
                  {summaryGroup.paymentCount}{' '}
                  {summaryGroup.paymentCount === 1 ? 'payment record' : 'payment records'}
                </span>
                <span className="text-slate-500">•</span>
                <span>
                  {summaryGroup.uniqueEmployeesCount}{' '}
                  {summaryGroup.uniqueEmployeesCount === 1 ? 'employee' : 'employees'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              title="Export as CSV"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handlePrint}
              title="Print Summary"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Aggregate Banner & Search Bar */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-xs text-emerald-700 font-medium">Total Paid:</span>
              <span className="text-sm font-bold font-mono tabular-nums text-emerald-800">
                {formatCurrency(summaryGroup.totalPaid)}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Showing {filteredPayments.length} of {summaryGroup.payments.length} items
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={modalSearch}
              onChange={e => setModalSearch(e.target.value)}
              placeholder="Filter by employee, ID, note..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Modal Scrollable Table Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No payment records found</p>
              <p className="text-xs text-slate-400 mt-1">
                {modalSearch
                  ? 'Try adjusting your search criteria.'
                  : 'No payments recorded for this group.'}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3.5">Employee</th>
                    <th className="py-2.5 px-3.5">Deduction Account</th>
                    <th className="py-2.5 px-3.5">Channel / Reference</th>
                    <th className="py-2.5 px-3.5 text-right">Amount Paid</th>
                    <th className="py-2.5 px-3.5 text-right">Remaining Balance</th>
                    <th className="py-2.5 px-3.5">Remarks</th>
                    <th className="py-2.5 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredPayments.map((p, idx) => (
                    <tr
                      key={p.id || `${p.entryId}_${idx}`}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {/* Employee Column */}
                      <td className="py-2.5 px-3.5 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {p.avatarUrl ? (
                              <img
                                src={p.avatarUrl}
                                alt={p.employeeName}
                                className="w-7 h-7 rounded-full object-cover"
                              />
                            ) : (
                              p.employeeName.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 leading-tight">
                              {p.employeeName}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                              <span>{p.employeeNumber}</span>
                              <span>•</span>
                              <span className="font-sans">{p.department}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Deduction Account Column */}
                      <td className="py-2.5 px-3.5">
                        <div className="font-medium text-slate-800">{p.deductionTitle}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {p.deductionCode}
                        </div>
                      </td>

                      {/* Channel / Reference */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-1.5">
                          {p.isManual ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Over-the-Counter
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Cutoff Deduction
                            </span>
                          )}
                        </div>
                        {p.reference && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[130px]" title={p.reference}>
                            {p.reference}
                          </div>
                        )}
                      </td>

                      {/* Amount Paid */}
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-600 tabular-nums">
                        {formatCurrency(p.amount)}
                      </td>

                      {/* Remaining Balance After */}
                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-600 tabular-nums">
                        {formatCurrency(p.runningBalanceAfter)}
                      </td>

                      {/* Remarks */}
                      <td className="py-2.5 px-3.5 text-slate-500 max-w-[150px] truncate" title={p.remarks || 'None'}>
                        {p.remarks || <span className="text-slate-300 italic">—</span>}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        {p.isManual && !p.payslipId && !p.thirteenthMonthYear ? (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const ded = employeeDeductions.find(d => d.id === p.deductionId);
                                if (ded) {
                                  setEditingTarget({
                                    deduction: ded,
                                    entry: {
                                      id: p.entryId,
                                      amount: p.amount,
                                      date: p.date,
                                      remarks: p.remarks,
                                      description: p.remarks,
                                      reference: p.reference,
                                    },
                                    employeeName: p.employeeName,
                                  });
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white border border-amber-300 hover:border-amber-600 rounded-lg text-xs font-bold transition-all shadow-2xs group cursor-pointer"
                              title="Edit manual payment"
                            >
                              <Pencil className="w-3.5 h-3.5 text-amber-600 group-hover:text-white transition-colors" />
                              <span>Edit</span>
                            </button>

                            {/* Delete manual payment button with in-UI confirmation */}
                            {deletingEntryId === p.entryId ? (
                              <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-lg shadow-2xs">
                                <span className="text-[11px] font-bold text-rose-700">Delete?</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteDeductionLedgerEntry(p.deductionId, p.entryId);
                                    setDeletingEntryId(null);
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
                                onClick={() => setDeletingEntryId(p.entryId)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete manual payment entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs px-2">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-semibold border-t border-slate-200 text-slate-800">
                    <td colSpan={3} className="py-2.5 px-3.5 text-right text-xs">
                      Total for {filteredPayments.length} displayed items:
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-700 tabular-nums text-xs">
                      {formatCurrency(
                        filteredPayments.reduce((sum, item) => sum + item.amount, 0)
                      )}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Recorded in employee deduction ledgers
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Edit Payment Modal */}
      {editingTarget && (
        <EditPaymentModal
          isOpen={!!editingTarget}
          onClose={() => setEditingTarget(null)}
          deduction={editingTarget.deduction}
          paymentEntry={editingTarget.entry}
          employeeName={editingTarget.employeeName}
        />
      )}
    </div>
  );
};
