import { Employee, DTRRecord, Payslip, PayslipItem, PeriodHoliday } from '../types';
import { findSSSBracket } from '../components/sss/SSSMatrixView';

/**
 * Standard Philippine Payroll & Statutory Calculations (Weekly Schedule)
 * Weekly Cycle: Saturday (Start) to Friday (End), Payday: Saturday
 */

// SSS Contribution (SSS CIRCULAR NO. 2024-006 Effective January 2025)
// For weekly pay period, monthly statutory amount is divided by 4 (standard weekly divisor)
export function calculateMonthlySSS(monthlyBasicPay: number): { employeeShare: number; employerShare: number; msc: number; totalContribution: number } {
  const bracket = findSSSBracket(monthlyBasicPay);
  return {
    employeeShare: bracket.totalEe,
    employerShare: bracket.totalEr,
    msc: bracket.totalMsc,
    totalContribution: bracket.grandTotal,
  };
}

export function calculateSSS(monthlyGrossEquivalent: number): { employeeShare: number; employerShare: number } {
  const res = calculateMonthlySSS(monthlyGrossEquivalent);
  // For weekly pay period, divide monthly deduction by 4
  return {
    employeeShare: Math.round((res.employeeShare / 4) * 100) / 100,
    employerShare: Math.round((res.employerShare / 4) * 100) / 100,
  };
}

// PhilHealth (5% premium, 50% employee share, 50% employer share, floor ₱10,000, cap ₱100,000)
// For weekly pay period, monthly amount divided by 4
export function calculateMonthlyPhilHealth(monthlyBasicPay: number): { employeeShare: number; employerShare: number; baseSalary: number; totalContribution: number } {
  const baseSalary = Math.min(Math.max(monthlyBasicPay, 10000), 100000);
  const totalContribution = Math.round((baseSalary * 0.05) * 100) / 100;
  const employeeShare = Math.round((totalContribution / 2) * 100) / 100;
  const employerShare = Math.round((totalContribution - employeeShare) * 100) / 100;
  return { employeeShare, employerShare, baseSalary, totalContribution };
}

export function calculatePhilHealth(monthlyGrossEquivalent: number): { employeeShare: number; employerShare: number } {
  const res = calculateMonthlyPhilHealth(monthlyGrossEquivalent);
  return {
    employeeShare: Math.round((res.employeeShare / 4) * 100) / 100,
    employerShare: Math.round((res.employerShare / 4) * 100) / 100,
  };
}

// Pag-IBIG (HDMF) Contribution (Standard weekly ₱50 EE / ₱50 ER, based on ₱200/mo)
export function calculateMonthlyPagIbig(monthlyBasicPay: number): { employeeShare: number; employerShare: number } {
  return {
    employeeShare: 200,
    employerShare: 200,
  };
}

export function calculatePagIbig(monthlyGrossEquivalent: number): { employeeShare: number; employerShare: number } {
  // Current HDMF mandated rate is ₱200/mo employee, ₱200/mo employer (₱50 weekly)
  return {
    employeeShare: 50,
    employerShare: 50,
  };
}

export interface CutoffContributionsParams {
  cutoffBasicPay: number;
  isLastCutoffOfMonth?: boolean;
  previousContributionsInMonth?: {
    sssEE: number;
    sssER: number;
    philhealthEE: number;
    philhealthER: number;
    pagibigEE: number;
    pagibigER: number;
    basicPaySum: number;
  };
  hasSSS?: boolean;
  hasPhilHealth?: boolean;
  hasPagIbig?: boolean;
}

/**
 * Auto-calculate government statutory contributions for a cutoff.
 * - Regular cutoff (1-3): Expected total basic pay for the month = (cutoffBasicPay * 4), divided by 4 (4 cutoffs).
 * - Last cutoff of the month: True-up calculation = Correct full monthly contribution based on actual total basic pay earned across the month minus all paid/deducted contributions in earlier cutoffs for that month.
 */
export function calculateCutoffContributions(params: CutoffContributionsParams): {
  sss: { employeeShare: number; employerShare: number };
  philhealth: { employeeShare: number; employerShare: number };
  pagibig: { employeeShare: number; employerShare: number };
  expectedMonthlyBasic: number;
  isLastCutoff: boolean;
} {
  const {
    cutoffBasicPay,
    isLastCutoffOfMonth = false,
    previousContributionsInMonth,
    hasSSS = true,
    hasPhilHealth = true,
    hasPagIbig = true,
  } = params;

  if (isLastCutoffOfMonth) {
    // Exact month-end true-up
    const prevBasic = previousContributionsInMonth?.basicPaySum || 0;
    const actualMonthlyBasic = prevBasic + cutoffBasicPay;

    const fullMonthlySSS = calculateMonthlySSS(actualMonthlyBasic);
    const prevSSSEE = previousContributionsInMonth?.sssEE || 0;
    const prevSSSER = previousContributionsInMonth?.sssER || 0;
    const sssEE = hasSSS ? Math.max(0, Math.round((fullMonthlySSS.employeeShare - prevSSSEE) * 100) / 100) : 0;
    const sssER = hasSSS ? Math.max(0, Math.round((fullMonthlySSS.employerShare - prevSSSER) * 100) / 100) : 0;

    const fullMonthlyPH = calculateMonthlyPhilHealth(actualMonthlyBasic);
    const prevPHEE = previousContributionsInMonth?.philhealthEE || 0;
    const prevPHER = previousContributionsInMonth?.philhealthER || 0;
    const phEE = hasPhilHealth ? Math.max(0, Math.round((fullMonthlyPH.employeeShare - prevPHEE) * 100) / 100) : 0;
    const phER = hasPhilHealth ? Math.max(0, Math.round((fullMonthlyPH.employerShare - prevPHER) * 100) / 100) : 0;

    const fullMonthlyHDMF = calculateMonthlyPagIbig(actualMonthlyBasic);
    const prevHDMFEE = previousContributionsInMonth?.pagibigEE || 0;
    const prevHDMFER = previousContributionsInMonth?.pagibigER || 0;
    const hdmfEE = hasPagIbig ? Math.max(0, Math.round((fullMonthlyHDMF.employeeShare - prevHDMFEE) * 100) / 100) : 0;
    const hdmfER = hasPagIbig ? Math.max(0, Math.round((fullMonthlyHDMF.employerShare - prevHDMFER) * 100) / 100) : 0;

    return {
      sss: { employeeShare: sssEE, employerShare: sssER },
      philhealth: { employeeShare: phEE, employerShare: phER },
      pagibig: { employeeShare: hdmfEE, employerShare: hdmfER },
      expectedMonthlyBasic: actualMonthlyBasic,
      isLastCutoff: true,
    };
  } else {
    // Regular Cutoff: Expected total basic pay for the month = cutoffBasicPay * 4
    const expectedMonthlyBasic = Math.max(0, cutoffBasicPay * 4);

    const fullMonthlySSS = calculateMonthlySSS(expectedMonthlyBasic);
    const sssEE = hasSSS ? Math.round((fullMonthlySSS.employeeShare / 4) * 100) / 100 : 0;
    const sssER = hasSSS ? Math.round((fullMonthlySSS.employerShare / 4) * 100) / 100 : 0;

    const fullMonthlyPH = calculateMonthlyPhilHealth(expectedMonthlyBasic);
    const phEE = hasPhilHealth ? Math.round((fullMonthlyPH.employeeShare / 4) * 100) / 100 : 0;
    const phER = hasPhilHealth ? Math.round((fullMonthlyPH.employerShare / 4) * 100) / 100 : 0;

    const hdmfEE = hasPagIbig ? 50 : 0; // 200 / 4
    const hdmfER = hasPagIbig ? 50 : 0;

    return {
      sss: { employeeShare: sssEE, employerShare: sssER },
      philhealth: { employeeShare: phEE, employerShare: phER },
      pagibig: { employeeShare: hdmfEE, employerShare: hdmfER },
      expectedMonthlyBasic,
      isLastCutoff: false,
    };
  }
}

// BIR TRAIN Law Official Weekly Withholding Tax Matrix (BIR RR 11-2018)
export function calculateWithholdingTax(taxableIncomeWeekly: number): number {
  if (taxableIncomeWeekly <= 4808) {
    return 0; // Tax exempt (₱250,000 / 52 weeks = ₱4,808/wk)
  } else if (taxableIncomeWeekly <= 7692) {
    return Math.round(((taxableIncomeWeekly - 4808) * 0.15) * 100) / 100;
  } else if (taxableIncomeWeekly <= 15385) {
    return Math.round((432.60 + (taxableIncomeWeekly - 7692) * 0.20) * 100) / 100;
  } else if (taxableIncomeWeekly <= 38462) {
    return Math.round((1971.20 + (taxableIncomeWeekly - 15385) * 0.25) * 100) / 100;
  } else if (taxableIncomeWeekly <= 153846) {
    return Math.round((7740.45 + (taxableIncomeWeekly - 38462) * 0.30) * 100) / 100;
  } else {
    return Math.round((42355.65 + (taxableIncomeWeekly - 153846) * 0.35) * 100) / 100;
  }
}

/**
 * Helper to compute tardiness (late minutes) from an arrival time and shift start time
 */
export function calculateLateMinutes(
  timeInStr: string | null | undefined,
  shiftStartTime: string = "08:00",
  gracePeriodMinutes: number = 5
): number {
  if (!timeInStr) return 0;
  const cleanTime = timeInStr.split(' ')[0].split(':').slice(0, 2).join(':');
  const [inH, inM] = cleanTime.split(':').map(Number);
  const [startH, startM] = shiftStartTime.split(':').map(Number);
  if (isNaN(inH) || isNaN(inM) || isNaN(startH) || isNaN(startM)) return 0;

  const inMinutes = inH * 60 + inM;
  const startMinutes = startH * 60 + startM;

  if (inMinutes > startMinutes + gracePeriodMinutes) {
    return inMinutes - startMinutes;
  }
  return 0;
}

/**
 * Calculate DTR Time differences and late/undertime/overtime
 */
export function calculateDTRMetrics(
  timeInStr: string | null,
  timeOutStr: string | null,
  shiftStart = "08:00",
  shiftEnd = "17:00",
  dayType = "Regular Working Day",
  gracePeriodMinutes = 5
): {
  regularHours: number;
  lateMinutes: number;
  undertimeMinutes: number;
  overtimeHours: number;
  nightDiffHours: number;
  status: 'Present' | 'Late' | 'Half Day' | 'Absent' | 'On Leave' | 'Rest Day' | 'Holiday';
} {
  if (!timeInStr || !timeOutStr) {
    if (dayType === 'Rest Day') {
      return { regularHours: 0, lateMinutes: 0, undertimeMinutes: 0, overtimeHours: 0, nightDiffHours: 0, status: 'Rest Day' };
    }
    if (dayType.includes('Holiday')) {
      return { regularHours: 0, lateMinutes: 0, undertimeMinutes: 0, overtimeHours: 0, nightDiffHours: 0, status: 'Holiday' };
    }
    return { regularHours: 0, lateMinutes: 0, undertimeMinutes: 0, overtimeHours: 0, nightDiffHours: 0, status: 'Absent' };
  }

  const [inH, inM] = timeInStr.split(':').map(Number);
  const [outH, outM] = timeOutStr.split(':').map(Number);
  const [startH, startM] = shiftStart.split(':').map(Number);
  const [endH, endM] = shiftEnd.split(':').map(Number);

  const inMinutes = inH * 60 + inM;
  const outMinutes = outH * 60 + outM;
  const shiftStartMin = startH * 60 + startM;
  const shiftEndMin = endH * 60 + endM;

  // Calculate Late using shift start and grace period
  const lateMinutes = calculateLateMinutes(timeInStr, shiftStart, gracePeriodMinutes);

  // Calculate Regular Work Hours
  const totalWorkedMinutes = Math.max(0, outMinutes - inMinutes);
  const effectiveMinutes = totalWorkedMinutes;
  let regularHours = Math.min(8, Math.max(0, Math.round((effectiveMinutes / 60) * 10) / 10));

  // Calculate Undertime:
  // If attendance is less than 4hrs (240 mins), consider it as half day (0.5 days work), and make undertime count from 4hrs (240 mins)
  // If attendance is between 4hrs and 8hrs (480 mins), undertime counts from 8hrs (480 mins)
  let undertimeMinutes = 0;
  if (effectiveMinutes > 0) {
    if (effectiveMinutes < 240) {
      undertimeMinutes = 240 - effectiveMinutes;
    } else if (effectiveMinutes < 480) {
      undertimeMinutes = 480 - effectiveMinutes;
    }
  }

  // Calculate Overtime: Counted by hours after 8 hours of work, rounded down by 30 mins
  // e.g. 1 hr 45 mins extra -> Math.floor(105 / 30) * 0.5 = 1.5 hrs
  let overtimeHours = 0;
  if (effectiveMinutes > 480) {
    const extraMinutes = effectiveMinutes - 480;
    overtimeHours = Math.floor(extraMinutes / 30) * 0.5;
  } else if (outMinutes > shiftEndMin + 30) {
    // If shift schedule OT
    const otMinutes = outMinutes - shiftEndMin;
    overtimeHours = Math.floor(otMinutes / 30) * 0.5;
  }

  let status: 'Present' | 'Late' | 'Half Day' | 'Absent' | 'On Leave' | 'Rest Day' | 'Holiday' = 'Present';
  if (regularHours < 4) {
    status = 'Half Day';
  } else if (lateMinutes > 0) {
    status = 'Late';
  }

  return {
    regularHours,
    lateMinutes,
    undertimeMinutes,
    overtimeHours,
    nightDiffHours: 0,
    status
  };
}

export interface GeneratePayslipOptions {
  enableLateDeduction?: boolean;
  enableNightShiftPay?: boolean;
  enableWithholdingTax?: boolean;
  isLastCutoffOfMonth?: boolean;
  previousContributionsInMonth?: {
    sssEE: number;
    sssER: number;
    philhealthEE: number;
    philhealthER: number;
    pagibigEE: number;
    pagibigER: number;
    basicPaySum: number;
  };
}

/**
 * Generate a complete Weekly Payslip for an employee given their DTR records and allowances/deductions
 */
export function generateEmployeePayslip(
  employee: Employee,
  payPeriodId: string,
  dtrRecords: DTRRecord[],
  customAllowances: PayslipItem[] = [],
  customDeductions: PayslipItem[] = [],
  periodHolidays: PeriodHoliday[] = [],
  options: GeneratePayslipOptions = {}
): Payslip {
  const dailyRate = employee.dailyRate;
  const hourlyRate = Math.round((dailyRate / 8) * 100) / 100;
  const minuteRate = hourlyRate / 60;

  // Create a fast lookup map for holidays by date
  const holidayMap = new Map<string, 'Regular Holiday' | 'Special Non-Working Holiday'>();
  periodHolidays.forEach(h => {
    const normType = (h.type as string) === 'Regular' || h.type === 'Regular Holiday'
      ? 'Regular Holiday'
      : 'Special Non-Working Holiday';
    holidayMap.set(h.date, normType);
  });

  // Tally DTR metrics
  let daysWorked = 0;
  let lateMinutes = 0;
  let undertimeMinutes = 0;
  let overtimeHours = 0;
  let nightDiffHours = 0;
  let holidayDays = 0;
  let regularHolidayDays = 0;
  let specialHolidayDays = 0;
  let wdoHours = 0;

  const employeeRestDays = (employee.restDays && employee.restDays.length > 0) ? employee.restDays : ['Sunday'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const processedDates = new Set<string>();

  dtrRecords.forEach((record) => {
    processedDates.add(record.date);
    const isWorked = record.status === 'Present' || record.status === 'Late' || record.status === 'Half Day';
    const dayFraction = record.status === 'Half Day' ? 0.5 : 1;

    // Check if the record date falls on employee's configured rest days or dayType is 'Rest Day'
    const recordDateObj = new Date(record.date + 'T00:00:00');
    const recordDayName = !isNaN(recordDateObj.getTime()) ? dayNames[recordDateObj.getDay()] : (record.dayOfWeek || '');
    const isRestDay = record.dayType === 'Rest Day' || employeeRestDays.includes(recordDayName);

    if (isRestDay && isWorked) {
      // Work Day Off (WDO) on Rest Day (130% rate)
      const hrsWorked = record.regularHours || (record.status === 'Half Day' ? 4 : 8);
      wdoHours += hrsWorked + (record.overtimeHours || 0);
    } else if (!isRestDay) {
      const isSub4Hrs = (record.totalHours !== undefined && record.totalHours > 0 && record.totalHours < 4) ||
                        (record.regularHours !== undefined && record.regularHours > 0 && record.regularHours < 4);
      if (record.status === 'Half Day' || isSub4Hrs) {
        daysWorked += 0.5;
      } else if (record.status === 'Present' || record.status === 'Late' || (record.totalHours || record.regularHours || 0) >= 4) {
        daysWorked += 1;
      }
    }

    // Check holiday type (from periodHolidays or record.dayType)
    const configuredHolidayType = holidayMap.get(record.date);
    const effectiveHolidayType = configuredHolidayType || (record.dayType && record.dayType.includes('Holiday')
      ? (record.dayType === 'Special Non-Working Holiday' ? 'Special Non-Working Holiday' : 'Regular Holiday')
      : null);

    if (effectiveHolidayType) {
      holidayDays += 1;
      if (effectiveHolidayType === 'Special Non-Working Holiday') {
        if (isWorked) {
          specialHolidayDays += dayFraction;
        }
      } else {
        // Regular Holiday (DOLE Art. 94):
        // Worked: 100% Basic Pay (via daysWorked) + 100% Holiday Pay (via regularHolidayDays)
        // Unworked: 100% Holiday Pay (via regularHolidayDays)
        if (isWorked) {
          regularHolidayDays += dayFraction;
        } else {
          regularHolidayDays += 1;
        }
      }
    }

    lateMinutes += record.lateMinutes || 0;
    undertimeMinutes += record.undertimeMinutes || 0;
    nightDiffHours += record.nightDiffHours || 0;
    if (!isRestDay) {
      overtimeHours += record.overtimeHours || 0;
    }
  });

  // Account for period holidays that were not present in DTR records (unworked holidays)
  periodHolidays.forEach((h) => {
    if (!processedDates.has(h.date)) {
      const normType = (h.type as string) === 'Regular' || h.type === 'Regular Holiday'
        ? 'Regular Holiday'
        : 'Special Non-Working Holiday';

      if (normType === 'Regular Holiday') {
        // DOLE Art. 94: Unworked Regular Holiday grants 100% daily wage (1 day regular holiday pay)
        regularHolidayDays += 1;
        holidayDays += 1;
      }
    }
  });

  // Earnings computations
  const basicPay = Math.round((daysWorked * dailyRate) * 100) / 100;
  
  // Overtime pay (125% regular rate)
  const overtimePay = Math.round((overtimeHours * hourlyRate * 1.25) * 100) / 100;

  // Night Shift Differential (NSD): 10% premium on hourly rate for hours worked between 10PM - 6AM (Art. 86 Labor Code)
  // Included in payslip calculation only when enableNightShiftPay is turned ON
  const enableNightShiftPay = Boolean(options.enableNightShiftPay);
  const nightDiffPay = enableNightShiftPay
    ? Math.round((nightDiffHours * hourlyRate * 0.10) * 100) / 100
    : 0;
  
  // Holiday Pay:
  // - Regular Holiday: 100% additional daily rate if worked (+1.0x)
  // - Special Non-Working Holiday: 30% additional daily rate if worked (+0.30x)
  const regularHolidayPay = Math.round((regularHolidayDays * dailyRate * 1.0) * 100) / 100;
  const specialHolidayPay = Math.round((specialHolidayDays * dailyRate * 0.30) * 100) / 100;
  const holidayPay = Math.round((regularHolidayPay + specialHolidayPay) * 100) / 100;

  // Work Day Off (WDO) Pay (130% rate for rest day work)
  const wdoPay = Math.round((wdoHours * hourlyRate * 1.30) * 100) / 100;

  // Allowances computation (Rice & Meal Subsidy and Transportation Allowance excluded from default computation)
  const standardAllowances: PayslipItem[] = customAllowances;

  const totalAllowances = standardAllowances.reduce((acc, item) => acc + item.amount, 0);
  const grossPay = Math.round((basicPay + overtimePay + holidayPay + wdoPay + nightDiffPay + totalAllowances) * 100) / 100;

  // Deductions
  // If enableLateDeduction is explicitly false, lateMinutes are excluded from payroll deduction (only undertime is deducted)
  const enableLateDeduction = options.enableLateDeduction !== false;
  const effectiveLateMinutes = enableLateDeduction ? lateMinutes : 0;
  const lateUndertimeDeduction = Math.round(((effectiveLateMinutes + undertimeMinutes) * minuteRate) * 100) / 100;

  // Government Contributions (Only deduct if statutory ID is filled AND toggle is enabled)
  const hasSSS = Boolean(
    employee.sssEnabled !== false &&
    employee.sssNumber &&
    employee.sssNumber.trim().length > 0
  );
  const hasPhilHealth = Boolean(
    employee.philhealthEnabled !== false &&
    employee.philhealthNumber &&
    employee.philhealthNumber.trim().length > 0
  );
  const hasPagIbig = Boolean(
    employee.pagibigEnabled !== false &&
    employee.pagibigNumber &&
    employee.pagibigNumber.trim().length > 0
  );

  const statutory = calculateCutoffContributions({
    cutoffBasicPay: basicPay,
    isLastCutoffOfMonth: Boolean(options.isLastCutoffOfMonth),
    previousContributionsInMonth: options.previousContributionsInMonth,
    hasSSS,
    hasPhilHealth,
    hasPagIbig,
  });

  const sss = statutory.sss;
  const philhealth = statutory.philhealth;
  const pagibig = statutory.pagibig;

  // Total Statutory Deductions
  const totalStatutory = sss.employeeShare + philhealth.employeeShare + pagibig.employeeShare;

  // Taxable Income = Gross Pay - Non-taxable statutory deductions
  const taxableIncome = Math.max(0, grossPay - totalStatutory - lateUndertimeDeduction);

  // TIN / Withholding Tax (Only deduct if TIN is enabled and filled, and withholding tax is enabled)
  const hasTIN = Boolean(
    employee.tinEnabled !== false &&
    employee.tinNumber &&
    employee.tinNumber.trim().length > 0
  );
  const enableWithholdingTax = Boolean(options.enableWithholdingTax) && hasTIN;
  const withholdingTax = enableWithholdingTax ? calculateWithholdingTax(taxableIncome) : 0;

  const defaultOtherDeductions: PayslipItem[] = customDeductions;
  const totalOtherDeductions = defaultOtherDeductions.reduce((acc, item) => acc + item.amount, 0);

  const mlsDeduction = employee.mlsDeduction || 0;
  const cashAdvanceDeduction = employee.cashAdvanceDeduction || 0;

  const totalDeductions = Math.round(
    (lateUndertimeDeduction +
      sss.employeeShare +
      philhealth.employeeShare +
      pagibig.employeeShare +
      withholdingTax +
      mlsDeduction +
      cashAdvanceDeduction +
      totalOtherDeductions) * 100
  ) / 100;

  const netPay = Math.max(0, Math.round((grossPay - totalDeductions) * 100) / 100);

  return {
    id: `PS-${payPeriodId}-${employee.id}`,
    payPeriodId,
    employeeId: employee.id,
    employeeNumber: employee.employeeNumber,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    department: employee.department,
    position: employee.position,
    dailyRate,
    hourlyRate,
    daysWorked,
    lateMinutes,
    undertimeMinutes,
    overtimeHours,
    holidayDays,
    regularHolidayDays,
    specialHolidayDays,
    wdoHours,
    nightDiffHours: Math.round(nightDiffHours * 10) / 10,
    nightDiffPay,
    basicPay,
    overtimePay,
    holidayPay,
    wdoPay,
    allowances: standardAllowances,
    totalAllowances,
    grossPay,
    lateUndertimeDeduction,
    sssDeduction: sss.employeeShare,
    sssEmployerShare: sss.employerShare,
    philhealthDeduction: philhealth.employeeShare,
    philhealthEmployerShare: philhealth.employerShare,
    pagibigDeduction: pagibig.employeeShare,
    pagibigEmployerShare: pagibig.employerShare,
    withholdingTax,
    mlsDeduction,
    cashAdvanceDeduction,
    otherDeductions: defaultOtherDeductions,
    totalOtherDeductions,
    totalDeductions,
    netPay,
    status: 'Draft',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Helper to get payday month info and check if a payday date (payoutDate)
 * is the last payday of its calendar month.
 */
export function getPaydayMonthInfo(payoutDateStr: string) {
  if (!payoutDateStr) return { monthName: '', year: 0, isLast: false, paydayNum: 1 };
  try {
    const payDate = new Date(payoutDateStr + 'T00:00:00');
    if (isNaN(payDate.getTime())) return { monthName: '', year: 0, isLast: false, paydayNum: 1 };

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[payDate.getMonth()];
    const year = payDate.getFullYear();

    // Next weekly payday is 7 days later
    const nextPayday = new Date(payDate);
    nextPayday.setDate(nextPayday.getDate() + 7);

    // If adding 7 days crosses into the next month or year, this payday is the LAST payday of the month
    const isLast = (
      nextPayday.getMonth() !== payDate.getMonth() ||
      nextPayday.getFullYear() !== payDate.getFullYear()
    );

    // Calculate payday index in the month (e.g. 1st payday of August, 2nd, etc.)
    const dayOfMonth = payDate.getDate();
    const paydayNum = Math.ceil(dayOfMonth / 7);

    return { monthName, year, isLast, paydayNum };
  } catch {
    return { monthName: '', year: 0, isLast: false, paydayNum: 1 };
  }
}

export interface DynamicCutoffOption {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  payoutDate: string; // YYYY-MM-DD
  displayLabel: string; // e.g. "Sep 5 - 11, 2026 / Payday: Sep 12"
}

/**
 * Calculates up to N weekly cutoff periods starting from date today (Saturday to Friday cycle, Payday Saturday).
 */
export function getCutoffsFromToday(count: number = 5, refDate: Date = new Date()): DynamicCutoffOption[] {
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Current day of week: 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayOfWeek = refDate.getDay();
  // Days to subtract to reach the Saturday starting the current weekly cutoff
  const daysSinceSaturday = (dayOfWeek + 1) % 7;

  const currentSat = new Date(refDate);
  currentSat.setDate(refDate.getDate() - daysSinceSaturday);
  currentSat.setHours(0, 0, 0, 0);

  const options: DynamicCutoffOption[] = [];

  for (let i = 0; i < count; i++) {
    const satStart = new Date(currentSat);
    satStart.setDate(currentSat.getDate() - (i * 7));

    const friEnd = new Date(satStart);
    friEnd.setDate(satStart.getDate() + 6);

    const satPayday = new Date(friEnd);
    satPayday.setDate(friEnd.getDate() + 1);

    const pad = (n: number) => String(n).padStart(2, '0');
    const startIso = `${satStart.getFullYear()}-${pad(satStart.getMonth() + 1)}-${pad(satStart.getDate())}`;
    const endIso = `${friEnd.getFullYear()}-${pad(friEnd.getMonth() + 1)}-${pad(friEnd.getDate())}`;
    const paydayIso = `${satPayday.getFullYear()}-${pad(satPayday.getMonth() + 1)}-${pad(satPayday.getDate())}`;

    const mStart = shortMonths[satStart.getMonth()];
    const dStart = satStart.getDate();

    const mEnd = shortMonths[friEnd.getMonth()];
    const dEnd = friEnd.getDate();
    const yearEnd = friEnd.getFullYear();

    const mPay = shortMonths[satPayday.getMonth()];
    const dPay = satPayday.getDate();

    let rangeLabel = '';
    if (mStart === mEnd) {
      rangeLabel = `${mStart} ${dStart} - ${dEnd}, ${yearEnd}`;
    } else {
      rangeLabel = `${mStart} ${dStart} - ${mEnd} ${dEnd}, ${yearEnd}`;
    }

    const displayLabel = `${rangeLabel} / Payday: ${mPay} ${dPay}`;

    const mStartFull = fullMonths[satStart.getMonth()];
    const mEndFull = fullMonths[friEnd.getMonth()];
    let fullRangeLabel = '';
    if (mStartFull === mEndFull) {
      fullRangeLabel = `${mStartFull} ${dStart} - ${dEnd}, ${yearEnd}`;
    } else {
      fullRangeLabel = `${mStartFull} ${dStart} - ${mEndFull} ${dEnd}, ${yearEnd}`;
    }

    options.push({
      id: `DYNAMIC-${startIso}`,
      name: `${fullRangeLabel} (Weekly Cutoff)`,
      startDate: startIso,
      endDate: endIso,
      payoutDate: paydayIso,
      displayLabel,
    });
  }

  return options;
}

