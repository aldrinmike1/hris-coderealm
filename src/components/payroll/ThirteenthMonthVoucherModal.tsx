import React from 'react';
import { useApp } from '../../context/AppContext';
import { ThirteenthMonthItem, ThirteenthMonthRecord } from '../../types';
import {
  X,
  Gift,
  Printer,
  Edit3,
  TrendingUp,
  Receipt,
  Sparkles,
  Calendar,
  Building2,
  CheckCircle2,
} from 'lucide-react';

interface ThirteenthMonthVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ThirteenthMonthItem | null;
  record?: ThirteenthMonthRecord | null;
  year?: number;
  onEditVoucher?: () => void;
}

export const ThirteenthMonthVoucherModal: React.FC<ThirteenthMonthVoucherModalProps> = ({
  isOpen,
  onClose,
  item,
  record,
  year: propYear,
  onEditVoucher,
}) => {
  const { companyProfile } = useApp();

  if (!isOpen || !item) return null;

  const voucherYear = record?.year || propYear || new Date().getFullYear();
  const baseBonus = item.thirteenthMonthPay;
  const incentives = item.incentives || 0;
  const otherEarnings = item.otherEarnings || 0;
  const totalGross = item.totalGrossPay ?? (baseBonus + incentives + otherEarnings);
  const totalDeds = item.totalDeductions || 0;
  const netPayable = item.netPay ?? (totalGross - totalDeds);
  const hasDeductions = !!(item.deductions && item.deductions.length > 0);
  const hasAdditions = incentives > 0 || otherEarnings > 0;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const deductionsListHtml = hasDeductions
      ? `
        <div style="margin-top:14px; margin-bottom:14px; border:1px solid #fed7aa; background:#fffbeb; border-radius:6px; padding:10px 12px;">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#b45309; margin-bottom:6px;">
            Itemized Deductions Applied:
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:11px;">
            <thead>
              <tr style="border-bottom:1px solid #fde68a;">
                <th style="padding:4px 6px; text-align:left; color:#78350f;">Description</th>
                <th style="padding:4px 6px; text-align:center; color:#78350f;">Type</th>
                <th style="padding:4px 6px; text-align:right; color:#78350f;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${item.deductions!.map(d => `
                <tr style="border-bottom:1px solid #fef3c7;">
                  <td style="padding:5px 6px; color:#1e293b;">
                    <strong>${d.name}</strong>
                    ${d.remarks ? `<span style="font-size:10px; color:#64748b; margin-left:4px;">(${d.remarks})</span>` : ''}
                  </td>
                  <td style="padding:5px 6px; text-align:center; font-size:10px; color:#475569;">
                    ${d.type === 'DEDUCTION_MODULE' ? 'Deduction Ledger' : 'Custom'}
                  </td>
                  <td style="padding:5px 6px; text-align:right; font-family:monospace; color:#dc2626; font-weight:bold;">
                    -₱${d.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              `).join('')}
              <tr style="font-weight:bold; border-top:1px solid #fcd34d;">
                <td colspan="2" style="padding:6px 6px; text-align:right; color:#78350f;">Total Deductions:</td>
                <td style="padding:6px 6px; text-align:right; font-family:monospace; color:#dc2626;">
                  -₱${totalDeds.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `
      : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>13th Month Pay Voucher - ${item.employeeName} (${voucherYear})</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
            .voucher { border: 2px solid #0284c7; padding: 25px; border-radius: 8px; max-width: 650px; margin: 0 auto; }
            .company { font-size: 18px; font-weight: 800; color: #0284c7; }
            .title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #334155; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; margin-bottom: 15px; }
            .box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; }
            .box-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
            .amount { font-size: 24px; font-weight: 900; color: #166534; font-family: monospace; }
            .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 35px; font-size: 11px; }
            .sig-line { border-top: 1px solid #94a3b8; text-align: center; padding-top: 4px; margin-top: 35px; }
          </style>
        </head>
        <body>
          <div class="voucher">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px;">
              <div>
                <div class="company">${companyProfile.name}</div>
                <div style="font-size:11px; color:#64748b;">${companyProfile.address}</div>
              </div>
              <div style="text-align:right;">
                <div class="title">13th Month Pay Voucher</div>
                <div style="font-size:11px; font-weight:bold; color:#0284c7;">YEAR ${voucherYear}</div>
              </div>
            </div>

            <div class="grid">
              <div class="box">
                <div class="box-title">Employee Details</div>
                <div><strong>${item.employeeName}</strong></div>
                <div>${item.employeeNumber} | ${item.position}</div>
                <div>Department: ${item.department}</div>
              </div>
              <div class="box">
                <div class="box-title">Computation Basis</div>
                <div>Daily Rate: ₱${item.dailyRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                <div>Annual Basic Salary: ₱${item.totalBasicSalaryEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                <div>Base 13th Bonus: ₱${baseBonus.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                ${incentives > 0 ? `<div>Incentive: +₱${incentives.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>` : ''}
                ${otherEarnings > 0 ? `<div>Other Addition: +₱${otherEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${item.otherEarningsDescription ? `(${item.otherEarningsDescription})` : ''}</div>` : ''}
                <div style="margin-top:4px; font-weight:bold; color:#0f172a;">Total Gross 13th: ₱${totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            ${deductionsListHtml}

            <div class="box" style="background:#f0fdf4; border-color:#86efac; text-align:center; padding:16px;">
              <div class="box-title" style="color:#15803d; font-size:11px;">Net 13th Month Payable Amount</div>
              <div class="amount">₱${netPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div style="font-size:11px; color:#16a34a; margin-top:4px;">
                Statutory Exemption: Tax-Exempt (Under ₱90,000.00 TRAIN Law Threshold)
              </div>
            </div>

            <div class="sig-grid">
              <div>
                <div style="font-weight:bold;">Issued By:</div>
                <div class="sig-line">Payroll / HR Officer</div>
              </div>
              <div>
                <div style="font-weight:bold;">Received By:</div>
                <div class="sig-line">${item.employeeName}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
            <Gift className="w-4 h-4 text-indigo-600" />
            <span>13th Month Pay Voucher Preview</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
              {voucherYear}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-sm p-1 rounded transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Main Net Amount Display */}
          <div className="border border-indigo-100 bg-indigo-50/50 p-4 rounded-xl text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              Net 13th Month Payable ({voucherYear})
            </span>
            <div className="text-3xl font-black text-emerald-700 font-mono">
              ₱{netPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-600 font-medium">
              {item.employeeName} <span className="font-mono text-slate-400">({item.employeeNumber})</span>
            </div>
            <div className="text-[10px] text-slate-500 pt-1">
              Total Gross: <span className="font-mono font-semibold text-slate-800">₱{totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              {hasDeductions && (
                <> • Deductions: <span className="text-rose-600 font-semibold font-mono">-₱{totalDeds.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></>
              )}
            </div>
          </div>

          {/* Breakdown Summary */}
          <div className="space-y-2 border-t border-b border-slate-100 py-3">
            <div className="flex justify-between text-slate-600">
              <span>Position / Dept:</span>
              <span className="font-semibold text-slate-800">{item.position} ({item.department})</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Daily Rate:</span>
              <span className="font-mono font-semibold text-slate-800">₱{item.dailyRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Annual Basic Salary Earned:</span>
              <span className="font-mono font-semibold text-slate-800">₱{item.totalBasicSalaryEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-100">
              <span>Base 13th Month Bonus:</span>
              <span className="font-mono font-semibold text-slate-800">₱{baseBonus.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>

            {incentives > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  <span>Incentive:</span>
                </span>
                <span className="font-mono font-bold">+₱{incentives.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {otherEarnings > 0 && (
              <div className="flex justify-between text-indigo-700">
                <span>Other Gross Addition {item.otherEarningsDescription ? `(${item.otherEarningsDescription})` : ''}:</span>
                <span className="font-mono font-bold">+₱{otherEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {hasAdditions && (
              <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-100">
                <span>Total Gross Payment:</span>
                <span className="font-mono">₱{totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600 pt-1">
              <span>Taxability Status:</span>
              <span className="font-semibold text-emerald-600">Tax-Exempt (TRAIN Law &lt;₱90k)</span>
            </div>
          </div>

          {/* Itemized Deductions Section */}
          {hasDeductions ? (
            <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                  Applied Deductions ({item.deductions!.length})
                </span>
                <span className="font-mono font-bold text-rose-600 text-xs">
                  -₱{totalDeds.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="divide-y divide-amber-100 text-[11px] max-h-36 overflow-y-auto pr-1">
                {item.deductions!.map((d, dIdx) => (
                  <div key={`d-prev-${d.id}-${dIdx}`} className="py-1.5 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span>{d.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          d.type === 'DEDUCTION_MODULE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {d.type === 'DEDUCTION_MODULE' ? 'Deduction Ledger' : 'Custom'}
                        </span>
                      </div>
                      {d.remarks && (
                        <div className="text-[10px] text-slate-500 italic">{d.remarks}</div>
                      )}
                    </div>
                    <span className="font-mono font-semibold text-rose-600">
                      -₱{d.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center text-slate-500 text-[11px]">
              No deductions applied to this 13th month voucher.
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex justify-between items-center gap-2 pt-2">
            {onEditVoucher ? (
              <button
                type="button"
                onClick={onEditVoucher}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Edit voucher gross additions and deductions"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Voucher</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Voucher</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
