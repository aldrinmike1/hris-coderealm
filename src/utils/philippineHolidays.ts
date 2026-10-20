import { PeriodHoliday, PayPeriod } from '../types';
import { getPaydayMonthInfo } from './calculations';

export interface DeclaredHolidayInfo {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'Regular Holiday' | 'Special Non-Working Holiday';
}

/**
 * Returns Philippine Regular and Special Non-Working Holidays for any given year.
 * Includes fixed national holidays, Easter-calculated Holy Week holidays, and
 * movable holidays such as National Heroes Day (Last Monday of August).
 */
export function getPhilippineHolidaysForYear(year: number): DeclaredHolidayInfo[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const holidays: DeclaredHolidayInfo[] = [
    { date: `${year}-01-01`, name: "New Year's Day", type: 'Regular Holiday' },
    { date: `${year}-01-23`, name: 'First Philippine Republic Day', type: 'Special Non-Working Holiday' },
    { date: `${year}-02-25`, name: 'EDSA People Power Revolution Anniversary', type: 'Special Non-Working Holiday' },
    { date: `${year}-04-09`, name: 'Araw ng Kagitingan (Day of Valor)', type: 'Regular Holiday' },
    { date: `${year}-05-01`, name: 'Labor Day', type: 'Regular Holiday' },
    { date: `${year}-06-12`, name: 'Independence Day', type: 'Regular Holiday' },
    { date: `${year}-08-21`, name: 'Ninoy Aquino Day', type: 'Special Non-Working Holiday' },
    { date: `${year}-11-01`, name: "All Saints' Day", type: 'Special Non-Working Holiday' },
    { date: `${year}-11-02`, name: "All Souls' Day", type: 'Special Non-Working Holiday' },
    { date: `${year}-11-30`, name: 'Bonifacio Day', type: 'Regular Holiday' },
    { date: `${year}-12-08`, name: 'Feast of the Immaculate Conception', type: 'Special Non-Working Holiday' },
    { date: `${year}-12-24`, name: 'Christmas Eve', type: 'Special Non-Working Holiday' },
    { date: `${year}-12-25`, name: 'Christmas Day', type: 'Regular Holiday' },
    { date: `${year}-12-30`, name: 'Rizal Day', type: 'Regular Holiday' },
    { date: `${year}-12-31`, name: 'Last Day of the Year', type: 'Special Non-Working Holiday' },
  ];

  // National Heroes Day: Last Monday of August
  let lastMondayAug = 31;
  while (lastMondayAug > 20) {
    const d = new Date(year, 7, lastMondayAug); // Month 7 is August (0-indexed)
    if (d.getDay() === 1) { // 1 = Monday
      break;
    }
    lastMondayAug--;
  }
  holidays.push({
    date: `${year}-08-${pad(lastMondayAug)}`,
    name: 'National Heroes Day',
    type: 'Regular Holiday',
  });

  // Calculate Easter Sunday (Meeus/Jones/Butcher algorithm)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const easterMonth = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed (March=2, April=3)
  const easterDay = ((h + l - 7 * m + 114) % 31) + 1;

  const easterDate = new Date(year, easterMonth, easterDay);

  // Maundy Thursday: -3 days from Easter Sunday
  const maundy = new Date(easterDate);
  maundy.setDate(maundy.getDate() - 3);
  holidays.push({
    date: `${maundy.getFullYear()}-${pad(maundy.getMonth() + 1)}-${pad(maundy.getDate())}`,
    name: 'Maundy Thursday',
    type: 'Regular Holiday',
  });

  // Good Friday: -2 days from Easter Sunday
  const goodFri = new Date(easterDate);
  goodFri.setDate(goodFri.getDate() - 2);
  holidays.push({
    date: `${goodFri.getFullYear()}-${pad(goodFri.getMonth() + 1)}-${pad(goodFri.getDate())}`,
    name: 'Good Friday',
    type: 'Regular Holiday',
  });

  // Black Saturday: -1 day from Easter Sunday
  const blackSat = new Date(easterDate);
  blackSat.setDate(blackSat.getDate() - 1);
  holidays.push({
    date: `${blackSat.getFullYear()}-${pad(blackSat.getMonth() + 1)}-${pad(blackSat.getDate())}`,
    name: 'Black Saturday',
    type: 'Special Non-Working Holiday',
  });

  return holidays;
}

/**
 * Get all declared holidays that fall within a given date range (inclusive).
 */
export function getPhilippineHolidaysInRange(startDateStr: string, endDateStr: string): PeriodHoliday[] {
  if (!startDateStr || !endDateStr) return [];
  try {
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T23:59:59');
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    let allHolidays: DeclaredHolidayInfo[] = getPhilippineHolidaysForYear(startYear);
    if (endYear !== startYear) {
      allHolidays = allHolidays.concat(getPhilippineHolidaysForYear(endYear));
    }

    return allHolidays
      .filter(h => h.date >= startDateStr && h.date <= endDateStr)
      .map((h, idx) => ({
        id: `hol-${h.date}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        date: h.date,
        name: h.name,
        type: h.type,
      }));
  } catch {
    return [];
  }
}

export interface DynamicWeeklyPreset {
  id: string;
  weekIndex: number; // 1-based index of week in the month
  totalWeeksInMonth: number;
  startDate: string; // YYYY-MM-DD (Saturday)
  endDate: string; // YYYY-MM-DD (Friday)
  payoutDate: string; // YYYY-MM-DD (Saturday)
  name: string; // e.g. "September 12 - 18, 2026 (Weekly Cutoff)"
  shortLabel: string; // e.g. "Sep 12 - 18, 2026"
  paydayShort: string; // e.g. "Sat, Sep 19"
  paydayDescription: string; // e.g. "Payday #3 of Sep"
  isLastCutoffOfMonth: boolean;
  holidays: PeriodHoliday[];
  alreadyExists: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Dynamically generates all weekly cutoffs whose Saturday Payday falls within the specified year and month.
 * In standard weekly payroll, each cutoff runs Saturday to Friday, and its payday is the following Saturday.
 */
export function generateWeeklyCutoffsForMonth(
  year: number,
  monthIndex: number, // 0 = Jan, 11 = Dec
  existingPeriods: PayPeriod[] = []
): DynamicWeeklyPreset[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // Find all Saturdays in this month (Paydays)
  const saturdays: number[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, monthIndex, d);
    if (dt.getDay() === 6) { // 6 = Saturday
      saturdays.push(d);
    }
  }

  const existingSet = new Set(
    existingPeriods.map(p => `${p.startDate}__${p.endDate}`)
  );

  return saturdays.map((satDay, idx) => {
    const satPayday = new Date(year, monthIndex, satDay);
    const friEnd = new Date(year, monthIndex, satDay - 1);
    const satStart = new Date(year, monthIndex, satDay - 7);

    const startIso = `${satStart.getFullYear()}-${pad(satStart.getMonth() + 1)}-${pad(satStart.getDate())}`;
    const endIso = `${friEnd.getFullYear()}-${pad(friEnd.getMonth() + 1)}-${pad(friEnd.getDate())}`;
    const payIso = `${satPayday.getFullYear()}-${pad(satPayday.getMonth() + 1)}-${pad(satPayday.getDate())}`;

    const mStartShort = SHORT_MONTH_NAMES[satStart.getMonth()];
    const mEndShort = SHORT_MONTH_NAMES[friEnd.getMonth()];
    const mPayShort = SHORT_MONTH_NAMES[satPayday.getMonth()];

    const mStartFull = MONTH_NAMES[satStart.getMonth()];
    const mEndFull = MONTH_NAMES[friEnd.getMonth()];
    const yearEnd = friEnd.getFullYear();

    let shortLabel = `${mStartShort} ${pad(satStart.getDate())} - ${mEndShort} ${pad(friEnd.getDate())}, ${yearEnd}`;
    if (mStartShort === mEndShort) {
      shortLabel = `${mStartShort} ${pad(satStart.getDate())} - ${pad(friEnd.getDate())}, ${yearEnd}`;
    }

    let fullName = `${mStartFull} ${satStart.getDate()} - ${mEndFull} ${friEnd.getDate()}, ${yearEnd} (Weekly Cutoff)`;
    if (mStartFull === mEndFull) {
      fullName = `${mStartFull} ${satStart.getDate()} - ${friEnd.getDate()}, ${yearEnd} (Weekly Cutoff)`;
    }

    const isLast = idx === saturdays.length - 1;
    const paydayDescription = `Payday #${idx + 1} of ${mPayShort}`;

    const holidays = getPhilippineHolidaysInRange(startIso, endIso);
    const alreadyExists = existingSet.has(`${startIso}__${endIso}`);

    return {
      id: `preset-${startIso}-${endIso}`,
      weekIndex: idx + 1,
      totalWeeksInMonth: saturdays.length,
      startDate: startIso,
      endDate: endIso,
      payoutDate: payIso,
      name: fullName,
      shortLabel,
      paydayShort: `Sat, ${mPayShort} ${satPayday.getDate()}`,
      paydayDescription,
      isLastCutoffOfMonth: isLast,
      holidays,
      alreadyExists,
    };
  });
}

/**
 * Computes the recommended next sequential weekly cutoff following the latest existing pay period.
 */
export function getSuggestedNextWeeklyCutoff(existingPeriods: PayPeriod[]) {
  const pad = (n: number) => String(n).padStart(2, '0');

  if (!existingPeriods || existingPeriods.length === 0) {
    // Default to upcoming Saturday from today
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilNextSat = (6 - dayOfWeek + 7) % 7 || 7;
    const nextSat = new Date(today);
    nextSat.setDate(today.getDate() + daysUntilNextSat);

    const friEnd = new Date(nextSat);
    friEnd.setDate(nextSat.getDate() + 6);

    const satPay = new Date(friEnd);
    satPay.setDate(friEnd.getDate() + 1);

    const startIso = `${nextSat.getFullYear()}-${pad(nextSat.getMonth() + 1)}-${pad(nextSat.getDate())}`;
    const endIso = `${friEnd.getFullYear()}-${pad(friEnd.getMonth() + 1)}-${pad(friEnd.getDate())}`;
    const payIso = `${satPay.getFullYear()}-${pad(satPay.getMonth() + 1)}-${pad(satPay.getDate())}`;

    const paydayInfo = getPaydayMonthInfo(payIso);

    return {
      startDate: startIso,
      endDate: endIso,
      payoutDate: payIso,
      name: `${MONTH_NAMES[nextSat.getMonth()]} ${nextSat.getDate()} - ${friEnd.getDate()}, ${friEnd.getFullYear()} (Weekly Cutoff)`,
      isLastCutoffOfMonth: paydayInfo.isLast,
      targetMonth: satPay.getMonth(),
      targetYear: satPay.getFullYear(),
      holidays: getPhilippineHolidaysInRange(startIso, endIso),
      afterPeriodName: null,
    };
  }

  // Find latest pay period by endDate
  const sorted = [...existingPeriods].sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  const latest = sorted[0];

  try {
    const latestEnd = new Date(latest.endDate + 'T00:00:00');
    // Next start is +1 day (Saturday)
    const nextStart = new Date(latestEnd);
    nextStart.setDate(latestEnd.getDate() + 1);

    // End is +6 days (Friday)
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextStart.getDate() + 6);

    // Payday is +7 days (Saturday)
    const nextPay = new Date(nextStart);
    nextPay.setDate(nextStart.getDate() + 7);

    const startIso = `${nextStart.getFullYear()}-${pad(nextStart.getMonth() + 1)}-${pad(nextStart.getDate())}`;
    const endIso = `${nextEnd.getFullYear()}-${pad(nextEnd.getMonth() + 1)}-${pad(nextEnd.getDate())}`;
    const payIso = `${nextPay.getFullYear()}-${pad(nextPay.getMonth() + 1)}-${pad(nextPay.getDate())}`;

    const mStartFull = MONTH_NAMES[nextStart.getMonth()];
    const mEndFull = MONTH_NAMES[nextEnd.getMonth()];
    const yearEnd = nextEnd.getFullYear();

    let name = `${mStartFull} ${nextStart.getDate()} - ${mEndFull} ${nextEnd.getDate()}, ${yearEnd} (Weekly Cutoff)`;
    if (mStartFull === mEndFull) {
      name = `${mStartFull} ${nextStart.getDate()} - ${nextEnd.getDate()}, ${yearEnd} (Weekly Cutoff)`;
    }

    const paydayInfo = getPaydayMonthInfo(payIso);
    const holidays = getPhilippineHolidaysInRange(startIso, endIso);

    return {
      startDate: startIso,
      endDate: endIso,
      payoutDate: payIso,
      name,
      isLastCutoffOfMonth: paydayInfo.isLast,
      targetMonth: nextPay.getMonth(),
      targetYear: nextPay.getFullYear(),
      holidays,
      afterPeriodName: latest.name,
    };
  } catch {
    return null;
  }
}
