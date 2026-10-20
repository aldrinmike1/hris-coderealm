import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Payslip, DayType, DTRRecord, DTRPunchPair, DTRStatus } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { calculateCutoffContributions, calculateMonthlySSS } from '../../utils/calculations';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  X,
  Edit3,
  Calculator,
  Clock,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  Sparkles,
  Building2,
  Calendar,
  Layers,
  HelpCircle,
  Sun,
  Moon,
  Trash2,
  Plus,
  ArrowDownUp,
  AlertTriangle,
  CheckCircle,
  FileText,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PayslipEditModalProps {
  isOpen: boolean;
  payslip: Payslip | null;
  onClose: () => void;
}

interface UnpairedPunch {
  id: string;
  time: string; // "HH:mm"
  isNextDay?: boolean; // True if next calendar day (+1d overnight shift)
}

interface DailyAttendanceItem {
  id: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  dayType: DayType;
  punches: UnpairedPunch[];
  regularHours: number;
  totalHours: number;
  overtimeHours: number;
  lateMinutes: number;
  undertimeMinutes: number;
  nightDiffHours: number;
  status: DTRStatus;
  remarks: string;
  isModified?: boolean;
}

/**
 * Standardize time string into HH:mm or HH:mm:ss
 */
function toHHMM(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const clean = timeStr.trim().replace(/\s*\(\+1d\)/i, '');
  return clean;
}

/**
 * Format date string (YYYY-MM-DD) into format "Sat, Aug 15"
 */
function formatTableDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    return `${dayName}, ${monthName} ${parseInt(parts[2], 10)}`;
  }
  return dateStr;
}

/**
 * Convert HH:mm or HH:mm:ss to minutes from midnight
 */
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().replace(/\s*\(\+1d\)/i, '');
  const [h, m] = clean.split(':').map(n => parseInt(n, 10) || 0);
  return h * 60 + m;
}

/**
 * Check if a timestamp string has the (+1d) tag
 */
function checkIsNextDayString(val: string | null | undefined): boolean {
  if (!val) return false;
  return val.toLowerCase().includes('+1d');
}

/**
 * Get effective minutes from midnight on Day 1 (0 to 2880)
 */
function getEffectiveMinutes(punch: UnpairedPunch): number {
  const baseMinutes = timeToMinutes(punch.time);
  return baseMinutes + (punch.isNextDay ? 1440 : 0);
}

/**
 * Direct Editable Time Input for the Excel-Style Table
 */
function DirectTimeCell({
  value,
  isNextDay,
  onCommit,
  placeholder = '',
  ariaLabel,
}: {
  value: string;
  isNextDay?: boolean;
  onCommit: (val: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [val, setVal] = useState(value || '');

  useEffect(() => {
    setVal(value || '');
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Backspace') {
      // If input currently ends with ':' (e.g. "08:") and cursor is at the end,
      // remove both the colon and the second digit so the user returns to "0" cleanly
      if (
        val.endsWith(':') &&
        e.currentTarget.selectionStart === val.length &&
        e.currentTarget.selectionEnd === val.length
      ) {
        e.preventDefault();
        setVal(val.slice(0, -2));
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    if (!raw) {
      setVal('');
      return;
    }

    const isDeleting = raw.length < val.length;
    if (isDeleting) {
      setVal(raw);
      return;
    }

    // Keep numbers, colon, letters/spaces for next day tags
    let cleaned = raw.replace(/[^0-9:a-zA-Z\s+]/g, '');

    // Automatically add ':' (colon) after inputting 2 digits
    if (/^\d{2}$/.test(cleaned)) {
      cleaned = cleaned + ':';
    } else if (/^\d{4}$/.test(cleaned)) {
      // 4 pure digits typed/pasted e.g. "0830" -> "08:30"
      cleaned = `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`;
    } else if (/^\d{6}$/.test(cleaned)) {
      // 6 pure digits typed/pasted e.g. "102418" -> "10:24:18"
      cleaned = `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}:${cleaned.slice(4, 6)}`;
    } else if (/^\d{2}:\d{2}\d+$/.test(cleaned) && cleaned.length === 6 && !cleaned.includes(':', 3)) {
      // Seconds entry transition e.g. "08:301" -> "08:30:1"
      cleaned = `${cleaned.slice(0, 5)}:${cleaned.slice(5)}`;
    }

    // Prevent duplicate consecutive colons like "::"
    cleaned = cleaned.replace(/:{2,}/g, ':');

    setVal(cleaned);
  };

  const handleBlur = () => {
    let finalVal = val.trim();
    // If left as "08:" or "8:" on blur, format to standard HH:00
    if (/^\d{1,2}:$/.test(finalVal)) {
      const h = finalVal.replace(':', '').padStart(2, '0');
      finalVal = `${h}:00`;
      setVal(finalVal);
    }
    if (finalVal !== (value || '')) {
      onCommit(finalVal);
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center min-w-[72px]">
      <input
        type="text"
        value={val}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        maxLength={15}
        className="w-full text-center py-1.5 px-1 bg-transparent hover:bg-slate-100/70 focus:bg-white text-slate-900 font-mono text-xs font-semibold border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded outline-hidden transition-all placeholder:text-slate-300"
      />
      {isNextDay && (
        <span className="absolute right-0.5 text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200 pointer-events-none">
          +1d
        </span>
      )}
    </div>
  );
}

/**
 * Compute night differential minutes falling between 22:00 (10 PM Day 1) and 06:00 (6 AM Day 2)
 */
function calculateNightDiffMinutes(startEffMin: number, endEffMin: number): number {
  if (endEffMin <= startEffMin) return 0;
  const nightStart = 1320; // 10:00 PM
  const nightEnd = 1800; // 06:00 AM next day

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
function calculateUnpairedMetrics(
  punches: UnpairedPunch[],
  shiftStartTime: string = "08:00",
  gracePeriodMinutes: number = 5
): {
  totalHours: number;
  totalMinutes: number;
  regularHours: number;
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
      regularHours: 0,
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
  const regularHours = Math.min(8, totalHours);
  const nightDiffHours = Math.round((totalNightDiffMins / 60) * 10) / 10;

  // Overtime: after 8 hrs of work (480 mins), rounded down by 30 mins (0.5 hrs step)
  let overtimeHours = 0;
  if (totalMinutes > 480) {
    const extraMinutes = totalMinutes - 480;
    overtimeHours = Math.floor(extraMinutes / 30) * 0.5;
  }

  // Late calculation based on employee's shift start time and grace period
  const firstInEff = getEffectiveMinutes(sortedPunches[0]);
  const [startH, startM] = (shiftStartTime || "08:00").split(':').map(Number);
  const shiftStartMin = (startH || 0) * 60 + (startM || 0);
  const isNightShift = firstInEff >= 720 && shiftStartMin < 720;
  const lateMinutes = !isNightShift && firstInEff > shiftStartMin + gracePeriodMinutes ? firstInEff - shiftStartMin : 0;

  // Undertime calculation:
  // - If attendance is less than 4hrs (240 mins), consider it as half day (0.5 days work), and undertime counts from 4hrs (240 mins)
  // - If attendance is 4hrs to 8hrs (480 mins), undertime counts from 8hrs (480 mins)
  let undertimeMinutes = 0;
  let undertimeHours = 0;
  if (totalMinutes > 0) {
    if (totalMinutes < 240) {
      // Under 4 hours: half day work, count undertime against the 4-hour (240 mins) half-day target
      undertimeMinutes = 240 - totalMinutes;
      undertimeHours = Math.round((undertimeMinutes / 60) * 100) / 100;
    } else if (totalMinutes < 480) {
      // 4 hours or more but under 8 hours: regular day, count undertime against the 8-hour (480 mins) target
      undertimeMinutes = 480 - totalMinutes;
      undertimeHours = Math.round((undertimeMinutes / 60) * 100) / 100;
    }
  }

  return {
    totalHours,
    totalMinutes,
    regularHours,
    overtimeHours,
    lateMinutes,
    undertimeMinutes,
    undertimeHours,
    nightDiffHours,
    punchPairs,
  };
}

export const PayslipEditModal: React.FC<PayslipEditModalProps> = ({
  isOpen,
  payslip,
  onClose,
}) => {
  const { updatePayslip, deletePayslip, isAdmin, isManager, payslips, payPeriods, dtrRecords, employees, batchUpdateDTRRecords, companyProfile, getEmployeeShift } = useApp();
  const employee = useMemo(() => {
    if (!payslip) return null;
    return employees.find(e => e.id === payslip.employeeId) || null;
  }, [payslip, employees]);
  const employeeShift = useMemo(() => {
    return employee ? getEmployeeShift(employee) : null;
  }, [employee, getEmployeeShift]);

  // Active Tab: Payslip vs Attendance
  const [activeTab, setActiveTab] = useState<'Payslip' | 'Attendance'>('Payslip');

  // DTR time inputs that drive calculations
  const [daysWorked, setDaysWorked] = useState<number>(0);
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [wdoHours, setWdoHours] = useState<number>(0);
  const [nightDiffHours, setNightDiffHours] = useState<number>(0);
  const [regularHolidayDays, setRegularHolidayDays] = useState<number>(0);
  const [specialHolidayDays, setSpecialHolidayDays] = useState<number>(0);
  const [holidayDays, setHolidayDays] = useState<number>(0);
  const [lateMinutes, setLateMinutes] = useState<number>(0);
  const [undertimeMinutes, setUndertimeMinutes] = useState<number>(0);

  // Monetary Earnings components
  const [basicPay, setBasicPay] = useState<number>(0);
  const [overtimePay, setOvertimePay] = useState<number>(0);
  const [wdoPay, setWdoPay] = useState<number>(0);
  const [holidayPay, setHolidayPay] = useState<number>(0);
  const [nightDiffPay, setNightDiffPay] = useState<number>(0);
  const [allowanceBonus, setAllowanceBonus] = useState<number>(0);

  // Monetary Deductions components
  const [lateUndertimeDeduction, setLateUndertimeDeduction] = useState<number>(0);
  const [sssDeduction, setSssDeduction] = useState<number>(0);
  const [philhealthDeduction, setPhilhealthDeduction] = useState<number>(0);
  const [pagibigDeduction, setPagibigDeduction] = useState<number>(0);
  const [withholdingTax, setWithholdingTax] = useState<number>(0);
  const [mlsDeduction, setMlsDeduction] = useState<number>(0);
  const [cashAdvanceDeduction, setCashAdvanceDeduction] = useState<number>(0);
  const [otherDeduction, setOtherDeduction] = useState<number>(0);

  // SSS Breakdown accordion toggle
  const [showSssBreakdown, setShowSssBreakdown] = useState<boolean>(false);

  const [editReason, setEditReason] = useState<string>('');

  // Confirmation Modal States
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState<boolean>(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [punchToDelete, setPunchToDelete] = useState<{ dateStr: string; punchId: string } | null>(null);

  // Daily Attendance state for the active pay period
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendanceItem[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');

  const dailyRate = payslip?.dailyRate || 0;
  const hourlyRate = dailyRate > 0 ? Math.round((dailyRate / 8) * 100) / 100 : 0;
  const minuteRate = hourlyRate > 0 ? hourlyRate / 60 : 0;
  const otHourlyRate = Math.round(hourlyRate * 1.25 * 100) / 100;
  const wdoHourlyRate = Math.round(hourlyRate * 1.30 * 100) / 100;

  // Find active PayPeriod and Employee Profile
  const currentPeriod = useMemo(() => {
    if (!payslip) return null;
    return payPeriods.find(p => p.id === payslip.payPeriodId) || null;
  }, [payslip, payPeriods]);

  const currentEmp = useMemo(() => {
    if (!payslip) return null;
    return employees.find(e => e.id === payslip.employeeId) || null;
  }, [payslip, employees]);

  // SSS Month Breakdown calculations
  const earlierPayslipsInMonth = useMemo(() => {
    if (!currentEmp || !currentPeriod) return [];
    const currentMonthKey = (currentPeriod.payoutDate || currentPeriod.startDate).substring(0, 7); // e.g. "2026-08" based on payday
    return payslips.filter(p => {
      if (p.employeeId !== currentEmp.id) return false;
      if (p.id === payslip?.id) return false;
      const matchingPeriod = payPeriods.find(pp => pp.id === p.payPeriodId);
      const periodMonthKey = matchingPeriod ? (matchingPeriod.payoutDate || matchingPeriod.startDate).substring(0, 7) : '';
      return periodMonthKey === currentMonthKey;
    });
  }, [payslips, currentEmp, currentPeriod, payslip, payPeriods]);

  const allPaidSSSForMonth = useMemo(() => {
    return earlierPayslipsInMonth.reduce((sum, p) => sum + (p.sssDeduction || 0), 0);
  }, [earlierPayslipsInMonth]);

  const totalSSSExpectedForMonth = useMemo(() => {
    if (!currentEmp) return 0;
    const isLast = Boolean(currentPeriod?.isLastCutoffOfMonth);
    const prevBasic = earlierPayslipsInMonth.reduce((sum, p) => sum + (p.basicPay || 0), 0);
    const monthlyBasic = isLast ? prevBasic + basicPay : Math.max(0, basicPay * 4);
    return calculateMonthlySSS(monthlyBasic).employeeShare;
  }, [currentEmp, currentPeriod, earlierPayslipsInMonth, basicPay]);

  // Load and build daily attendance records for the period when modal opens
  useEffect(() => {
    if (payslip && isOpen) {
      setDaysWorked(payslip.daysWorked ?? 0);
      setOvertimeHours(payslip.overtimeHours ?? 0);
      setWdoHours(payslip.wdoHours ?? 0);

      const regHolidays =
        payslip.regularHolidayDays !== undefined
          ? payslip.regularHolidayDays
          : payslip.holidayDays ?? 0;
      const specHolidays = payslip.specialHolidayDays ?? 0;
      setRegularHolidayDays(regHolidays);
      setSpecialHolidayDays(specHolidays);
      setHolidayDays(payslip.holidayDays ?? regHolidays + specHolidays);

      setLateMinutes(payslip.lateMinutes ?? 0);
      setUndertimeMinutes(payslip.undertimeMinutes ?? 0);

      setBasicPay(payslip.basicPay ?? 0);
      setOvertimePay(payslip.overtimePay ?? 0);
      setWdoPay(payslip.wdoPay ?? 0);
      setHolidayPay(payslip.holidayPay ?? 0);

      const ndHours = payslip.nightDiffHours ?? 0;
      setNightDiffHours(ndHours);
      const ndPay =
        payslip.nightDiffPay !== undefined
          ? payslip.nightDiffPay
          : companyProfile.enableNightShiftPay
          ? Math.round(ndHours * hourlyRate * 0.10 * 100) / 100
          : 0;
      setNightDiffPay(ndPay);

      setAllowanceBonus(payslip.totalAllowances ?? 0);

      setLateUndertimeDeduction(payslip.lateUndertimeDeduction ?? 0);
      setSssDeduction(payslip.sssDeduction ?? 0);
      setPhilhealthDeduction(payslip.philhealthDeduction ?? 0);
      setPagibigDeduction(payslip.pagibigDeduction ?? 0);
      setWithholdingTax(companyProfile.enableWithholdingTax ? (payslip.withholdingTax ?? 0) : 0);
      setMlsDeduction(payslip.mlsDeduction ?? 0);
      setCashAdvanceDeduction(payslip.cashAdvanceDeduction ?? (currentEmp?.cashAdvanceDeduction ?? 0));
      setOtherDeduction(payslip.totalOtherDeductions ?? 0);

      setEditReason('');
      setActiveTab('Payslip');

      // Build daily attendance items from dtrRecords for the period
      if (currentPeriod) {
        const start = new Date(currentPeriod.startDate);
        const end = new Date(currentPeriod.endDate);
        const items: DailyAttendanceItem[] = [];
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const empRestDays = currentEmp?.restDays && currentEmp.restDays.length > 0 ? currentEmp.restDays : ['Sunday'];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          const dayName = days[d.getDay()];
          const isRestDay = empRestDays.includes(dayName);

          // Find existing record
          const existing = dtrRecords.find(
            r => r.employeeId === payslip.employeeId && r.date === dateStr
          );

          let initialDayType: DayType = isRestDay ? 'Rest Day' : 'Regular Working Day';
          const matchedHoliday = currentPeriod.holidays?.find(hol => hol.date === dateStr);
          if (matchedHoliday) {
            initialDayType = (matchedHoliday.type === 'Regular' || matchedHoliday.type === 'Regular Holiday')
              ? 'Regular Holiday'
              : 'Special Non-Working Holiday';
          }

          if (existing) {
            // Extract punches from rawPunches or punchPairs or timeIn/timeOut
            let extractedPunches: UnpairedPunch[] = [];
            if (existing.rawPunches && existing.rawPunches.length > 0) {
              const firstM = timeToMinutes(existing.rawPunches[0]);
              extractedPunches = existing.rawPunches.map((p, idx) => ({
                id: `p-${idx}-${dateStr}`,
                time: toHHMM(p),
                isNextDay: checkIsNextDayString(p) || (idx > 0 && timeToMinutes(toHHMM(p)) < firstM && firstM >= 720),
              }));
            } else if (existing.punchPairs && existing.punchPairs.length > 0) {
              let count = 0;
              existing.punchPairs.forEach(pair => {
                if (pair.timeIn) {
                  extractedPunches.push({
                    id: `p-in-${count++}-${dateStr}`,
                    time: toHHMM(pair.timeIn),
                    isNextDay: checkIsNextDayString(pair.timeIn),
                  });
                }
                if (pair.timeOut) {
                  extractedPunches.push({
                    id: `p-out-${count++}-${dateStr}`,
                    time: toHHMM(pair.timeOut),
                    isNextDay: checkIsNextDayString(pair.timeOut),
                  });
                }
              });
            } else if (existing.timeIn || existing.timeOut) {
              if (existing.timeIn) {
                extractedPunches.push({
                  id: `p-in-0-${dateStr}`,
                  time: toHHMM(existing.timeIn),
                  isNextDay: checkIsNextDayString(existing.timeIn),
                });
              }
              if (existing.timeOut) {
                extractedPunches.push({
                  id: `p-out-1-${dateStr}`,
                  time: toHHMM(existing.timeOut),
                  isNextDay: checkIsNextDayString(existing.timeOut),
                });
              }
            }

            const metrics = calculateUnpairedMetrics(extractedPunches, employeeShift?.startTime, employeeShift?.gracePeriodMinutes);
            const effTotalHours = existing.totalHours ?? metrics.totalHours;
            let effUndertimeMins = existing.undertimeMinutes ?? metrics.undertimeMinutes;
            if (extractedPunches.length > 0) {
              effUndertimeMins = metrics.undertimeMinutes;
            } else if (effTotalHours > 0 && effTotalHours < 4) {
              // Count undertime from 4hrs (240 mins) for half day
              effUndertimeMins = Math.max(0, 240 - Math.round(effTotalHours * 60));
            }

            items.push({
              id: existing.id || `DTR-${payslip.employeeId}-${dateStr}`,
              date: dateStr,
              dayOfWeek: dayName,
              dayType: matchedHoliday ? initialDayType : (existing.dayType || initialDayType),
              punches: extractedPunches,
              regularHours: existing.regularHours ?? metrics.regularHours,
              totalHours: effTotalHours,
              overtimeHours: existing.overtimeHours ?? metrics.overtimeHours,
              lateMinutes: existing.lateMinutes ?? metrics.lateMinutes,
              undertimeMinutes: effUndertimeMins,
              nightDiffHours: existing.nightDiffHours ?? metrics.nightDiffHours,
              status: existing.status ?? (effTotalHours >= 4 ? 'Present' : effTotalHours > 0 ? 'Half Day' : (isRestDay ? 'Rest Day' : 'Absent')),
              remarks: existing.remarks || '',
            });
          } else {
            // Missing record fallback
            items.push({
              id: `DTR-${payslip.employeeId}-${dateStr}`,
              date: dateStr,
              dayOfWeek: dayName,
              dayType: initialDayType,
              punches: [],
              regularHours: 0,
              totalHours: 0,
              overtimeHours: 0,
              lateMinutes: 0,
              undertimeMinutes: 0,
              nightDiffHours: 0,
              status: isRestDay ? 'Rest Day' : 'Absent',
              remarks: '',
            });
          }
        }

        setDailyAttendance(items);
        if (items.length > 0) {
          setSelectedDateStr(items[0].date);
        }
      }
    }
  }, [payslip, isOpen, currentPeriod, currentEmp, dtrRecords]);

  // Selected Day item for Attendance tab
  const activeDayItem = dailyAttendance.find(d => d.date === selectedDateStr) || dailyAttendance[0];

  // Helper to recompute statutory government contributions (SSS, PhilHealth, Pag-IBIG)
  // automatically whenever basicPay changes
  const recalculateGovtContributions = (newBasicPay: number) => {
    if (!currentEmp) return;
    const isLast = Boolean(currentPeriod?.isLastCutoffOfMonth);

    let prevContributions = undefined;
    if (isLast && currentPeriod) {
      const currentMonthKey = (currentPeriod.payoutDate || currentPeriod.startDate).substring(0, 7); // e.g. "2026-08" based on payday
      // Find all earlier payslips for this employee in the same month
      const earlierPayslips = payslips.filter(p => {
        if (p.employeeId !== currentEmp.id) return false;
        if (p.payPeriodId === currentPeriod.id) return false;
        const matchingPeriod = payPeriods.find(pp => pp.id === p.payPeriodId);
        const periodMonthKey = matchingPeriod ? (matchingPeriod.payoutDate || matchingPeriod.startDate).substring(0, 7) : '';
        return periodMonthKey === currentMonthKey;
      });

      const sssEE = earlierPayslips.reduce((sum, p) => sum + (p.sssDeduction || 0), 0);
      const sssER = earlierPayslips.reduce((sum, p) => sum + (p.sssEmployerShare || 0), 0);
      const philhealthEE = earlierPayslips.reduce((sum, p) => sum + (p.philhealthDeduction || 0), 0);
      const philhealthER = earlierPayslips.reduce((sum, p) => sum + (p.philhealthEmployerShare || 0), 0);
      const pagibigEE = earlierPayslips.reduce((sum, p) => sum + (p.pagibigDeduction || 0), 0);
      const pagibigER = earlierPayslips.reduce((sum, p) => sum + (p.pagibigEmployerShare || 0), 0);
      const basicPaySum = earlierPayslips.reduce((sum, p) => sum + (p.basicPay || 0), 0);

      prevContributions = {
        sssEE,
        sssER,
        philhealthEE,
        philhealthER,
        pagibigEE,
        pagibigER,
        basicPaySum,
      };
    }

    const hasSSS = Boolean(currentEmp.sssEnabled !== false && currentEmp.sssNumber && currentEmp.sssNumber.trim());
    const hasPhilHealth = Boolean(currentEmp.philhealthEnabled !== false && currentEmp.philhealthNumber && currentEmp.philhealthNumber.trim());
    const hasPagIbig = Boolean(currentEmp.pagibigEnabled !== false && currentEmp.pagibigNumber && currentEmp.pagibigNumber.trim());

    const result = calculateCutoffContributions({
      cutoffBasicPay: newBasicPay,
      isLastCutoffOfMonth: isLast,
      previousContributionsInMonth: prevContributions,
      hasSSS,
      hasPhilHealth,
      hasPagIbig,
    });

    setSssDeduction(result.sss.employeeShare);
    setPhilhealthDeduction(result.philhealth.employeeShare);
    setPagibigDeduction(result.pagibig.employeeShare);
  };

  // Helper to recompute period attendance totals and update payslip drivers
  const syncAttendanceToPayslipDrivers = (updatedItems: DailyAttendanceItem[]) => {
    let totDaysWorked = 0;
    let totOT = 0;
    let totWDO = 0;
    let totRegHolidays = 0;
    let totSpecHolidays = 0;
    let totLate = 0;
    let totUndertime = 0;

    updatedItems.forEach(item => {
      const isRest = item.dayType === 'Rest Day';
      const isRegHol = item.dayType === 'Regular Holiday';
      const isSpecHol = item.dayType === 'Special Non-Working Holiday';

      if (isRest) {
        // Worked hours on Rest Day count as WDO (130%)
        if (item.totalHours > 0) {
          totWDO += item.totalHours;
        }
      } else {
        // Regular work day
        if (item.totalHours >= 4) {
          totDaysWorked += 1;
        } else if (item.totalHours > 0) {
          totDaysWorked += 0.5;
        }

        totOT += item.overtimeHours || 0;
      }

      if (isRegHol) {
        if (item.totalHours > 0) {
          totRegHolidays += item.totalHours >= 4 ? 1 : 0.5;
        } else {
          // Unworked Regular Holiday: DOLE Art. 94 grants 100% daily wage (1 day regular holiday pay)
          totRegHolidays += 1;
        }
      } else if (isSpecHol && item.totalHours > 0) {
        totSpecHolidays += item.totalHours >= 4 ? 1 : 0.5;
      }

      totLate += item.lateMinutes || 0;
      if (!isRest && item.undertimeMinutes > 0) {
        totUndertime += item.undertimeMinutes;
      }
    });

    // Update time states
    setDaysWorked(totDaysWorked);
    setOvertimeHours(totOT);
    setWdoHours(totWDO);
    setRegularHolidayDays(totRegHolidays);
    setSpecialHolidayDays(totSpecHolidays);
    setHolidayDays(totRegHolidays + totSpecHolidays);
    setLateMinutes(totLate);
    setUndertimeMinutes(totUndertime);

    const totNightDiff = updatedItems.reduce((acc, it) => acc + (it.nightDiffHours || 0), 0);
    setNightDiffHours(Math.round(totNightDiff * 10) / 10);

    // Update monetary calculations
    const newBasic = Math.round(totDaysWorked * dailyRate * 100) / 100;
    const newOTPay = Math.round(totOT * otHourlyRate * 100) / 100;
    const newWDOPay = Math.round(totWDO * wdoHourlyRate * 100) / 100;
    const newHolPay = Math.round(((totRegHolidays * dailyRate * 1.0) + (totSpecHolidays * dailyRate * 0.30)) * 100) / 100;
    const newLateUTDed = Math.round((totLate + totUndertime) * minuteRate * 100) / 100;
    const newNDPay = companyProfile.enableNightShiftPay
      ? Math.round(totNightDiff * hourlyRate * 0.10 * 100) / 100
      : 0;

    setBasicPay(newBasic);
    setOvertimePay(newOTPay);
    setWdoPay(newWDOPay);
    setHolidayPay(newHolPay);
    setNightDiffPay(newNDPay);
    setLateUndertimeDeduction(newLateUTDed);
    recalculateGovtContributions(newBasic);
  };

  // Dynamic Punch Pair Count for Excel-style table (at least 3 sets of Time In/Out)
  const [extraPairColumns, setExtraPairColumns] = useState<number>(0);

  const maxPunchPairs = useMemo(() => {
    let maxPairs = 3;
    dailyAttendance.forEach(item => {
      const pairsCount = Math.ceil((item.punches?.length || 0) / 2);
      if (pairsCount > maxPairs) {
        maxPairs = pairsCount;
      }
    });
    return maxPairs + extraPairColumns;
  }, [dailyAttendance, extraPairColumns]);

  // Cutoff period totals for Attendance summary row
  const cutoffSummary = useMemo(() => {
    let totalHours = 0;
    let totalDays = 0;
    let totalOT = 0;
    let totalUTMins = 0;
    let totalUTHrs = 0;
    let totalLateMins = 0;

    dailyAttendance.forEach(d => {
      const isRest = d.dayType === 'Rest Day';
      totalHours += d.totalHours || 0;
      
      // Calculate row days worked (less than 4 hours is considered 0.5 days work)
      if (!isRest) {
        if (d.totalHours >= 4) {
          totalDays += 1;
        } else if (d.totalHours > 0) {
          totalDays += 0.5;
        }
      } else if (d.totalHours > 0) {
        // Work on rest day
        totalDays += d.totalHours >= 4 ? 1 : 0.5;
      }

      totalOT += d.overtimeHours || 0;
      if (!isRest && d.undertimeMinutes > 0) {
        totalUTMins += d.undertimeMinutes;
        totalUTHrs += Math.round((d.undertimeMinutes / 60) * 100) / 100;
      }
      totalLateMins += d.lateMinutes || 0;
    });

    const roundedUTHrs = Math.round(totalUTHrs * 100) / 100;
    const finalUTMins = totalUTMins;

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      totalDays,
      totalOT: Math.round(totalOT * 10) / 10,
      totalUTMins: finalUTMins,
      totalUTHrs: roundedUTHrs,
      totalLateMins,
    };
  }, [dailyAttendance]);

  // Handler for directly editing Time In / Time Out cells on the table
  const handleDirectTableCellChange = (
    dateStr: string,
    punchIndex: number,
    newTimeValue: string
  ) => {
    const nextItems = dailyAttendance.map(item => {
      if (item.date !== dateStr) return item;

      const punches = [...item.punches];
      const cleanTime = newTimeValue.trim();

      if (cleanTime === '') {
        if (punchIndex < punches.length) {
          punches[punchIndex] = {
            ...punches[punchIndex],
            time: '',
          };
        }
      } else {
        while (punches.length <= punchIndex) {
          punches.push({
            id: `p-${punches.length}-${dateStr}-${Date.now()}`,
            time: '',
          });
        }

        const prevPunch = punches[punchIndex];
        const newMins = timeToMinutes(cleanTime);
        let nextDayFlag = prevPunch?.isNextDay || checkIsNextDayString(cleanTime);

        if (punchIndex > 0) {
          const firstMins = timeToMinutes(punches[0]?.time || '');
          if (newMins < firstMins && firstMins >= 720) {
            nextDayFlag = true;
          } else if (newMins >= firstMins && !checkIsNextDayString(cleanTime)) {
            nextDayFlag = false;
          }
        }

        punches[punchIndex] = {
          id: prevPunch?.id || `p-${punchIndex}-${dateStr}-${Date.now()}`,
          time: cleanTime.replace(/\s*\(\+1d\)/i, ''),
          isNextDay: nextDayFlag,
        };
      }

      // Filter to valid non-empty punches
      const validPunches = punches.filter(p => p.time && p.time.trim().length > 0);
      const metrics = calculateUnpairedMetrics(validPunches, employeeShift?.startTime, employeeShift?.gracePeriodMinutes);
      const isRest = item.dayType === 'Rest Day';
      const isHol = item.dayType.includes('Holiday');

      const updatedStatus: DTRStatus =
        metrics.totalHours >= 4
          ? metrics.lateMinutes > 0
            ? 'Late'
            : 'Present'
          : metrics.totalHours > 0
          ? 'Half Day'
          : isRest
          ? 'Rest Day'
          : isHol
          ? 'Holiday'
          : 'Absent';

      return {
        ...item,
        punches: validPunches,
        regularHours: metrics.regularHours,
        totalHours: metrics.totalHours,
        overtimeHours: metrics.overtimeHours,
        lateMinutes: metrics.lateMinutes,
        undertimeMinutes: metrics.undertimeMinutes,
        nightDiffHours: metrics.nightDiffHours,
        status: updatedStatus,
        isModified: true,
      };
    });

    setDailyAttendance(nextItems);
    syncAttendanceToPayslipDrivers(nextItems);
  };

  const handleDayTypeChange = (dateStr: string, newType: DayType) => {
    const nextItems = dailyAttendance.map(item => {
      if (item.date !== dateStr) return item;
      const isRest = newType === 'Rest Day';
      const isHol = newType.includes('Holiday');
      const updatedStatus: DTRStatus =
        item.totalHours >= 4
          ? item.lateMinutes > 0
            ? 'Late'
            : 'Present'
          : item.totalHours > 0
          ? 'Half Day'
          : isRest
          ? 'Rest Day'
          : isHol
          ? 'Holiday'
          : 'Absent';

      return {
        ...item,
        dayType: newType,
        status: updatedStatus,
        isModified: true,
      };
    });
    setDailyAttendance(nextItems);
    syncAttendanceToPayslipDrivers(nextItems);
  };

  const handleQuickAddShift = (dateStr: string, inTime = '08:00:00', outTime = '17:00:00') => {
    const nextItems = dailyAttendance.map(item => {
      if (item.date !== dateStr) return item;
      const newIn: UnpairedPunch = {
        id: `p-in-${Date.now()}`,
        time: inTime,
        isNextDay: false,
      };
      const newOut: UnpairedPunch = {
        id: `p-out-${Date.now() + 1}`,
        time: outTime,
        isNextDay: timeToMinutes(outTime) < timeToMinutes(inTime),
      };
      const updatedPunches = [...item.punches, newIn, newOut];
      const metrics = calculateUnpairedMetrics(updatedPunches, employeeShift?.startTime, employeeShift?.gracePeriodMinutes);
      return {
        ...item,
        punches: updatedPunches,
        regularHours: metrics.regularHours,
        totalHours: metrics.totalHours,
        overtimeHours: metrics.overtimeHours,
        lateMinutes: metrics.lateMinutes,
        undertimeMinutes: metrics.undertimeMinutes,
        nightDiffHours: metrics.nightDiffHours,
        status: metrics.totalHours >= 4 ? 'Present' : 'Half Day',
        isModified: true,
      };
    });
    setDailyAttendance(nextItems);
    syncAttendanceToPayslipDrivers(nextItems);
  };

  const handleClearDayPunches = (dateStr: string) => {
    const nextItems = dailyAttendance.map(item => {
      if (item.date !== dateStr) return item;
      const isRest = item.dayType === 'Rest Day';
      return {
        ...item,
        punches: [],
        regularHours: 0,
        totalHours: 0,
        overtimeHours: 0,
        lateMinutes: 0,
        undertimeMinutes: 0,
        nightDiffHours: 0,
        status: isRest ? ('Rest Day' as DTRStatus) : ('Absent' as DTRStatus),
        isModified: true,
      };
    });
    setDailyAttendance(nextItems);
    syncAttendanceToPayslipDrivers(nextItems);
  };

  // Handlers for manual drivers on Payslip tab
  const handleBasicPayChange = (newVal: number) => {
    const val = Math.max(0, newVal);
    setBasicPay(val);
    recalculateGovtContributions(val);
  };

  const handleDaysChange = (newDays: number) => {
    const val = Math.max(0, newDays);
    setDaysWorked(val);
    const newBasic = Math.round(val * dailyRate * 100) / 100;
    setBasicPay(newBasic);
    recalculateGovtContributions(newBasic);
  };

  const handleOvertimeChange = (newOT: number) => {
    const val = Math.max(0, newOT);
    setOvertimeHours(val);
    const newOTPay = Math.round(val * otHourlyRate * 100) / 100;
    setOvertimePay(newOTPay);
  };

  const handleWdoHoursChange = (newWDO: number) => {
    const val = Math.max(0, newWDO);
    setWdoHours(val);
    const newWdoPay = Math.round(val * wdoHourlyRate * 100) / 100;
    setWdoPay(newWdoPay);
  };

  const handleRegularHolidayDaysChange = (newRegHolidays: number) => {
    const val = Math.max(0, newRegHolidays);
    setRegularHolidayDays(val);
    setHolidayDays(val + specialHolidayDays);
    const newHolidayPay =
      Math.round((val * dailyRate * 1.0 + specialHolidayDays * dailyRate * 0.3) * 100) / 100;
    setHolidayPay(newHolidayPay);
  };

  const handleSpecialHolidayDaysChange = (newSpecHolidays: number) => {
    const val = Math.max(0, newSpecHolidays);
    setSpecialHolidayDays(val);
    setHolidayDays(regularHolidayDays + val);
    const newHolidayPay =
      Math.round((regularHolidayDays * dailyRate * 1.0 + val * dailyRate * 0.3) * 100) / 100;
    setHolidayPay(newHolidayPay);
  };

  const handleLateChange = (newLate: number) => {
    const val = Math.max(0, newLate);
    setLateMinutes(val);
    const effectiveLate = companyProfile.enableLateDeduction !== false ? val : 0;
    const totalMinutes = effectiveLate + undertimeMinutes;
    const newDeduction = Math.round(totalMinutes * minuteRate * 100) / 100;
    setLateUndertimeDeduction(newDeduction);
  };

  const handleUndertimeChange = (newUT: number) => {
    const val = Math.max(0, newUT);
    setUndertimeMinutes(val);
    const effectiveLate = companyProfile.enableLateDeduction !== false ? lateMinutes : 0;
    const totalMinutes = effectiveLate + val;
    const newDeduction = Math.round(totalMinutes * minuteRate * 100) / 100;
    setLateUndertimeDeduction(newDeduction);
  };

  // Live Totals
  const currentGross =
    Math.round(
      (Number(basicPay) +
        Number(overtimePay) +
        Number(wdoPay) +
        Number(holidayPay) +
        Number(nightDiffPay) +
        Number(allowanceBonus)) *
        100
    ) / 100;

  const currentTotalDeductions =
    Math.round(
      (Number(lateUndertimeDeduction) +
        Number(sssDeduction) +
        Number(philhealthDeduction) +
        Number(pagibigDeduction) +
        (companyProfile.enableWithholdingTax ? (Number(withholdingTax) || 0) : 0) +
        Number(mlsDeduction) +
        Number(cashAdvanceDeduction) +
        Number(otherDeduction)) *
        100
    ) / 100;

  const currentNetPay = Math.max(
    0,
    Math.round((currentGross - currentTotalDeductions) * 100) / 100
  );

  // Submit Handler: Opens confirmation dialog
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payslip) return;
    setIsSaveConfirmOpen(true);
  };

  // Perform actual save after confirmation
  const executeSave = () => {
    if (!payslip) return;

    const isLast = Boolean(currentPeriod?.isLastCutoffOfMonth);
    let prevContributions = undefined;
    if (isLast && currentPeriod && currentEmp) {
      const currentMonthKey = (currentPeriod.payoutDate || currentPeriod.startDate).substring(0, 7);
      const earlierPayslips = payslips.filter(p => {
        if (p.employeeId !== currentEmp.id) return false;
        if (p.payPeriodId === currentPeriod.id) return false;
        const matchingPeriod = payPeriods.find(pp => pp.id === p.payPeriodId);
        const periodMonthKey = matchingPeriod ? (matchingPeriod.payoutDate || matchingPeriod.startDate).substring(0, 7) : '';
        return periodMonthKey === currentMonthKey;
      });

      prevContributions = {
        sssEE: earlierPayslips.reduce((sum, p) => sum + (p.sssDeduction || 0), 0),
        sssER: earlierPayslips.reduce((sum, p) => sum + (p.sssEmployerShare || 0), 0),
        philhealthEE: earlierPayslips.reduce((sum, p) => sum + (p.philhealthDeduction || 0), 0),
        philhealthER: earlierPayslips.reduce((sum, p) => sum + (p.philhealthEmployerShare || 0), 0),
        pagibigEE: earlierPayslips.reduce((sum, p) => sum + (p.pagibigDeduction || 0), 0),
        pagibigER: earlierPayslips.reduce((sum, p) => sum + (p.pagibigEmployerShare || 0), 0),
        basicPaySum: earlierPayslips.reduce((sum, p) => sum + (p.basicPay || 0), 0),
      };
    }

    const hasSSS = Boolean(currentEmp?.sssEnabled !== false && currentEmp?.sssNumber && currentEmp.sssNumber.trim());
    const hasPhilHealth = Boolean(currentEmp?.philhealthEnabled !== false && currentEmp?.philhealthNumber && currentEmp.philhealthNumber.trim());
    const hasPagIbig = Boolean(currentEmp?.pagibigEnabled !== false && currentEmp?.pagibigNumber && currentEmp.pagibigNumber.trim());

    const calcResult = calculateCutoffContributions({
      cutoffBasicPay: Number(basicPay) || 0,
      isLastCutoffOfMonth: isLast,
      previousContributionsInMonth: prevContributions,
      hasSSS,
      hasPhilHealth,
      hasPagIbig,
    });

    // 1. Update Payslip
    updatePayslip(
      payslip.id,
      {
        daysWorked: Number(daysWorked) || 0,
        overtimeHours: Number(overtimeHours) || 0,
        wdoHours: Number(wdoHours) || 0,
        nightDiffHours: Number(nightDiffHours) || 0,
        regularHolidayDays: Number(regularHolidayDays) || 0,
        specialHolidayDays: Number(specialHolidayDays) || 0,
        holidayDays: (Number(regularHolidayDays) || 0) + (Number(specialHolidayDays) || 0),
        lateMinutes: Number(lateMinutes) || 0,
        undertimeMinutes: Number(undertimeMinutes) || 0,
        basicPay: Number(basicPay) || 0,
        overtimePay: Number(overtimePay) || 0,
        wdoPay: Number(wdoPay) || 0,
        holidayPay: Number(holidayPay) || 0,
        nightDiffPay: Number(nightDiffPay) || 0,
        lateUndertimeDeduction: Number(lateUndertimeDeduction) || 0,
        sssDeduction: Number(sssDeduction) || 0,
        philhealthDeduction: Number(philhealthDeduction) || 0,
        pagibigDeduction: Number(pagibigDeduction) || 0,
        sssEmployerShare: calcResult.sss.employerShare,
        philhealthEmployerShare: calcResult.philhealth.employerShare,
        pagibigEmployerShare: calcResult.pagibig.employerShare,
        withholdingTax: companyProfile.enableWithholdingTax ? (Number(withholdingTax) || 0) : 0,
        mlsDeduction: Number(mlsDeduction) || 0,
        cashAdvanceDeduction: Number(cashAdvanceDeduction) || 0,
        totalAllowances: Number(allowanceBonus) || 0,
        totalOtherDeductions: Number(otherDeduction) || 0,
        allowances:
          allowanceBonus > 0
            ? [{ name: 'Allowances / Bonus Incentive', amount: Number(allowanceBonus) || 0 }]
            : [],
        otherDeductions:
          otherDeduction > 0
            ? [{ name: 'Adjustments / Other Loan', amount: Number(otherDeduction) || 0 }]
            : [],
      },
      editReason.trim() || undefined
    );

    // 2. Commit modified Attendance records back into DTR
    if (batchUpdateDTRRecords && dailyAttendance.length > 0) {
      const recordsToSave: DTRRecord[] = dailyAttendance.map(item => {
        const metrics = calculateUnpairedMetrics(item.punches, employeeShift?.startTime, employeeShift?.gracePeriodMinutes);
        const sortedPunches = [...item.punches].sort(
          (a, b) => getEffectiveMinutes(a) - getEffectiveMinutes(b)
        );
        const firstIn = sortedPunches[0] ? (sortedPunches[0].isNextDay ? `${sortedPunches[0].time} (+1d)` : sortedPunches[0].time) : null;
        const lastOut = sortedPunches.length > 1 ? (sortedPunches[sortedPunches.length - 1].isNextDay ? `${sortedPunches[sortedPunches.length - 1].time} (+1d)` : sortedPunches[sortedPunches.length - 1].time) : null;

        return {
          id: item.id,
          employeeId: payslip.employeeId,
          employeeNumber: payslip.employeeNumber,
          employeeName: payslip.employeeName,
          date: item.date,
          dayOfWeek: item.dayOfWeek,
          dayType: item.dayType,
          timeIn: firstIn,
          timeOut: lastOut,
          punchPairs: metrics.punchPairs,
          rawPunches: sortedPunches.map(p => (p.isNextDay ? `${p.time} (+1d)` : p.time)),
          regularHours: item.regularHours,
          totalHours: item.totalHours,
          overtimeHours: item.overtimeHours,
          lateMinutes: item.lateMinutes,
          undertimeMinutes: item.undertimeMinutes,
          nightDiffHours: item.nightDiffHours,
          status: item.status,
          source: 'Adjustment',
          remarks: item.remarks || (item.isModified ? 'Adjusted in Payslip Attendance tab' : ''),
        };
      });

      batchUpdateDTRRecords(
        recordsToSave,
        editReason.trim() || `Payslip Adjustment attendance sync for ${payslip.employeeName}`
      );
    }

    onClose();
  };

  const executeDelete = () => {
    if (payslip) {
      deletePayslip(payslip.id);
    }
    setIsDeleteConfirmOpen(false);
    onClose();
  };

  // Check if active day has overnight shift
  const hasActiveDayNextDayPunch = activeDayItem?.punches?.some(p => p.isNextDay);

  if (!isOpen || !payslip) return null;

  return (
    <>
      <AnimatePresence>
        <div key="payslip-edit-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full overflow-hidden border border-slate-300 my-4 flex flex-col max-h-[94vh]"
          id="payslip-edit-modal"
        >
          {/* Header Banner */}
          <div className="bg-slate-900 text-white p-4 sm:p-5 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                      Manual Payslip Adjustment
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Live Recalculation
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">{payslip.employeeName}</span>
                    <span className="text-slate-400 font-mono">({payslip.employeeNumber})</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300">{payslip.department}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">{payslip.position}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                id="close-payslip-adjustment-btn"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Statutory Rates Reference Badges */}
            <div className="mt-3.5 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
              <div className="bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Daily Rate</span>
                <span className="font-bold text-amber-300 text-sm">{formatCurrency(dailyRate)}</span>
              </div>
              <div className="bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Hourly (8h)</span>
                <span className="font-bold text-slate-200">₱{hourlyRate.toFixed(2)}/h</span>
              </div>
              <div className="bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">OT Rate (125%)</span>
                <span className="font-bold text-blue-300">₱{otHourlyRate.toFixed(2)}/h</span>
              </div>
              <div className="bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">WDO Rate (130%)</span>
                <span className="font-bold text-emerald-300">₱{wdoHourlyRate.toFixed(2)}/h</span>
              </div>
              <div className="bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700 col-span-2 sm:col-span-1">
                <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Minute Rate</span>
                <span className="font-bold text-rose-300">₱{minuteRate.toFixed(2)}/m</span>
              </div>
            </div>

            {/* TAB BAR NAVIGATION */}
            <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setActiveTab('Payslip')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                    activeTab === 'Payslip'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                  id="tab-btn-payslip"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Payslip</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('Attendance')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                    activeTab === 'Attendance'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                  id="tab-btn-attendance"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Attendance</span>
                  {dailyAttendance.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-slate-700 text-indigo-200 border border-slate-600">
                      {dailyAttendance.length} days
                    </span>
                  )}
                </button>
              </div>

              {/* Cutoff Period Tag */}
              {currentPeriod && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-semibold text-slate-200">{currentPeriod.name}</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    ({currentPeriod.startDate} to {currentPeriod.endDate})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Form Scrollable Body */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {/* ======================================================== */}
            {/* TAB 1: PAYSLIP ADJUSTMENT VIEW */}
            {/* ======================================================== */}
            {activeTab === 'Payslip' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* SECTION 1: ATTENDANCE & DTR DRIVERS */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-indigo-100 text-indigo-700">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                          Time & Attendance Parameters
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Changing these or editing punches in the Attendance tab automatically recalculates pay and tardiness deductions.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('Attendance')}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 hover:border-indigo-300 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors w-fit"
                    >
                      <span>Edit Daily Punches</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* 3 Balanced Columns for Attendance */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Card A: Regular & Holiday Days */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2.5 shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                        Worked Days & Holidays
                      </span>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <label className="font-semibold text-slate-700">Days Worked</label>
                          <span className="text-[10px] font-mono text-slate-400">× ₱{dailyRate.toFixed(2)}</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="31"
                            value={daysWorked}
                            onChange={e => handleDaysChange(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 bg-indigo-50/40 border border-indigo-200 rounded-lg font-mono font-bold text-xs text-indigo-950 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                            id="adjustment-days-worked-input"
                          />
                          <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-sans pointer-events-none">
                            days
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <label className="font-semibold text-indigo-950">Regular Holiday (Days)</label>
                          <span className="text-[10px] font-mono text-indigo-600 font-medium">+100% rate</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={regularHolidayDays}
                            onChange={e => handleRegularHolidayDaysChange(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-lg font-mono font-bold text-xs text-indigo-950 focus:ring-2 focus:ring-indigo-500"
                            id="adjustment-regular-holiday-days-input"
                          />
                          <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-sans pointer-events-none">
                            days
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <label className="font-semibold text-indigo-950">Special Holiday (Days)</label>
                          <span className="text-[10px] font-mono text-indigo-600 font-medium">+30% rate</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={specialHolidayDays}
                            onChange={e => handleSpecialHolidayDaysChange(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-lg font-mono font-bold text-xs text-indigo-950 focus:ring-2 focus:ring-indigo-500"
                            id="adjustment-special-holiday-days-input"
                          />
                          <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-sans pointer-events-none">
                            days
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card B: Overtime & Rest Day Duty */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2.5 shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                        Overtime & Rest Day
                      </span>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <label className="font-semibold text-slate-700">Overtime Hours (125%)</label>
                          <span className="text-[10px] font-mono text-blue-600 font-medium">₱{otHourlyRate.toFixed(2)}/h</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={overtimeHours}
                            onChange={e => handleOvertimeChange(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs text-blue-950 focus:ring-2 focus:ring-indigo-500"
                            id="adjustment-overtime-hours-input"
                          />
                          <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-sans pointer-events-none">
                            hrs
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <label className="font-semibold text-slate-700">Rest Day Duty (WDO 130%)</label>
                          <span className="text-[10px] font-mono text-emerald-600 font-medium">₱{wdoHourlyRate.toFixed(2)}/h</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={wdoHours}
                            onChange={e => handleWdoHoursChange(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs text-emerald-950 focus:ring-2 focus:ring-indigo-500"
                            id="adjustment-wdo-hours-input"
                          />
                          <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-sans pointer-events-none">
                            hrs
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card C: Tardiness & Undertime */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2.5 shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                        Tardiness & Undertime
                      </span>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-1.5">
                            <label className="font-semibold text-slate-700">Late (Minutes)</label>
                            {companyProfile.enableLateDeduction === false && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                                No Deduction
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-rose-600 font-medium">₱{minuteRate.toFixed(2)}/m</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={lateMinutes}
                            onChange={e => handleLateChange(parseInt(e.target.value, 10) || 0)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs text-rose-950 focus:ring-2 focus:ring-indigo-500"
                            id="adjustment-late-minutes-input"
                          />
                          <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-sans pointer-events-none">
                            mins
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <label className="font-semibold text-slate-700">Undertime (Minutes)</label>
                          <span className="text-[10px] font-mono text-rose-600 font-medium">₱{minuteRate.toFixed(2)}/m</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={undertimeMinutes}
                            onChange={e => handleUndertimeChange(parseInt(e.target.value, 10) || 0)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs text-rose-950 focus:ring-2 focus:ring-indigo-500"
                            id="adjustment-undertime-minutes-input"
                          />
                          <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-sans pointer-events-none">
                            mins
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2 & 3: EARNINGS & DEDUCTIONS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* EARNINGS */}
                  <div className="bg-emerald-50/40 rounded-xl border border-emerald-200/80 p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-700" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950">Earnings Components</h3>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        Additions (+)
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {/* Basic Pay */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div>
                          <label className="font-semibold text-slate-700 block">Basic Pay</label>
                          <span className="text-[10px] text-indigo-600 font-medium">Auto-triggers SSS/PH/HDMF</span>
                        </div>
                        <div className="relative w-1/2">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            value={basicPay}
                            onChange={e => handleBasicPayChange(parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                            id="adjustment-basic-pay-input"
                          />
                        </div>
                      </div>

                      {/* Overtime Pay */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <label className="font-semibold text-slate-700 w-1/2">Overtime Pay</label>
                        <div className="relative w-1/2">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            value={overtimePay}
                            onChange={e => setOvertimePay(parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                            id="adjustment-overtime-pay-input"
                          />
                        </div>
                      </div>

                      {/* WDO Pay */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <label className="font-semibold text-slate-700 w-1/2">Rest Day (WDO) Pay</label>
                        <div className="relative w-1/2">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            value={wdoPay}
                            onChange={e => setWdoPay(parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                            id="adjustment-wdo-pay-input"
                          />
                        </div>
                      </div>

                      {/* Holiday Pay */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <label className="font-semibold text-slate-700 w-1/2">Holiday Pay</label>
                        <div className="relative w-1/2">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            value={holidayPay}
                            onChange={e => setHolidayPay(parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                            id="adjustment-holiday-pay-input"
                          />
                        </div>
                      </div>

                      {/* Night Shift Differential (NSD) Pay */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="w-1/2">
                          <label className="font-semibold text-slate-700 block">Night Shift Pay (10%)</label>
                          <span className="text-[10px] text-slate-500">
                            {nightDiffHours}h {companyProfile.enableNightShiftPay ? '(Active Policy)' : '(Policy Off)'}
                          </span>
                        </div>
                        <div className="relative w-1/2">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            value={nightDiffPay}
                            onChange={e => setNightDiffPay(parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                            id="adjustment-night-diff-pay-input"
                          />
                        </div>
                      </div>

                      {/* Allowances / Bonus */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <label className="font-semibold text-slate-700 w-1/2">Allowances / Bonus</label>
                        <div className="relative w-1/2">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            value={allowanceBonus}
                            onChange={e => setAllowanceBonus(parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                            id="adjustment-allowances-input"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Subtotal Gross Box */}
                    <div className="pt-2 mt-2 border-t border-emerald-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-950 uppercase text-[11px]">Gross Pay</span>
                      <span className="font-bold font-mono text-emerald-800 text-sm">{formatCurrency(currentGross)}</span>
                    </div>
                  </div>

                  {/* DEDUCTIONS */}
                  <div className="bg-rose-50/40 rounded-xl border border-rose-200/80 p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-rose-200">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-rose-700" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-rose-950">Deductions Components</h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => recalculateGovtContributions(basicPay)}
                          title="Recalculate SSS, PhilHealth & Pag-IBIG from Basic Pay"
                          className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded flex items-center gap-1 transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Auto-Recalc Govt</span>
                        </button>
                        <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                          Subtractions (−)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {/* Late / Undertime */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <label className="font-semibold text-slate-700 w-1/2">Late & Undertime</label>
                        <div className="relative w-1/2">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            value={lateUndertimeDeduction}
                            onChange={e => setLateUndertimeDeduction(parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-semibold text-rose-700 focus:ring-2 focus:ring-indigo-500"
                            id="adjustment-late-deduction-input"
                          />
                        </div>
                      </div>

                      {/* SSS EE with Dropdown Toggle & Accordion Container */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="w-1/2 flex items-center gap-1.5">
                            <label className="font-semibold text-slate-700">SSS EE Share</label>
                            <button
                              type="button"
                              onClick={() => setShowSssBreakdown(prev => !prev)}
                              className="p-1 rounded-md text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
                              title={showSssBreakdown ? 'Hide SSS computation' : 'Show SSS monthly computation'}
                              id="toggle-sss-breakdown-btn"
                            >
                              {showSssBreakdown ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="relative w-1/2">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">₱</span>
                            <input
                              type="number"
                              step="0.01"
                              value={sssDeduction}
                              onChange={e => setSssDeduction(parseFloat(e.target.value) || 0)}
                              className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-semibold text-rose-700 focus:ring-2 focus:ring-indigo-500"
                              id="adjustment-sss-input"
                            />
                          </div>
                        </div>

                        {/* SSS Computation Accordion */}
                        <AnimatePresence>
                          {showSssBreakdown && (
                            <motion.div
                              key="sss-accordion-breakdown-details"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1.5 shadow-2xs text-xs font-sans">
                                <div className="flex items-center justify-between text-slate-600">
                                  <span className="text-[11px] font-medium">All Paid SSS (for the month)</span>
                                  <span className="font-mono font-semibold text-slate-800">
                                    {formatCurrency(allPaidSSSForMonth)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-600">
                                  <span className="text-[11px] font-medium">Current SSS Deduction</span>
                                  <span className="font-mono font-semibold text-rose-700">
                                    {formatCurrency(sssDeduction)}
                                  </span>
                                </div>
                                <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between font-bold text-slate-900">
                                  <span className="text-[11px]">Total SSS (expected for the month):</span>
                                  <span className="font-mono text-indigo-700">
                                    {formatCurrency(totalSSSExpectedForMonth)}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* PhilHealth EE */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <label className="font-semibold text-slate-700 w-1/2">PhilHealth EE Share</label>
                        <div className="relative w-1/2">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            value={philhealthDeduction}
                            onChange={e => setPhilhealthDeduction(parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-semibold text-rose-700 focus:ring-2 focus:ring-indigo-500"
                            id="adjustment-philhealth-input"
                          />
                        </div>
                      </div>

                      {/* Pag-IBIG EE */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <label className="font-semibold text-slate-700 w-1/2">Pag-IBIG EE Share</label>
                        <div className="relative w-1/2">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            value={pagibigDeduction}
                            onChange={e => setPagibigDeduction(parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-semibold text-rose-700 focus:ring-2 focus:ring-indigo-500"
                            id="adjustment-pagibig-input"
                          />
                        </div>
                      </div>

                      {/* Withholding Tax */}
                      {Boolean(companyProfile.enableWithholdingTax) && (
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <label className="font-semibold text-slate-700 w-1/2">Withholding Tax</label>
                          <div className="relative w-1/2">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">₱</span>
                            <input
                              type="number"
                              step="0.01"
                              value={withholdingTax}
                              onChange={e => setWithholdingTax(parseFloat(e.target.value) || 0)}
                              className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-semibold text-rose-700 focus:ring-2 focus:ring-indigo-500"
                              id="adjustment-tax-input"
                            />
                          </div>
                        </div>
                      )}

                      {/* MLS Deduction */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <label className="font-semibold text-slate-700 w-1/2">MLS Deduction</label>
                        <div className="relative w-1/2">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            value={mlsDeduction}
                            onChange={e => setMlsDeduction(parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-semibold text-rose-700 focus:ring-2 focus:ring-indigo-500"
                            id="adjustment-mls-deduction-input"
                          />
                        </div>
                      </div>

                      {/* Cash Advance (Vale) */}
                      <div className="flex items-center justify-between gap-2 text-xs bg-amber-50/70 p-1.5 rounded-lg border border-amber-200/80">
                        <div className="w-1/2">
                          <label className="font-bold text-amber-900 block">Cash Advance (Vale)</label>
                          <span className="text-[10px] text-amber-700">Cutoff salary advance</span>
                        </div>
                        <div className="relative w-1/2">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-amber-600">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            value={cashAdvanceDeduction}
                            onChange={e => setCashAdvanceDeduction(parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-amber-300 rounded-lg font-mono text-xs font-bold text-amber-800 focus:ring-2 focus:ring-amber-500"
                            id="adjustment-cash-advance-input"
                          />
                        </div>
                      </div>

                      {/* Other Custom Deductions */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <label className="font-semibold text-slate-700 w-1/2">Other / Misc Loan</label>
                        <div className="relative w-1/2">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            value={otherDeduction}
                            onChange={e => setOtherDeduction(parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-semibold text-rose-700 focus:ring-2 focus:ring-indigo-500"
                            id="adjustment-other-deduction-input"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Subtotal Deductions Box */}
                    <div className="pt-2 mt-2 border-t border-rose-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-rose-950 uppercase text-[11px]">Total Deductions</span>
                      <span className="font-bold font-mono text-rose-800 text-sm">-{formatCurrency(currentTotalDeductions)}</span>
                    </div>
                  </div>
                </div>

                {/* SECTION 4: NET TAKE HOME SUMMARY BANNER */}
                <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block">
                      Computed Net Take-Home Pay
                    </span>
                    <p className="text-xs text-slate-300">
                      Gross Pay (<span className="text-emerald-300 font-mono">{formatCurrency(currentGross)}</span>) − Deductions (<span className="text-rose-300 font-mono">-{formatCurrency(currentTotalDeductions)}</span>)
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-2xl font-bold font-mono text-emerald-400">
                      {formatCurrency(currentNetPay)}
                    </span>
                  </div>
                </div>

                {/* SECTION 5: AUDIT LOG REASON */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Reason for Adjustment <span className="text-slate-400 font-normal lowercase text-[11px]">(optional note)</span>
                  </label>
                  <input
                    type="text"
                    value={editReason}
                    onChange={e => setEditReason(e.target.value)}
                    placeholder="e.g. Corrected 2 OT hours and adjusted MLS deduction for August..."
                    className="w-full px-3.5 py-2 border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-slate-800"
                    id="adjustment-reason-input"
                  />
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: ATTENDANCE RECORD CUTOFF SUMMARY TABLE VIEW */}
            {/* ======================================================== */}
            {activeTab === 'Attendance' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Table Control Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      Cutoff Attendance Log Sheet
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {currentPeriod?.startDate} to {currentPeriod?.endDate} • Edit time logs directly on the table (auto-calculates on focus exit)
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => setExtraPairColumns(prev => prev + 1)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                      title="Add an extra Time In / Time Out column pair"
                      id="add-punch-column-btn"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add In/Out Column</span>
                    </button>
                    {extraPairColumns > 0 && (
                      <button
                        type="button"
                        onClick={() => setExtraPairColumns(prev => Math.max(0, prev - 1))}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Remove extra empty column pair"
                      >
                        <span>− Remove Column</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* CUTOFF ATTENDANCE EXCEL-STYLE TABLE */}
                <div className="rounded-2xl border border-slate-300 overflow-hidden shadow-xs bg-white">
                  <div className="overflow-x-auto max-h-[58vh] scrollbar-thin rounded-2xl">
                    <table className="w-full text-xs text-left border-separate border-spacing-0">
                      <colgroup>
                        <col className="w-[125px]" />
                        {Array.from({ length: maxPunchPairs * 2 }).map((_, idx) => (
                          <col key={`col-punch-${idx}`} />
                        ))}
                        <col className="w-[120px]" />
                        <col className="w-[72px]" />
                        <col className="w-[72px]" />
                        <col className="w-[72px]" />
                      </colgroup>
                      <thead className="sticky top-0 z-20 bg-slate-100 shadow-xs">
                        <tr className="text-slate-700 text-[11px] font-bold select-none">
                          <th className="py-2 px-2.5 border-b border-r border-slate-300 w-[115px] sm:w-[125px] min-w-[110px] font-bold text-slate-800 rounded-tl-2xl">
                            DATE
                          </th>
                          {Array.from({ length: maxPunchPairs }).map((_, pIdx) => (
                            <React.Fragment key={`th-pair-${pIdx}`}>
                              <th className="py-2 px-1 border-b border-r border-slate-300 w-[80px] min-w-[72px] text-center font-bold text-slate-700">
                                TIME IN {maxPunchPairs > 1 ? pIdx + 1 : ''}
                              </th>
                              <th className="py-2 px-1 border-b border-r border-slate-300 w-[80px] min-w-[72px] text-center font-bold text-slate-700">
                                TIME OUT {maxPunchPairs > 1 ? pIdx + 1 : ''}
                              </th>
                            </React.Fragment>
                          ))}
                          <th className="py-2 px-2 border-b border-r border-slate-300 w-[115px] min-w-[105px] text-center font-bold text-slate-800">
                            TOTAL HOURS / DAYS
                          </th>
                          <th className="py-2 px-2 border-b border-r border-slate-300 w-[72px] min-w-[72px] max-w-[72px] text-center font-bold text-amber-950 bg-amber-100/70">
                            OT
                          </th>
                          <th className="py-2 px-2 border-b border-r border-slate-300 w-[72px] min-w-[72px] max-w-[72px] text-center font-bold text-rose-950 bg-rose-100/70">
                            UT
                          </th>
                          <th className="py-2 px-2 border-b border-r border-slate-300 w-[72px] min-w-[72px] max-w-[72px] text-center font-bold text-orange-950 bg-orange-100/70 rounded-tr-2xl">
                            LATE
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyAttendance.map((d, rowIdx) => {
                          const isRest = d.dayType === 'Rest Day';
                          const isHol = d.dayType.includes('Holiday');
                          const rowPunches = d.punches || [];

                          // Calculate undertime hours for row display
                          let rowUTHrs = 0;
                          if (!isRest && d.undertimeMinutes > 0) {
                            rowUTHrs = Math.round((d.undertimeMinutes / 60) * 100) / 100;
                          }

                          // Calculate row days worked (less than 4 hours is considered 0.5 days work)
                          let rowDays = 0;
                          if (d.totalHours >= 4) {
                            rowDays = 1;
                          } else if (d.totalHours > 0) {
                            rowDays = 0.5;
                          }

                          return (
                            <tr
                              key={`${d.date}-${rowIdx}`}
                              className={`hover:bg-indigo-50/20 transition-colors ${
                                rowIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                              }`}
                            >
                              {/* Date Column */}
                              <td className="py-2 px-3 border-b border-r border-slate-200 font-semibold text-slate-800 whitespace-nowrap">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="font-bold text-xs">{formatTableDate(d.date)}</span>
                                  {isRest ? (
                                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                      Rest
                                    </span>
                                  ) : isHol ? (
                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                      Hol
                                    </span>
                                  ) : d.isModified ? (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Modified" />
                                  ) : null}
                                </div>
                              </td>

                              {/* Dynamic Punch Pairs (Time In & Time Out) */}
                              {Array.from({ length: maxPunchPairs }).map((_, pIdx) => {
                                const inPunchIdx = pIdx * 2;
                                const outPunchIdx = pIdx * 2 + 1;
                                const inPunch = rowPunches[inPunchIdx];
                                const outPunch = rowPunches[outPunchIdx];

                                return (
                                  <React.Fragment key={`cell-${d.date}-pair-${pIdx}`}>
                                    {/* Time In */}
                                    <td className="py-0 px-0.5 border-b border-r border-slate-200 bg-white">
                                      <DirectTimeCell
                                        value={inPunch?.time || ''}
                                        isNextDay={inPunch?.isNextDay}
                                        onCommit={val => handleDirectTableCellChange(d.date, inPunchIdx, val)}
                                        placeholder="—"
                                        ariaLabel={`${d.date} Time In ${pIdx + 1}`}
                                      />
                                    </td>

                                    {/* Time Out */}
                                    <td className="py-0 px-0.5 border-b border-r border-slate-200 bg-white">
                                      <DirectTimeCell
                                        value={outPunch?.time || ''}
                                        isNextDay={outPunch?.isNextDay}
                                        onCommit={val => handleDirectTableCellChange(d.date, outPunchIdx, val)}
                                        placeholder="—"
                                        ariaLabel={`${d.date} Time Out ${pIdx + 1}`}
                                      />
                                    </td>
                                  </React.Fragment>
                                );
                              })}

                              {/* Total Hours / Days Column (no units in row) */}
                              <td className="py-2 px-2 border-b border-r border-slate-200 text-center font-mono text-xs font-bold text-slate-800 bg-slate-50/30 whitespace-nowrap">
                                {d.totalHours > 0 ? (
                                  <div className="flex items-center justify-center gap-1 font-mono">
                                    <span className="text-slate-900">{d.totalHours.toFixed(1)}</span>
                                    <span className="text-slate-400 font-normal">/</span>
                                    <span className="text-indigo-700 font-semibold">{rowDays}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 font-normal font-mono">0 / 0</span>
                                )}
                              </td>

                              {/* OT Column */}
                              <td className="py-2 px-2 border-b border-r border-slate-200 w-[72px] min-w-[72px] max-w-[72px] text-center font-mono text-xs font-bold text-amber-800 bg-amber-50/40">
                                {d.overtimeHours > 0 ? (
                                  <span>{d.overtimeHours.toFixed(1)}</span>
                                ) : (
                                  <span className="text-slate-400 font-normal">0</span>
                                )}
                              </td>

                              {/* UT Column */}
                              <td className="py-2 px-2 border-b border-r border-slate-200 w-[72px] min-w-[72px] max-w-[72px] text-center font-mono text-xs font-bold text-rose-800 bg-rose-50/40">
                                {rowUTHrs > 0 ? (
                                  <span>{rowUTHrs.toFixed(2)}</span>
                                ) : (
                                  <span className="text-slate-400 font-normal">0</span>
                                )}
                              </td>

                              {/* LATE Column (no units in row) */}
                              <td className="py-2 px-2 border-b border-r border-slate-200 w-[72px] min-w-[72px] max-w-[72px] text-center font-mono text-xs font-bold text-orange-800 bg-orange-50/40">
                                {d.lateMinutes > 0 ? (
                                  <span>{d.lateMinutes}</span>
                                ) : (
                                  <span className="text-slate-400 font-normal">0</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {/* SUMMARY FOOTER ROW (Dark navy background matching screenshot style) */}
                        <tr className="sticky bottom-0 z-10 bg-slate-950 font-bold text-white select-none">
                          <td
                            colSpan={1 + maxPunchPairs * 2}
                            className="py-2.5 px-4 text-left font-bold text-xs uppercase tracking-wider text-slate-200 border-t-2 border-slate-800 rounded-bl-2xl"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-indigo-400">●</span>
                              <span>TOTAL (CUTOFF ATTENDANCE SUMMARY)</span>
                            </div>
                          </td>

                          {/* Total Cutoff Hours / Days with unit */}
                          <td className="py-2.5 px-2 border-t-2 border-r border-slate-800 text-center font-mono text-xs sm:text-sm font-black text-white bg-slate-900 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <span>{cutoffSummary.totalHours.toFixed(1)} hrs</span>
                              <span className="text-slate-500 font-normal">/</span>
                              <span className="text-indigo-300">
                                {cutoffSummary.totalDays} {cutoffSummary.totalDays === 0.5 || cutoffSummary.totalDays === 1 ? 'day' : 'days'}
                              </span>
                            </div>
                          </td>

                          {/* Total OT Hours with unit */}
                          <td className="py-2.5 px-2 border-t-2 border-r border-slate-800 w-[72px] min-w-[72px] max-w-[72px] text-center font-mono text-xs sm:text-sm font-black text-amber-400 bg-slate-900 whitespace-nowrap">
                            {cutoffSummary.totalOT > 0 ? `${cutoffSummary.totalOT.toFixed(1)} hrs` : '0 hrs'}
                          </td>

                          {/* Total UT in minutes (multiplied by 60) with unit */}
                          <td
                            className="py-2.5 px-2 border-t-2 border-r border-slate-800 w-[72px] min-w-[72px] max-w-[72px] text-center font-mono text-xs sm:text-sm font-black text-rose-400 bg-slate-900 whitespace-nowrap"
                            title={`Total Undertime: ${cutoffSummary.totalUTMins} mins (${cutoffSummary.totalUTHrs.toFixed(2)} hrs × 60)`}
                          >
                            {cutoffSummary.totalUTMins > 0 ? (
                              <span>{cutoffSummary.totalUTMins} mins</span>
                            ) : (
                              <span>0 mins</span>
                            )}
                          </td>

                          {/* Total LATE in minutes with unit */}
                          <td
                            className="py-2.5 px-2 border-t-2 border-r border-slate-800 w-[72px] min-w-[72px] max-w-[72px] text-center font-mono text-xs sm:text-sm font-black text-orange-400 bg-slate-900 whitespace-nowrap rounded-br-2xl"
                            title={`Total Late: ${cutoffSummary.totalLateMins} mins`}
                          >
                            {cutoffSummary.totalLateMins > 0 ? (
                              <span>{cutoffSummary.totalLateMins} mins</span>
                            ) : (
                              <span>0 mins</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-200">
              <div className="flex items-center gap-2">
                {activeTab === 'Attendance' ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('Payslip')}
                    className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>View Payslip Breakdown</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('Attendance')}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Review Attendance Punches</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {(isAdmin || isManager) && (
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer mr-1"
                    id="delete-payslip-adjustment-btn"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Payslip</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  id="cancel-adjustment-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  id="save-adjustment-btn"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Adjustment & Recalculate</span>
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
      </AnimatePresence>

      {/* Confirmation Dialog on Save */}
      <ConfirmDialog
        key="confirm-dialog-save-adjusted-payslip"
        isOpen={isSaveConfirmOpen}
        title="Confirm Payslip Adjustments"
        message={`Are you sure you want to save the adjusted earnings, deductions (Net Pay: ${formatCurrency(currentNetPay)}), and attendance records for ${payslip.employeeName}? This will update the payslip record and log an audit trail.`}
        confirmText="Save & Recalculate"
        cancelText="Review Changes"
        variant="primary"
        onConfirm={executeSave}
        onCancel={() => setIsSaveConfirmOpen(false)}
      />

      {/* Confirmation Dialog on Delete */}
      <ConfirmDialog
        key="confirm-dialog-delete-adjusted-payslip"
        isOpen={isDeleteConfirmOpen}
        title="Delete Payslip"
        message={`Are you sure you want to delete the payslip for ${payslip.employeeName} (${payslip.employeeNumber})? This will remove the computed payslip and update the cutoff period totals.`}
        confirmText="Delete Payslip"
        cancelText="Cancel"
        variant="danger"
        onConfirm={executeDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </>
  );
};
