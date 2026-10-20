import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { DTRDraftRecord, DTRAnomalyType } from '../../types';
import { DTRDraftEditModal } from './DTRDraftEditModal';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  Filter,
  Layers,
  Sparkles,
  ArrowRight,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCheck,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';

interface DTRDraftStagingViewProps {
  onOpenUploadModal: () => void;
  onViewSummary: () => void;
}

export const DTRDraftStagingView: React.FC<DTRDraftStagingViewProps> = ({
  onOpenUploadModal,
  onViewSummary,
}) => {
  const {
    dtrDrafts,
    employees,
    validateDraftRecord,
    rejectDraftRecord,
    commitDraftsToDTR,
    clearDrafts,
    quickLoadSampleBiometrics,
    showToast,
  } = useApp();

  // Selected Status Tab
  const [activeTab, setActiveTab] = useState<'ALL' | 'ANOMALIES' | 'VALIDATED' | 'REJECTED'>('ANOMALIES');
  const [selectedAnomalyType, setSelectedAnomalyType] = useState<string>('ALL');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc'>('asc');

  // Selected Drafts for batch actions
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());

  // Editing Draft Modal
  const [editingDraft, setEditingDraft] = useState<DTRDraftRecord | null>(null);

  // Filtered and Sorted Drafts
  const filteredDrafts = useMemo(() => {
    const list = dtrDrafts.filter(draft => {
      // Exclude any committed drafts (official records belong in DTR Logs)
      if (draft.status === 'COMMITTED') return false;

      // Tab filter
      if (activeTab === 'ANOMALIES') {
        if (draft.status === 'REJECTED') return false;
        if (draft.anomalies.length === 0) return false;
      } else if (activeTab === 'VALIDATED') {
        if (draft.status !== 'VALIDATED') return false;
      } else if (activeTab === 'REJECTED') {
        if (draft.status !== 'REJECTED') return false;
      }

      // Anomaly Type filter
      if (selectedAnomalyType !== 'ALL') {
        const hasType = draft.anomalies.some(a => a.type === selectedAnomalyType);
        if (!hasType) return false;
      }

      // Employee Filter
      if (filterEmployeeId !== 'ALL') {
        if (draft.employeeId !== filterEmployeeId && draft.biometrixPersonId !== filterEmployeeId) {
          return false;
        }
      }

      // Date Range Filter
      if (startDate && draft.date < startDate) {
        return false;
      }
      if (endDate && draft.date > endDate) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = draft.employeeName.toLowerCase().includes(q);
        const bioMatch = draft.biometrixPersonId.toLowerCase().includes(q);
        const dateMatch = draft.date.includes(q);
        if (!nameMatch && !bioMatch && !dateMatch) return false;
      }

      return true;
    });

    // Sort by Date
    return list.sort((a, b) => {
      if (a.date < b.date) return dateSortOrder === 'asc' ? -1 : 1;
      if (a.date > b.date) return dateSortOrder === 'asc' ? 1 : -1;
      // Secondary sort by employee name
      return a.employeeName.localeCompare(b.employeeName);
    });
  }, [dtrDrafts, activeTab, selectedAnomalyType, filterEmployeeId, startDate, endDate, searchQuery, dateSortOrder]);

  const toggleDateSort = () => {
    setDateSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  };

  // Counts
  const counts = useMemo(() => {
    const uncommitted = dtrDrafts.filter(d => d.status !== 'COMMITTED');
    const total = uncommitted.length;
    const anomalies = uncommitted.filter(d => d.status !== 'REJECTED' && d.anomalies.length > 0).length;
    const validated = uncommitted.filter(d => d.status === 'VALIDATED' && d.anomalies.length === 0).length;
    const rejected = uncommitted.filter(d => d.status === 'REJECTED').length;
    return { total, anomalies, validated, rejected };
  }, [dtrDrafts]);

  // Handle multi-select
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedDraftIds(new Set(filteredDrafts.map(d => d.id)));
    } else {
      setSelectedDraftIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedDraftIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Batch Approve
  const handleBatchApprove = () => {
    const ids = Array.from(selectedDraftIds);
    ids.forEach(id => validateDraftRecord(id));
    setSelectedDraftIds(new Set());
    showToast(`Approved ${ids.length} draft records for timesheets.`);
  };

  // Commit to official DTR
  const handleCommitToDTR = () => {
    const targetIds = selectedDraftIds.size > 0 ? Array.from(selectedDraftIds) : undefined;
    const res = commitDraftsToDTR(targetIds);
    if (res.committedCount > 0) {
      setSelectedDraftIds(new Set());
    }
  };

  const handleQuickLoadSample = () => {
    quickLoadSampleBiometrics();
    setActiveTab('ANOMALIES');
  };

  return (
    <div id="dtr-draft-staging-view" className="space-y-3.5">
      {/* Top Banner & Quick Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
                Attendance Staging
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                Biometric DTR Draft Staging & Anomaly Validator
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review raw biometric machine punch intervals, resolve missing ins/outs, and approve validated timesheets before committing to official DTR.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-upload-biometrics-staging"
              onClick={onOpenUploadModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Import Logs CSV</span>
            </button>

            {dtrDrafts.length === 0 && (
              <button
                id="btn-quick-sample-staging"
                onClick={handleQuickLoadSample}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <span>Load Sample Dataset</span>
              </button>
            )}

            <button
              id="btn-view-timesheet-summary"
              onClick={onViewSummary}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Timesheet Summary</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('ANOMALIES')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
              activeTab === 'ANOMALIES'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>⚠️ Needs Review / Anomalies ({counts.anomalies})</span>
          </button>

          <button
            onClick={() => setActiveTab('ALL')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
              activeTab === 'ALL'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Drafts ({counts.total})</span>
          </button>

          <button
            onClick={() => setActiveTab('VALIDATED')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
              activeTab === 'VALIDATED'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Validated ({counts.validated})</span>
          </button>

          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
              activeTab === 'REJECTED'
                ? 'bg-rose-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected ({counts.rejected})</span>
          </button>

          {counts.total > 0 && (
            <button
              onClick={clearDrafts}
              className="ml-auto text-xs text-slate-500 hover:text-red-700 font-medium px-2 py-1"
            >
              Clear All Drafts
            </button>
          )}
        </div>
      </div>

      {/* Filter Row & Batch Actions */}
      <div className="bg-white border border-slate-200 rounded p-2.5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Employee Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold">Employee:</span>
            <select
              id="draft-filter-employee"
              value={filterEmployeeId}
              onChange={e => setFilterEmployeeId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
            >
              <option value="ALL">All Employees</option>
              {employees.map((emp, empIdx) => (
                <option key={`draft-staging-emp-${emp.id}-${empIdx}`} value={emp.id}>
                  {emp.lastName}, {emp.firstName} (Bio: {emp.biometrixId || emp.employeeNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Anomaly Type Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold">Anomaly:</span>
            <select
              id="draft-filter-anomaly-type"
              value={selectedAnomalyType}
              onChange={e => setSelectedAnomalyType(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
            >
              <option value="ALL">All Anomaly Types</option>
              <option value="INCOMPLETE_PUNCH">Incomplete Punch (Missing Out)</option>
              <option value="MULTIPLE_PUNCHES">Multiple Punch Cycles (4+ Stamps)</option>
              <option value="RAPID_PUNCH">Rapid Duplicate Scans (&lt;2m)</option>
              <option value="UNMATCHED_EMPLOYEE">Unmatched Person ID</option>
              <option value="EXCESSIVE_HOURS">Excessive Hours (&gt;14h)</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            <input
              type="text"
              placeholder="Search name, bio ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 w-36 focus:w-48 transition-all"
            />
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-300 rounded px-2 py-0.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-500 font-semibold text-[11px]">Date:</span>
            <input
              type="date"
              id="draft-filter-start-date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent text-xs text-slate-800 focus:outline-none cursor-pointer py-0.5"
              title="From date"
            />
            <span className="text-slate-400 text-xs font-bold">→</span>
            <input
              type="date"
              id="draft-filter-end-date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent text-xs text-slate-800 focus:outline-none cursor-pointer py-0.5"
              title="To date"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                title="Clear date filter"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Batch Actions */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {selectedDraftIds.size > 0 && (
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
              {selectedDraftIds.size} selected
            </span>
          )}

          {selectedDraftIds.size > 0 && (
            <button
              onClick={handleBatchApprove}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-600 transition-colors shadow-2xs"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Approve Selected</span>
            </button>
          )}

          <button
            id="btn-commit-drafts-official"
            onClick={handleCommitToDTR}
            className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>Commit to Official DTR</span>
          </button>
        </div>
      </div>

      {/* Main Drafts Table */}
      <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table id="dtr-draft-staging-table" className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 divide-x divide-slate-200">
                <th className="py-2 px-2 text-center w-8">
                  <input
                    type="checkbox"
                    checked={filteredDrafts.length > 0 && selectedDraftIds.size === filteredDrafts.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-slate-800 focus:ring-0"
                  />
                </th>
                <th className="py-2 px-2.5 font-bold uppercase tracking-wider text-[11px] w-24">
                  Status
                </th>
                <th className="py-2 px-3 font-bold uppercase tracking-wider text-[11px] w-48">
                  Employee & Bio ID
                </th>
                <th
                  onClick={toggleDateSort}
                  className="py-2 px-3 font-bold uppercase tracking-wider text-[11px] w-32 cursor-pointer select-none hover:bg-slate-200 transition-colors"
                  title="Click to sort by Date (Asc / Desc)"
                  id="sort-drafts-date-th"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Date</span>
                    <span className="text-slate-500">
                      {dateSortOrder === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-700" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-700" />
                      )}
                    </span>
                  </div>
                </th>
                <th className="py-2 px-3 font-bold uppercase tracking-wider text-[11px]">
                  Raw Biometric Scans
                </th>
                <th className="py-2 px-3 font-bold uppercase tracking-wider text-[11px]">
                  Attendance Log (In / Out)
                </th>
                <th className="py-2 px-2 font-bold uppercase tracking-wider text-[11px] text-right bg-slate-200/60 w-16">
                  Hours
                </th>
                <th className="py-2 px-2 font-bold uppercase tracking-wider text-[11px] text-right bg-amber-100/60 text-amber-900 w-14">
                  OT
                </th>
                <th className="py-2 px-2 font-bold uppercase tracking-wider text-[11px] text-right bg-rose-100/60 text-rose-900 w-14">
                  UT
                </th>
                <th className="py-2 px-2 font-bold uppercase tracking-wider text-[11px] text-right bg-orange-100/60 text-orange-900 w-14">
                  Late
                </th>
                <th className="py-2 px-3 font-bold uppercase tracking-wider text-[11px] text-center w-28">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredDrafts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No draft records found matching this filter.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click "Import Logs CSV" or "Load Sample Dataset" to stage biometric logs.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDrafts.map((draft, idx) => {
                  const hasAnomalies = draft.anomalies.length > 0;
                  const isSelected = selectedDraftIds.has(draft.id);

                  return (
                    <tr
                      key={`${draft.id}-${idx}`}
                      className={`divide-x divide-slate-200 transition-colors ${
                        isSelected
                          ? 'bg-blue-50/70'
                          : hasAnomalies
                          ? 'bg-amber-50/40 hover:bg-amber-50'
                          : idx % 2 === 0
                          ? 'bg-white hover:bg-slate-50'
                          : 'bg-slate-50/30 hover:bg-slate-50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(draft.id)}
                          className="rounded border-slate-300 text-slate-800 focus:ring-0"
                        />
                      </td>

                      {/* Status */}
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        {draft.status === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            <XCircle className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        ) : hasAnomalies ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs animate-pulse"
                            title={draft.anomalies.map(a => a.message).join(' • ')}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                            <span>Needs Review</span>
                          </span>
                        ) : draft.status === 'VALIDATED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Validated</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Employee & Bio ID */}
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">{draft.employeeName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Bio ID: <span className="font-semibold text-slate-700">{draft.biometrixPersonId}</span>
                          {draft.employeeNumber ? ` • ${draft.employeeNumber}` : ''}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-2 px-3 font-mono text-[11px]">
                        <div className="font-semibold text-slate-800">{draft.date}</div>
                        <div className="text-[10px] text-slate-500 font-sans">{draft.dayOfWeek}</div>
                      </td>

                      {/* Raw Punches */}
                      <td className="py-2 px-3">
                        <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                          {draft.rawPunches.map((punch, pIdx) => (
                            <span
                              key={`raw-${draft.id}-${pIdx}`}
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {punch}
                            </span>
                          ))}
                        </div>

                        {/* Anomalies alert badges */}
                        {hasAnomalies && (
                          <div className="mt-1 space-y-0.5">
                            {draft.anomalies.map((ano, aIdx) => (
                              <div
                                key={`ano-${draft.id}-${aIdx}`}
                                className={`text-[10px] px-1.5 py-0.5 rounded border font-sans flex items-center gap-1 ${
                                  ano.severity === 'error'
                                    ? 'text-rose-900 bg-rose-100/90 border-rose-300 font-semibold'
                                    : 'text-amber-900 bg-amber-100/90 border-amber-300 font-medium'
                                }`}
                              >
                                <AlertTriangle className={`w-2.5 h-2.5 shrink-0 ${ano.severity === 'error' ? 'text-rose-600' : 'text-amber-600'}`} />
                                <span className="truncate">{ano.message}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Punch Pairs */}
                      <td className="py-2 px-3 font-mono text-[11px]">
                        <div className="flex flex-wrap gap-1.5">
                          {draft.punchPairs.map((pair, pIdx) => (
                            <span
                              key={`pair-${draft.id}-${pIdx}`}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                !pair.timeOut
                                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {pair.timeIn} → {pair.timeOut || 'MISSING'}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Total Hours */}
                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                        {draft.totalHours.toFixed(1)}
                      </td>

                      {/* OT */}
                      <td className={`py-2 px-2 text-right font-mono font-bold ${draft.overtimeHours > 0 ? 'text-amber-800 bg-amber-50/60 font-black' : 'text-slate-400'}`}>
                        {draft.overtimeHours > 0 ? draft.overtimeHours.toFixed(1) : '0'}
                      </td>

                      {/* UT */}
                      <td className={`py-2 px-2 text-right font-mono font-bold ${draft.undertimeHours > 0 ? 'text-rose-800 bg-rose-50/60' : 'text-slate-400'}`}>
                        {draft.undertimeHours > 0 ? draft.undertimeHours.toFixed(2) : '0'}
                      </td>

                      {/* Late */}
                      <td className={`py-2 px-2 text-right font-mono font-bold ${(draft.lateMinutes || 0) > 0 ? 'text-orange-700 bg-orange-50/60 font-black' : 'text-slate-400'}`}>
                        {(draft.lateMinutes || 0) > 0 ? draft.lateMinutes : '0'}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingDraft(draft)}
                            className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                            title="Edit & Resolve Anomaly"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => validateDraftRecord(draft.id)}
                            className="p-1 rounded text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                            title="Approve / Validate"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => rejectDraftRecord(draft.id)}
                            className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Anomaly Modal */}
      {editingDraft && (
        <DTRDraftEditModal
          draft={editingDraft}
          onClose={() => setEditingDraft(null)}
        />
      )}
    </div>
  );
};
