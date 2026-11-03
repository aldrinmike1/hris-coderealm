import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ThirteenthMonthRecord, ThirteenthMonthItem } from '../../types';
import {
  Gift,
  Calendar,
  Users,
  DollarSign,
  Plus,
  CheckCircle2,
  FileText,
  Printer,
  Download,
  Trash2,
  ChevronLeft,
  Search,
  Building2,
  ShieldAlert,
  Info,
  ArrowRight,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { EditThirteenthMonthVoucherModal } from './EditThirteenthMonthVoucherModal';
import { ThirteenthMonthVoucherModal } from './ThirteenthMonthVoucherModal';

export const ThirteenthMonthPayView: React.FC = () => {
  const {
    thirteenthMonthRecords,
    generateThirteenthMonthPay,
    approveThirteenthMonthPay,
    deleteThirteenthMonthRecord,
    isAdmin,
    isManager,
    companyProfile,
    employees,
  } = useApp();

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateYearInput, setGenerateYearInput] = useState<number>(new Date().getFullYear());
  const [generatePayoutDateInput, setGeneratePayoutDateInput] = useState<string>(`${new Date().getFullYear()}-12-15`);
  const [activePayslipItem, setActivePayslipItem] = useState<{ record: ThirteenthMonthRecord; item: ThirteenthMonthItem } | null>(null);
  const [editingVoucherItem, setEditingVoucherItem] = useState<{ record: ThirteenthMonthRecord; item: ThirteenthMonthItem } | null>(null);

  const selectedRecord = thirteenthMonthRecords.find(r => r.year === selectedYear) || null;

  // Resolve current live item for editing/preview modal in case record was updated
  const currentEditingItem: ThirteenthMonthItem | null = editingVoucherItem && selectedRecord
    ? (selectedRecord.items.find(i => i.employeeId === editingVoucherItem.item.employeeId) || editingVoucherItem.item)
    : (editingVoucherItem?.item || null);

  const currentPreviewItem: ThirteenthMonthItem | null = activePayslipItem && selectedRecord
    ? (selectedRecord.items.find(i => i.employeeId === activePayslipItem.item.employeeId) || activePayslipItem.item)
    : (activePayslipItem?.item || null);

  // Filtered employees for detail view
  const filteredItems = selectedRecord ? selectedRecord.items.filter(item => {
    return (
      !searchTerm ||
      item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.position.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }) : [];

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!generateYearInput) return;
    const newRecord = generateThirteenthMonthPay(generateYearInput, generatePayoutDateInput);
    setIsGenerateModalOpen(false);
    setSelectedYear(newRecord.year);
  };

  const handlePrintSummary = (record: ThirteenthMonthRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>13th Month Pay Summary - ${record.year}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #0f172a; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; }
            .company { font-size: 20px; font-weight: 800; color: #0369a1; }
            .title { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; }
            .meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: 6px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 7px 9px; text-align: left; }
            th { background: #f1f5f9; font-weight: 700; text-transform: uppercase; font-size: 10px; }
            .number { text-align: right; font-family: monospace; }
            .deduction { color: #dc2626; }
            .net-amount { color: #166534; font-weight: bold; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; }
            .sig-line { border-top: 1px solid #94a3b8; width: 180px; text-align: center; padding-top: 5px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">${companyProfile.name}</div>
            <div class="title">13th Month Pay Summary Register - Year ${record.year}</div>
          </div>
          <div class="meta">
            <div><strong>Status:</strong> ${record.status.toUpperCase()}</div>
            <div><strong>Payout Date:</strong> ${record.payoutDate}</div>
            <div><strong>Total Employees:</strong> ${record.totalEmployees}</div>
            <div><strong>Gross Bonus:</strong> ₱${record.totalThirteenthMonthPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            ${record.totalDeductions ? `<div><strong>Deductions:</strong> <span style="color:#dc2626;">-₱${record.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>` : ''}
            <div><strong>Net Payout:</strong> <span style="color:#166534; font-weight:bold;">₱${(record.totalNetPay ?? record.totalThirteenthMonthPay).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Emp #</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Position</th>
                <th class="number">Daily Rate</th>
                <th class="number">Annual Basic</th>
                <th class="number">Gross 13th</th>
                <th class="number">Deductions</th>
                <th class="number">Net Payout</th>
              </tr>
            </thead>
            <tbody>
              ${record.items.map(item => `
                <tr>
                  <td>${item.employeeNumber}</td>
                  <td><strong>${item.employeeName}</strong></td>
                  <td>${item.department}</td>
                  <td>${item.position}</td>
                  <td class="number">₱${item.dailyRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td class="number">₱${item.totalBasicSalaryEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td class="number">₱${item.thirteenthMonthPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td class="number deduction">${(item.totalDeductions && item.totalDeductions > 0) ? `-₱${item.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
                  <td class="number net-amount">₱${(item.netPay ?? item.thirteenthMonthPay).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <div>
              <p>Prepared By:</p>
              <div class="sig-line">HR & Payroll Manager</div>
            </div>
            <div>
              <p>Approved By:</p>
              <div class="sig-line">Finance Director / Admin</div>
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

  const handlePrintSinglePayslip = (item: ThirteenthMonthItem, record: ThirteenthMonthRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const hasDeductions = !!(item.deductions && item.deductions.length > 0);
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
                    ${d.type === 'DEDUCTION_MODULE' ? 'Deduction Ledger' : 'Other / Custom'}
                  </td>
                  <td style="padding:5px 6px; text-align:right; font-family:monospace; color:#dc2626; font-weight:bold;">
                    -₱${d.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              `).join('')}
              <tr style="font-weight:bold; border-top:1px solid #fcd34d;">
                <td colspan="2" style="padding:6px 6px; text-align:right; color:#78350f;">Total Deductions:</td>
                <td style="padding:6px 6px; text-align:right; font-family:monospace; color:#dc2626;">
                  -₱${(item.totalDeductions || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
          <title>13th Month Pay Voucher - ${item.employeeName} (${record.year})</title>
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
                <div style="font-size:11px; font-weight:bold; color:#0284c7;">YEAR ${record.year}</div>
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
                <div>Gross Bonus: <strong>₱${item.thirteenthMonthPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></div>
              </div>
            </div>

            ${deductionsListHtml}

            <div class="box" style="background:#f0fdf4; border-color:#86efac; text-align:center; padding:16px;">
              <div class="box-title" style="color:#15803d; font-size:11px;">Net 13th Month Payable Amount</div>
              <div class="amount">₱${(item.netPay ?? item.thirteenthMonthPay).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
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

  // Metrics for overview
  const totalYears = thirteenthMonthRecords.length;
  const grandTotalDisbursed = thirteenthMonthRecords.reduce((sum, r) => sum + r.totalThirteenthMonthPay, 0);

  return (
    <div className="space-y-6 pb-12" id="13th-month-pay-container">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <Gift className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              13th Month Pay Overview & Register
            </h1>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-200">
              PD 851 Compliant
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Annual mandatory statutory bonus equal to 1/12th of total basic salary earned during the calendar year (Tax-exempt up to ₱90,000).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(isAdmin || isManager) && (
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              id="generate-13th-month-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Generate 13th Month Pay</span>
            </button>
          )}
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Generated Years</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {totalYears} <span className="text-xs font-normal text-slate-500">Year(s)</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {thirteenthMonthRecords.map(r => r.year).join(', ') || 'None generated'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total Disbursed / Computed</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            ₱{grandTotalDisbursed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500">
            Across all generated calendar years
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Active Roster</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {employees.filter(e => e.status === 'active').length} <span className="text-xs font-normal text-slate-500">Employees</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Eligible for 13th month computation
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Tax Exemption Cap</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono">
            ₱90,000.00
          </div>
          <div className="text-[11px] text-slate-500">
            BIR TRAIN Law annual exclusion threshold
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!selectedRecord ? (
        /* MAIN OVERVIEW: LIST OF YEARS THAT HAVE BEEN GENERATED */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>List of Generated Years for 13th Month Pay</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any year to view employee breakdown, individual vouchers, and approval status.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Year</th>
                  <th className="py-3 px-4">Coverage Period</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Employees</th>
                  <th className="py-3 px-4 text-right">Total Annual Basic</th>
                  <th className="py-3 px-4 text-right">Gross Bonus</th>
                  <th className="py-3 px-4 text-right">Deductions</th>
                  <th className="py-3 px-4 text-right">Net Payout</th>
                  <th className="py-3 px-4">Payout Date</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {thirteenthMonthRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <Gift className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">No 13th Month Pay generated yet</p>
                      <p className="text-xs text-slate-400 mt-1">Click "Generate 13th Month Pay" above to calculate for a year.</p>
                    </td>
                  </tr>
                ) : (
                  thirteenthMonthRecords.map((record, rIdx) => {
                    const isApproved = record.status === 'Approved' || record.status === 'Paid';
                    return (
                      <tr
                        key={`13th-year-${record.year}-${rIdx}`}
                        className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                        onClick={() => setSelectedYear(record.year)}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm font-mono">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                            <span>{record.year}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          Jan 1 – Dec 31, {record.year}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            {record.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                          {record.totalEmployees}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                          ₱{record.totalBasicEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700">
                          ₱{record.totalThirteenthMonthPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-rose-600 font-semibold">
                          {record.totalDeductions && record.totalDeductions > 0
                            ? `-₱${record.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                            : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 text-sm">
                          ₱{(record.totalNetPay ?? record.totalThirteenthMonthPay).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                          {record.payoutDate}
                        </td>
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedYear(record.year)}
                              className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              title="View detailed employee breakdown"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Breakdown</span>
                            </button>

                            <button
                              onClick={() => handlePrintSummary(record)}
                              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Print Summary Register"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {(isAdmin || isManager) && !isApproved && (
                              <button
                                onClick={() => approveThirteenthMonthPay(record.year)}
                                className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                title="Approve 13th month payout"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Approve</span>
                              </button>
                            )}

                            {isAdmin && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete 13th Month Pay record for year ${record.year}?`)) {
                                    deleteThirteenthMonthRecord(record.year);
                                  }
                                }}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete 13th month record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
        </div>
      ) : (
        /* YEAR DETAIL BREAKDOWN VIEW */
        <div className="space-y-4">
          {/* Back button & Year Title Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedYear(null)}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                id="back-to-years-btn"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to All Years</span>
              </button>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>13th Month Pay Breakdown for Year {selectedRecord.year}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedRecord.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedRecord.status}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Target Payout Date: <span className="font-mono font-semibold text-slate-700">{selectedRecord.payoutDate}</span> • Gross: <span className="font-mono font-semibold text-slate-800">₱{selectedRecord.totalThirteenthMonthPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  {selectedRecord.totalDeductions ? (
                    <> • Deductions: <span className="font-mono font-semibold text-rose-600">-₱{selectedRecord.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></>
                  ) : null}
                  {' '}• Net Payout: <span className="font-mono font-bold text-emerald-600">₱{(selectedRecord.totalNetPay ?? selectedRecord.totalThirteenthMonthPay).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePrintSummary(selectedRecord)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print Summary</span>
              </button>

              {(isAdmin || isManager) && selectedRecord.status === 'Draft' && (
                <button
                  onClick={() => approveThirteenthMonthPay(selectedRecord.year)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve 13th Month Pay</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search employee or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Showing {filteredItems.length} of {selectedRecord.items.length} employees
            </div>
          </div>

          {/* Employee Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4 text-center">Months Active</th>
                    <th className="py-3 px-4 text-right">Annual Basic Salary</th>
                    <th className="py-3 px-4 text-right">Gross Bonus</th>
                    <th className="py-3 px-4 text-right">Deductions</th>
                    <th className="py-3 px-4 text-right">Net 13th Month</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item, idx) => {
                    const baseBonus = item.thirteenthMonthPay;
                    const incentive = item.incentives || 0;
                    const otherEarn = item.otherEarnings || 0;
                    const grossAmount = item.totalGrossPay ?? (baseBonus + incentive + otherEarn);
                    const deductionAmount = item.totalDeductions || 0;
                    const netPayout = item.netPay ?? (grossAmount - deductionAmount);

                    return (
                      <tr key={`emp-13th-${item.employeeId}-${idx}`} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div>{item.employeeName}</div>
                          <div className="text-[10px] font-mono text-slate-400">{item.employeeNumber}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700 font-mono">
                          {item.monthsWorkedCount} mos
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          ₱{item.totalBasicSalaryEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                          <div>₱{grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                          {(incentive > 0 || otherEarn > 0) && (
                            <div className="text-[10px] text-indigo-600 font-normal">
                              Base: ₱{baseBonus.toLocaleString()} (+₱{(incentive + otherEarn).toLocaleString()})
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {deductionAmount > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="font-semibold text-rose-600">
                                -₱{deductionAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {item.deductions?.length || 1} item{item.deductions && item.deductions.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 text-sm">
                          ₱{netPayout.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setEditingVoucherItem({ record: selectedRecord, item })}
                              className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Edit voucher deductions from deduction ledger or custom"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Voucher</span>
                            </button>
                            <button
                              onClick={() => setActivePayslipItem({ record: selectedRecord, item })}
                              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="View and print 13th month pay voucher"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500" />
                              <span>Voucher</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE 13th MONTH PAY MODAL */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <Gift className="w-4 h-4 text-indigo-600" />
                <span>Generate 13th Month Pay</span>
              </div>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Calendar Year
                </label>
                <input
                  type="number"
                  value={generateYearInput}
                  onChange={(e) => {
                    const y = parseInt(e.target.value) || new Date().getFullYear();
                    setGenerateYearInput(y);
                    setGeneratePayoutDateInput(`${y}-12-15`);
                  }}
                  min={2020}
                  max={2035}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Calculates for all active employees across 12 months.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Payout Date
                </label>
                <input
                  type="date"
                  value={generatePayoutDateInput}
                  onChange={(e) => setGeneratePayoutDateInput(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Philippine Labor Law requires disbursement on or before Dec 24.
                </p>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs text-indigo-900 space-y-1">
                <div className="font-bold flex items-center gap-1 text-indigo-800">
                  <Info className="w-3.5 h-3.5" />
                  <span>Statutory Calculation Formula</span>
                </div>
                <p className="text-[11px] leading-relaxed text-indigo-700">
                  13th Month Pay = Total Basic Salary Earned in Year ÷ 12. Excludes overtime, holiday premiums, and night diffs under PD 851.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Payroll</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SINGLE VOUCHER MODAL */}
      <ThirteenthMonthVoucherModal
        isOpen={!!activePayslipItem}
        onClose={() => setActivePayslipItem(null)}
        item={currentPreviewItem}
        record={activePayslipItem?.record}
        onEditVoucher={() => {
          if (!activePayslipItem) return;
          const rec = activePayslipItem.record;
          const itm = currentPreviewItem || activePayslipItem.item;
          setActivePayslipItem(null);
          setEditingVoucherItem({ record: rec, item: itm });
        }}
      />

      {/* EDIT 13TH MONTH VOUCHER DEDUCTIONS MODAL */}
      <EditThirteenthMonthVoucherModal
        isOpen={!!editingVoucherItem}
        onClose={() => setEditingVoucherItem(null)}
        item={currentEditingItem}
        year={editingVoucherItem?.record.year || selectedRecord?.year || new Date().getFullYear()}
      />
    </div>
  );
};
