import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Calendar,
  Plus,
  Sparkles,
  Trash2,
  Tag,
  Info,
  ChevronLeft,
  ChevronRight,
  Zap,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PeriodHoliday, PayPeriod } from '../../types';
import { getPaydayMonthInfo } from '../../utils/calculations';
import {
  generateWeeklyCutoffsForMonth,
  getSuggestedNextWeeklyCutoff,
  getPhilippineHolidaysInRange,
} from '../../utils/philippineHolidays';

interface NewPayPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (period: PayPeriod) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const NewPayPeriodModal: React.FC<NewPayPeriodModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { createPayPeriod, payPeriods } = useApp();

  // Smart suggestion for next cutoff based on latest existing pay period
  const suggestedNext = useMemo(() => getSuggestedNextWeeklyCutoff(payPeriods), [payPeriods]);

  // Dynamic preset navigation month and year
  const [navYear, setNavYear] = useState(() => suggestedNext?.targetYear ?? new Date().getFullYear());
  const [navMonth, setNavMonth] = useState(() => suggestedNext?.targetMonth ?? new Date().getMonth());

  const [name, setName] = useState('September 12 - 18, 2026 (Weekly Cutoff)');
  const [startDate, setStartDate] = useState('2026-09-12'); // Saturday
  const [endDate, setEndDate] = useState('2026-09-18'); // Friday
  const [payoutDate, setPayoutDate] = useState('2026-09-19'); // Saturday
  const [isLastCutoffOfMonth, setIsLastCutoffOfMonth] = useState(false);
  const [holidays, setHolidays] = useState<PeriodHoliday[]>([]);

  // Automatically initialize modal fields with suggested next cutoff or current month when opened
  useEffect(() => {
    if (isOpen) {
      if (suggestedNext) {
        setStartDate(suggestedNext.startDate);
        setEndDate(suggestedNext.endDate);
        setPayoutDate(suggestedNext.payoutDate);
        setName(suggestedNext.name);
        setIsLastCutoffOfMonth(suggestedNext.isLastCutoffOfMonth);
        setHolidays(suggestedNext.holidays || []);
        setNavYear(suggestedNext.targetYear);
        setNavMonth(suggestedNext.targetMonth);
      } else {
        const today = new Date();
        setNavYear(today.getFullYear());
        setNavMonth(today.getMonth());
      }
    }
  }, [isOpen, suggestedNext]);

  // Preset helper for weekly Saturday -> Friday cutoffs
  const applyWeeklyPreset = (
    satStart: string,
    friEnd: string,
    satPayday: string,
    label: string,
    presetHolidays?: PeriodHoliday[],
    isLastOverride?: boolean
  ) => {
    setStartDate(satStart);
    setEndDate(friEnd);
    setPayoutDate(satPayday);
    setName(label);
    const autoLast = getPaydayMonthInfo(satPayday).isLast;
    setIsLastCutoffOfMonth(isLastOverride !== undefined ? isLastOverride : autoLast);
    if (presetHolidays !== undefined) {
      setHolidays(presetHolidays);
    } else {
      // Auto-fetch holidays in this weekly range
      const rangeHolidays = getPhilippineHolidaysInRange(satStart, friEnd);
      setHolidays(rangeHolidays);
    }
  };

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear(prev => prev - 1);
    } else {
      setNavMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear(prev => prev + 1);
    } else {
      setNavMonth(prev => prev + 1);
    }
  };

  const handleJumpToCurrentMonth = () => {
    const today = new Date();
    setNavYear(today.getFullYear());
    setNavMonth(today.getMonth());
  };

  const handleApplySuggested = () => {
    if (!suggestedNext) return;
    setNavYear(suggestedNext.targetYear);
    setNavMonth(suggestedNext.targetMonth);
    applyWeeklyPreset(
      suggestedNext.startDate,
      suggestedNext.endDate,
      suggestedNext.payoutDate,
      suggestedNext.name,
      suggestedNext.holidays,
      suggestedNext.isLastCutoffOfMonth
    );
  };

  // Dynamically generated weekly presets for the chosen navYear & navMonth
  const dynamicPresets = useMemo(() => {
    return generateWeeklyCutoffsForMonth(navYear, navMonth, payPeriods);
  }, [navYear, navMonth, payPeriods]);

  // Helper when user selects a custom start date to auto-calculate Friday and Saturday
  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (!newStart) return;

    try {
      const dStart = new Date(newStart + 'T00:00:00');
      // Friday is +6 days
      const dEnd = new Date(dStart);
      dEnd.setDate(dEnd.getDate() + 6);
      const endStr = dEnd.toISOString().split('T')[0];

      // Saturday payday is +7 days
      const dPay = new Date(dStart);
      dPay.setDate(dPay.getDate() + 7);
      const payStr = dPay.toISOString().split('T')[0];

      setEndDate(endStr);
      setPayoutDate(payStr);

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mStart = months[dStart.getMonth()];
      const mEnd = months[dEnd.getMonth()];
      const year = dEnd.getFullYear();

      let rangeLabel = `${mStart} ${dStart.getDate()} - ${mEnd} ${dEnd.getDate()}, ${year}`;
      if (mStart === mEnd) {
        rangeLabel = `${mStart} ${dStart.getDate()} - ${dEnd.getDate()}, ${year}`;
      }
      setName(`${rangeLabel} (Weekly Cutoff)`);

      // Auto-determine if this payday is the last payday of the month
      const paydayInfo = getPaydayMonthInfo(payStr);
      setIsLastCutoffOfMonth(paydayInfo.isLast);

      // Also auto-fetch holidays in this range if currently empty
      if (holidays.length === 0) {
        const detected = getPhilippineHolidaysInRange(newStart, endStr);
        if (detected.length > 0) {
          setHolidays(detected);
        }
      }
    } catch {
      // ignore
    }
  };

  const handlePayoutDateChange = (newPayout: string) => {
    setPayoutDate(newPayout);
    if (newPayout) {
      const paydayInfo = getPaydayMonthInfo(newPayout);
      setIsLastCutoffOfMonth(paydayInfo.isLast);
    }
  };

  const handleAddHoliday = () => {
    const newHoliday: PeriodHoliday = {
      id: `hol-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      date: startDate || new Date().toISOString().split('T')[0],
      name: '',
      type: 'Regular Holiday',
    };
    setHolidays(prev => [...prev, newHoliday]);
  };

  const handleUpdateHoliday = (id: string, updates: Partial<PeriodHoliday>) => {
    setHolidays(prev =>
      prev.map(h => (h.id === id ? { ...h, ...updates } : h))
    );
  };

  const handleRemoveHoliday = (id: string) => {
    setHolidays(prev => prev.filter(h => h.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Filter out invalid/empty holidays and ensure clean names
    const cleanedHolidays = holidays.map(h => ({
      ...h,
      name: h.name.trim() || (h.type === 'Regular Holiday' ? 'Regular Holiday' : 'Special Non-Working Holiday'),
    }));

    const created = createPayPeriod({
      name: name.trim(),
      startDate,
      endDate,
      payoutDate,
      status: 'Draft',
      holidays: cleanedHolidays,
      isLastCutoffOfMonth,
    });

    onClose();
    if (onCreated && created) {
      onCreated(created);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div key="new-pay-period-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8"
          id="new-payperiod-modal"
        >
          <div className="bg-slate-900 text-white p-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Create Weekly Pay Period</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Saturday to Friday Cutoff • Saturday Payday</p>
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

          {/* Weekly Schedule Callout */}
          <div className="bg-indigo-50 border-b border-indigo-100 p-3.5 flex items-start gap-2.5 text-xs text-indigo-900">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Weekly Payroll & Holiday System</span>
              <p className="text-[11px] text-indigo-700">
                Attendance runs from <strong>Saturday to Friday</strong> (7 days). You can specify all declared <strong>Regular</strong> & <strong>Special Non-Working Holidays</strong> to auto-calculate holiday pay during payroll calculation.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Quick Weekly Presets (Dynamic for any Month & Year) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Quick Weekly Presets
                    </label>
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      Dynamic
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Click any weekly preset below to auto-populate dates, period name, and Philippine holidays.
                  </p>
                </div>

                {/* Quick Next Cutoff Suggestion Button */}
                {suggestedNext && (
                  <button
                    type="button"
                    onClick={handleApplySuggested}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors shadow-2xs shrink-0 self-start sm:self-auto"
                    title={`Suggested next cutoff following ${suggestedNext.afterPeriodName || 'latest period'}`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                    <span>⚡ Next Cutoff: {suggestedNext.startDate.slice(5)} to {suggestedNext.endDate.slice(5)}</span>
                  </button>
                )}
              </div>

              {/* Month & Year Navigator */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Month Selector */}
                  <select
                    value={navMonth}
                    onChange={e => setNavMonth(parseInt(e.target.value, 10))}
                    className="px-2 py-1 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {MONTH_NAMES.map((mName, mIdx) => (
                      <option key={mName} value={mIdx}>
                        {mName}
                      </option>
                    ))}
                  </select>

                  {/* Year Selector */}
                  <select
                    value={navYear}
                    onChange={e => setNavYear(parseInt(e.target.value, 10))}
                    className="px-2 py-1 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleJumpToCurrentMonth}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    📅 This Month
                  </button>
                </div>
              </div>

              {/* Weekly Preset Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dynamicPresets.map(preset => {
                  const isSelected = startDate === preset.startDate && endDate === preset.endDate;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        applyWeeklyPreset(
                          preset.startDate,
                          preset.endDate,
                          preset.payoutDate,
                          preset.name,
                          preset.holidays,
                          preset.isLastCutoffOfMonth
                        )
                      }
                      className={`p-2.5 rounded-xl text-left transition-all border relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-500/20 shadow-xs'
                          : preset.isLastCutoffOfMonth
                          ? 'border-purple-200 bg-purple-50/40 hover:border-purple-400 hover:bg-purple-50/80'
                          : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-slate-50/90'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                            Week {preset.weekIndex} of {preset.totalWeeksInMonth}
                          </span>
                          <div className="flex items-center gap-1">
                            {isSelected && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded-md">
                                <Check className="w-3 h-3" /> Active
                              </span>
                            )}
                            {preset.alreadyExists && (
                              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
                                ✓ Created
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-xs font-bold text-slate-900 leading-tight">
                          {preset.shortLabel}
                        </div>

                        <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                          {preset.paydayShort} • {preset.paydayDescription}
                        </div>
                      </div>

                      <div className="mt-2 space-y-1">
                        {preset.isLastCutoffOfMonth && (
                          <div className="text-[10px] text-purple-700 font-bold bg-purple-100/90 border border-purple-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                            🏁 Final Cutoff of {MONTH_NAMES[navMonth]} (SSS/PhilHealth/Pag-IBIG True-Up)
                          </div>
                        )}

                        {preset.holidays.length > 0 && (
                          <div className="text-[10px] text-amber-700 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                            🎉 {preset.holidays.map(h => `${h.name} (${h.type === 'Regular Holiday' ? 'Regular 100%' : 'Special 30%'})`).join(', ')}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cutoff Name / Label <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. August 15 - 21, 2026 (Weekly Cutoff)"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Start Date (Saturday)
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  End Date (Friday)
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Disbursement / Payday (Saturday)
              </label>
              <input
                type="date"
                required
                value={payoutDate}
                onChange={e => handlePayoutDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50/30 rounded-xl text-xs font-semibold text-emerald-800"
              />
            </div>

            {/* LAST PAYROLL OF THE MONTH SETTING */}
            {(() => {
              const paydayInfo = getPaydayMonthInfo(payoutDate);
              return (
                <div className="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/60 transition-all">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="is-last-cutoff-month-checkbox"
                      checked={isLastCutoffOfMonth}
                      onChange={e => setIsLastCutoffOfMonth(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-purple-950">
                          Last Cutoff / Payroll for the Month
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          isLastCutoffOfMonth
                            ? 'bg-purple-200 text-purple-900 border border-purple-300'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {isLastCutoffOfMonth ? '🏁 Month-End True-Up' : 'Regular Cutoff'}
                        </span>
                      </div>
                      <p className="text-[11px] text-purple-900 mt-1.5 leading-relaxed">
                        <strong>Based on Payday ({payoutDate || 'N/A'}):</strong> Payday falls in <strong>{paydayInfo.monthName} {paydayInfo.year}</strong>. {paydayInfo.isLast ? `This is the LAST payday of ${paydayInfo.monthName} ${paydayInfo.year}.` : `This is payday #${paydayInfo.paydayNum} of ${paydayInfo.monthName} ${paydayInfo.year} (not the final payday of the month).`}
                      </p>
                      <p className="text-[10.5px] text-purple-800/90 mt-1 leading-normal">
                        Check this if this cutoff is the <strong>final payroll of the month</strong> for government statutory contributions (SSS, PhilHealth, Pag-IBIG) true-up.
                      </p>
                    </div>
                  </label>
                </div>
              );
            })()}


            {/* HOLIDAYS CONFIGURATION SECTION */}
            <div className="pt-2 border-t border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Holidays in this Cutoff
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Add any Regular (100%) or Special (30%) holidays occurring in this period.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddHoliday}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Holiday</span>
                </button>
              </div>

              {holidays.length === 0 ? (
                <div className="p-3.5 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                  <p className="text-xs text-slate-500">No declared holidays configured for this weekly cutoff.</p>
                  <button
                    type="button"
                    onClick={handleAddHoliday}
                    className="mt-1.5 text-xs text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add holiday date & rate
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {holidays.map((h, index) => (
                    <div
                      key={h.id ? `holiday-${h.id}-${index}` : `holiday-idx-${index}`}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-600">
                          Holiday #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveHoliday(h.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                          title="Remove holiday"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                            Holiday Date
                          </label>
                          <input
                            type="date"
                            value={h.date}
                            min={startDate}
                            max={endDate}
                            onChange={e => handleUpdateHoliday(h.id, { date: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                            Holiday Name / Description
                          </label>
                          <input
                            type="text"
                            value={h.name}
                            onChange={e => handleUpdateHoliday(h.id, { name: e.target.value })}
                            placeholder="e.g. National Heroes Day"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Holiday Classification & Rate
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              h.type === 'Regular Holiday'
                                ? 'border-indigo-500 bg-indigo-50/80 font-bold text-indigo-900'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`holiday-type-${h.id}`}
                              checked={h.type === 'Regular Holiday'}
                              onChange={() => handleUpdateHoliday(h.id, { type: 'Regular Holiday' })}
                              className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <span className="block text-xs">Regular Holiday</span>
                              <span className="text-[10px] font-normal text-slate-500 block">
                                +100% daily rate if worked (200% total)
                              </span>
                            </div>
                          </label>

                          <label
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              h.type === 'Special Non-Working Holiday'
                                ? 'border-indigo-500 bg-indigo-50/80 font-bold text-indigo-900'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`holiday-type-${h.id}`}
                              checked={h.type === 'Special Non-Working Holiday'}
                              onChange={() => handleUpdateHoliday(h.id, { type: 'Special Non-Working Holiday' })}
                              className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <span className="block text-xs">Special Holiday</span>
                              <span className="text-[10px] font-normal text-slate-500 block">
                                +30% daily rate if worked (130% total)
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-start gap-1.5 p-2 bg-slate-100 rounded-lg text-[11px] text-slate-600">
                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Calculation rule:</strong> Regular holidays add 100% of the employee's daily rate when worked. Special non-working holidays add 30% of the daily rate. Both calculate into <strong>Holiday Pay</strong>.
                </span>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
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
                Create Weekly Cutoff
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

