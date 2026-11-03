import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { EmployeeDeduction } from '../../types';
import { X, Calendar, CreditCard } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  deductions: EmployeeDeduction[];
  preselectedDeductionId?: string;
  employeeName?: string;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  deductions,
  preselectedDeductionId,
  employeeName,
}) => {
  const { recordDeductionPayment, showToast } = useApp();

  const [selectedDeductionId, setSelectedDeductionId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState<string>('');

  const currentDeduction = deductions.find(d => d.id === selectedDeductionId);

  useEffect(() => {
    if (isOpen) {
      const activeList = deductions.filter(d => d.runningBalance > 0);
      const chosen =
        preselectedDeductionId && activeList.some(d => d.id === preselectedDeductionId)
          ? preselectedDeductionId
          : activeList.length > 0
          ? activeList[0].id
          : '';

      setSelectedDeductionId(chosen);
      setDate(new Date().toISOString().split('T')[0]);
      setRemarks('');

      const activeDed = activeList.find(d => d.id === chosen);
      if (activeDed) {
        setAmount(Math.min(activeDed.cutoffDeductionAmount, activeDed.runningBalance).toString());
      } else {
        setAmount('');
      }
    }
  }, [isOpen, deductions, preselectedDeductionId]);

  if (!isOpen) return null;

  const numAmount = Math.max(0, parseFloat(amount) || 0);
  const remainingAfterPayment = currentDeduction
    ? Math.max(0, Math.round((currentDeduction.runningBalance - numAmount) * 100) / 100)
    : 0;

  const handleSelectDeduction = (id: string) => {
    setSelectedDeductionId(id);
    const ded = deductions.find(d => d.id === id);
    if (ded) {
      setAmount(Math.min(ded.cutoffDeductionAmount, ded.runningBalance).toString());
    }
  };

  const handleApplyPreset = (presetType: 'cutoff' | 'full') => {
    if (!currentDeduction) return;
    if (presetType === 'cutoff') {
      setAmount(Math.min(currentDeduction.cutoffDeductionAmount, currentDeduction.runningBalance).toString());
    } else {
      setAmount(currentDeduction.runningBalance.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeductionId) {
      showToast('Please select a deduction account.', 'error');
      return;
    }
    if (numAmount <= 0) {
      showToast('Payment amount must be greater than ₱0.', 'error');
      return;
    }
    if (currentDeduction && numAmount > currentDeduction.runningBalance) {
      showToast(`Payment cannot exceed outstanding balance of ₱${currentDeduction.runningBalance.toLocaleString()}.`, 'error');
      return;
    }

    recordDeductionPayment(selectedDeductionId, {
      amount: numAmount,
      date,
      reference: undefined,
      description: remarks.trim() || 'Manual Payment',
      remarks: remarks.trim() || undefined,
      type: 'PAYMENT',
      isManual: true,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Record Payment / Amortization</h2>
              <p className="text-xs text-slate-400">
                {employeeName ? `For ${employeeName}` : 'Credit repayment to deduction account'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Deduction Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Deduction Account <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedDeductionId}
              onChange={e => handleSelectDeduction(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {deductions.map(d => (
                <option key={d.id} value={d.id} disabled={d.runningBalance <= 0}>
                  {d.deductionId} • {d.description} (Bal: ₱{d.runningBalance.toLocaleString()})
                  {d.runningBalance <= 0 ? ' - FULLY PAID' : ''}
                </option>
              ))}
            </select>
          </div>

          {currentDeduction && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                  Current Running Balance
                </span>
                <span className="text-sm font-black text-emerald-950 font-mono">
                  ₱{currentDeduction.runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-emerald-700 font-medium block">
                  Standard Cutoff: ₱{currentDeduction.cutoffDeductionAmount.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">
                  Total Paid: ₱{currentDeduction.totalPaid.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Payment Amount & Date Grid (2:1 ratio) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
            {/* Payment Amount (Larger: 2 columns) */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
                  Payment Amount (₱) <span className="text-rose-500">*</span>
                </label>
                {currentDeduction && (
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('cutoff')}
                      className="text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer"
                    >
                      1 Cutoff (₱{currentDeduction.cutoffDeductionAmount.toLocaleString()})
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('full')}
                      className="text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer"
                    >
                      Pay in Full
                    </button>
                  </div>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">₱</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={currentDeduction?.runningBalance}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              {currentDeduction && numAmount > 0 && (
                <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between font-mono">
                  <span>New Running Balance:</span>
                  <span className="font-bold text-slate-800">
                    ₱{remainingAfterPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    {remainingAfterPayment === 0 && ' (Fully Settled ✓)'}
                  </span>
                </p>
              )}
            </div>

            {/* Payment Date (Shorter: 1 column) */}
            <div className="sm:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Date <span className="text-rose-500">*</span>
                </label>
              </div>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Remarks (Optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Remarks <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Additional payment notes or remarks"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition-all cursor-pointer"
            >
              Post Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
