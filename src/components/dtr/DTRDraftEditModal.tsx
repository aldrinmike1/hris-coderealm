import React, { useState, useEffect, useMemo } from 'react';
import { DTRDraftRecord, DTRPunchPair, DayType } from '../../types';
import { useApp } from '../../context/AppContext';
import { timeToMinutes, evaluateDTRAnomalies } from '../../utils/biometricsParser';
import { cleanAndNormalizeTime } from '../../utils/formatters';
import {
  X,
  Plus,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Save,
  RotateCcw,
  Sparkles,
  ArrowDownUp,
  Moon,
  Sun,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DTRDraftEditModalProps {
  draft: DTRDraftRecord;
  onClose: () => void;
}

export interface UnpairedPunch {
  id: string;
  time: string; // HH:mm format, e.g. "08:00", "18:00", "02:00"
  isNextDay: boolean; // true if this punch occurs past midnight on the next calendar day
}

/**
 * Standardize time string into HH:mm format for HTML time inputs
 */
function toHHMM(timeStr: string): string {
  if (!timeStr) return '';
  const clean = timeStr.trim();
  const match = clean.match(/(?:^|T|\s)(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return clean;
}

/**
 * Check if a time string or context represents a next-day punch (+1d)
 */
function checkIsNextDayString(timeStr: string): boolean {
  if (!timeStr) return false;
  const lower = timeStr.toLowerCase();
  return lower.includes('+1') || lower.includes('next day') || lower.includes('next');
}

/**
 * Calculate effective minutes from the start of Day 1 (00:00)
 */
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
        document.querySelectorAll<HTMLInputElement>('input[data-draft-time-cell="true"]')
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
      data-draft-time-cell="true"
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

/**
 * Compute night differential minutes falling between 22:00 (10 PM Day 1) and 06:00 (6 AM Day 2)
 */
function calculateNightDiffMinutes(startEffMin: number, endEffMin: number): number {
  if (endEffMin <= startEffMin) return 0;
  // Night window 1: 22:00 (1320) to 24:00 (1440) on Day 1
  // Night window 2: 00:00 (1440) to 06:00 (1800) on Day 2 (relative to Day 1 = 1440 to 1800)
  // Overall continuous night window: 1320 to 1800 minutes
  const nightStart = 1320; // 10:00 PM
  const nightEnd = 1800;   // 06:00 AM next day

  const overlapStart = Math.max(startEffMin, nightStart);
  const overlapEnd = Math.min(endEffMin, nightEnd);

  if (overlapEnd > overlapStart) {
    return overlapEnd - overlapStart;
  }
  return 0;
}

/**
 * Helper to compute work hours, overtime, late, undertime, and night diff from an unpaired list of punches
 */
export function calculateUnpairedMetrics(
  punches: UnpairedPunch[],
  shiftStartTime: string = "08:00",
  gracePeriodMinutes: number = 5
): {
  totalHours: number;
  totalMinutes: number;
  overtimeHours: number;
  lateMinutes: number;
  undertimeMinutes: number;
  undertimeHours: number;
  nightDiffHours: number;
  punchPairs: DTRPunchPair[];
} {
  const validPunches = punches.filter(p => p.time && p.time.trim().length > 0);
  if (validPunches.length === 0) {
    return {
      totalHours: 0,
      totalMinutes: 0,
      overtimeHours: 0,
      lateMinutes: 0,
      undertimeMinutes: 0,
      undertimeHours: 0,
      nightDiffHours: 0,
      punchPairs: [],
    };
  }

  // Sort punches chronologically by effective minutes (accounting for +1 Next Day)
  const sortedPunches = [...validPunches].sort((a, b) => getEffectiveMinutes(a) - getEffectiveMinutes(b));

  let totalMinutes = 0;
  let totalNightDiffMins = 0;
  const punchPairs: DTRPunchPair[] = [];

  if (sortedPunches.length === 1) {
    const p = sortedPunches[0];
    punchPairs.push({
      timeIn: p.isNextDay ? `${p.time} (+1d)` : p.time,
      timeOut: null,
    });
  } else if (sortedPunches.length === 2) {
    const inPunch = sortedPunches[0];
    const outPunch = sortedPunches[1];
    let inEff = getEffectiveMinutes(inPunch);
    let outEff = getEffectiveMinutes(outPunch);

    // If outEff <= inEff (e.g., user entered 18:00 In and 02:00 Out without clicking Next Day),
    // automatically treat out as next day (+1440 mins)
    if (outEff < inEff) {
      outEff += 1440;
    }

    let diff = outEff - inEff;
    totalMinutes = diff;
    totalNightDiffMins = calculateNightDiffMinutes(inEff, outEff);

    punchPairs.push({
      timeIn: inPunch.isNextDay ? `${inPunch.time} (+1d)` : inPunch.time,
      timeOut: outPunch.isNextDay || (outEff >= 1440 && inEff < 1440) ? `${outPunch.time} (+1d)` : outPunch.time,
      durationMinutes: diff,
      durationHours: Math.round((diff / 60) * 10) / 10,
    });
  } else {
    // 3 or more punches: pair sequentially
    for (let i = 0; i < sortedPunches.length; i += 2) {
      const inP = sortedPunches[i];
      const outP = i + 1 < sortedPunches.length ? sortedPunches[i + 1] : null;
      let pairDiff = 0;

      if (inP && outP) {
        let inEff = getEffectiveMinutes(inP);
        let outEff = getEffectiveMinutes(outP);
        if (outEff < inEff) {
          outEff += 1440;
        }
        pairDiff = outEff - inEff;
        totalMinutes += pairDiff;
        totalNightDiffMins += calculateNightDiffMinutes(inEff, outEff);
      }

      punchPairs.push({
        timeIn: inP ? (inP.isNextDay ? `${inP.time} (+1d)` : inP.time) : null,
        timeOut: outP ? (outP.isNextDay ? `${outP.time} (+1d)` : outP.time) : null,
        durationMinutes: pairDiff,
        durationHours: Math.round((pairDiff / 60) * 10) / 10,
      });
    }
  }

  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const nightDiffHours = Math.round((totalNightDiffMins / 60) * 10) / 10;

  // Overtime: after 8 hrs of work (480 mins), rounded down by 30 mins (0.5 hrs step)
  let overtimeHours = 0;
  if (totalMinutes > 480) {
    const extraMinutes = totalMinutes - 480;
    overtimeHours = Math.floor(extraMinutes / 30) * 0.5;
  }

  // Late calculation based on employee's shift start time and grace period
  const firstInEff = getEffectiveMinutes(sortedPunches[0]);
  const [startH, startM] = shiftStartTime.split(':').map(Number);
  const shiftStartMin = (startH || 0) * 60 + (startM || 0);
  const lateMinutes = firstInEff > shiftStartMin + gracePeriodMinutes ? firstInEff - shiftStartMin : 0;

  // Undertime calculation:
  // - If attendance is less than 4hrs (240 mins), consider it as half day (0.5 days work), and undertime counts from 4hrs (240 mins)
  // - If attendance is 4hrs to 8hrs (480 mins), undertime counts from 8hrs (480 mins)
  let undertimeMinutes = 0;
  let undertimeHours = 0;
  if (totalMinutes > 0) {
    if (totalMinutes < 240) {
      undertimeMinutes = 240 - totalMinutes;
      undertimeHours = Math.round((undertimeMinutes / 60) * 100) / 100;
    } else if (totalMinutes < 480) {
      undertimeMinutes = 480 - totalMinutes;
      undertimeHours = Math.round((undertimeMinutes / 60) * 100) / 100;
    }
  }

  return {
    totalHours,
    totalMinutes,
    overtimeHours,
    lateMinutes,
    undertimeMinutes,
    undertimeHours,
    nightDiffHours,
    punchPairs,
  };
}

export const DTRDraftEditModal: React.FC<DTRDraftEditModalProps> = ({ draft, onClose }) => {
  const { employees, getEmployeeShift, updateDraftRecord, validateDraftRecord, rejectDraftRecord, showToast } = useApp();

  // Employee mapping
  const [selectedEmpId, setSelectedEmpId] = useState<string>(draft.employeeId || '');

  // Get employee's assigned shift for tardiness calculation
  const employeeShift = useMemo(() => {
    return getEmployeeShift(selectedEmpId || draft.employeeId);
  }, [getEmployeeShift, selectedEmpId, draft.employeeId]);

  // Unpaired list of punches with next-day (+1d) support
  const [punches, setPunches] = useState<UnpairedPunch[]>(() => {
    // 1. Check raw punches first
    if (draft.rawPunches && draft.rawPunches.length > 0) {
      const firstMins = timeToMinutes(draft.rawPunches[0]);
      return draft.rawPunches.map((p, idx) => {
        const hhmm = toHHMM(p);
        const hasNextDayFlag = checkIsNextDayString(p);
        const currMins = timeToMinutes(hhmm);
        // Smart auto-detect: if punch #2+ is early morning (< 08:00 AM, e.g. 02:00) and first punch was afternoon/evening (>= 12:00 PM)
        const isPastMidnightAuto = idx > 0 && currMins < firstMins && firstMins >= 720;
        return {
          id: `p-${idx}-${Date.now().toString(36)}`,
          time: hhmm,
          isNextDay: hasNextDayFlag || isPastMidnightAuto,
        };
      });
    }

    // 2. Fallback to punchPairs
    if (draft.punchPairs && draft.punchPairs.length > 0) {
      const extracted: UnpairedPunch[] = [];
      let counter = 0;
      draft.punchPairs.forEach(pair => {
        if (pair.timeIn) {
          const inH = toHHMM(pair.timeIn);
          extracted.push({
            id: `p-in-${counter++}`,
            time: inH,
            isNextDay: checkIsNextDayString(pair.timeIn),
          });
        }
        if (pair.timeOut) {
          const outH = toHHMM(pair.timeOut);
          const inMins = pair.timeIn ? timeToMinutes(pair.timeIn) : 0;
          const outMins = timeToMinutes(outH);
          const autoNext = checkIsNextDayString(pair.timeOut) || (outMins < inMins && inMins >= 720);
          extracted.push({
            id: `p-out-${counter++}`,
            time: outH,
            isNextDay: autoNext,
          });
        }
      });
      if (extracted.length > 0) return extracted;
    }

    // Default fallback
    return [
      { id: 'p-1', time: '08:00', isNextDay: false },
      { id: 'p-2', time: '17:00', isNextDay: false },
    ];
  });

  // Direct metrics state (with auto-calculate option)
  const [autoCalculate, setAutoCalculate] = useState<boolean>(true);
  const [totalHours, setTotalHours] = useState<number>(draft.totalHours || 8.0);
  const [overtimeHours, setOvertimeHours] = useState<number>(draft.overtimeHours || 0);
  const [lateMinutes, setLateMinutes] = useState<number>(draft.lateMinutes !== undefined ? draft.lateMinutes : 0);
  const [undertimeHours, setUndertimeHours] = useState<number>(draft.undertimeHours || 0);

  // Day Type
  const [dayType, setDayType] = useState<DayType>(() => {
    const d = new Date(draft.date + 'T00:00:00');
    return d.getDay() === 0 || d.getDay() === 6 ? 'Rest Day' : 'Regular Working Day';
  });

  // Remarks / notes
  const [remarks, setRemarks] = useState<string>(draft.remarks || '');

  // Delete shift confirmation state
  const [shiftToDelete, setShiftToDelete] = useState<{
    inOrigIndex: number;
    outOrigIndex?: number;
    shiftNum: number;
    inTime: string;
    outTime: string;
  } | null>(null);

  // Formatted prominent date string
  const formattedDateDisplay = useMemo(() => {
    if (!draft.date) return 'Date Not Set';
    try {
      const d = new Date(draft.date.includes('T') ? draft.date : `${draft.date}T00:00:00`);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    } catch {}
    return `${draft.dayOfWeek ? draft.dayOfWeek + ', ' : ''}${draft.date}`;
  }, [draft.date, draft.dayOfWeek]);

  // Check if any punch is scheduled on next day (+1d)
  const hasNextDayPunch = useMemo(() => {
    return punches.some(p => p.isNextDay);
  }, [punches]);

  // Live computed metrics using employee's assigned shift
  const liveMetrics = useMemo(() => {
    return calculateUnpairedMetrics(punches, employeeShift.startTime, employeeShift.gracePeriodMinutes);
  }, [punches, employeeShift]);

  // Live evaluated anomalies based on current punch state
  const currentAnomalies = useMemo(() => {
    const formattedRawPunches = punches
      .filter(p => p.time && p.time.trim().length > 0)
      .map(p => (p.isNextDay ? `${p.time} (+1d)` : p.time));

    return evaluateDTRAnomalies({
      rawPunches: formattedRawPunches,
      punchPairs: liveMetrics.punchPairs,
      totalHours: Number(totalHours) || liveMetrics.totalHours,
      hasMatchedEmployee: Boolean(selectedEmpId || draft.employeeId),
      biometrixPersonId: draft.biometrixPersonId,
      isEdited: true,
    });
  }, [punches, liveMetrics.punchPairs, totalHours, liveMetrics.totalHours, selectedEmpId, draft.employeeId, draft.biometrixPersonId]);

  // Automatically sync metrics when punches change if autoCalculate is ON
  useEffect(() => {
    if (autoCalculate) {
      setTotalHours(liveMetrics.totalHours);
      setOvertimeHours(liveMetrics.overtimeHours);
      setLateMinutes(liveMetrics.lateMinutes);
      setUndertimeHours(liveMetrics.undertimeHours);
    }
  }, [liveMetrics, autoCalculate]);

  // Handle editing a punch time and auto-sort chronologically
  const handlePunchTimeChange = (index: number, newTime: string) => {
    setPunches(prev => {
      const updated = [...prev];
      const prevPunch = updated[index];
      const newMins = timeToMinutes(newTime);

      // Smart auto-detect next day: If modifying punch #2+ and new time is early morning (e.g. 02:00, 03:00, 04:00)
      // while previous/first punch was in the afternoon/evening (>= 12:00 PM), automatically activate isNextDay
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

      // Auto sort chronologically by effective minutes
      return updated.sort((a, b) => getEffectiveMinutes(a) - getEffectiveMinutes(b));
    });
  };

  // Toggle next day flag (+1d) for a punch and auto-sort chronologically
  const handleToggleNextDay = (index: number) => {
    setPunches(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isNextDay: !updated[index].isNextDay,
      };
      // Auto sort chronologically by effective minutes
      return updated.sort((a, b) => getEffectiveMinutes(a) - getEffectiveMinutes(b));
    });
  };

  // Add a new punch timestamp and auto-sort
  const handleAddPunch = (initialTime: string = '17:00', isNextDay: boolean = false) => {
    setPunches(prev => {
      const updated = [
        ...prev,
        {
          id: `p-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
          time: initialTime,
          isNextDay,
        },
      ];
      return updated.sort((a, b) => getEffectiveMinutes(a) - getEffectiveMinutes(b));
    });
  };

  // Add a new shift pair (Time In and Time Out)
  const handleAddShiftPair = (inTime: string = '08:00', outTime: string = '17:00', inNextDay: boolean = false, outNextDay: boolean = false) => {
    setPunches(prev => {
      if (prev.length === 0) {
        return [
          { id: `p-${Date.now().toString(36)}-in-1`, time: inTime, isNextDay: inNextDay },
          { id: `p-${Date.now().toString(36)}-out-1`, time: outTime, isNextDay: outNextDay },
        ];
      }

      // If last punch is unpaired (odd count), pair it first
      if (prev.length % 2 === 1) {
        const lastPunch = prev[prev.length - 1];
        const lastMinutes = getEffectiveMinutes(lastPunch);
        let newMinutes = lastMinutes + 240;
        let newIsNextDay = lastPunch.isNextDay;
        if (newMinutes >= 1440) {
          newMinutes = newMinutes % 1440;
          newIsNextDay = true;
        }
        const hours = Math.floor(newMinutes / 60).toString().padStart(2, '0');
        const mins = (newMinutes % 60).toString().padStart(2, '0');
        const updated = [
          ...prev,
          {
            id: `p-${Date.now().toString(36)}-out-${Math.random().toString(36).substring(2, 5)}`,
            time: `${hours}:${mins}`,
            isNextDay: newIsNextDay,
          },
        ];
        return updated.sort((a, b) => getEffectiveMinutes(a) - getEffectiveMinutes(b));
      }

      // If even count, compute next sequential shift
      const lastPunch = prev[prev.length - 1];
      const lastMinutes = getEffectiveMinutes(lastPunch);

      let nextInMins = lastMinutes + 60; // 1 hour break
      let nextOutMins = nextInMins + 240; // 4 hours shift

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

  // Remove an entire shift pair (both In and Out punches)
  const confirmDeleteShift = () => {
    if (!shiftToDelete) return;
    const { inOrigIndex, outOrigIndex } = shiftToDelete;
    setPunches(prev => prev.filter((_, i) => i !== inOrigIndex && (outOrigIndex === undefined || i !== outOrigIndex)));
    setShiftToDelete(null);
  };

  // Add missing Time Out to an unpaired shift
  const handleAddMissingOut = (inOrigIndex: number) => {
    setPunches(prev => {
      const inPunch = prev[inOrigIndex];
      if (!inPunch) return prev;
      const inMinutes = getEffectiveMinutes(inPunch);
      let outMinutes = inMinutes + 240; // +4 hours default
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

  // Remove a punch
  const handleRemovePunch = (index: number) => {
    setPunches(prev => prev.filter((_, i) => i !== index));
  };

  // Sort punches chronologically taking +1 day into account
  const handleSortPunches = () => {
    setPunches(prev => [...prev].sort((a, b) => getEffectiveMinutes(a) - getEffectiveMinutes(b)));
  };

  // Quick preset shifts: non-destructive append / insert, don't duplicate existing punches
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
      // Don't append if the punch timestamp is already in the list
      const existingKeySet = new Set(
        prev.map(p => `${toHHMM(p.time)}__${Boolean(p.isNextDay)}`)
      );

      const toAdd = presetPunches.filter(
        preset => !existingKeySet.has(`${toHHMM(preset.time)}__${Boolean(preset.isNextDay)}`)
      );

      if (toAdd.length === 0) {
        return prev; // All punches already on list
      }

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

  // Manual recalculation trigger
  const handleRecalculate = () => {
    setTotalHours(liveMetrics.totalHours);
    setOvertimeHours(liveMetrics.overtimeHours);
    setLateMinutes(liveMetrics.lateMinutes);
    setUndertimeHours(liveMetrics.undertimeHours);
    setAutoCalculate(true);
  };

  // Save handler
  const handleSave = (validateImmediate: boolean = false) => {
    const matchedEmp = employees.find(e => e.id === selectedEmpId);
    const metrics = calculateUnpairedMetrics(punches, employeeShift.startTime, employeeShift.gracePeriodMinutes);

    // Format raw punch strings preserving next day markers
    const formattedRawPunches = punches
      .filter(p => p.time && p.time.trim().length > 0)
      .map(p => (p.isNextDay ? `${p.time} (+1d)` : p.time));

    const finalTotalHours = autoCalculate ? metrics.totalHours : (Number(totalHours) || metrics.totalHours || 0);
    const finalOvertimeHours = autoCalculate ? metrics.overtimeHours : (Number(overtimeHours) || 0);
    const finalLateMinutes = autoCalculate ? metrics.lateMinutes : (Number(lateMinutes) || 0);
    const finalUndertimeHours = autoCalculate ? metrics.undertimeHours : (Number(undertimeHours) || 0);
    const finalUndertimeMinutes = autoCalculate ? metrics.undertimeMinutes : Math.round(finalUndertimeHours * 60);

    const evaluatedAnomalies = evaluateDTRAnomalies({
      rawPunches: formattedRawPunches,
      punchPairs: metrics.punchPairs,
      totalHours: finalTotalHours,
      hasMatchedEmployee: Boolean(matchedEmp || draft.employeeId),
      biometrixPersonId: draft.biometrixPersonId,
      isEdited: true,
    });

    const hasErrors = evaluatedAnomalies.some(a => a.severity === 'error');
    const hasAnyAnomaly = evaluatedAnomalies.length > 0;

    if (validateImmediate && hasErrors) {
      showToast(`Cannot approve incomplete log: ${evaluatedAnomalies[0].message}`, 'error');
      return;
    }

    const nextStatus: DTRDraftRecord['status'] = validateImmediate
      ? 'VALIDATED'
      : (hasAnyAnomaly ? 'PENDING' : 'VALIDATED');

    updateDraftRecord(draft.id, {
      employeeId: matchedEmp?.id || draft.employeeId,
      employeeNumber: matchedEmp?.employeeNumber || draft.employeeNumber,
      employeeName: matchedEmp ? `${matchedEmp.firstName} ${matchedEmp.lastName}` : draft.employeeName,
      rawPunches: formattedRawPunches,
      punchPairs: metrics.punchPairs,
      totalHours: finalTotalHours,
      totalMinutes: Math.round(finalTotalHours * 60),
      overtimeHours: finalOvertimeHours,
      lateMinutes: finalLateMinutes,
      undertimeMinutes: finalUndertimeMinutes,
      undertimeHours: finalUndertimeHours,
      dayType,
      anomalies: evaluatedAnomalies,
      status: nextStatus,
      remarks: remarks.trim() || undefined,
    });

    if (nextStatus === 'VALIDATED') {
      validateDraftRecord(draft.id);
      showToast(`Attendance record updated & validated (${finalTotalHours} hrs, all complete).`, 'success');
    } else {
      showToast(`Attendance record saved with updated warning: ${evaluatedAnomalies[0].message}`, 'warning');
    }

    onClose();
  };

  const handleReject = () => {
    rejectDraftRecord(draft.id, remarks.trim() || 'Marked as invalid by supervisor');
    onClose();
  };

  const firstPunchDisplay = punches.length > 0 ? `${punches[0].time}${punches[0].isNextDay ? ' (+1d)' : ''}` : '—';
  const lastPunchObj = punches.length > 1 ? punches[punches.length - 1] : (punches.length === 1 ? null : null);
  const lastPunchDisplay = lastPunchObj ? `${lastPunchObj.time}${lastPunchObj.isNextDay ? ' (+1d Next Day)' : ''}` : (punches.length === 1 ? 'Missing Out' : '—');

  return (
    <AnimatePresence>
      <div key="dtr-draft-edit-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-6"
          id="dtr-draft-edit-modal"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-6 py-4 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Modify Attendance Log</h3>
                  <p className="text-xs text-slate-400">
                    {draft.employeeName} • Bio ID: <span className="font-mono text-slate-200 font-semibold">{draft.biometrixPersonId}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                id="close-draft-edit-btn"
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
                      {draft.dayOfWeek || 'Working Day'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Log Date: <span className="font-mono text-indigo-300 font-semibold">{draft.date}</span> • Biometric ID: <span className="font-mono text-emerald-300 font-bold">{draft.biometrixPersonId}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Assignment & Attendance Day Type (Removed Attendance Status) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <label htmlFor="draft-emp-assign" className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Linked Employee Profile
                </label>
                <select
                  id="draft-emp-assign"
                  value={selectedEmpId}
                  onChange={e => setSelectedEmpId(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Linked Employee --</option>
                  {employees.map((emp, empIdx) => (
                    <option key={`draft-emp-${emp.id}-${empIdx}`} value={emp.id}>
                      {emp.lastName}, {emp.firstName} ({emp.employeeNumber}) [Bio: {emp.biometrixId || 'None'}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="draft-day-type" className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Attendance Day Type
                </label>
                <select
                  id="draft-day-type"
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
                  <span>Flagged Biometric Anomalies (Requires Fix)</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[11px] pl-1 font-sans">
                  {currentAnomalies.map((ano, i) => (
                    <li key={`draft-ano-live-${ano.type}-${i}`}>
                      <span className="font-semibold">{ano.type.replace(/_/g, ' ')}:</span> {ano.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex items-center gap-2 text-emerald-800 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All biometric punches are balanced and complete. Saving will validate this record.</span>
              </div>
            )}

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
                                <tr key={`draft-pair-${pair.pairNum}-${pIdx}-${pair.inPunch?.id || 'no-id'}`} className="hover:bg-indigo-50/30 transition-colors group">
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

            {/* Remarks / Adjustment Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Adjustment Reason / Remarks <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <input
                type="text"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="e.g. Next-day 2:00 AM timeout verified by site supervisor for emergency overnight overtime"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                id="draft-remarks-input"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReject}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-100/80 transition-colors"
                title="Mark this log as rejected"
              >
                Reject Log
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSave(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
                id="save-draft-btn"
              >
                <Save className="w-3.5 h-3.5 text-slate-600" />
                <span>Save Changes</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                id="approve-validate-btn"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Validate</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Delete Shift Confirmation Dialog */}
        <AnimatePresence>
          {shiftToDelete && (
            <div key="draft-delete-shift-confirm-overlay" className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200"
                id="draft-confirm-delete-shift-dialog"
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
                    id="draft-confirm-delete-shift-btn"
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


