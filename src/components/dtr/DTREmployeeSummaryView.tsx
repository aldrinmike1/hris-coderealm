import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { DTRRecord, Employee, PayPeriod } from '../../types';
import { formatAttendanceTime, cleanAndNormalizeTime } from '../../utils/formatters';
import { getCutoffsFromToday, getPaydayMonthInfo, calculateLateMinutes } from '../../utils/calculations';
import {
  User,
  Calendar,
  Clock,
  Download,
  Printer,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  ArrowUpDown,
  Edit3,
  Check,
  Plus
} from 'lucide-react';
import { DTREditDayModal } from './DTREditDayModal';
import { UnpairedPunch, calculateUnpairedMetrics } from './DTRDraftEditModal';
import { timeToMinutes, evaluateDTRAnomalies } from '../../utils/biometricsParser';

function toHHMM(timeStr: string): string {
  if (!timeStr) return '';
  const clean = timeStr.trim();
  const match = clean.match(/(?:^|T|\s)(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return clean;
}

interface EditableTimeCellProps {
  value: string;
  onCommit: (newVal: string) => void;
  isWeekend?: boolean;
  hasWork?: boolean;
  placeholder?: string;
  ariaLabel: string;
}

const EditableTimeCell: React.FC<EditableTimeCellProps> = ({
  value,
  onCommit,
  isWeekend,
  hasWork,
  placeholder = '—',
  ariaLabel,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localVal, setLocalVal] = useState(toHHMM(value));

  useEffect(() => {
    if (!isFocused) {
      setLocalVal(toHHMM(value));
    }
  }, [value, isFocused]);

  const commitValue = (valToCommit: string) => {
    const normalized = cleanAndNormalizeTime(valToCommit);
    setLocalVal(normalized);
    if (normalized !== toHHMM(value)) {
      onCommit(normalized);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    commitValue(localVal);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    e.currentTarget.select();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9:]/g, '');
    if (val.length > 5) {
      val = val.slice(0, 5);
    }
    // Auto-insert colon if 2 digits entered without colon
    if (val.length === 2 && !val.includes(':') && !localVal.endsWith(':')) {
      val = val + ':';
    }
    setLocalVal(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      commitValue(localVal);

      // Find all time cell inputs in table
      const allInputs = Array.from(
        document.querySelectorAll<HTMLInputElement>('input[data-time-cell="true"]')
      );
      const currentIndex = allInputs.indexOf(e.currentTarget);
      if (currentIndex !== -1) {
        const nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
        if (nextIndex >= 0 && nextIndex < allInputs.length) {
          allInputs[nextIndex].focus();
          allInputs[nextIndex].select();
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commitValue(localVal);

      // Enter key moves to the same slot in the next row
      const allInputs = Array.from(
        document.querySelectorAll<HTMLInputElement>('input[data-time-cell="true"]')
      );
      const currentIndex = allInputs.indexOf(e.currentTarget);
      if (currentIndex !== -1) {
        const nextRowIndex = currentIndex + 6;
        if (nextRowIndex < allInputs.length) {
          allInputs[nextRowIndex].focus();
          allInputs[nextRowIndex].select();
        } else {
          e.currentTarget.blur();
        }
      }
    } else if (e.key === 'Escape') {
      setLocalVal(toHHMM(value));
      setIsFocused(false);
      e.currentTarget.blur();
    }
  };

  const isNextDay = Boolean(
    value && (value.toLowerCase().includes('+1') || value.toLowerCase().includes('next'))
  );
  const displayVal = formatAttendanceTime(value, false);

  return (
    <div className="relative w-full flex items-center justify-center">
      <input
        data-time-cell="true"
        type="text"
        inputMode="numeric"
        value={isFocused ? localVal : (displayVal && displayVal !== '—' ? displayVal : '')}
        placeholder={isFocused ? '--:--' : placeholder}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        className={`w-full text-center py-1 px-1 font-mono text-[11px] rounded transition-all cursor-text focus:outline-none ${
          isFocused
            ? 'bg-white text-indigo-950 border border-indigo-500 rounded shadow-xs ring-1 ring-indigo-500 font-bold text-xs'
            : displayVal && displayVal !== '—'
            ? 'bg-transparent text-slate-800 font-bold border border-transparent hover:bg-indigo-50/70 hover:border-indigo-300'
            : isWeekend && !hasWork
            ? 'bg-transparent text-slate-300 border border-transparent hover:bg-indigo-50/70 hover:border-indigo-300'
            : 'bg-transparent text-slate-400 border border-transparent hover:bg-indigo-50/70 hover:border-indigo-300'
        }`}
        title="Type HH:MM (24h) or press Tab to proceed to next input"
      />
      {isNextDay && !isFocused && (
        <span className="absolute right-0.5 top-0.5 text-[8px] text-amber-700 bg-amber-100 font-bold px-0.5 rounded leading-none pointer-events-none">
          +1d
        </span>
      )}
    </div>
  );
};

interface DTREmployeeSummaryViewProps {
  onOpenUploadModal: () => void;
  onOpenDraftStaging: () => void;
}

export const DTREmployeeSummaryView: React.FC<DTREmployeeSummaryViewProps> = ({
  onOpenUploadModal,
  onOpenDraftStaging,
}) => {
  const { employees, dtrRecords, dtrDrafts, payPeriods, batchUpdateDTRRecords, updateDraftRecord, validateDraftRecord, getEmployeeShift, showToast } = useApp();

  // Selected Employee (default to Joshua Fontanilla 006 or first active)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(() => {
    const joshua = employees.find(e => e.biometrixId === '006' || e.lastName.toLowerCase().includes('fontanilla'));
    return joshua ? joshua.id : employees[0]?.id || '';
  });

  // Dynamic weekly cutoff options based on date today (up to 5 cutoffs)
  const cutoffOptions = useMemo(() => {
    const dynamicCutoffs = getCutoffsFromToday(5);
    const options = dynamicCutoffs.map(dc => {
      const matchingPP = payPeriods.find(pp => pp.startDate === dc.startDate);
      return {
        id: matchingPP ? matchingPP.id : dc.id,
        name: dc.name,
        startDate: dc.startDate,
        endDate: dc.endDate,
        payoutDate: dc.payoutDate,
        displayLabel: dc.displayLabel,
      };
    });

    // Append any extra pay periods from store not covered in the top 5
    payPeriods.forEach(pp => {
      if (!options.some(o => o.startDate === pp.startDate)) {
        const paydayShort = pp.payoutDate ? pp.payoutDate : '';
        options.push({
          id: pp.id,
          name: pp.name,
          startDate: pp.startDate,
          endDate: pp.endDate,
          payoutDate: pp.payoutDate,
          displayLabel: `${pp.name} • Payday: ${paydayShort}`,
        });
      }
    });

    // Deduplicate options by id
    const uniqueOptions: typeof options = [];
    const seenIds = new Set<string>();
    options.forEach(opt => {
      if (!seenIds.has(opt.id)) {
        seenIds.add(opt.id);
        uniqueOptions.push(opt);
      }
    });

    return uniqueOptions;
  }, [payPeriods]);

  const [selectedPayPeriodId, setSelectedPayPeriodId] = useState<string>(() => {
    return cutoffOptions[0]?.id || 'CUSTOM';
  });
  const [startDate, setStartDate] = useState<string>(() => {
    return cutoffOptions[0]?.startDate || '2026-09-05';
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return cutoffOptions[0]?.endDate || '2026-09-11';
  });
  const [useCustomRange, setUseCustomRange] = useState<boolean>(false);

  // Edit Modal State
  const [editingDay, setEditingDay] = useState<{
    date: string;
    employee: Employee;
    officialRecord?: DTRRecord;
    draftRecord?: any;
  } | null>(null);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId) || employees[0];

  const employeeShift = useMemo(() => {
    return getEmployeeShift(selectedEmployee);
  }, [getEmployeeShift, selectedEmployee]);

  // Handle Pay Period Selection
  const handlePeriodChange = (periodId: string) => {
    setSelectedPayPeriodId(periodId);
    if (periodId === 'CUSTOM') {
      setUseCustomRange(true);
    } else {
      setUseCustomRange(false);
      const option = cutoffOptions.find(o => o.id === periodId) || payPeriods.find(p => p.id === periodId);
      if (option) {
        setStartDate(option.startDate);
        setEndDate(option.endDate);
      }
    }
  };

  // Direct In-Table Cell Edit Commit handler
  const handleDirectCellCommit = (
    dateStr: string,
    slot: 'p1In' | 'p1Out' | 'p2In' | 'p2Out' | 'p3In' | 'p3Out',
    newTimeVal: string,
    existingRow: any
  ) => {
    if (!selectedEmployee) return;

    // Build the 6 punch slots
    const currentSlots = {
      p1In: existingRow.rawPairs[0]?.timeIn ? toHHMM(existingRow.rawPairs[0].timeIn) : '',
      p1Out: existingRow.rawPairs[0]?.timeOut ? toHHMM(existingRow.rawPairs[0].timeOut) : '',
      p2In: existingRow.rawPairs[1]?.timeIn ? toHHMM(existingRow.rawPairs[1].timeIn) : '',
      p2Out: existingRow.rawPairs[1]?.timeOut ? toHHMM(existingRow.rawPairs[1].timeOut) : '',
      p3In: existingRow.rawPairs[2]?.timeIn ? toHHMM(existingRow.rawPairs[2].timeIn) : '',
      p3Out: existingRow.rawPairs[2]?.timeOut ? toHHMM(existingRow.rawPairs[2].timeOut) : '',
    };

    currentSlots[slot] = newTimeVal;

    // Construct flat punch list
    const unparsed: { time: string; isNextDay: boolean }[] = [];
    const pushIf = (t: string) => {
      if (t && t.trim()) {
        const isNext = t.toLowerCase().includes('+1');
        unparsed.push({ time: toHHMM(t), isNextDay: isNext });
      }
    };

    pushIf(currentSlots.p1In);
    pushIf(currentSlots.p1Out);
    pushIf(currentSlots.p2In);
    pushIf(currentSlots.p2Out);
    pushIf(currentSlots.p3In);
    pushIf(currentSlots.p3Out);

    // Auto-detect next-day wrap
    const punches: UnpairedPunch[] = unparsed.map((p, idx) => {
      let isNext = p.isNextDay;
      if (idx > 0 && p.time) {
        const firstMins = timeToMinutes(unparsed[0].time);
        const currMins = timeToMinutes(p.time);
        if (currMins < firstMins && firstMins >= 720) {
          isNext = true;
        }
      }
      return {
        id: `punch-${idx}`,
        time: p.time,
        isNextDay: isNext,
      };
    });

    const metrics = calculateUnpairedMetrics(punches, employeeShift.startTime, employeeShift.gracePeriodMinutes);
    const formattedRawPunches = punches.map(p => (p.isNextDay ? `${p.time} (+1d)` : p.time));

    const totalHours = metrics.totalHours;
    const ot = metrics.overtimeHours;
    const utHours = metrics.undertimeHours;
    const utMinutes = metrics.undertimeMinutes;
    const lateMinutes = metrics.lateMinutes;

    const timeInFirst = metrics.punchPairs.length > 0 && metrics.punchPairs[0].timeIn ? metrics.punchPairs[0].timeIn : null;
    const timeOutLast = metrics.punchPairs.length > 0 && metrics.punchPairs[metrics.punchPairs.length - 1].timeOut ? metrics.punchPairs[metrics.punchPairs.length - 1].timeOut : null;

    const d = new Date(dateStr + 'T00:00:00');
    const dayType = d.getDay() === 0 || d.getDay() === 6 ? 'Rest Day' : 'Regular Working Day';

    const updatedRecord: DTRRecord = {
      id: existingRow.officialRec?.id || `DTR-${selectedEmployee.id}-${dateStr}`,
      employeeId: selectedEmployee.id,
      employeeNumber: selectedEmployee.employeeNumber,
      biometrixId: selectedEmployee.biometrixId,
      employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
      date: dateStr,
      dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayType,
      timeIn: timeInFirst,
      timeOut: timeOutLast,
      punchPairs: metrics.punchPairs,
      rawPunches: formattedRawPunches,
      regularHours: Math.min(8.0, totalHours),
      totalHours,
      overtimeHours: ot,
      lateMinutes,
      undertimeMinutes: utMinutes,
      undertimeHours: utHours,
      nightDiffHours: metrics.nightDiffHours,
      status: totalHours > 0 ? 'Present' : 'Absent',
      remarks: existingRow.officialRec?.remarks || existingRow.draftRec?.remarks,
      source: 'Adjustment',
    };

    if (batchUpdateDTRRecords) {
      batchUpdateDTRRecords([updatedRecord], `Direct table edit for ${selectedEmployee.firstName} ${selectedEmployee.lastName} on ${dateStr}`);
    }

    if (existingRow.draftRec) {
      const evaluatedAnomalies = evaluateDTRAnomalies({
        rawPunches: formattedRawPunches,
        punchPairs: metrics.punchPairs,
        totalHours,
        hasMatchedEmployee: Boolean(selectedEmployee),
        biometrixPersonId: existingRow.draftRec?.biometrixPersonId,
        isEdited: true,
      });
      const hasAnyAnomaly = evaluatedAnomalies.length > 0;

      updateDraftRecord(existingRow.draftRec.id, {
        rawPunches: formattedRawPunches,
        punchPairs: metrics.punchPairs,
        totalHours,
        totalMinutes: Math.round(totalHours * 60),
        overtimeHours: ot,
        lateMinutes,
        undertimeHours: utHours,
        undertimeMinutes: utMinutes,
        anomalies: evaluatedAnomalies,
        status: hasAnyAnomaly ? 'PENDING' : 'VALIDATED',
      });

      if (!hasAnyAnomaly) {
        validateDraftRecord(existingRow.draftRec.id);
        showToast(`Updated and validated ${dateStr} for ${selectedEmployee.firstName}`, 'success');
      } else {
        showToast(`Updated ${dateStr} with warning: ${evaluatedAnomalies[0].message}`, 'warning');
      }
    } else {
      showToast(`Updated ${dateStr} for ${selectedEmployee.firstName}`);
    }
  };

  // Filter and build timesheet rows for the selected employee across dates
  const timesheetData = useMemo(() => {
    if (!selectedEmployee) return [];

    // Find all official DTR records and draft records for this employee
    const recordsMap = new Map<string, DTRRecord>();

    dtrRecords
      .filter(r => r.employeeId === selectedEmployee.id || r.employeeNumber === selectedEmployee.employeeNumber)
      .forEach(r => {
        recordsMap.set(r.date, r);
      });

    // Also check if any uncommitted drafts exist for this employee
    const draftMap = new Map<string, any>();
    dtrDrafts
      .filter(d => d.status !== 'COMMITTED' && (d.employeeId === selectedEmployee.id || d.biometrixPersonId === selectedEmployee.biometrixId))
      .forEach(d => {
        draftMap.set(d.date, d);
      });

    // Generate list of dates from startDate to endDate
    const rows = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeekShort = days[d.getDay()];
      const monthShort = months[d.getMonth()];
      const dayNum = d.getDate();
      const formattedDateLabel = `${dayOfWeekShort}, ${monthShort} ${dayNum}`;

      const officialRec = recordsMap.get(dateStr);
      const draftRec = draftMap.get(dateStr);

      let punchPairs: { timeIn: string; timeOut: string | null }[] = [];
      let totalHours = 0;
      let ot = 0;
      let utHours = 0;
      let utMinutes = 0;
      let lateMinutes = 0;
      let isDraft = false;
      let hasAnomaly = false;

      if (officialRec) {
        if (officialRec.punchPairs && officialRec.punchPairs.length > 0) {
          punchPairs = officialRec.punchPairs;
        } else if (officialRec.timeIn || officialRec.timeOut) {
          punchPairs = [{ timeIn: officialRec.timeIn || '—', timeOut: officialRec.timeOut || '—' }];
        }
        totalHours = officialRec.totalHours !== undefined ? officialRec.totalHours : (officialRec.regularHours + (officialRec.overtimeHours || 0));
        ot = officialRec.overtimeHours || 0;
        utMinutes = officialRec.undertimeMinutes || 0;
        lateMinutes = officialRec.lateMinutes !== undefined ? officialRec.lateMinutes : 0;
        if (totalHours > 0 && totalHours < 4) {
          // If attendance is less than 4hrs, consider it half day and undertime counts from 4hrs (240 mins)
          utMinutes = Math.max(0, 240 - Math.round(totalHours * 60));
          utHours = Math.round((utMinutes / 60) * 100) / 100;
        } else {
          utHours = officialRec.undertimeHours !== undefined ? officialRec.undertimeHours : (utMinutes > 0 ? Math.round((utMinutes / 60) * 100) / 100 : 0);
        }
      } else if (draftRec) {
        isDraft = true;
        hasAnomaly = draftRec.anomalies.length > 0;
        punchPairs = draftRec.punchPairs;
        totalHours = draftRec.totalHours;
        ot = draftRec.overtimeHours;
        utMinutes = draftRec.undertimeMinutes;
        lateMinutes = draftRec.lateMinutes !== undefined ? draftRec.lateMinutes : 0;
        if (totalHours > 0 && totalHours < 4) {
          utMinutes = Math.max(0, 240 - Math.round(totalHours * 60));
          utHours = Math.round((utMinutes / 60) * 100) / 100;
        } else {
          utHours = draftRec.undertimeHours;
        }
      }

      // Calculate row days worked (less than 4 hours is considered 0.5 days work)
      const rowDays = totalHours >= 4 ? 1 : totalHours > 0 ? 0.5 : 0;

      // Format punch pairs into 3 pairs (In1, Out1, In2, Out2, In3, Out3) - WITHOUT SECONDS
      const p1In = punchPairs[0]?.timeIn ? formatAttendanceTime(punchPairs[0].timeIn, false) : '';
      const p1Out = punchPairs[0]?.timeOut ? formatAttendanceTime(punchPairs[0].timeOut, false) : '';
      const p2In = punchPairs[1]?.timeIn ? formatAttendanceTime(punchPairs[1].timeIn, false) : '';
      const p2Out = punchPairs[1]?.timeOut ? formatAttendanceTime(punchPairs[1].timeOut, false) : '';
      const p3In = punchPairs[2]?.timeIn ? formatAttendanceTime(punchPairs[2].timeIn, false) : '';
      const p3Out = punchPairs[2]?.timeOut ? formatAttendanceTime(punchPairs[2].timeOut, false) : '';

      // Compute tardiness based on assigned shift
      if (p1In && totalHours > 0) {
        const computedLate = calculateLateMinutes(p1In, employeeShift.startTime, employeeShift.gracePeriodMinutes);
        if (officialRec?.lateMinutes !== undefined && officialRec.lateMinutes > 0) {
          lateMinutes = officialRec.lateMinutes;
        } else {
          lateMinutes = computedLate;
        }
      }

      rows.push({
        date: dateStr,
        dateLabel: formattedDateLabel,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        p1In,
        p1Out,
        p2In,
        p2Out,
        p3In,
        p3Out,
        rawPairs: punchPairs,
        totalHours,
        rowDays,
        ot,
        utHours,
        utMinutes,
        lateMinutes,
        isDraft,
        hasAnomaly,
        hasRecord: !!(officialRec || draftRec),
        officialRec,
        draftRec,
      });
    }

    return rows;
  }, [selectedEmployee, dtrRecords, dtrDrafts, startDate, endDate, employeeShift]);

  // Grand Totals calculation
  const totals = useMemo(() => {
    let sumTotalHours = 0;
    let sumTotalDays = 0;
    let sumOT = 0;
    let sumUTMinutes = 0;
    let sumUTHours = 0;
    let sumLateMinutes = 0;
    let daysWithWork = 0;

    timesheetData.forEach(row => {
      if (row.totalHours > 0) {
        daysWithWork += 1;
        sumTotalDays += row.rowDays;
        sumTotalHours += row.totalHours;
        sumOT += row.ot;
        sumUTMinutes += row.utMinutes;
        sumUTHours += row.utHours;
        sumLateMinutes += row.lateMinutes;
      }
    });

    return {
      totalHours: Math.round(sumTotalHours * 10) / 10,
      totalDays: sumTotalDays,
      totalOT: Math.round(sumOT * 10) / 10,
      totalUTMinutes: sumUTMinutes,
      totalUTHours: Math.round(sumUTHours * 100) / 100,
      totalLateMinutes: sumLateMinutes,
      daysWithWork,
    };
  }, [timesheetData]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!selectedEmployee) return;

    const headers = ['Date', 'Time In 1', 'Time Out 1', 'Time In 2', 'Time Out 2', 'Time In 3', 'Time Out 3', 'Total Hours', 'OT (Hours)', 'UT (Hours)', 'Late (Minutes)'];
    const csvRows = timesheetData.map(r => [
      r.dateLabel,
      r.p1In,
      r.p1Out,
      r.p2In,
      r.p2Out,
      r.p3In,
      r.p3Out,
      r.totalHours ? r.totalHours.toFixed(1) : '',
      r.ot ? r.ot.toFixed(1) : '',
      r.utHours ? r.utHours.toFixed(2) : '',
      r.lateMinutes ? `${r.lateMinutes} mins` : '',
    ]);

    // Add Summary Row
    csvRows.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      '',
      totals.totalHours.toFixed(1),
      totals.totalOT.toFixed(1),
      `${totals.totalUTHours.toFixed(2)} (${totals.totalUTMinutes} mins)`,
      `${totals.totalLateMinutes} mins`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [
      `"Timesheet Summary - ${selectedEmployee.firstName} ${selectedEmployee.lastName} (${selectedEmployee.employeeNumber})"`,
      `"Period: ${startDate} to ${endDate}"`,
      '',
      headers.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Timesheet_${selectedEmployee.lastName}_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Timesheet exported for ${selectedEmployee.firstName} ${selectedEmployee.lastName}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const pendingDraftsCount = dtrDrafts.filter(d => d.status === 'PENDING' || d.status === 'VALIDATED').length;

  return (
    <div id="dtr-employee-summary-view" className="space-y-4">
      {/* Top Filter & Action Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Employee Selector & Cutoff Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Employee Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="summary-emp-select" className="text-xs font-semibold text-slate-600 whitespace-nowrap flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Employee:
              </label>
              <select
                id="summary-emp-select"
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-400 min-w-[220px]"
              >
                {employees.map((emp, empIdx) => (
                  <option key={`${emp.id}-${empIdx}`} value={emp.id}>
                    {emp.lastName}, {emp.firstName} ({emp.employeeNumber}) {emp.biometrixId ? `[Bio: ${emp.biometrixId}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Pay Period / Preset Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="summary-period-select" className="text-xs font-semibold text-slate-600 whitespace-nowrap flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Cutoff Period:
              </label>
              <select
                id="summary-period-select"
                value={useCustomRange ? 'CUSTOM' : selectedPayPeriodId}
                onChange={e => handlePeriodChange(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-400"
              >
                {cutoffOptions.map((opt, optIdx) => (
                  <option key={`${opt.id}-${optIdx}`} value={opt.id}>
                    {opt.displayLabel}
                  </option>
                ))}
                <option value="CUSTOM">Custom Date Range (Biometrics Sync)</option>
              </select>
            </div>

            {/* Date Pickers */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 px-2 py-1 rounded border border-slate-200 text-xs">
              <input
                id="summary-start-date"
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setUseCustomRange(true);
                }}
                className="bg-transparent border-0 text-slate-700 font-mono text-xs focus:ring-0 p-0"
              />
              <span className="text-slate-400 font-mono">→</span>
              <input
                id="summary-end-date"
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setUseCustomRange(true);
                }}
                className="bg-transparent border-0 text-slate-700 font-mono text-xs focus:ring-0 p-0"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {pendingDraftsCount > 0 && (
              <button
                id="btn-view-staging-drafts"
                onClick={onOpenDraftStaging}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors shadow-2xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span>Review Drafts ({pendingDraftsCount})</span>
              </button>
            )}

            <button
              id="btn-upload-biometrics-summary"
              onClick={onOpenUploadModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import Biometrics CSV</span>
            </button>

            <button
              id="btn-export-timesheet-csv"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
              title="Export as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              id="btn-print-timesheet"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
              title="Print timesheet"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Employee Quick Info & Metrics Strip */}
      {selectedEmployee && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-white border border-slate-200 rounded p-2.5 flex items-center gap-2.5">
            <img
              src={selectedEmployee.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={selectedEmployee.firstName}
              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 truncate">
                {selectedEmployee.firstName} {selectedEmployee.lastName}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono truncate">
                {selectedEmployee.employeeNumber} • Bio ID: {selectedEmployee.biometrixId || 'None'}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-2 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Days Worked</span>
              <span className="text-sm font-bold text-slate-900">{totals.daysWithWork} days</span>
            </div>
            <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-2 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Total Work Hours</span>
              <span className="text-sm font-bold text-slate-900 font-mono">{totals.totalHours.toFixed(1)} hrs</span>
            </div>
            <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-2 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Overtime (OT)</span>
              <span className="text-sm font-bold text-amber-700 font-mono">{totals.totalOT.toFixed(1)} hrs</span>
              <span className="text-[10px] text-slate-400 block">Round down 30m</span>
            </div>
            <div className="w-7 h-7 rounded bg-amber-50 flex items-center justify-center text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-2 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Undertime (UT)</span>
              <span className="text-sm font-bold text-rose-700 font-mono">{totals.totalUTHours.toFixed(2)} hrs</span>
              <span className="text-[10px] text-slate-400 block">{totals.totalUTMinutes} mins total</span>
            </div>
            <div className="w-7 h-7 rounded bg-rose-50 flex items-center justify-center text-rose-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-2 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Tardiness (Late)</span>
              <span className="text-sm font-bold text-orange-700 font-mono">{totals.totalLateMinutes} mins</span>
              <span className="text-[10px] text-slate-400 block">
                {employeeShift ? `${employeeShift.name.split(' (')[0]} (${employeeShift.startTime})` : 'Shift benchmark'}
              </span>
            </div>
            <div className="w-7 h-7 rounded bg-orange-50 flex items-center justify-center text-orange-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Main Timesheet Table (Exact visual layout with in-table editing and modal action column) */}
      <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table id="dtr-timesheet-summary-table" className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 divide-x divide-slate-200">
                <th className="py-2 px-3 font-bold uppercase tracking-wider text-[11px] w-[130px]">
                  Date
                </th>
                <th className="py-2 px-2 font-bold uppercase tracking-wider text-[11px] text-center min-w-[75px]">
                  Time In
                </th>
                <th className="py-2 px-2 font-bold uppercase tracking-wider text-[11px] text-center min-w-[75px]">
                  Time Out
                </th>
                <th className="py-2 px-2 font-bold uppercase tracking-wider text-[11px] text-center min-w-[75px]">
                  Time In
                </th>
                <th className="py-2 px-2 font-bold uppercase tracking-wider text-[11px] text-center min-w-[75px]">
                  Time Out
                </th>
                <th className="py-2 px-2 font-bold uppercase tracking-wider text-[11px] text-center min-w-[75px]">
                  Time In
                </th>
                <th className="py-2 px-2 font-bold uppercase tracking-wider text-[11px] text-center min-w-[75px]">
                  Time Out
                </th>
                <th className="py-2 px-3 font-bold uppercase tracking-wider text-[11px] text-center bg-slate-200/70 w-[130px] min-w-[120px] max-w-[135px]">
                  Total Hours / Days
                </th>
                <th className="py-2 px-3 font-bold uppercase tracking-wider text-[11px] text-right bg-amber-100/70 text-amber-900 w-[65px]">
                  OT
                </th>
                <th className="py-2 px-3 font-bold uppercase tracking-wider text-[11px] text-right bg-rose-100/70 text-rose-900 w-[65px]">
                  UT
                </th>
                <th className="py-2 px-3 font-bold uppercase tracking-wider text-[11px] text-right bg-orange-100/70 text-orange-900 w-[65px]">
                  Late
                </th>
                <th className="py-2 px-2 font-bold uppercase tracking-wider text-[11px] text-center bg-indigo-50/80 text-indigo-900 w-[75px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {timesheetData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-500 font-sans">
                    No attendance records found for this employee in the selected date range.
                  </td>
                </tr>
              ) : (
                timesheetData.map((row, idx) => {
                  const hasWork = row.totalHours > 0;
                  const isWeekend = row.isWeekend;

                  return (
                    <tr
                      key={`${row.date}-${idx}`}
                      className={`divide-x divide-slate-200 transition-colors ${
                        isWeekend && !hasWork
                          ? 'bg-slate-50/70 text-slate-400'
                          : row.isDraft
                          ? 'bg-amber-50/40 hover:bg-amber-50'
                          : idx % 2 === 0
                          ? 'bg-white hover:bg-slate-50/80'
                          : 'bg-slate-50/30 hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Date */}
                      <td className="py-1.5 px-3 font-sans font-medium text-slate-800 whitespace-nowrap">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-semibold">{row.dateLabel}</span>
                          <div className="flex items-center gap-1">
                            {row.hasAnomaly && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded shadow-2xs animate-pulse"
                                title={row.draftRec?.anomalies.map((a: any) => a.message).join(' • ') || 'Needs Review'}
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                                <span>Needs Review</span>
                              </span>
                            )}
                            {row.isDraft && !row.hasAnomaly && (
                              <span className="text-[9px] font-sans px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 uppercase">
                                Validated
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Pair 1 - Time In */}
                      <td className="p-0.5 text-center">
                        <EditableTimeCell
                          value={row.p1In}
                          isWeekend={isWeekend}
                          hasWork={hasWork}
                          ariaLabel={`${row.dateLabel} Time In 1`}
                          onCommit={val => handleDirectCellCommit(row.date, 'p1In', val, row)}
                        />
                      </td>

                      {/* Pair 1 - Time Out */}
                      <td className="p-0.5 text-center">
                        <EditableTimeCell
                          value={row.p1Out}
                          isWeekend={isWeekend}
                          hasWork={hasWork}
                          ariaLabel={`${row.dateLabel} Time Out 1`}
                          onCommit={val => handleDirectCellCommit(row.date, 'p1Out', val, row)}
                        />
                      </td>

                      {/* Pair 2 - Time In */}
                      <td className="p-0.5 text-center">
                        <EditableTimeCell
                          value={row.p2In}
                          isWeekend={isWeekend}
                          hasWork={hasWork}
                          ariaLabel={`${row.dateLabel} Time In 2`}
                          onCommit={val => handleDirectCellCommit(row.date, 'p2In', val, row)}
                        />
                      </td>

                      {/* Pair 2 - Time Out */}
                      <td className="p-0.5 text-center">
                        <EditableTimeCell
                          value={row.p2Out}
                          isWeekend={isWeekend}
                          hasWork={hasWork}
                          ariaLabel={`${row.dateLabel} Time Out 2`}
                          onCommit={val => handleDirectCellCommit(row.date, 'p2Out', val, row)}
                        />
                      </td>

                      {/* Pair 3 - Time In */}
                      <td className="p-0.5 text-center">
                        <EditableTimeCell
                          value={row.p3In}
                          isWeekend={isWeekend}
                          hasWork={hasWork}
                          ariaLabel={`${row.dateLabel} Time In 3`}
                          onCommit={val => handleDirectCellCommit(row.date, 'p3In', val, row)}
                        />
                      </td>

                      {/* Pair 3 - Time Out */}
                      <td className="p-0.5 text-center">
                        <EditableTimeCell
                          value={row.p3Out}
                          isWeekend={isWeekend}
                          hasWork={hasWork}
                          ariaLabel={`${row.dateLabel} Time Out 3`}
                          onCommit={val => handleDirectCellCommit(row.date, 'p3Out', val, row)}
                        />
                      </td>

                      {/* Total Hours / Days */}
                      <td className="py-1.5 px-2 text-center font-bold text-slate-900 bg-slate-50 whitespace-nowrap w-[130px] max-w-[135px]">
                        {row.totalHours > 0 ? (
                          <div className="flex items-center justify-center gap-1 font-mono">
                            <span>{row.totalHours.toFixed(1)}</span>
                            <span className="text-slate-400 font-normal">/</span>
                            <span className="text-indigo-700 font-semibold">{row.rowDays}</span>
                          </div>
                        ) : hasWork ? (
                          <span className="text-slate-400 font-normal font-mono">0 / 0</span>
                        ) : ''}
                      </td>

                      {/* OT */}
                      <td className={`py-1.5 px-3 text-right font-bold w-[65px] ${row.ot > 0 ? 'text-amber-800 bg-amber-50/60 font-black' : 'text-slate-400'}`}>
                        {row.ot > 0 ? row.ot.toFixed(1) : hasWork ? '0' : ''}
                      </td>

                      {/* UT */}
                      <td className={`py-1.5 px-3 text-right font-bold w-[65px] ${row.utHours > 0 ? 'text-rose-800 bg-rose-50/60' : 'text-slate-400'}`}>
                        {row.utHours > 0 ? row.utHours.toFixed(2) : hasWork ? '0' : ''}
                      </td>

                      {/* Late */}
                      <td className={`py-1.5 px-3 text-right font-bold w-[65px] ${row.lateMinutes > 0 ? 'text-orange-700 bg-orange-50/70 font-black' : 'text-slate-400'}`}>
                        {row.lateMinutes > 0 ? row.lateMinutes : hasWork ? '0' : ''}
                      </td>

                      {/* Action Column - Edit in modal with full form */}
                      <td className="py-1 px-1.5 text-center bg-indigo-50/30">
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => {
                            setEditingDay({
                              date: row.date,
                              employee: selectedEmployee,
                              officialRecord: row.officialRec,
                              draftRecord: row.draftRec,
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200 transition-colors shadow-2xs font-sans"
                          title="Open full editor modal"
                          aria-label={`Edit ${row.dateLabel} logs`}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Bottom Grand Summary Bar (Matching Screenshot Totals) */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-mono font-bold text-xs divide-x divide-slate-800 border-t-2 border-slate-950">
                <td colSpan={7} className="py-2.5 px-4 font-sans uppercase tracking-wider text-slate-200">
                  Total (Cutoff Attendance Summary)
                </td>
                <td className="py-2.5 px-2 text-center text-emerald-300 font-bold whitespace-nowrap w-[130px] max-w-[135px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>{totals.totalHours.toFixed(1)} hrs</span>
                    <span className="text-slate-500 font-normal">/</span>
                    <span className="text-indigo-300">
                      {totals.totalDays} {totals.totalDays === 0.5 || totals.totalDays === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right text-amber-300 font-bold whitespace-nowrap w-[65px]">
                  {totals.totalOT > 0 ? `${totals.totalOT.toFixed(1)} hrs` : '0 hrs'}
                </td>
                <td className="py-2.5 px-3 text-right text-rose-300 font-bold whitespace-nowrap w-[65px]">
                  {totals.totalUTMinutes > 0 ? `${totals.totalUTMinutes} mins` : '0 mins'}
                </td>
                <td className="py-2.5 px-3 text-right text-orange-300 font-bold whitespace-nowrap w-[65px]">
                  {totals.totalLateMinutes > 0 ? `${totals.totalLateMinutes} mins` : '0 mins'}
                </td>
                <td className="py-2.5 px-2 bg-slate-900 w-[75px]"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer Notes on Calculation Rules */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Timesheet Editing:</span>
            <span>Click any time cell to edit directly with instant recalculation on blur, or click <strong>Edit</strong> for shift rows and overrides.</span>
          </div>
          <div className="font-mono text-slate-500">
            Total Undertime: <span className="font-bold text-slate-800">{totals.totalUTHours.toFixed(2)} hrs</span> ({totals.totalUTMinutes} mins)
          </div>
        </div>
      </div>

      {/* Edit Modal reusing draft form logic */}
      {editingDay && (
        <DTREditDayModal
          date={editingDay.date}
          employee={editingDay.employee}
          officialRecord={editingDay.officialRecord}
          draftRecord={editingDay.draftRecord}
          onClose={() => setEditingDay(null)}
        />
      )}
    </div>
  );
};

