import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { EmployeeDeduction } from '../../types';
import { X, Pencil, DollarSign, Calendar, AlertCircle } from 'lucide-react';

export interface EditablePaymentEntry {
  id: string;
  amount: number;
  date: string;
  remarks?: string;
  description?: string;
  reference?: string;
}

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  deduction: EmployeeDeduction | null;
  paymentEntry: EditablePaymentEntry | null;
  employeeName?: string;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  isOpen,
  onClose,
  deduction,
  paymentEntry,
  employeeName,
}) => {
  const { updateDeductionPayment, showToast } = useApp();

  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    if (isOpen && paymentEntry) {
      setAmount(Math.abs(paymentEntry.amount).toString());
      setDate(paymentEntry.date || new Date().toISOString().split('T')[0]);
      setReference(paymentEntry.reference || '');
      setDescription(paymentEntry.remarks || paymentEntry.description || '');
    }
  }, [isOpen, paymentEntry]);

  if (!isOpen || !deduction || !paymentEntry) return null;

  const currentOriginalAmount = Math.abs(paymentEntry.amount);
  const numAmount = Math.max(0, parseFloat(amount) || 0);

  // The maximum this payment could be is the current running balance + what was already deducted by this entry
  const maxPossibleAmount = Math.round((deduction.runningBalance + currentOriginalAmount) * 100) / 100;
  const recalculatedNewBalance = Math.max(0, Math.round((maxPossibleAmount - numAmount) * 100) / 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (numAmount <= 0) {
      showToast('Payment amount must be greater than ₱0.', 'error');
      return;
    }

    if (numAmount > maxPossibleAmount) {
      showToast(
        `Payment cannot exceed total outstanding balance of ₱${maxPossibleAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`,
        'error'
      );
      return;
    }

    updateDeductionPayment(deduction.id, paymentEntry.id, {
      amount: numAmount,
      date,
      reference: reference.trim() || undefined,
      description: description.trim() || undefined,
      remarks: description.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Edit Manual Payment</h2>
              <p className="text-xs text-slate-400">
                {deduction.deductionId} • {deduction.description}
                {employeeName ? ` (${employeeName})` : ''}
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
          {/* Account Balance Info */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">
                Original Recorded Payment
              </span>
              <span className="text-sm font-black text-amber-950 font-mono">
                ₱{currentOriginalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-amber-700 font-medium block">
                Current Account Balance: ₱{deduction.runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500">
                Max Allowed: ₱{maxPossibleAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Payment Amount & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
            {/* Payment Amount */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Payment Amount (₱) <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setAmount(maxPossibleAmount.toString())}
                  className="text-amber-700 hover:text-amber-900 font-semibold underline text-[10px] cursor-pointer"
                >
                  Pay Max (₱{maxPossibleAmount.toLocaleString()})
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">₱</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={maxPossibleAmount}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
              {numAmount > 0 && (
                <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between font-mono">
                  <span>New Running Balance:</span>
                  <span className="font-bold text-slate-800">
                    ₱{recalculatedNewBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    {recalculatedNewBalance === 0 && ' (Fully Settled ✓)'}
                  </span>
                </p>
              )}
            </div>

            {/* Payment Date */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Reference / OR # */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reference / Receipt # (OR)
            </label>
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="e.g. OR-849201"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-mono"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Remarks <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Additional payment notes or remarks"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
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
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Update Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
