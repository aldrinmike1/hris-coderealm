import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Clock, Fingerprint, Calendar, CheckCircle2, User, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DTRPunchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DTRPunchModal: React.FC<DTRPunchModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, employees, punchClock, isAdmin, isManager } = useApp();

  const [selectedEmpId, setSelectedEmpId] = useState<string>(() => {
    // If staff, default to themselves or first employee
    const staffMatch = employees.find(e => `${e.firstName} ${e.lastName}` === currentUser.name || e.employeeNumber === currentUser.employeeId);
    return staffMatch ? staffMatch.id : employees[0]?.id || '';
  });

  const [punchType, setPunchType] = useState<'IN' | 'OUT'>('IN');
  const [useCurrentTime, setUseCurrentTime] = useState(true);
  const [customTime, setCustomTime] = useState('');
  const [customDate, setCustomDate] = useState('');

  const [currentTimeDisplay, setCurrentTimeDisplay] = useState('');

  useEffect(() => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const dateStr = now.toISOString().split('T')[0];
    setCustomTime(timeStr);
    setCustomDate(dateStr);

    const timer = setInterval(() => {
      setCurrentTimeDisplay(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedEmp = employees.find(e => e.id === selectedEmpId);

  const handlePunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;

    const time = useCurrentTime ? undefined : customTime;
    const date = useCurrentTime ? undefined : customDate;

    punchClock(selectedEmpId, punchType, time, date);
    onClose();
  };

  return (
    <AnimatePresence>
      <div key="dtr-punch-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200"
          id="dtr-punch-kiosk-modal"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Biometric Attendance Kiosk</h2>
                  <p className="text-xs text-emerald-200 mt-0.5">Record Daily Time Record (DTR) In / Out</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition-colors"
                id="close-punch-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Clock Display in Header */}
            <div className="mt-4 pt-3 border-t border-emerald-800/60 text-center">
              <div className="text-2xl font-extrabold font-mono tracking-wider text-white">
                {currentTimeDisplay || '08:00:00 AM'}
              </div>
              <span className="text-[11px] text-emerald-300">Standard Work Shift: 8:00 AM – 5:00 PM</span>
            </div>
          </div>

          {/* Body Form */}
          <form onSubmit={handlePunch} className="p-6 space-y-4" id="dtr-punch-form">
            {/* Select Employee */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Employee Personnel
              </label>
              {isAdmin || isManager ? (
                <select
                  value={selectedEmpId}
                  onChange={e => setSelectedEmpId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
                  id="punch-emp-select"
                >
                  {employees
                    .filter(e => e.status === 'active')
                    .map((emp, empIdx) => (
                      <option key={`${emp.id}-${empIdx}`} value={emp.id}>
                        {emp.employeeNumber} - {emp.firstName} {emp.lastName} ({emp.biometrixId})
                      </option>
                    ))}
                </select>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-slate-800">
                      {selectedEmp?.firstName} {selectedEmp?.lastName}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-indigo-600">
                    {selectedEmp?.biometrixId}
                  </span>
                </div>
              )}
            </div>

            {/* Punch Mode Selection (Time IN vs Time OUT) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Punch Action
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPunchType('IN')}
                  className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    punchType === 'IN'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                  id="punch-in-selector-btn"
                >
                  <Clock className="w-4 h-4" />
                  TIME IN (AM)
                </button>

                <button
                  type="button"
                  onClick={() => setPunchType('OUT')}
                  className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    punchType === 'OUT'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                  id="punch-out-selector-btn"
                >
                  <Clock className="w-4 h-4" />
                  TIME OUT (PM)
                </button>
              </div>
            </div>

            {/* Manual Timestamp Override Toggle (for managers/admins or adjustment simulation) */}
            <div className="pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-600 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!useCurrentTime}
                    onChange={e => setUseCurrentTime(!e.target.checked)}
                    className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                    id="manual-timestamp-checkbox"
                  />
                  <span>Specify Custom Date & Time (Simulation)</span>
                </label>
              </div>

              {!useCurrentTime && (
                <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Date</span>
                    <input
                      type="date"
                      value={customDate}
                      onChange={e => setCustomDate(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                      id="punch-custom-date"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Time (24h)</span>
                    <input
                      type="time"
                      value={customTime}
                      onChange={e => setCustomTime(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                      id="punch-custom-time"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div className="pt-3">
              <button
                type="submit"
                className={`w-full py-3 rounded-xl text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 ${
                  punchType === 'IN'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
                id="submit-punch-btn"
              >
                <Fingerprint className="w-5 h-5" />
                Register {punchType === 'IN' ? 'Time In' : 'Time Out'} Attendance
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
