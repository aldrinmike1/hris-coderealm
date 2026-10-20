import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { DTRRecord, DayType, DTRStatus } from '../../types';
import { formatDate, formatTime } from '../../utils/formatters';
import { timeToMinutes } from '../../utils/biometricsParser';
import { X, Clock, Calendar, AlertCircle, FileEdit, CheckCircle, Moon, Sun, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DTREditModalProps {
  isOpen: boolean;
  dtrRecord: DTRRecord | null;
  onClose: () => void;
}

export const DTREditModal: React.FC<DTREditModalProps> = ({
  isOpen,
  dtrRecord,
  onClose,
}) => {
  const { updateDTRRecord, currentUser } = useApp();

  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [isNextDayOut, setIsNextDayOut] = useState(false);
  const [status, setStatus] = useState<DTRStatus>('Present');
  const [dayType, setDayType] = useState<DayType>('Regular Working Day');
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  useEffect(() => {
    if (dtrRecord) {
      const rawIn = dtrRecord.timeIn || '';
      const rawOut = dtrRecord.timeOut || '';
      setTimeIn(rawIn.replace(/\s*\(\+1d?\)/i, '').replace(/\s*\(next day\)/i, ''));
      setTimeOut(rawOut.replace(/\s*\(\+1d?\)/i, '').replace(/\s*\(next day\)/i, ''));
      
      const isNext = rawOut.toLowerCase().includes('+1') || 
                     rawOut.toLowerCase().includes('next') || 
                     (rawIn && rawOut && timeToMinutes(rawOut) < timeToMinutes(rawIn) && timeToMinutes(rawIn) >= 720);
      setIsNextDayOut(isNext);
      
      setStatus(dtrRecord.status);
      setDayType(dtrRecord.dayType);
      setOvertimeHours(dtrRecord.overtimeHours || 0);
      setAdjustmentReason('');
    }
  }, [dtrRecord, isOpen]);

  // Live computed work duration
  const liveDuration = useMemo(() => {
    if (!timeIn || !timeOut) return { totalHours: 0, otHours: 0, isNextDay: isNextDayOut };
    const inM = timeToMinutes(timeIn);
    let outM = timeToMinutes(timeOut);
    if (isNextDayOut || outM < inM) {
      outM += 1440;
    }
    const diff = outM - inM;
    const totalHours = Math.round((diff / 60) * 10) / 10;
    let otHours = 0;
    if (diff > 480) {
      otHours = Math.floor((diff - 480) / 30) * 0.5;
    }
    return { totalHours, otHours, isNextDay: isNextDayOut || (timeToMinutes(timeOut) < inM) };
  }, [timeIn, timeOut, isNextDayOut]);

  if (!isOpen || !dtrRecord) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentReason.trim()) {
      alert('Please provide an official reason for this DTR adjustment (will be logged in the audit trail).');
      return;
    }

    const finalTimeOut = timeOut ? (isNextDayOut ? `${timeOut} (+1d)` : timeOut) : null;

    updateDTRRecord(
      dtrRecord.id,
      {
        timeIn: timeIn ? timeIn : null,
        timeOut: finalTimeOut,
        dayType,
        status,
        overtimeHours: Number(overtimeHours) || 0,
      },
      adjustmentReason.trim()
    );

    onClose();
  };

  return (
    <AnimatePresence>
      <div key="dtr-edit-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
          id="dtr-edit-adjustment-modal"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <FileEdit className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">DTR Time Adjustment</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {dtrRecord.employeeName} ({dtrRecord.employeeNumber}) • {formatDate(dtrRecord.date)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                id="close-dtr-edit-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4" id="dtr-adjustment-form">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Time In (24h)
                </label>
                <input
                  type="time"
                  value={timeIn}
                  onChange={e => setTimeIn(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                  id="dtr-edit-timein"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Time Out (24h)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsNextDayOut(!isNextDayOut)}
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all inline-flex items-center gap-1 ${
                      isNextDayOut
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                  >
                    <Moon className="w-2.5 h-2.5" />
                    <span>{isNextDayOut ? '+1d Next Day' : 'Same Day'}</span>
                  </button>
                </div>
                <input
                  type="time"
                  value={timeOut}
                  onChange={e => {
                    const val = e.target.value;
                    setTimeOut(val);
                    if (val && timeIn && timeToMinutes(val) < timeToMinutes(timeIn) && timeToMinutes(timeIn) >= 720) {
                      setIsNextDayOut(true);
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 ${
                    isNextDayOut ? 'border-indigo-400 bg-indigo-50/40 text-indigo-900' : 'border-slate-300'
                  }`}
                  id="dtr-edit-timeout"
                />
              </div>
            </div>

            {/* Quick Helper for Overnight Shift */}
            {(isNextDayOut || (timeIn && timeOut && timeToMinutes(timeOut) < timeToMinutes(timeIn))) && (
              <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200 flex items-center justify-between text-xs text-indigo-900">
                <div className="flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    Overnight shift active: Calculated <strong>{liveDuration.totalHours} hrs</strong> work.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOvertimeHours(liveDuration.otHours)}
                  className="text-[11px] font-bold text-indigo-700 underline hover:text-indigo-900"
                >
                  Set OT ({liveDuration.otHours}h)
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Day Classification
                </label>
                <select
                  value={dayType}
                  onChange={e => setDayType(e.target.value as DayType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
                  id="dtr-edit-daytype"
                >
                  <option value="Regular Working Day">Regular Working Day</option>
                  <option value="Rest Day">Rest Day (Weekend)</option>
                  <option value="Regular Holiday">Regular Holiday (100% Prem)</option>
                  <option value="Special Non-Working Holiday">Special Non-Working Holiday</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Attendance Status
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as DTRStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 bg-white"
                  id="dtr-edit-status"
                >
                  <option value="Present">Present (Full 8 hrs)</option>
                  <option value="Late">Late Arrival</option>
                  <option value="Half Day">Half Day (4 hrs)</option>
                  <option value="Absent">Absent (Unexcused)</option>
                  <option value="On Leave">On Official Leave</option>
                  <option value="Rest Day">Rest Day</option>
                  <option value="Holiday">Holiday</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Approved Overtime Hours (OT)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="16"
                value={overtimeHours}
                onChange={e => setOvertimeHours(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                id="dtr-edit-ot"
              />
            </div>

            {/* Required Audit Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Audit Trail Reason / Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={adjustmentReason}
                onChange={e => setAdjustmentReason(e.target.value)}
                placeholder="e.g. Biometrics malfunction, official field assignment OB slip #104, supervisor pre-approved overtime..."
                className="w-full px-3 py-2 border border-amber-300 bg-amber-50/40 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                id="dtr-edit-reason"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Actor: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.role})
              </span>
            </div>

            {/* Actions */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                id="cancel-dtr-edit"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors shadow-indigo-600/20"
                id="save-dtr-edit"
              >
                Apply Adjustment & Log Audit
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
