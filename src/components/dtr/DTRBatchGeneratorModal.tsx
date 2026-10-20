import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Sparkles, Calendar, Users, Fingerprint, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DTRBatchGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DTRBatchGeneratorModal: React.FC<DTRBatchGeneratorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { employees, generateBulkDTR } = useApp();
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-08-15');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(() =>
    employees.filter(e => e.status === 'active').map(e => e.id)
  );

  if (!isOpen) return null;

  const handleToggleEmp = (id: string) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === employees.filter(e => e.status === 'active').length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.filter(e => e.status === 'active').map(e => e.id));
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmployees.length === 0) {
      alert('Please select at least one employee.');
      return;
    }

    generateBulkDTR(startDate, endDate, selectedEmployees);
    onClose();
  };

  return (
    <AnimatePresence>
      <div key="dtr-batch-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
          id="dtr-batch-generator-modal"
        >
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Sync & Generate Biometrics</h2>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Populate realistic DTR logs across cutoff dates
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Target Active Personnel ({selectedEmployees.length})
                </label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-indigo-600 font-semibold hover:underline"
                >
                  {selectedEmployees.length === employees.filter(e => e.status === 'active').length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                {employees
                  .filter(e => e.status === 'active')
                  .map((emp, empIdx) => {
                    const isSelected = selectedEmployees.includes(emp.id);
                    return (
                      <button
                        type="button"
                        key={`${emp.id}-${empIdx}`}
                        onClick={() => handleToggleEmp(emp.id)}
                        className={`w-full p-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-semibold'
                            : 'bg-white border border-slate-200 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Fingerprint className="w-3.5 h-3.5 text-indigo-500" />
                          <span>
                            {emp.firstName} {emp.lastName} ({emp.employeeNumber})
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              <span className="font-semibold block">Simulation Details:</span>
              Generates 8:00 AM - 5:00 PM standard shifts, realistic commutes, weekend rest days, and holiday tags for payroll testing.
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/20"
              >
                Sync & Generate Logs
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
