import React, { useState, useEffect } from 'react';
import { PayPeriod, PeriodHoliday } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, Calendar, CheckCircle2, Tag, Plus, Trash2 } from 'lucide-react';
import { getPaydayMonthInfo } from '../../utils/calculations';

interface EditPayPeriodModalProps {
  isOpen: boolean;
  period: PayPeriod | null;
  onClose: () => void;
}

export const EditPayPeriodModal: React.FC<EditPayPeriodModalProps> = ({
  isOpen,
  period,
  onClose,
}) => {
  const { updatePayPeriod } = useApp();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [payoutDate, setPayoutDate] = useState('');
  const [isLastCutoffOfMonth, setIsLastCutoffOfMonth] = useState(false);
  const [status, setStatus] = useState<PayPeriod['status']>('Draft');
  const [holidays, setHolidays] = useState<PeriodHoliday[]>([]);

  useEffect(() => {
    if (period) {
      setName(period.name || '');
      setStartDate(period.startDate || '');
      setEndDate(period.endDate || '');
      setPayoutDate(period.payoutDate || '');
      setIsLastCutoffOfMonth(Boolean(period.isLastCutoffOfMonth));
      setStatus(period.status || 'Draft');
      setHolidays(period.holidays ? JSON.parse(JSON.stringify(period.holidays)) : []);
    }
  }, [period]);

  if (!isOpen || !period) return null;

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

  const handleRemoveHoliday = (id: string) => {
    setHolidays(prev => prev.filter(h => h.id !== id));
  };

  const handleUpdateHoliday = (id: string, updates: Partial<PeriodHoliday>) => {
    setHolidays(prev =>
      prev.map(h => (h.id === id ? { ...h, ...updates } : h))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updatePayPeriod(period.id, {
      name: name.trim(),
      startDate,
      endDate,
      payoutDate,
      isLastCutoffOfMonth,
      status,
      holidays,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Edit Cutoff Period</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
            id="close-edit-period-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description / Cutoff Label
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Aug 16 - Aug 22, 2026 (W34)"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
              id="edit-period-name-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Start Date (Sat)
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                id="edit-period-start-date"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                End Date (Fri)
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                id="edit-period-end-date"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Payday / Payout Date
              </label>
              <input
                type="date"
                required
                value={payoutDate}
                onChange={e => handlePayoutDateChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-300 bg-emerald-50/20 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-semibold text-emerald-900"
                id="edit-period-payout-date"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as PayPeriod['status'])}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium bg-white"
                id="edit-period-status-select"
              >
                <option value="Draft">Draft</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Approved">Approved</option>
              </select>
            </div>
          </div>

          {/* Month-End True-Up Checkbox */}
          {(() => {
            const paydayInfo = getPaydayMonthInfo(payoutDate);
            return (
              <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/50">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isLastCutoffOfMonth}
                    onChange={e => setIsLastCutoffOfMonth(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-950">
                        Last Cutoff / Payroll for Month
                      </span>
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                        isLastCutoffOfMonth
                          ? 'bg-purple-200 text-purple-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {isLastCutoffOfMonth ? 'Month-End True-Up' : 'Regular'}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-purple-900 mt-1">
                      Payday <strong>{payoutDate || 'N/A'}</strong> falls in <strong>{paydayInfo.monthName} {paydayInfo.year}</strong>. {paydayInfo.isLast ? `(Final payday of ${paydayInfo.monthName}).` : `(Payday #${paydayInfo.paydayNum} of ${paydayInfo.monthName}).`}
                    </p>
                  </div>
                </label>
              </div>
            );
          })()}

          {/* HOLIDAYS CONFIGURATION SECTION */}
          <div className="pt-3 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Holidays in this Cutoff
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Configure Regular (100%) or Special (30%) holidays in this cutoff.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddHoliday}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Holiday</span>
              </button>
            </div>

            {holidays.length === 0 ? (
              <div className="p-3 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                <p className="text-xs text-slate-500">No declared holidays configured for this cutoff.</p>
                <button
                  type="button"
                  onClick={handleAddHoliday}
                  className="mt-1 text-xs text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add holiday date & rate
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {holidays.map((h, index) => (
                  <div
                    key={h.id ? `edit-holiday-${h.id}-${index}` : `edit-holiday-idx-${index}`}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
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
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 font-mono"
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
                            name={`edit-holiday-type-${h.id}`}
                            checked={h.type === 'Regular Holiday'}
                            onChange={() => handleUpdateHoliday(h.id, { type: 'Regular Holiday' })}
                            className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 text-[11px]">Regular (100%)</div>
                            <div className="text-[9.5px] text-slate-500">Double pay if worked</div>
                          </div>
                        </label>

                        <label
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            h.type === 'Special Non-Working Holiday'
                              ? 'border-purple-500 bg-purple-50/80 font-bold text-purple-900'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`edit-holiday-type-${h.id}`}
                            checked={h.type === 'Special Non-Working Holiday'}
                            onChange={() =>
                              handleUpdateHoliday(h.id, { type: 'Special Non-Working Holiday' })
                            }
                            className="w-3.5 h-3.5 text-purple-600 focus:ring-purple-500"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 text-[11px]">Special (30%)</div>
                            <div className="text-[9.5px] text-slate-500">+30% premium if worked</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-xs"
              id="save-edit-period-btn"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
