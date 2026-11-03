import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ThirteenthMonthItem, ThirteenthMonthDeduction, EmployeeDeduction } from '../../types';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Receipt,
  Calculator,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface EditThirteenthMonthVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ThirteenthMonthItem | null;
  year: number;
}

export const EditThirteenthMonthVoucherModal: React.FC<EditThirteenthMonthVoucherModalProps> = ({
  isOpen,
  onClose,
  item,
  year,
}) => {
  const { employeeDeductions, updateThirteenthMonthItem, showToast } = useApp();

  // Gross Earnings Override & Addition States
  const [annualBasicInput, setAnnualBasicInput] = useState<string>('');
  const [grossBonusInput, setGrossBonusInput] = useState<string>('');
  const [incentiveInput, setIncentiveInput] = useState<string>('');
  const [otherEarningsInput, setOtherEarningsInput] = useState<string>('');
  const [otherEarningsDescInput, setOtherEarningsDescInput] = useState<string>('');

  // Deductions repeater list
  const [deductions, setDeductions] = useState<ThirteenthMonthDeduction[]>([]);

  // Active deductions for this specific employee from the deductions module
  const activeEmployeeDeductions: EmployeeDeduction[] = React.useMemo(() => {
    if (!item) return [];
    return employeeDeductions.filter(
      d => d.employeeId === item.employeeId && d.status === 'Active' && d.runningBalance > 0
    );
  }, [item, employeeDeductions]);

  // Initialize modal state when opened or item changes
  useEffect(() => {
    if (isOpen && item) {
      setAnnualBasicInput(item.totalBasicSalaryEarned ? item.totalBasicSalaryEarned.toString() : '0');
      setGrossBonusInput(item.thirteenthMonthPay ? item.thirteenthMonthPay.toString() : '0');
      setIncentiveInput(item.incentives !== undefined && item.incentives > 0 ? item.incentives.toString() : '');
      setOtherEarningsInput(item.otherEarnings !== undefined && item.otherEarnings > 0 ? item.otherEarnings.toString() : '');
      setOtherEarningsDescInput(item.otherEarningsDescription || '');

      const initialDeds: ThirteenthMonthDeduction[] = item.deductions
        ? item.deductions.map(d => ({ ...d }))
        : [];
      setDeductions(initialDeds);
    }
  }, [isOpen, item]);

  // Recalculate Gross 13th Month Bonus from Annual Basic Salary (Annual / 12)
  const handleRecalculateBaseBonus = () => {
    const annual = parseFloat(annualBasicInput) || 0;
    const computedBonus = Math.round((annual / 12) * 100) / 100;
    setGrossBonusInput(computedBonus.toString());
    showToast(`Recalculated 13th month bonus: ₱${computedBonus.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'info');
  };

  // Add a new deduction cluster row
  // Add a new deduction cluster row
  const handleAddDeductionRow = () => {
    const existingDeductionIds = new Set(
      deductions
        .filter(d => d.type === 'DEDUCTION_MODULE' && d.deductionId)
        .map(d => d.deductionId)
    );

    const firstAvailable = activeEmployeeDeductions.find(
      d => !existingDeductionIds.has(d.id) && !existingDeductionIds.has(d.deductionId)
    );

    if (firstAvailable) {
      const newRow: ThirteenthMonthDeduction = {
        id: `ded-row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        deductionId: firstAvailable.id,
        name: firstAvailable.description,
        type: 'DEDUCTION_MODULE',
        amount: firstAvailable.runningBalance, // fill with running balance
        remarks: `Deduction for ${firstAvailable.description}`,
      };
      setDeductions(prev => [...prev, newRow]);
    } else {
      // Default to 'OTHER' if no active deduction accounts are available (empty description and amount)
      const newRow: ThirteenthMonthDeduction = {
        id: `ded-row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: '',
        type: 'OTHER',
        amount: 0,
        remarks: '',
      };
      setDeductions(prev => [...prev, newRow]);
    }
  };

  // Handle changing the Deduction Account dropdown on a row
  const handleRowAccountChange = (rowId: string, value: string) => {
    setDeductions(prev =>
      prev.map(d => {
        if (d.id !== rowId) return d;

        if (value === 'OTHER') {
          // If the deduction account is others, don't fill up anything in the description and amount
          return {
            ...d,
            type: 'OTHER',
            deductionId: undefined,
            name: '',
            amount: 0,
            remarks: '',
          };
        }

        const selectedDed = activeEmployeeDeductions.find(
          ed => ed.id === value || ed.deductionId === value
        );

        if (selectedDed) {
          // When selecting deduction account, fill the amount field with the balance
          return {
            ...d,
            type: 'DEDUCTION_MODULE',
            deductionId: selectedDed.id,
            name: selectedDed.description,
            amount: selectedDed.runningBalance,
            remarks: `Deduction for ${selectedDed.description}`,
          };
        }

        return d;
      })
    );
  };

  // Handle changing the optional description for 'Others'
  const handleRowDescriptionChange = (rowId: string, description: string) => {
    setDeductions(prev =>
      prev.map(d => {
        if (d.id !== rowId) return d;
        return {
          ...d,
          name: description,
          remarks: description,
        };
      })
    );
  };

  // Handle changing the amount on a row
  const handleRowAmountChange = (rowId: string, amount: number) => {
    setDeductions(prev =>
      prev.map(d => {
        if (d.id !== rowId) return d;
        return {
          ...d,
          amount: Math.max(0, amount),
        };
      })
    );
  };

  // Remove a deduction row
  const handleRemoveRow = (rowId: string) => {
    setDeductions(prev => prev.filter(d => d.id !== rowId));
  };

  if (!isOpen || !item) return null;

  // Live Financial calculations
  const parsedGrossBonus = Math.max(0, parseFloat(grossBonusInput) || 0);
  const parsedIncentive = Math.max(0, parseFloat(incentiveInput) || 0);
  const parsedOtherEarnings = Math.max(0, parseFloat(otherEarningsInput) || 0);
  const totalGrossPay = Math.round((parsedGrossBonus + parsedIncentive + parsedOtherEarnings) * 100) / 100;

  const totalDeductions = Math.round(
    deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0) * 100
  ) / 100;

  const netPay = Math.max(0, Math.round((totalGrossPay - totalDeductions) * 100) / 100);
  const isOverDeducted = totalDeductions > totalGrossPay;

  // Save handler - automatically syncs payments with employee deduction module ledger
  const handleSave = () => {
    if (isOverDeducted) {
      showToast('Total deductions cannot exceed the total gross 13th Month Pay amount.', 'error');
      return;
    }

    // Validate that employee deduction accounts do not exceed running balance
    for (const d of deductions) {
      if (d.type === 'DEDUCTION_MODULE' && d.deductionId) {
        const matched = activeEmployeeDeductions.find(
          ed => ed.id === d.deductionId || ed.deductionId === d.deductionId
        );
        if (matched && d.amount > matched.runningBalance) {
          showToast(
            `Deduction amount for "${d.name}" (₱${d.amount.toLocaleString()}) exceeds the running balance of ₱${matched.runningBalance.toLocaleString()}.`,
            'error'
          );
          return;
        }
      }
    }

    const parsedAnnual = Math.max(0, parseFloat(annualBasicInput) || 0);

    // Clean deductions: retain positive amounts and apply formatted labels
    const cleanedDeductions = deductions
      .filter(d => (Number(d.amount) || 0) > 0)
      .map(d => ({
        ...d,
        amount: Math.round(Number(d.amount) * 100) / 100,
        name:
          d.type === 'OTHER'
            ? d.remarks?.trim() || (d.name && d.name !== 'Other Deduction' && d.name !== 'Others' ? d.name.trim() : 'Other Deduction')
            : d.name,
        remarks: d.type === 'OTHER' ? d.remarks?.trim() || undefined : d.remarks,
      }));

    updateThirteenthMonthItem(
      year,
      item.employeeId,
      {
        totalBasicSalaryEarned: parsedAnnual,
        thirteenthMonthPay: parsedGrossBonus,
        incentives: parsedIncentive,
        otherEarnings: parsedOtherEarnings,
        otherEarningsDescription: otherEarningsDescInput.trim() || undefined,
        totalGrossPay,
        deductions: cleanedDeductions,
        totalDeductions,
        netPay,
      },
      true // Automatically record payments in deduction module ledger
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Edit 13th Month Pay Voucher</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                  Year {year}
                </span>
              </h2>
              <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                <span className="font-semibold text-white">{item.employeeName}</span>
                <span>•</span>
                <span className="font-mono text-slate-400">{item.employeeNumber}</span>
                <span>•</span>
                <span className="text-slate-400">{item.position}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Financial Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Base 13th Bonus
            </span>
            <span className="text-sm font-black font-mono text-slate-900 block mt-0.5">
              ₱{parsedGrossBonus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400">Basic ÷ 12 / override</span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-indigo-600 block">
              Gross Additions
            </span>
            <span className="text-sm font-black font-mono text-indigo-700 block mt-0.5">
              +₱{(parsedIncentive + parsedOtherEarnings).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400">Incentive & others</span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-rose-700 block">
              Total Deductions
            </span>
            <span className="text-sm font-black font-mono text-rose-700 block mt-0.5">
              {totalDeductions > 0 ? `-₱${totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₱0.00'}
            </span>
            <span className="text-[10px] text-slate-400">
              {deductions.length} {deductions.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block">
              Net Payable
            </span>
            <span className="text-sm font-black font-mono text-emerald-700 block mt-0.5">
              ₱{netPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold">Total Payout</span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* ======================================================== */}
          {/* SECTION 1: GROSS PAYMENT & CALCULATION OVERRIDES         */}
          {/* ======================================================== */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Gross 13th Month Earnings & Calculation Override
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                Total Gross: ₱{totalGrossPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Annual Basic Salary Earned (Editable) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Annual Basic Salary Earned (₱)
                  </label>
                  <button
                    type="button"
                    onClick={handleRecalculateBaseBonus}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 transition-colors cursor-pointer"
                    title="Compute 1/12 of this annual basic salary"
                  >
                    <span>Calc ÷ 12</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={annualBasicInput}
                    onChange={e => setAnnualBasicInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Editable annual base earnings accumulator
                </p>
              </div>

              {/* Gross 13th Month Bonus (Overrideable) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Gross 13th Month Bonus (₱) <span className="text-indigo-600 font-semibold">(Override)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-indigo-500">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={grossBonusInput}
                    onChange={e => setGrossBonusInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 bg-indigo-50/50 border border-indigo-300 rounded-xl text-xs font-mono font-black text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Directly override the employee's base 13th month bonus
                </p>
              </div>

              {/* Incentive Field */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  <span>Incentive (₱)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-emerald-600">+₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={incentiveInput}
                    onChange={e => setIncentiveInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Performance/attendance incentive added to gross payout
                </p>
              </div>

              {/* Other Gross Addition */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Other Gross Addition (₱)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">+₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={otherEarningsInput}
                    onChange={e => setOtherEarningsInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Miscellaneous bonus or allowance added to gross
                </p>
              </div>
            </div>

            {/* Other Gross Addition Description (if applicable) */}
            {(parsedOtherEarnings > 0 || otherEarningsDescInput) && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Other Addition Description / Remarks
                </label>
                <input
                  type="text"
                  value={otherEarningsDescInput}
                  onChange={e => setOtherEarningsDescInput(e.target.value)}
                  placeholder="e.g. Special Management Grant, Holiday Discretionary Bonus..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Over-deduction warning */}
          {isOverDeducted && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>
                <strong>Warning:</strong> Total deductions (₱{totalDeductions.toLocaleString()}) exceed total gross 13th month earnings (₱{totalGrossPay.toLocaleString()}).
              </span>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 2: DEDUCTIONS REPEATER ROWS                      */}
          {/* ======================================================== */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                  Deductions
                </span>
                {deductions.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono font-bold">
                    {deductions.length}
                  </span>
                )}
              </div>

              {deductions.length > 0 && (
                <span className="text-xs font-mono font-bold text-rose-600">
                  Total: -₱{totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>

            {/* Deductions Repeater Cluster Rows */}
            {deductions.length === 0 ? (
              <div className="py-4 px-3 text-center border border-dashed border-slate-200 rounded-xl bg-white space-y-2">
                <p className="text-xs text-slate-500">No deductions applied to this voucher.</p>
                <button
                  type="button"
                  onClick={handleAddDeductionRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Deduction</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {deductions.map(d => {
                  const isOthers = d.type === 'OTHER';
                  const matchedDed =
                    !isOthers && d.deductionId
                      ? activeEmployeeDeductions.find(
                          ed => ed.id === d.deductionId || ed.deductionId === d.deductionId
                        )
                      : null;

                  return (
                    <div
                      key={d.id}
                      className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5 p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-slate-300 transition-colors"
                    >
                      {/* Deduction Account Dropdown */}
                      <div className={isOthers ? 'w-full sm:w-44 shrink-0' : 'flex-1 min-w-0'}>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Deduction Account
                        </label>
                        <select
                          value={isOthers ? 'OTHER' : (d.deductionId || '')}
                          onChange={e => handleRowAccountChange(d.id, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden truncate"
                        >
                          {activeEmployeeDeductions.map(ded => {
                            const isSelectedElsewhere = deductions.some(
                              other => other.id !== d.id && other.deductionId === ded.id
                            );
                            return (
                              <option key={ded.id} value={ded.id} disabled={isSelectedElsewhere}>
                                {ded.description} (Bal: ₱{ded.runningBalance.toLocaleString()}) {isSelectedElsewhere ? '— Added' : ''}
                              </option>
                            );
                          })}
                          <option value="OTHER">Others</option>
                        </select>
                      </div>

                      {/* Optional Description Field when 'Others' is selected */}
                      {isOthers && (
                        <div className="flex-1 min-w-0">
                          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Description <span className="text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={d.remarks || (d.name && d.name !== 'Other Deduction' && d.name !== 'Others' ? d.name : '')}
                            onChange={e => handleRowDescriptionChange(d.id, e.target.value)}
                            placeholder="e.g. Uniform Balance, Cash Advance..."
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          />
                        </div>
                      )}

                      {/* Amount (₱) */}
                      <div className="w-full sm:w-32 shrink-0">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                            Amount (₱)
                          </label>
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={matchedDed ? matchedDed.runningBalance : undefined}
                            value={d.amount === 0 ? '' : d.amount}
                            onChange={e => handleRowAmountChange(d.id, parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-rose-600 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Delete Button */}
                      <div className="sm:self-end shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(d.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer h-[32px] w-[32px] flex items-center justify-center border border-transparent hover:border-rose-200"
                          title="Remove deduction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* + Add Deduction Button below rows */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleAddDeductionRow}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200/80 hover:border-indigo-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Deduction</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Net Payout: <strong className="font-mono text-emerald-700 font-bold text-sm">₱{netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isOverDeducted}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Voucher</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
