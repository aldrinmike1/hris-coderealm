import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { EmployeeDeduction, DeductionType, DeductionStatus } from '../../types';
import { X, Plus, DollarSign, Calculator, AlertCircle, Info, Calendar, FileText } from 'lucide-react';

interface AddDeductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedEmployeeId?: string;
  editingDeduction?: EmployeeDeduction | null;
}

export const AddDeductionModal: React.FC<AddDeductionModalProps> = ({
  isOpen,
  onClose,
  preselectedEmployeeId,
  editingDeduction,
}) => {
  const { employees, employeeDeductions, addEmployeeDeduction, updateEmployeeDeduction, showToast } = useApp();

  const [employeeId, setEmployeeId] = useState<string>('');
  const [deductionId, setDeductionId] = useState<string>('');
  const [type, setType] = useState<DeductionType>('Loan');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>('');
  const [interestType, setInterestType] = useState<'fixed' | 'percentage'>('fixed');
  const [interestInput, setInterestInput] = useState<string>('0');
  const [cutoffDeductionAmount, setCutoffDeductionAmount] = useState<string>('');
  const [status, setStatus] = useState<DeductionStatus>('Active');
  const [notes, setNotes] = useState<string>('');

  // Generate next unique Deduction ID
  const generateDeductionId = () => {
    const year = new Date().getFullYear();
    const existingIds = employeeDeductions.map(d => d.deductionId);
    let counter = employeeDeductions.length + 1;
    let candidate = `DED-${year}-${String(counter).padStart(3, '0')}`;
    while (existingIds.includes(candidate)) {
      counter++;
      candidate = `DED-${year}-${String(counter).padStart(3, '0')}`;
    }
    return candidate;
  };

  useEffect(() => {
    if (isOpen) {
      if (editingDeduction) {
        setEmployeeId(editingDeduction.employeeId);
        setDeductionId(editingDeduction.deductionId);
        setType(editingDeduction.type);
        setDescription(editingDeduction.description);
        setDate(editingDeduction.date);
        setAmount(editingDeduction.amount.toString());
        setInterestType(editingDeduction.interestType || 'fixed');
        setInterestInput(
          editingDeduction.interestType === 'percentage'
            ? (editingDeduction.interestRate || 0).toString()
            : editingDeduction.interest.toString()
        );
        setCutoffDeductionAmount(editingDeduction.cutoffDeductionAmount.toString());
        setStatus(editingDeduction.status);
        setNotes(editingDeduction.notes || '');
      } else {
        const defaultEmpId = preselectedEmployeeId || (employees.length > 0 ? employees[0].id : '');
        setEmployeeId(defaultEmpId);
        setDeductionId(generateDeductionId());
        setType('Loan');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setAmount('');
        setInterestType('fixed');
        setInterestInput('0');
        setCutoffDeductionAmount('');
        setStatus('Active');
        setNotes('');
      }
    }
  }, [isOpen, editingDeduction, preselectedEmployeeId, employees]);

  if (!isOpen) return null;

  const numAmount = Math.max(0, parseFloat(amount) || 0);
  const numInterestInput = Math.max(0, parseFloat(interestInput) || 0);

  const calculatedInterest =
    interestType === 'percentage'
      ? Math.round((numAmount * (numInterestInput / 100)) * 100) / 100
      : numInterestInput;

  const totalAmountDue = Math.round((numAmount + calculatedInterest) * 100) / 100;
  const numCutoff = Math.max(0, parseFloat(cutoffDeductionAmount) || 0);
  const estimatedCutoffs = numCutoff > 0 ? Math.ceil(totalAmountDue / numCutoff) : 0;

  const selectedEmployee = employees.find(e => e.id === employeeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId) {
      showToast('Please select an employee.', 'error');
      return;
    }
    if (!description.trim()) {
      showToast('Please provide a deduction description.', 'error');
      return;
    }
    if (numAmount <= 0) {
      showToast('Principal amount must be greater than ₱0.', 'error');
      return;
    }
    if (numCutoff <= 0) {
      showToast('Cutoff deduction amount must be greater than ₱0.', 'error');
      return;
    }

    if (editingDeduction) {
      updateEmployeeDeduction(editingDeduction.id, {
        description: description.trim(),
        type,
        date,
        amount: numAmount,
        interest: calculatedInterest,
        interestType,
        interestRate: interestType === 'percentage' ? numInterestInput : undefined,
        cutoffDeductionAmount: numCutoff,
        status,
        notes: notes.trim() || undefined,
      });
    } else {
      addEmployeeDeduction({
        employeeId,
        deductionId: deductionId.trim() || undefined,
        type,
        description: description.trim(),
        date,
        amount: numAmount,
        interest: calculatedInterest,
        interestType,
        interestRate: interestType === 'percentage' ? numInterestInput : undefined,
        cutoffDeductionAmount: numCutoff,
        notes: notes.trim() || undefined,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {editingDeduction ? 'Edit Deduction Record' : 'New Employee Deduction / Loan'}
              </h2>
              <p className="text-xs text-slate-400">
                Loan grants, salary deductions, and amortization tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Employee Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Employee <span className="text-rose-500">*</span>
            </label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              disabled={!!editingDeduction || !!preselectedEmployeeId}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-600"
            >
              <option value="">Select Employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeNumber}) • {emp.department}
                </option>
              ))}
            </select>
            {selectedEmployee && (
              <p className="text-[11px] text-slate-500 mt-1">
                {selectedEmployee.position} • Daily Rate: ₱{selectedEmployee.dailyRate.toLocaleString()}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Deduction ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Deduction ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={deductionId}
                onChange={e => setDeductionId(e.target.value)}
                disabled={!!editingDeduction}
                required
                placeholder="e.g. DED-2026-001"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden disabled:bg-slate-100"
              />
            </div>

            {/* Deduction Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as DeductionType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="Loan">Loan (Cash / Emergency / SSS)</option>
                <option value="Salary Deduction">Salary Deduction (Uniform / HMO / Gear)</option>
                <option value="Others">Others (Vale / Tools / Misc)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              placeholder="e.g. Company Emergency Loan, Uniform & Safety Boots, Vale"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {[
                'Company Emergency Loan',
                'SSS Salary Loan',
                'Uniform & Safety Shoes',
                'Cash Advance / Vale',
                'HMO Dependent Premium',
                'Tool & Equipment Deposit',
              ].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDescription(preset)}
                  className="text-[10px] text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 px-2 py-0.5 rounded-md transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Grant Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Date Granted / Effective <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Principal Amount & Interest */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Principal Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Principal Amount (₱) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                    placeholder="10,000.00"
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Interest Mode & Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Interest
                  </label>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setInterestType('fixed')}
                      className={`px-1.5 py-0.5 rounded ${interestType === 'fixed' ? 'bg-blue-600 text-white font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Fixed (₱)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInterestType('percentage')}
                      className={`px-1.5 py-0.5 rounded ${interestType === 'percentage' ? 'bg-blue-600 text-white font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Rate (%)
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">
                    {interestType === 'fixed' ? '₱' : '%'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={interestInput}
                    onChange={e => setInterestInput(e.target.value)}
                    placeholder={interestType === 'fixed' ? '500.00' : '5.0'}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Total Obligation Summary */}
            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                Total Obligation (Principal + Interest):
              </span>
              <span className="text-sm font-black text-slate-900 font-mono">
                ₱{totalAmountDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Cutoff Deduction Amount & Estimated Duration */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Cutoff Deduction Amount (₱) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">₱</span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={cutoffDeductionAmount}
                onChange={e => setCutoffDeductionAmount(e.target.value)}
                required
                placeholder="500.00"
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            {numCutoff > 0 && totalAmountDue > 0 && (
              <p className="text-[11px] text-blue-700 font-medium mt-1">
                ⚡ ~{estimatedCutoffs} payroll cutoffs required to fully amortize this deduction.
              </p>
            )}
          </div>

          {/* Status (if editing) */}
          {editingDeduction && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Account Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as DeductionStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="Active">Active (Ongoing Cutoff Deductions)</option>
                <option value="Paused">Paused (Temporarily Suspended)</option>
                <option value="Completed">Completed (Fully Settled)</option>
              </select>
            </div>
          )}

          {/* Notes / Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Notes & Terms (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Approved under emergency assistance program. 10 weekly payroll installments."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs shadow-blue-600/20 transition-all"
            >
              {editingDeduction ? 'Save Changes' : 'Create Deduction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
