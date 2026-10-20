import React, { useState, useEffect, useMemo } from 'react';
import { DTRRecord, DTRDraftRecord, DayType, Employee } from '../../types';
import { useApp } from '../../context/AppContext';
import { timeToMinutes, evaluateDTRAnomalies } from '../../utils/biometricsParser';
import { cleanAndNormalizeTime } from '../../utils/formatters';
import {
  X,
  Plus,
  Trash2,
  Clock,
  Calendar,
  Save,
  RotateCcw,
  Sparkles,
  Sun,
  Moon,
  ArrowDownUp,
  AlertTriangle,
  CheckCircle2,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UnpairedPunch, calculateUnpairedMetrics } from './DTRDraftEditModal';

interface DTREditDayModalProps {
  date: string; // YYYY-MM-DD
  employee: Employee;
  officialRecord?: DTRRecord;
  draftRecord?: DTRDraftRecord;
  onClose: () => void;
}

function toHHMM(timeStr: string): string {
  if (!timeStr) return '';
  const clean = timeStr.trim();
  const match = clean.match(/(?:^|T|\s)(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return clean;
}

function getEffectiveMinutes(punch: UnpairedPunch): number {
  const baseMinutes = timeToMinutes(punch.time);
  return baseMinutes + (punch.isNextDay ? 1440 : 0);
}

/**
 * Controlled time input cell that buffers local changes and triggers auto-calculation only on blur (focus out)
 */
function TimeCellInput({
  value,
  onCommit,
  className,
  id,
  ariaLabel,
}: {
  value: string;
  onCommit: (val: string) => void;
  className?: string;
  id?: string;
  ariaLabel?: string;
}) {
  const [localVal, setLocalVal] = useState(toHHMM(value));

  useEffect(() => {
    setLocalVal(toHHMM(value));
  }, [value]);

  const commitValue = (val: string) => {
    const normalized = cleanAndNormalizeTime(val);
    setLocalVal(normalized);
    if (normalized !== toHHMM(value)) {
      onCommit(normalized);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      commitValue(localVal);

      // Find modal time cell inputs
      const modalInputs = Array.from(
        document.querySelectorAll<HTMLInputElement>('input[data-modal-time-cell="true"]')
      );
      const idx = modalInputs.indexOf(e.currentTarget);
      if (idx !== -1) {
        const nextIdx = e.shiftKey ? idx - 1 : idx + 1;
        if (nextIdx >= 0 && nextIdx < modalInputs.length) {
          modalInputs[nextIdx].focus();
          modalInputs[nextIdx].select();
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commitValue(localVal);
      e.currentTarget.blur();
    }
  };

  return (
    <input
      data-modal-time-cell="true"
      id={id}
      type="text"
      inputMode="numeric"
      maxLength={5}
      placeholder="--:--"
      aria-label={ariaLabel}
      value={localVal}
      onFocus={e => e.currentTarget.select()}
      onChange={e => {
        let val = e.target.value.replace(/[^0-9:]/g, '');
        if (val.length > 5) val = val.slice(0, 5);
        if (val.length === 2 && !val.includes(':') && !localVal.endsWith(':')) {
          val = val + ':';
        }
        setLocalVal(val);
      }}
      onBlur={() => commitValue(localVal)}
      onKeyDown={handleKeyDown}
      className={className}
    />
  );
}

export const DTREditDayModal: React.FC<DTREditDayModalProps> = ({
  date,
  employee,
  officialRecord,
  draftRecord,
  onClose,
}) => {
  const { batchUpdateDTRRecords, updateDraftRecord, validateDraftRecord, employees, getEmployeeShift, showToast } = useApp();

  // Selected employee (defaults to the passed employee)
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employee.id);

  // Assigned Shift for employee
  const employeeShift = useMemo(() => {
    const matched = employees.find(e => e.id === selectedEmpId) || employee;
    return getEmployeeShift(matched);
  }, [getEmployeeShift, selectedEmpId, employees, employee]);

  // Initialize unpaired punches from existing official record or draft record
  const [punches, setPunches] = useState<UnpairedPunch[]>(() => {
    const rawList: string[] = [];

    if (officialRecord?.rawPunches && officialRecord.rawPunches.length > 0) {
      rawList.push(...officialRecord.rawPunches);
    } else if (draftRecord?.rawPunches && draftRecord.rawPunches.length > 0) {
      rawList.push(...draftRecord.rawPunches);
    }

    if (rawList.length > 0) {
      return rawList.map((p, idx) => {
        const isNext = p.toLowerCase().includes('+1') || p.toLowerCase().includes('next');
        const clean = toHHMM(p);
        return {
          id: `p-${idx}-${clean}`,
          time: clean,
          isNextDay: isNext,
        };
      });
    }

    // Try punch pairs
    const pairs = officialRecord?.punchPairs || draftRecord?.punchPairs;
    if (pairs && pairs.length > 0) {
      const extracted: UnpairedPunch[] = [];
      let counter = 0;
      pairs.forEach((pair) => {
        if (pair.timeIn && pair.timeIn !== '—') {
          const isNext = pair.timeIn.toLowerCase().includes('+1');
          extracted.push({
            id: `p-in-${counter++}`,
            time: toHHMM(pair.timeIn),
            isNextDay: isNext,
          });
        }
        if (pair.timeOut && pair.timeOut !== '—') {
          const isNext = pair.timeOut.toLowerCase().includes('+1');
          const outH = toHHMM(pair.timeOut);
          let autoNext = isNext;
          if (extracted.length > 0) {
            const lastInMins = timeToMinutes(extracted[extracted.length - 1].time);
            const outMins = timeToMinutes(outH);
            if (outMins < lastInMins && lastInMins >= 720) {
              autoNext = true;
            }
          }
          extracted.push({
            id: `p-out-${counter++}`,
            time: outH,
            isNextDay: autoNext,
          });
        }
      });
      if (extracted.length > 0) return extracted;
    }

    if (officialRecord?.timeIn || officialRecord?.timeOut) {
      const list: UnpairedPunch[] = [];
      if (officialRecord.timeIn) {
        list.push({ id: 'p-in-0', time: toHHMM(officialRecord.timeIn), isNextDay: false });
      }
      if (officialRecord.timeOut) {
        const outH = toHHMM(officialRecord.timeOut);
        const autoNext = officialRecord.timeIn && timeToMinutes(outH) < timeToMinutes(officialRecord.timeIn) && timeToMinutes(officialRecord.timeIn) >= 720;
        list.push({ id: 'p-out-1', time: outH, isNextDay: Boolean(autoNext) });
      }
      return list;
    }

    // Default 8am to 5pm for new work log
    return [
      { id: 'p-1', time: '08:00', isNextDay: false },
      { id: 'p-2', time: '17:00', isNextDay: false },
    ];
  });

  // Metrics state
  const [autoCalculate, setAutoCalculate] = useState<boolean>(true);
  const initialHours = officialRecord?.totalHours !== undefined
    ? officialRecord.totalHours
    : (draftRecord?.totalHours || 8.0);
  const initialOT = officialRecord?.overtimeHours !== undefined
    ? officialRecord.overtimeHours
    : (draftRecord?.overtimeHours || 0);
  const initialLate = officialRecord?.lateMinutes !== undefined
    ? officialRecord.lateMinutes
    : (draftRecord?.lateMinutes !== undefined ? draftRecord.lateMinutes : 0);
  const initialUT = officialRecord?.undertimeHours !== undefined
    ? officialRecord.undertimeHours
    : (draftRecord?.undertimeHours || 0);

  const [totalHours, setTotalHours] = useState<number>(initialHours);
  const [overtimeHours, setOvertimeHours] = useState<number>(initialOT);
  const [lateMinutes, setLateMinutes] = useState<number>(initialLate);
  const [undertimeHours, setUndertimeHours] = useState<number>(initialUT);

  // Day Type
  const [dayType, setDayType] = useState<DayType>(() => {
    if (officialRecord?.dayType) return officialRecord.dayType;
    const d = new Date(date + 'T00:00:00');
    return d.getDay() === 0 || d.getDay() === 6 ? 'Rest Day' : 'Regular Working Day';
  });

  // Remarks
  const [remarks, setRemarks] = useState<string>(officialRecord?.remarks || draftRecord?.remarks || '');

  // Delete shift confirmation state
  const [shiftToDelete, setShiftToDelete] = useState<{
    inOrigIndex: number;
    outOrigIndex?: number;
    shiftNum: number;
    inTime: string;
    outTime: string;
  } | null>(null);

  // Formatted date string
  const formattedDateDisplay = useMemo(() => {
    try {
      const d = new Date(date + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    } catch {}
    return date;
  }, [date]);

  const dayOfWeek = useMemo(() => {
    try {
      const d = new Date(date + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'long' });
    } catch {
      return 'Working Day';
    }
  }, [date]);

  // Live computed metrics
  const liveMetrics = useMemo(() => {
    return calculateUnpairedMetrics(punches, employeeShift.startTime, employeeShift.gracePeriodMinutes);
  }, [punches, employeeShift]);

  // Live evaluated anomalies
  const currentAnomalies = useMemo(() => {
    const formattedRawPunches = punches
      .filter(p => p.time && p.time.trim().length > 0)
      .map(p => (p.isNextDay ? `${p.time} (+1d)` : p.time));

    return evaluateDTRAnomalies({
      rawPunches: formattedRawPunches,
      punchPairs: liveMetrics.punchPairs,
      totalHours: Number(totalHours) || liveMetrics.totalHours,
      hasMatchedEmployee: Boolean(selectedEmpId || employee.id),
      biometrixPersonId: draftRecord?.biometrixPersonId || employee.biometrixId,
      isEdited: true,
    });
  }, [punches, liveMetrics.punchPairs, totalHours, liveMetrics.totalHours, selectedEmpId, employee, draftRecord]);

  useEffect(() => {
    if (autoCalculate) {
      setTotalHours(liveMetrics.totalHours);
      setOvertimeHours(liveMetrics.overtimeHours);
      setLateMinutes(liveMetrics.lateMinutes);
      setUndertimeHours(liveMetrics.undertimeHours);
    }
  }, [liveMetrics, autoCalculate]);

  const hasNextDayPunch = punches.some(p => p.isNextDay);

  // Punch actions
  const handlePunchTimeChange = (index: number, newTime: string) => {
    setPunches(prev => {
      const updated = [...prev];
      const prevPunch = updated[index];
      const newMins = timeToMinutes(newTime);

      let nextDayFlag = prevPunch.isNextDay;
      if (index > 0 && newTime) {
        const firstMins = timeToMinutes(updated[0].time);
        if (newMins < firstMins && firstMins >= 720) {
          nextDayFlag = true;
        } else if (newMins >= firstMins && !prevPunch.isNextDay) {
          nextDayFlag = false;
        }
      }

      updated[index] = {
        ...prevPunch,
        time: newTime,
        isNextDay: nextDayFlag,
      };

      return updated.sort((a, b) => getEffectiveMinutes(a) - getEffectiveMinutes(b));
    });
  };

  const handleToggleNextDay = (index: number) => {
    setPunches(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isNextDay: !updated[index].isNextDay,
      };
      return updated.sort((a, b) => getEffectiveMinutes(a) - getEffectiveMinutes(b));
    });
  };

  const handleSortPunches = () => {
    setPunches(prev => [...prev].sort((a, b) => getEffectiveMinutes(a) - getEffectiveMinutes(b)));
  };

  const handleAddShiftPair = (inTime = '08:00', outTime = '17:00') => {
    setPunches(prev => {
      if (prev.length === 0) {
        return [
          { id: `p-${Date.now()}-in`, time: inTime, isNextDay: false },
          { id: `p-${Date.now()}-out`, time: outTime, isNextDay: false },
        ];
      }

      const lastPunch = prev[prev.length - 1];
      const lastMinutes = getEffectiveMinutes(lastPunch);

      let nextInMins = lastMinutes + 60;
      let nextOutMins = nextInMins + 240;

      let inND = lastPunch.isNextDay;
      if (nextInMins >= 1440) {
        nextInMins = nextInMins % 1440;
        inND = true;
      }

      let outND = inND;
      if (nextOutMins >= 1440) {
        nextOutMins = nextOutMins % 1440;
        outND = true;
      }

      const inH = Math.floor(nextInMins / 60).toString().padStart(2, '0');
      const inM = (nextInMins % 60).toString().padStart(2, '0');
      const outH = Math.floor(nextOutMins / 60).toString().padStart(2, '0');
      const outM = (nextOutMins % 60).toString().padStart(2, '0');

      const updated = [
        ...prev,
        { id: `p-${Date.now().toString(36)}-in-${Math.random().toString(36).substring(2, 5)}`, time: `${inH}:${inM}`, isNextDay: inND },
        { id: `p-${Date.now().toString(36)}-out-${Math.random().toString(36).substring(2, 5)}`, time: `${outH}:${outM}`, isNextDay: outND },
      ];
      return updated.sort((a, b) => getEffectiveMinutes(a) - getEffectiveMinutes(b));
    });
  };

  const confirmDeleteShift = () => {
    if (!shiftToDelete) return;
    const { inOrigIndex, outOrigIndex } = shiftToDelete;
    setPunches(prev => prev.filter((_, i) => i !== inOrigIndex && (outOrigIndex === undefined || i !== outOrigIndex)));
    setShiftToDelete(null);
  };

  const handleAddMissingOut = (inOrigIndex: number) => {
    setPunches(prev => {
      const inPunch = prev[inOrigIndex];
      if (!inPunch) return prev;
      const inMinutes = getEffectiveMinutes(inPunch);
      let outMinutes = inMinutes + 240;
      let outNextDay = inPunch.isNextDay;
      if (outMinutes >= 1440) {
        outMinutes = outMinutes % 1440;
        outNextDay = true;
      }
      const h = Math.floor(outMinutes / 60).toString().padStart(2, '0');
      const m = (outMinutes % 60).toString().padStart(2, '0');
      const newOutPunch = {
        id: `p-${Date.now().toString(36)}-out-${Math.random().toString(36).substring(2, 5)}`,
        time: `${h}:${m}`,
        isNextDay: outNextDay,
      };
      const updated = [...prev, newOutPunch];
      return updated.sort((a, b) => getEffectiveMinutes(a) - getEffectiveMinutes(b));
    });
  };

  const handleApplyPreset = (presetType: '7am_12pm' | '1pm_4pm' | '7am_4pm_straight') => {
    let presetPunches: { time: string; isNextDay: boolean }[] = [];
    if (presetType === '7am_12pm') {
      presetPunches = [
        { time: '07:00', isNextDay: false },
        { time: '12:00', isNextDay: false },
      ];
    } else if (presetType === '1pm_4pm') {
      presetPunches = [
        { time: '13:00', isNextDay: false },
        { time: '16:00', isNextDay: false },
      ];
    } else if (presetType === '7am_4pm_straight') {
      presetPunches = [
        { time: '07:00', isNextDay: false },
        { time: '16:00', isNextDay: false },
      ];
    }

    setPunches(prev => {
      const existingKeySet = new Set(
        prev.map(p => `${toHHMM(p.time)}__${Boolean(p.isNextDay)}`)
      );

      const toAdd = presetPunches.filter(
        preset => !existingKeySet.has(`${toHHMM(preset.time)}__${Boolean(preset.isNextDay)}`)
      );

      if (toAdd.length === 0) return prev;

      const updated = [
        ...prev,
        ...toAdd.map((p, i) => ({
          id: `preset-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
          time: p.time,
          isNextDay: p.isNextDay,
        })),
      ];

      return updated.sort((a, b) => getEffectiveMinutes(a) - getEffectiveMinutes(b));
    });
  };

  const handleRecalculate = () => {
    setTotalHours(liveMetrics.totalHours);
    setOvertimeHours(liveMetrics.overtimeHours);
    setLateMinutes(liveMetrics.lateMinutes);
    setUndertimeHours(liveMetrics.undertimeHours);
    setAutoCalculate(true);
  };

  // Save handler: updates official DTR and/or draft
  const handleSave = () => {
    const matchedEmp = employees.find(e => e.id === selectedEmpId) || employee;
    const metrics = calculateUnpairedMetrics(punches, employeeShift.startTime, employeeShift.gracePeriodMinutes);
    const formattedRawPunches = punches
      .filter(p => p.time && p.time.trim().length > 0)
      .map(p => (p.isNextDay ? `${p.time} (+1d)` : p.time));

    const finalTotalHours = autoCalculate ? metrics.totalHours : (Number(totalHours) || metrics.totalHours || 0);
    const finalOT = autoCalculate ? metrics.overtimeHours : (Number(overtimeHours) || 0);
    const finalLateMinutes = autoCalculate ? metrics.lateMinutes : (Number(lateMinutes) || 0);
    const finalUTHours = autoCalculate ? metrics.undertimeHours : (Number(undertimeHours) || 0);
    const finalUTMinutes = autoCalculate ? metrics.undertimeMinutes : Math.round(finalUTHours * 60);

    const evaluatedAnomalies = evaluateDTRAnomalies({
      rawPunches: formattedRawPunches,
      punchPairs: metrics.punchPairs,
      totalHours: finalTotalHours,
      hasMatchedEmployee: Boolean(matchedEmp),
      biometrixPersonId: draftRecord?.biometrixPersonId || matchedEmp.biometrixId,
      isEdited: true,
    });
    const hasAnyAnomaly = evaluatedAnomalies.length > 0;

    const timeInFirst = metrics.punchPairs.length > 0 && metrics.punchPairs[0].timeIn ? metrics.punchPairs[0].timeIn : null;
    const timeOutLast = metrics.punchPairs.length > 0 && metrics.punchPairs[metrics.punchPairs.length - 1].timeOut ? metrics.punchPairs[metrics.punchPairs.length - 1].timeOut : null;

    const recordToSave: DTRRecord = {
      id: officialRecord?.id || `DTR-${matchedEmp.id}-${date}`,
      employeeId: matchedEmp.id,
      employeeNumber: matchedEmp.employeeNumber,
      biometrixId: matchedEmp.biometrixId,
      employeeName: `${matchedEmp.firstName} ${matchedEmp.lastName}`,
      date,
      dayOfWeek: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
      dayType,
      timeIn: timeInFirst,
      timeOut: timeOutLast,
      punchPairs: metrics.punchPairs,
      rawPunches: formattedRawPunches,
      regularHours: Math.min(8.0, finalTotalHours),
      totalHours: finalTotalHours,
      overtimeHours: finalOT,
      lateMinutes: finalLateMinutes,
      undertimeMinutes: finalUTMinutes,
      undertimeHours: finalUTHours,
      nightDiffHours: metrics.nightDiffHours,
      status: finalTotalHours > 0 ? 'Present' : 'Absent',
      remarks: remarks.trim() || undefined,
      source: 'Adjustment',
    };

    if (batchUpdateDTRRecords) {
      batchUpdateDTRRecords([recordToSave], remarks.trim() || `Manual Timesheet Edit for ${matchedEmp.firstName} ${matchedEmp.lastName} on ${date}`);
    }

    if (draftRecord) {
      updateDraftRecord(draftRecord.id, {
        employeeId: matchedEmp.id,
        employeeNumber: matchedEmp.employeeNumber,
        employeeName: `${matchedEmp.firstName} ${matchedEmp.lastName}`,
        rawPunches: formattedRawPunches,
        punchPairs: metrics.punchPairs,
        totalHours: finalTotalHours,
        totalMinutes: Math.round(finalTotalHours * 60),
        overtimeHours: finalOT,
        lateMinutes: finalLateMinutes,
        undertimeHours: finalUTHours,
        undertimeMinutes: finalUTMinutes,
        anomalies: evaluatedAnomalies,
        status: hasAnyAnomaly ? 'PENDING' : 'VALIDATED',
        remarks: remarks.trim() || undefined,
      });

      if (!hasAnyAnomaly) {
        validateDraftRecord(draftRecord.id);
      }
    }

    if (hasAnyAnomaly) {
      showToast(`Timesheet for ${formattedDateDisplay} saved with warning: ${evaluatedAnomalies[0].message}`, 'warning');
    } else {
      showToast(`Timesheet for ${formattedDateDisplay} saved successfully!`, 'success');
    }
    onClose();
  };

  const firstPunchDisplay = punches.length > 0 ? `${punches[0].time}${punches[0].isNextDay ? ' (+1d)' : ''}` : '—';
  const lastPunchObj = punches.length > 1 ? punches[punches.length - 1] : null;
  const lastPunchDisplay = lastPunchObj ? `${lastPunchObj.time}${lastPunchObj.isNextDay ? ' (+1d Next Day)' : ''}` : (punches.length === 1 ? 'Missing Out' : '—');

  return (
    <AnimatePresence>
      <div key="dtr-edit-day-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-6"
          id="dtr-timesheet-day-edit-modal"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-6 py-4 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold tracking-tight">Modify Attendance Log</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                      Timesheet Summary
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {employee.firstName} {employee.lastName} • Bio ID: <span className="font-mono text-slate-200 font-semibold">{employee.biometrixId || employee.employeeNumber}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                id="close-timesheet-edit-btn"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
            {/* Prominent Date Display Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-xl shadow-xs border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-500/25 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-base sm:text-lg font-black tracking-tight text-white">
                      {formattedDateDisplay}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                      {dayOfWeek}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Log Date: <span className="font-mono text-indigo-300 font-semibold">{date}</span> • Biometric ID: <span className="font-mono text-emerald-300 font-bold">{employee.biometrixId || employee.employeeNumber}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Assignment & Attendance Day Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <label htmlFor="timesheet-emp-assign" className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Linked Employee Profile
                </label>
                <select
                  id="timesheet-emp-assign"
                  value={selectedEmpId}
                  onChange={e => setSelectedEmpId(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  {employees.map((emp, empIdx) => (
                    <option key={`timesheet-emp-${emp.id}-${empIdx}`} value={emp.id}>
                      {emp.lastName}, {emp.firstName} ({emp.employeeNumber}) [Bio: {emp.biometrixId || 'None'}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="timesheet-day-type" className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Attendance Day Type
                </label>
                <select
                  id="timesheet-day-type"
                  value={dayType}
                  onChange={e => setDayType(e.target.value as DayType)}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Regular Working Day">Regular Working Day</option>
                  <option value="Rest Day">Rest Day</option>
                  <option value="Special Non-Working Holiday">Special Non-Working Holiday</option>
                  <option value="Regular Holiday">Regular Holiday</option>
                </select>
              </div>
            </div>

            {/* Detected Anomalies Alert (Live evaluation) */}
            {currentAnomalies.length > 0 ? (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Flagged Attendance Anomalies (Requires Fix)</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[11px] pl-1 font-sans">
                  {currentAnomalies.map((ano, i) => (
                    <li key={`timesheet-ano-live-${ano.type}-${i}`}>
                      <span className="font-semibold">{ano.type.replace(/_/g, ' ')}:</span> {ano.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : draftRecord ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex items-center gap-2 text-emerald-800 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All biometric punches are balanced and complete. Saving will validate this record.</span>
              </div>
            ) : null}

            {/* Next Day Shift Notice Banner */}
            {hasNextDayPunch && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-2.5 text-xs text-indigo-900">
                <div className="p-1 bg-indigo-100 text-indigo-700 rounded-lg mt-0.5 shrink-0">
                  <Moon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold block">Overnight / Next-Day Shift Active</span>
                  <span className="text-indigo-700 text-[11px]">
                    Punches tagged with <strong className="font-bold">Next Day</strong> are logged on the following morning (e.g. 2:00 AM). Work hours, night differential, and overtime are calculated across midnight.
                  </span>
                </div>
              </div>
            )}

            {/* UNPAIRED PUNCH LOGS SECTION */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Biometric Punch Log
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Modify or add shift timestamps directly. Metrics calculate when exiting the field.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={handleSortPunches}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Sort timestamps in chronological order"
                  >
                    <ArrowDownUp className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sort Chronologically</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddShiftPair()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs"
                    id="add-attendance-log-auto-pair-btn"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Shift (In & Out)</span>
                  </button>
                </div>
              </div>

              {/* Quick Shift & Preset Buttons */}
              <div className="flex items-center gap-2 flex-wrap bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Quick Shifts:
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('7am_12pm')}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-lg transition-colors shadow-2xs"
                  title="Append 7:00 AM - 12:00 PM shift if not present"
                >
                  + 7am - 12pm
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('1pm_4pm')}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-lg transition-colors shadow-2xs"
                  title="Append 1:00 PM - 4:00 PM shift if not present"
                >
                  + 1pm - 4pm
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('7am_4pm_straight')}
                  className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-2xs"
                  title="Append 7:00 AM - 4:00 PM full day shift if not present"
                >
                  + 7am-4pm straight
                </button>
              </div>

              {/* Shift Pairs Excel-Style Table UI */}
              {punches.length === 0 ? (
                <div className="p-5 border border-dashed border-slate-300 rounded-xl text-center bg-slate-50">
                  <Clock className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-700 font-semibold">No attendance shifts recorded for this day.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Click below to add a shift row or pick from quick presets.</p>
                  <button
                    type="button"
                    onClick={() => handleAddShiftPair('08:00', '17:00')}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Shift Row (08:00 - 17:00)
                  </button>
                </div>
              ) : (
                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-300 text-[11px] font-semibold select-none">
                          <th className="py-2 px-3 border-r border-slate-300 w-10 text-center text-slate-500 font-mono">
                            #
                          </th>
                          <th className="py-2 px-3 border-r border-slate-300 min-w-[145px]">
                            Time In
                          </th>
                          <th className="py-2 px-3 border-r border-slate-300 min-w-[145px]">
                            Time Out
                          </th>
                          <th className="py-2 px-3 border-r border-slate-300 w-24 text-right">
                            Hours
                          </th>
                          <th className="py-2 px-2 w-10 text-center" aria-label="Row Actions">
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(() => {
                          const shiftPairsList: {
                            pairNum: number;
                            inPunch: { id: string; time: string; isNextDay: boolean; origIndex: number };
                            outPunch?: { id: string; time: string; isNextDay: boolean; origIndex: number };
                            durationHours?: number;
                          }[] = [];

                          for (let i = 0; i < punches.length; i += 2) {
                            const inP = { ...punches[i], origIndex: i };
                            const outP = punches[i + 1] ? { ...punches[i + 1], origIndex: i + 1 } : undefined;
                            let durHrs: number | undefined = undefined;
                            if (outP) {
                              const inM = getEffectiveMinutes(inP);
                              const outM = getEffectiveMinutes(outP);
                              let diff = outM - inM;
                              if (diff < 0) diff += 1440;
                              durHrs = +(diff / 60).toFixed(1);
                            }
                            shiftPairsList.push({
                              pairNum: Math.floor(i / 2) + 1,
                              inPunch: inP,
                              outPunch: outP,
                              durationHours: durHrs,
                            });
                          }

                          const totalShiftHours = shiftPairsList.reduce((sum, p) => sum + (p.durationHours || 0), 0);

                          return (
                            <>
                              {shiftPairsList.map((pair, pIdx) => (
                                <tr key={`shift-pair-${pair.pairNum}-${pIdx}-${pair.inPunch?.id || 'no-id'}`} className="hover:bg-indigo-50/30 transition-colors group">
                                  {/* Row Number */}
                                  <td className="py-1.5 px-2.5 border-r border-slate-200 bg-slate-50/70 font-mono text-[11px] font-bold text-slate-500 text-center select-none">
                                    {pair.pairNum}
                                  </td>

                                  {/* Time In Field with icon immediately after */}
                                  <td className="py-1 px-2 border-r border-slate-200 bg-white">
                                    <div className="flex items-center gap-1.5">
                                      <div className="relative flex-1 flex items-center">
                                        <TimeCellInput
                                          value={pair.inPunch.time}
                                          onCommit={val => handlePunchTimeChange(pair.inPunch.origIndex, val)}
                                          className="w-full px-2 py-1 text-xs font-mono font-bold text-slate-800 bg-transparent border border-slate-200 rounded focus:bg-emerald-50/40 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden transition-all"
                                          ariaLabel={`Shift ${pair.pairNum} Time In`}
                                        />
                                        {pair.inPunch.isNextDay && (
                                          <span className="absolute right-1.5 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-200 pointer-events-none">
                                            +1d
                                          </span>
                                        )}
                                      </div>

                                      {/* Time In Day/Night Icon Button */}
                                      <button
                                        type="button"
                                        tabIndex={-1}
                                        onClick={() => handleToggleNextDay(pair.inPunch.origIndex)}
                                        className={`p-1 rounded border transition-all shrink-0 ${
                                          pair.inPunch.isNextDay
                                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs hover:bg-indigo-700'
                                            : 'bg-white text-amber-500 border-slate-200 hover:border-amber-300 hover:bg-amber-50'
                                        }`}
                                        title={`Time In: ${pair.inPunch.isNextDay ? '+1 Day (Next Day / Night Shift)' : 'Same Day'}`}
                                        aria-label={`Toggle Time In next-day for Shift ${pair.pairNum}`}
                                      >
                                        {pair.inPunch.isNextDay ? (
                                          <Moon className="w-3.5 h-3.5" />
                                        ) : (
                                          <Sun className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>
                                  </td>

                                  {/* Time Out Field with icon immediately after */}
                                  <td className="py-1 px-2 border-r border-slate-200 bg-white">
                                    {pair.outPunch ? (
                                      <div className="flex items-center gap-1.5">
                                        <div className="relative flex-1 flex items-center">
                                          <TimeCellInput
                                            value={pair.outPunch.time}
                                            onCommit={val => handlePunchTimeChange(pair.outPunch!.origIndex, val)}
                                            className="w-full px-2 py-1 text-xs font-mono font-bold text-slate-800 bg-transparent border border-slate-200 rounded focus:bg-blue-50/40 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden transition-all"
                                            ariaLabel={`Shift ${pair.pairNum} Time Out`}
                                          />
                                          {pair.outPunch.isNextDay && (
                                            <span className="absolute right-1.5 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-200 pointer-events-none">
                                              +1d
                                            </span>
                                          )}
                                        </div>

                                        {/* Time Out Day/Night Icon Button */}
                                        <button
                                          type="button"
                                          tabIndex={-1}
                                          onClick={() => handleToggleNextDay(pair.outPunch!.origIndex)}
                                          className={`p-1 rounded border transition-all shrink-0 ${
                                            pair.outPunch.isNextDay
                                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs hover:bg-indigo-700'
                                              : 'bg-white text-amber-500 border-slate-200 hover:border-amber-300 hover:bg-amber-50'
                                          }`}
                                          title={`Time Out: ${pair.outPunch.isNextDay ? '+1 Day (Next Day / Night Shift)' : 'Same Day'}`}
                                          aria-label={`Toggle Time Out next-day for Shift ${pair.pairNum}`}
                                        >
                                          {pair.outPunch.isNextDay ? (
                                            <Moon className="w-3.5 h-3.5" />
                                          ) : (
                                            <Sun className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleAddMissingOut(pair.inPunch.origIndex)}
                                        className="w-full py-1 px-2 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-dashed border-amber-300 rounded flex items-center justify-center gap-1 transition-colors"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Missing (Pair Out)</span>
                                      </button>
                                    )}
                                  </td>

                                  {/* Hours Column */}
                                  <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono text-xs font-bold text-slate-800 bg-slate-50/40">
                                    {pair.durationHours !== undefined ? (
                                      <span>{pair.durationHours.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">hrs</span></span>
                                    ) : (
                                      <span className="text-amber-600 font-medium text-[11px]">—</span>
                                    )}
                                  </td>

                                  {/* Delete Row Action Column with Confirmation */}
                                  <td className="py-1 px-1.5 text-center bg-white">
                                    <button
                                      type="button"
                                      onClick={() => setShiftToDelete({
                                        inOrigIndex: pair.inPunch.origIndex,
                                        outOrigIndex: pair.outPunch?.origIndex,
                                        shiftNum: pair.pairNum,
                                        inTime: pair.inPunch.time + (pair.inPunch.isNextDay ? ' (+1d)' : ''),
                                        outTime: pair.outPunch ? (pair.outPunch.time + (pair.outPunch.isNextDay ? ' (+1d)' : '')) : 'Missing',
                                      })}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                      title="Delete Shift Row"
                                      aria-label={`Delete Shift #${pair.pairNum}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}

                              {/* Excel Footer / Summary Row */}
                              <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-800">
                                <td colSpan={3} className="py-2 px-3 border-r border-slate-300 text-right text-[11px] text-slate-600 uppercase tracking-wider">
                                  Total Hours
                                </td>
                                <td className="py-2 px-3 border-r border-slate-300 text-right font-mono text-xs font-black text-indigo-950 bg-indigo-50/50">
                                  {totalShiftHours.toFixed(1)} <span className="text-[10px] text-slate-600 font-semibold">hrs</span>
                                </td>
                                <td className="py-2 px-1.5 text-center bg-slate-100/90">
                                  <button
                                    type="button"
                                    onClick={() => handleAddShiftPair()}
                                    className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded transition-colors"
                                    title="Add new shift row"
                                    aria-label="Add new shift row"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* DTR METRICS & OVERRIDES */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    DTR Calculated Metrics & Overrides
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRecalculate}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                    title="Recalculate metrics from current punch times"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Recalculate</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                {/* Total Hours */}
                <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700/80">
                  <label className="text-[10px] text-slate-400 block mb-1">Total Hours</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="24"
                      value={totalHours}
                      onChange={e => {
                        setAutoCalculate(false);
                        setTotalHours(parseFloat(e.target.value) || 0);
                      }}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-center font-mono font-bold text-sm text-emerald-300 focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </div>

                {/* Overtime */}
                <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700/80">
                  <label className="text-[10px] text-slate-400 block mb-1">Overtime (OT hrs)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="16"
                      value={overtimeHours}
                      onChange={e => {
                        setAutoCalculate(false);
                        setOvertimeHours(parseFloat(e.target.value) || 0);
                      }}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-center font-mono font-bold text-sm text-amber-300 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {/* Late Minutes */}
                <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700/80">
                  <label className="text-[10px] text-slate-400 block mb-1">Late (mins)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={lateMinutes}
                      onChange={e => {
                        setAutoCalculate(false);
                        setLateMinutes(parseInt(e.target.value, 10) || 0);
                      }}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-center font-mono font-bold text-sm text-rose-300 focus:ring-1 focus:ring-rose-400"
                    />
                  </div>
                </div>

                {/* Undertime Hours */}
                <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700/80">
                  <label className="text-[10px] text-slate-400 block mb-1">Undertime (hrs)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="8"
                      value={undertimeHours}
                      onChange={e => {
                        setAutoCalculate(false);
                        setUndertimeHours(parseFloat(e.target.value) || 0);
                      }}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-center font-mono font-bold text-sm text-rose-300 focus:ring-1 focus:ring-rose-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800 font-sans gap-1">
                <span>
                  Rule: OT after 8.0 hrs worked (rounded down by 30 mins / 0.5h step).
                  {liveMetrics.nightDiffHours > 0 && (
                    <span className="ml-2 text-indigo-300 font-semibold">
                      🌙 Night Diff: {liveMetrics.nightDiffHours} hrs (10PM - 6AM)
                    </span>
                  )}
                </span>
                <span className="font-mono text-emerald-400">
                  In: {firstPunchDisplay} • Out: {lastPunchDisplay}
                </span>
              </div>
            </div>

            {/* Adjustment Reason / Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Adjustment Reason / Remarks <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <input
                type="text"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="e.g. Manually adjusted punch times verified by team lead"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                id="timesheet-remarks-input"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs"
              id="save-timesheet-day-btn"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </motion.div>

        {/* Delete Shift Confirmation Dialog */}
        <AnimatePresence>
          {shiftToDelete && (
            <div key="delete-shift-confirm-overlay" className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200"
                id="confirm-delete-shift-dialog"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Delete Shift Row?</h4>
                    <p className="text-xs text-slate-500">
                      Shift #{shiftToDelete.shiftNum} ({shiftToDelete.inTime} - {shiftToDelete.outTime})
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  Are you sure you want to remove this shift row? Working hours and metrics for the day will be updated accordingly.
                </p>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShiftToDelete(null)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteShift}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs transition-colors"
                    id="confirm-delete-shift-btn"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Shift</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
};
