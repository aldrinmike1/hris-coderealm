import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { EmployeeDeduction } from '../../types';
import { X, TrendingUp } from 'lucide-react';

interface AdjustPrincipalModalProps {
  isOpen: boolean;
  onClose: () => void;
  deductions: EmployeeDeduction[];
  preselectedDeductionId?: string;
  employeeName?: string;
}

export const AdjustPrincipalModal: React.FC<AdjustPrincipalModalProps> = ({
  isOpen,
  onClose,
  deductions,
  preselectedDeductionId,
  employeeName,
}) => {
  const { adjustDeductionPrincipal, showToast } = useApp();

  const [selectedDeductionId, setSelectedDeductionId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const chosen =
        preselectedDeductionId && deductions.some(d => d.id === preselectedDeductionId)
          ? preselectedDeductionId
          : deductions.length > 0
          ? deductions[0].id
          : '';

      setSelectedDeductionId(chosen);
      setDate(new Date().toISOString().split('T')[0]);
      setRemarks('');

      const ded = deductions.find(d => d.id === chosen);
      if (ded && ded.cutoffDeductionAmount > 0) {
        setAmount(ded.cutoffDeductionAmount.toString());
      } else {
        setAmount('');
      }
    }
  }, [isOpen, deductions, preselectedDeductionId]);

  if (!isOpen) return null;

  const numAmount = Math.max(0, parseFloat(amount) || 0);

  const handleSelectDeduction = (id: string) => {
    setSelectedDeductionId(id);
    const ded = deductions.find(d => d.id === id);
    if (ded && ded.cutoffDeductionAmount > 0) {
      setAmount(ded.cutoffDeductionAmount.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeductionId) {
      showToast('Please select a deduction account to adjust.', 'error');
      return;
    }
    if (numAmount <= 0) {
      showToast('Adjustment amount must be greater than ₱0.', 'error');
      return;
    }

    const trimmedRemarks = remarks.trim();

    adjustDeductionPrincipal(selectedDeductionId, {
      amount: numAmount,
      date,
      reason: trimmedRemarks || 'Principal Adjustment',
      remarks: trimmedRemarks || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Adjust Principal</h2>
              {employeeName && (
                <p className="text-xs text-slate-400">For {employeeName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Deduction Selection */}
          {deductions.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Deduction Account <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedDeductionId}
                onChange={e => handleSelectDeduction(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                required
              >
                {deductions.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.deductionId} — {d.description} (Bal: ₱{d.runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}{d.runningBalance === 0 ? ' • Fully Paid' : ''})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Adjustment Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Adjustment Amount (₱) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">₱</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Adjustment Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Adjustment Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Remarks (no placeholder) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Remarks <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={numAmount <= 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Apply Adjustment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
