import React, { useState, useEffect } from 'react';
import { Payslip } from '../../types';
import { formatCurrency, formatDate, formatSSS, formatPhilHealth, formatPagIbig } from '../../utils/formatters';
import { printPayslip, openPayslipInNewWindow, downloadPayslipHtml } from '../../utils/printHelper';
import { useApp } from '../../context/AppContext';
import { CompactPayslipView } from './CompactPayslipView';
import {
  X,
  Printer,
  Download,
  ExternalLink,
  Building2,
  DollarSign,
  Calendar,
  User,
  ShieldCheck,
  Edit2,
  CheckCircle,
  Trash2,
  FileText,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface PayslipModalProps {
  isOpen: boolean;
  payslip: Payslip | null;
  onClose: () => void;
  onEditPayslip?: (payslip: Payslip) => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  isOpen,
  payslip,
  onClose,
  onEditPayslip,
}) => {
  const { isAdmin, isManager, payPeriods, companyProfile, deletePayslip } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [viewMode, setViewMode] = useState<'expanded' | 'compact'>('expanded');

  // Ensure every time a payslip is opened, it defaults to the expanded official view
  useEffect(() => {
    if (isOpen) {
      setViewMode('expanded');
    }
  }, [isOpen, payslip?.id]);

  if (!isOpen || !payslip) return null;

  const currentPeriod = payPeriods.find(p => p.id === payslip.payPeriodId);

  const handleDelete = () => {
    deletePayslip(payslip.id);
    setConfirmDelete(false);
    onClose();
  };

  const handlePrint = () => {
    printPayslip(payslip, companyProfile, currentPeriod?.name);
  };

  const handleOpenNewWindow = () => {
    openPayslipInNewWindow(payslip, companyProfile, currentPeriod?.name);
  };

  const handleDownload = () => {
    downloadPayslipHtml(payslip, companyProfile, currentPeriod?.name);
  };

  return (
    <>
      <AnimatePresence>
        <div key="payslip-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-6"
          id="payslip-detail-modal"
        >
          {/* Header Action Bar */}
          <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Official Confidential Payslip
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  payslip.status === 'Approved' || payslip.status === 'Paid'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {payslip.status}
              </span>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              {/* View Mode Toggle: Expanded (Default) vs Compact */}
              <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setViewMode('expanded')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === 'expanded'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  id="view-expanded-payslip-btn"
                  title="Expanded multi-column breakdown"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Expanded</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('compact')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === 'compact'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  id="view-compact-payslip-btn"
                  title="Compact format matching official printed slip"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Compact</span>
                </button>
              </div>

              {(isAdmin || isManager) && onEditPayslip && (
                <button
                  onClick={() => onEditPayslip(payslip)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                  id="edit-payslip-btn"
                  title="Adjust items"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Adjust</span>
                </button>
              )}

              {(isAdmin || isManager) && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-2.5 py-1.5 bg-rose-950/70 hover:bg-rose-900 text-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-rose-800/80 transition-colors cursor-pointer"
                  id="delete-payslip-modal-btn"
                  title="Delete this payslip"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete</span>
                </button>
              )}

              {/* Download / Export HTML Document */}
              <button
                onClick={handleDownload}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                id="download-payslip-btn"
                title="Save offline document"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Save</span>
              </button>

              {/* Direct Print Button */}
              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                id="print-payslip-btn"
                title="Print or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Payslip</span>
              </button>

              {/* Open in New Window */}
              <button
                onClick={handleOpenNewWindow}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs flex items-center justify-center border border-slate-700 transition-colors"
                id="open-tab-payslip-btn"
                title="Open in new window for direct full-page printing"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 ml-1"
                id="close-payslip-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Payslip Card Body */}
          {viewMode === 'compact' ? (
            <div className="p-6 bg-slate-100 max-h-[75vh] overflow-y-auto flex flex-col items-center justify-center" id="printable-payslip-sheet">
              <div className="p-4 bg-white rounded-xl shadow-md border border-slate-300 w-full max-w-[380px]">
                <CompactPayslipView
                  payslip={payslip}
                  companyProfile={companyProfile}
                  periodName={currentPeriod?.name}
                />
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-3 text-center">
                Official compact payslip format • Matches standard 6-per-page print tiling
              </p>
            </div>
          ) : (
            <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto" id="printable-payslip-sheet">
              {/* Company Header */}
              <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  {companyProfile.logoUrl ? (
                    <div className="h-10 w-14 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                      <img
                        src={companyProfile.logoUrl}
                        alt={companyProfile.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight uppercase">
                      {companyProfile.name || 'ENTERPRISE HOLDINGS CORP. (PH)'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {companyProfile.address || '32nd Floor, Corporate Tower, Bonifacio Global City, Taguig City, Philippines'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  PAY PERIOD
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {currentPeriod?.name || payslip.payPeriodId}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Generated on {formatDate(payslip.generatedAt)}
                </span>
              </div>
            </div>

            {/* Employee Information Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">EMPLOYEE NAME</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{payslip.employeeName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">EMPLOYEE NO.</span>
                <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">{payslip.employeeNumber}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">POSITION / DEPT</span>
                <span className="font-medium text-slate-800 block mt-0.5">{payslip.position}</span>
                <span className="text-[10px] text-slate-500">{payslip.department}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DAILY RATE</span>
                <span className="font-bold text-indigo-700 text-sm mt-0.5 block">{formatCurrency(payslip.dailyRate)}</span>
                <span className="text-[10px] text-slate-500">{formatCurrency(payslip.hourlyRate)}/hr</span>
              </div>
            </div>

            {/* Attendance Metrics Summary */}
            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-wrap items-center justify-between text-xs text-indigo-900 gap-2">
              <span className="font-semibold">Cutoff Attendance Summary:</span>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span>Days Worked: <strong>{payslip.daysWorked}d</strong></span>
                <span>Late: <strong>{payslip.lateMinutes}m</strong></span>
                <span>Undertime: <strong>{payslip.undertimeMinutes}m</strong></span>
                <span>OT: <strong>{payslip.overtimeHours}h</strong></span>
                {(payslip.wdoHours || 0) > 0 && <span>WDO: <strong>{payslip.wdoHours}h</strong></span>}
                {(payslip.nightDiffHours || 0) > 0 && <span>Night Diff: <strong>{payslip.nightDiffHours}h</strong></span>}
              </div>
            </div>

            {/* Earnings & Deductions Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* EARNINGS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-500">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-800">Earnings Breakdown</h4>
                  <span className="text-[10px] text-slate-400">AMOUNT (PHP)</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-700">Basic Pay ({payslip.daysWorked} days × {formatCurrency(payslip.dailyRate)})</span>
                    <span className="font-bold text-slate-900">{formatCurrency(payslip.basicPay)}</span>
                  </div>

                  {payslip.overtimePay > 0 && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-700">Overtime Pay ({payslip.overtimeHours}h @ 125%)</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(payslip.overtimePay)}</span>
                    </div>
                  )}

                  {(payslip.nightDiffPay || 0) > 0 && (
                    <div className="flex items-center justify-between py-1 bg-indigo-50/60 px-1.5 rounded text-indigo-950">
                      <span className="font-medium">Night Shift Differential (NSD) {payslip.nightDiffHours ? `(${payslip.nightDiffHours}h @ 10%)` : '(10%)'}</span>
                      <span className="font-bold text-indigo-800">+{formatCurrency(payslip.nightDiffPay || 0)}</span>
                    </div>
                  )}

                  {(payslip.wdoPay || 0) > 0 && (
                    <div className="flex items-center justify-between py-1 bg-emerald-50/60 px-1 rounded text-emerald-950">
                      <span className="font-medium">Work Day Off (WDO) Pay {(payslip.wdoHours || 0) > 0 ? `(${payslip.wdoHours}h @ 130%)` : ''}</span>
                      <span className="font-bold text-emerald-800">+{formatCurrency(payslip.wdoPay || 0)}</span>
                    </div>
                  )}

                  {payslip.holidayPay > 0 && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-700">Holiday Pay ({payslip.holidayDays} day)</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(payslip.holidayPay)}</span>
                    </div>
                  )}

                  {payslip.allowances.map((allowance, idx) => (
                    <div key={`allowance-${allowance.name}-${idx}`} className="flex items-center justify-between py-1 text-slate-600">
                      <span>{allowance.name}</span>
                      <span className="font-medium text-slate-800">{formatCurrency(allowance.amount)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
                  <span className="uppercase">Total Gross Earnings</span>
                  <span className="text-sm text-emerald-700">{formatCurrency(payslip.grossPay)}</span>
                </div>
              </div>

              {/* DEDUCTIONS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b-2 border-rose-500">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-rose-800">Deductions Breakdown</h4>
                  <span className="text-[10px] text-slate-400">AMOUNT (PHP)</span>
                </div>

                <div className="space-y-2 text-xs">
                  {payslip.lateUndertimeDeduction > 0 && (
                    <div className="flex items-center justify-between py-1 text-rose-700">
                      <span>Late / Undertime Deduction</span>
                      <span className="font-semibold">-{formatCurrency(payslip.lateUndertimeDeduction)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-1 text-slate-700">
                    <div>
                      <span>SSS Contribution (EE)</span>
                      <span className="text-[10px] text-slate-400 block">
                        {payslip.sssEmployerShare > 0 ? `ER Share: ${formatCurrency(payslip.sssEmployerShare)}` : 'Exempt / Not enrolled'}
                      </span>
                    </div>
                    <span className="font-semibold text-slate-900">
                      {payslip.sssDeduction > 0 ? `-${formatCurrency(payslip.sssDeduction)}` : '₱0.00'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 text-slate-700">
                    <div>
                      <span>PhilHealth Premium (EE)</span>
                      <span className="text-[10px] text-slate-400 block">
                        {payslip.philhealthEmployerShare > 0 ? `ER Share: ${formatCurrency(payslip.philhealthEmployerShare)}` : 'Exempt / Not enrolled'}
                      </span>
                    </div>
                    <span className="font-semibold text-slate-900">
                      {payslip.philhealthDeduction > 0 ? `-${formatCurrency(payslip.philhealthDeduction)}` : '₱0.00'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 text-slate-700">
                    <div>
                      <span>Pag-IBIG / HDMF (EE)</span>
                      <span className="text-[10px] text-slate-400 block">
                        {payslip.pagibigEmployerShare > 0 ? `ER Share: ${formatCurrency(payslip.pagibigEmployerShare)}` : 'Exempt / Not enrolled'}
                      </span>
                    </div>
                    <span className="font-semibold text-slate-900">
                      {payslip.pagibigDeduction > 0 ? `-${formatCurrency(payslip.pagibigDeduction)}` : '₱0.00'}
                    </span>
                  </div>

                  {Boolean(companyProfile.enableWithholdingTax) && (
                    <div className="flex items-center justify-between py-1 text-slate-700">
                      <span>BIR Withholding Tax</span>
                      <span className="font-semibold text-slate-900">
                        {payslip.withholdingTax > 0 ? `-${formatCurrency(payslip.withholdingTax)}` : '₱0.00 (Exempt)'}
                      </span>
                    </div>
                  )}

                  {payslip.mlsDeduction > 0 && (
                    <div className="flex items-center justify-between py-1 text-slate-700">
                      <span>MLS Deduction</span>
                      <span className="font-semibold text-rose-700">-{formatCurrency(payslip.mlsDeduction)}</span>
                    </div>
                  )}

                  {(payslip.cashAdvanceDeduction || 0) > 0 && (
                    <div className="flex items-center justify-between py-1 text-amber-900 bg-amber-50/80 px-1.5 rounded">
                      <span className="font-medium">Cash Advance (Vale)</span>
                      <span className="font-bold text-amber-700">-{formatCurrency(payslip.cashAdvanceDeduction || 0)}</span>
                    </div>
                  )}

                  {payslip.otherDeductions && payslip.otherDeductions.length > 0 ? (
                    payslip.otherDeductions.map((ded, idx) => (
                      <div key={`deduction-${ded.name}-${idx}`} className="flex items-center justify-between py-1 text-slate-600">
                        <span>{ded.name}</span>
                        <span className="font-medium text-rose-700">-{formatCurrency(ded.amount)}</span>
                      </div>
                    ))
                  ) : (payslip.totalOtherDeductions || 0) > 0 ? (
                    <div className="flex items-center justify-between py-1 text-slate-600">
                      <span>Other Deductions</span>
                      <span className="font-medium text-rose-700">-{formatCurrency(payslip.totalOtherDeductions || 0)}</span>
                    </div>
                  ) : null}
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
                  <span className="uppercase">Total Deductions</span>
                  <span className="text-sm text-rose-700">-{formatCurrency(payslip.totalDeductions)}</span>
                </div>
              </div>
            </div>

            {/* NET TAKE HOME PAY BOX */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-5 rounded-2xl shadow-md flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-indigo-200 tracking-wider block">
                  Net Take-Home Pay (Disbursement)
                </span>
                <span className="text-[11px] text-indigo-300">
                  Credited to registered payroll bank account
                </span>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                  {formatCurrency(payslip.netPay)}
                </span>
              </div>
            </div>

            {/* Signatures and Confidentiality Note */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
              <div>
                <div className="h-10 border-b border-slate-300 mx-auto max-w-[200px]" />
                <span className="font-semibold text-slate-800 block mt-1.5">Prepared & Approved By</span>
                <span className="text-[10px] text-slate-400">Payroll / HR Officer</span>
              </div>
              <div>
                <div className="h-10 border-b border-slate-300 mx-auto max-w-[200px]" />
                <span className="font-semibold text-slate-800 block mt-1.5">Received By (Employee)</span>
                <span className="text-[10px] text-slate-400">Signature Over Printed Name</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 font-mono">
              CONFIDENTIAL: This document is intended solely for the recipient employee. Republic Act 10173 (Data Privacy Act of 2012).
            </div>
          </div>
        )}
        </motion.div>
      </div>
      </AnimatePresence>

      <ConfirmDialog
        key="confirm-dialog-delete-payslip-modal"
        isOpen={confirmDelete}
        title="Delete Payslip"
        message={`Are you sure you want to delete the payslip for ${payslip.employeeName} (${payslip.employeeNumber})? The cutoff period totals will be updated automatically.`}
        confirmText="Delete Payslip"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
};
