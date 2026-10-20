import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { DTRRecord, Employee, DTRStatus } from '../../types';
import { formatDate, formatPunchDateMMDDYYYY, formatTime, formatAttendanceTime, exportToCSV } from '../../utils/formatters';
import {
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  Fingerprint,
  User,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Edit2,
  FileSpreadsheet,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Info,
  ListFilter
} from 'lucide-react';

interface DTROverviewViewProps {
  onOpenUploadModal: () => void;
  onOpenPunchModal: () => void;
  onOpenDraftStaging: () => void;
  onSelectEmployeeSummary?: (employeeId: string) => void;
  onEditRecord: (record: DTRRecord) => void;
}

export const DTROverviewView: React.FC<DTROverviewViewProps> = ({
  onOpenUploadModal,
  onOpenPunchModal,
  onOpenDraftStaging,
  onSelectEmployeeSummary,
  onEditRecord,
}) => {
  const { dtrRecords, dtrDrafts, employees, isAdmin, isManager, isStaff, currentUser, showToast } = useApp();

  // View Mode: 'punchLogs' (individual punch logs as in user image) or 'dailyRecords'
  const [viewMode, setViewMode] = useState<'punchLogs' | 'dailyRecords'>('punchLogs');

  // Employee Filter
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(() => {
    if (isStaff) {
      const match = employees.find(
        e => `${e.firstName} ${e.lastName}` === currentUser.name || e.employeeNumber === currentUser.employeeId
      );
      return match ? match.id : 'ALL';
    }
    return 'ALL';
  });

  // Search query (matches name, employee id, biometrix id, date, time)
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Date Filter Mode
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'cutoff1' | 'cutoff2' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('2026-08-01');
  const [customEndDate, setCustomEndDate] = useState('2026-08-22');

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<'ALL' | DTRStatus>('ALL');

  // Map employee lookup by ID or employee number
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach(emp => {
      map.set(emp.id, emp);
      map.set(emp.employeeNumber, emp);
    });
    return map;
  }, [employees]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return dtrRecords
      .filter(record => {
        // Employee Filter
        if (selectedEmployeeId !== 'ALL') {
          if (record.employeeId !== selectedEmployeeId) {
            const emp = employeeMap.get(record.employeeId) || employeeMap.get(record.employeeNumber);
            if (!emp || emp.id !== selectedEmployeeId) {
              return false;
            }
          }
        }

        // Date Filter
        let start = '2000-01-01';
        let end = '2099-12-31';

        if (dateFilterMode === 'cutoff1') {
          start = '2026-08-01';
          end = '2026-08-15';
        } else if (dateFilterMode === 'cutoff2') {
          start = '2026-08-16';
          end = '2026-08-31';
        } else if (dateFilterMode === 'custom') {
          start = customStartDate;
          end = customEndDate;
        }

        if (record.date < start || record.date > end) {
          return false;
        }

        // Status Filter
        if (statusFilter !== 'ALL' && record.status !== statusFilter) {
          return false;
        }

        // Search Query Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const emp = employeeMap.get(record.employeeId) || employeeMap.get(record.employeeNumber);
          const bioId = record.biometrixId || emp?.biometrixId || '';
          const name = (record.employeeName || `${emp?.firstName} ${emp?.lastName}`).toLowerCase();
          const empNum = (record.employeeNumber || emp?.employeeNumber || '').toLowerCase();
          const dateStr = record.date;
          const formattedDate = formatPunchDateMMDDYYYY(record.date);
          const rawPunchesStr = (record.rawPunches || []).join(' ');

          const matchName = name.includes(q);
          const matchEmpNum = empNum.includes(q);
          const matchBio = bioId.toLowerCase().includes(q);
          const matchDate = dateStr.includes(q) || formattedDate.includes(q);
          const matchTime = rawPunchesStr.includes(q) || (record.timeIn || '').includes(q) || (record.timeOut || '').includes(q);

          if (!matchName && !matchEmpNum && !matchBio && !matchDate && !matchTime) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Sort descending by date, then by employee name
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) return dateCmp;
        return a.employeeName.localeCompare(b.employeeName);
      });
  }, [dtrRecords, selectedEmployeeId, dateFilterMode, customStartDate, customEndDate, statusFilter, searchQuery, employeeMap]);

  // Flattened punch logs list for exact log-by-log table view as in screenshot
  const punchLogList = useMemo(() => {
    const list: {
      id: string;
      employeeId: string;
      employeeNumber: string;
      biometrixId: string;
      employeeName: string;
      date: string;
      punchDateFormatted: string;
      attendanceRecord: string;
      dayOfWeek: string;
      dayType: string;
      source: string;
      rawRecord: DTRRecord;
    }[] = [];

    filteredRecords.forEach((record, recIdx) => {
      const emp = employeeMap.get(record.employeeId) || employeeMap.get(record.employeeNumber);
      const empNum = record.employeeNumber || emp?.employeeNumber || record.employeeId;
      const bioId = record.biometrixId || emp?.biometrixId || '—';
      const empName = record.employeeName || `${emp?.firstName} ${emp?.lastName}`;
      const punchDateFormatted = formatPunchDateMMDDYYYY(record.date);

      const punches = record.rawPunches && record.rawPunches.length > 0
        ? record.rawPunches
        : [record.timeIn, record.timeOut].filter(Boolean) as string[];

      if (punches.length > 0) {
        punches.forEach((punch, pIdx) => {
          const formattedPunch = formatAttendanceTime(punch);
          list.push({
            id: `${record.id || recIdx}-${pIdx}-${formattedPunch}`,
            employeeId: record.employeeId,
            employeeNumber: empNum,
            biometrixId: bioId,
            employeeName: empName,
            date: record.date,
            punchDateFormatted,
            attendanceRecord: formattedPunch,
            dayOfWeek: record.dayOfWeek,
            dayType: record.dayType,
            source: record.source || 'Biometrics',
            rawRecord: record,
          });
        });
      } else {
        list.push({
          id: `${record.id || recIdx}-empty`,
          employeeId: record.employeeId,
          employeeNumber: empNum,
          biometrixId: bioId,
          employeeName: empName,
          date: record.date,
          punchDateFormatted,
          attendanceRecord: '08:00:00',
          dayOfWeek: record.dayOfWeek,
          dayType: record.dayType,
          source: record.source || 'Biometrics',
          rawRecord: record,
        });
      }
    });

    // Sort descending by date, then descending by attendanceRecord time (e.g. 16:41:42 down to 08:54:06)
    return list.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.attendanceRecord.localeCompare(a.attendanceRecord);
    });
  }, [filteredRecords, employeeMap]);

  // Aggregate Metrics for filtered view
  const metrics = useMemo(() => {
    let daysPresent = 0;
    let totalWorkHours = 0;
    let totalLateMins = 0;
    let totalOvertimeHours = 0;
    let totalUndertimeMins = 0;

    filteredRecords.forEach(rec => {
      if (rec.status === 'Present' || rec.status === 'Late' || rec.status === 'Half Day') {
        daysPresent += 1;
      }
      totalWorkHours += rec.totalHours !== undefined ? rec.totalHours : (rec.regularHours + (rec.overtimeHours || 0));
      totalLateMins += rec.lateMinutes || 0;
      totalOvertimeHours += rec.overtimeHours || 0;
      totalUndertimeMins += rec.undertimeMinutes || 0;
    });

    return {
      daysPresent,
      totalWorkHours: Math.round(totalWorkHours * 10) / 10,
      totalLateMins,
      totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
      totalUndertimeMins,
    };
  }, [filteredRecords]);

  // Helper to format attendance record string
  const renderAttendanceRecord = (record: DTRRecord) => {
    const rawPunches = record.rawPunches || [];
    let punchStamps: string[] = [];
    if (rawPunches.length > 0) {
      punchStamps = rawPunches;
    } else if (record.punchPairs && record.punchPairs.length > 0) {
      record.punchPairs.forEach(p => {
        if (p.timeIn) punchStamps.push(p.timeIn);
        if (p.timeOut) punchStamps.push(p.timeOut);
      });
    } else {
      if (record.timeIn) punchStamps.push(record.timeIn);
      if (record.timeOut) punchStamps.push(record.timeOut);
    }

    if (punchStamps.length === 0) {
      return <span className="font-semibold text-slate-900 font-mono text-xs sm:text-sm">08:00:00</span>;
    }

    // Render pure clean timestamps (e.g. 16:41:42)
    return (
      <div className="space-y-0.5">
        {punchStamps.map((stamp, sIdx) => (
          <div key={`stamp-${stamp}-${sIdx}`} className="font-semibold text-slate-900 font-mono text-xs sm:text-sm leading-tight">
            {formatAttendanceTime(stamp)}
          </div>
        ))}
      </div>
    );
  };

  const handleExportCSV = () => {
    const dataToExport = punchLogList.map(item => ({
      'Person ID / Bio ID': item.biometrixId,
      'Employee ID': item.employeeNumber,
      'Employee Name': item.employeeName,
      'Punch Date': item.punchDateFormatted,
      'Attendance record': item.attendanceRecord,
      'Day of Week': item.dayOfWeek,
      'Day Type': item.dayType,
      Source: item.source,
    }));

    exportToCSV(`Attendance_Records_${new Date().toISOString().split('T')[0]}`, dataToExport);
    showToast(`Exported ${dataToExport.length} attendance records to CSV.`, 'success');
  };

  return (
    <div className="space-y-3" id="dtr-overview-component">
      {/* High-density summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Logged Punches
            </span>
            <span className="text-lg font-black text-slate-900 font-mono">
              {punchLogList.length}{' '}
              <span className="text-xs font-normal text-slate-400">punches</span>
            </span>
          </div>
          <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-600">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Rendered Work
            </span>
            <span className="text-lg font-black text-emerald-700 font-mono">
              {metrics.totalWorkHours}{' '}
              <span className="text-xs font-normal text-slate-400">hrs</span>
            </span>
          </div>
          <div className="w-8 h-8 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Overtime (Approved)
            </span>
            <span className="text-lg font-black text-blue-700 font-mono">
              {metrics.totalOvertimeHours}{' '}
              <span className="text-xs font-normal text-slate-400">hrs</span>
            </span>
          </div>
          <div className="w-8 h-8 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Daily Attendance Days
            </span>
            <span className="text-lg font-black text-slate-800 font-mono">
              {filteredRecords.length}{' '}
              <span className="text-xs font-normal text-slate-400">days</span>
            </span>
          </div>
          <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {/* Header & Filter Controls */}
        <div className="p-3 bg-white border-b border-slate-200 space-y-2.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-900 tracking-tight">
                  Attendance Records & Time Logs
                </h2>
                <span className="bg-slate-900 text-white text-[10px] font-mono font-bold px-1.5 py-0.2 rounded uppercase">
                  Biometrics Log
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Attendance punch timestamps recorded from biometrics device NMR2253900026
              </p>
            </div>

            {/* Quick Action Buttons & View Mode Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('punchLogs')}
                  className={`px-2.5 py-1 rounded font-semibold transition-all ${
                    viewMode === 'punchLogs'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Log-by-Log View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('dailyRecords')}
                  className={`px-2.5 py-1 rounded font-semibold transition-all ${
                    viewMode === 'dailyRecords'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Daily Grouped
                </button>
              </div>

              <button
                onClick={handleExportCSV}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                id="btn-export-dtr-overview"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={onOpenUploadModal}
                className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                id="btn-upload-biometrics-overview"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-300" />
                <span>Upload Logs</span>
              </button>

              <button
                onClick={onOpenPunchModal}
                className="px-2.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                id="btn-punch-clock-overview"
              >
                <Fingerprint className="w-3.5 h-3.5" />
                <span>Punch Clock</span>
              </button>
            </div>
          </div>

          {/* Filter Strip */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            {/* 1. FILTER BY EMPLOYEE */}
            <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-200 px-2 py-1 rounded">
              <User className="w-3.5 h-3.5 text-blue-700" />
              <label htmlFor="overview-filter-employee" className="font-bold text-blue-900 text-xs">
                Filter Employee:
              </label>
              <select
                id="overview-filter-employee"
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                className="bg-white border border-blue-300 rounded px-2 py-0.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[240px]"
              >
                <option value="ALL">All Active Employees ({employees.length})</option>
                {employees.map((emp, empIdx) => (
                  <option key={`overview-emp-${emp.id}-${empIdx}`} value={emp.id}>
                    [{emp.employeeNumber}] {emp.lastName}, {emp.firstName} (Person ID: {emp.biometrixId || '—'})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. SEARCH INPUT */}
            <div className="relative flex-1 min-w-[160px] max-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                id="overview-search-input"
                placeholder="Search name, ID, date, time..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1 text-xs border border-slate-300 rounded bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-400"
              />
            </div>

            {/* 3. DATE CUTOFF SELECTOR */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-semibold">Period:</span>
              <select
                id="overview-filter-period"
                value={dateFilterMode}
                onChange={e => setDateFilterMode(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-400"
              >
                <option value="all">All Available Dates</option>
                <option value="cutoff1">1st Half Cutoff (Aug 1 - 15, 2026)</option>
                <option value="cutoff2">2nd Half Cutoff (Aug 16 - 31, 2026)</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {/* Custom Date Pickers */}
            {dateFilterMode === 'custom' && (
              <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="bg-transparent border-0 text-slate-700 font-mono text-xs focus:ring-0 p-0"
                />
                <span className="text-slate-400">→</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="bg-transparent border-0 text-slate-700 font-mono text-xs focus:ring-0 p-0"
                />
              </div>
            )}
          </div>
        </div>

        {/* Attendance Record Table matching the exact UI in the user image */}
        <div className="overflow-x-auto">
          <table id="dtr-overview-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                {/* Column 1: employee id (with biometrix id below it) */}
                <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-slate-600 w-36 bg-[#f1f5f9]">
                  <div className="flex flex-col">
                    <span>Employee ID</span>
                    <span className="text-[10px] font-medium text-slate-500 normal-case">Person ID</span>
                  </div>
                </th>

                {/* Column 2: employee name */}
                <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-slate-600 w-52 bg-[#f1f5f9]">
                  Employee Name
                </th>

                {/* Column 3: Punch Date with filter icon */}
                <th className="py-3 px-4 font-bold text-xs text-slate-600 w-40 bg-[#f1f5f9]">
                  <div className="flex items-center gap-1.5 select-none">
                    <span>Punch Date</span>
                    <Filter className="w-3.5 h-3.5 text-slate-500 fill-slate-500" />
                  </div>
                </th>

                {/* Column 4: Attendance record (Exact requested header) */}
                <th className="py-3 px-4 font-bold text-xs text-slate-600 bg-[#f1f5f9]">
                  Attendance record
                </th>

                {/* Action column */}
                {(isAdmin || isManager) && (
                  <th className="py-3 px-3 font-bold text-xs text-right w-16 bg-[#f1f5f9] text-slate-600">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {viewMode === 'punchLogs' ? (
                // LOG-BY-LOG VIEW (Exact match to uploaded screenshot: Punch Date MM/DD/YYYY and Attendance record HH:mm:ss)
                punchLogList.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin || isManager ? 5 : 4} className="py-12 text-center text-slate-500">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">No attendance records found matching filters.</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Upload raw biometrics CSV or adjust your filter selection.
                      </p>
                    </td>
                  </tr>
                ) : (
                  punchLogList.map((item, idx) => (
                    <tr
                      key={`${item.id}-${idx}`}
                      className={`transition-colors border-b border-slate-100 hover:bg-slate-50/80 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      {/* Column 1: EMPLOYEE ID (with Person ID displayed below) */}
                      <td className="py-3 px-4 whitespace-nowrap align-middle">
                        <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                          {item.employeeNumber}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <span className="text-slate-400 font-sans font-medium">Bio ID:</span>
                          <span className="font-bold text-blue-900 bg-blue-50 px-1 rounded border border-blue-200">
                            {item.biometrixId}
                          </span>
                        </div>
                      </td>

                      {/* Column 2: EMPLOYEE NAME */}
                      <td className="py-3 px-4 align-middle">
                        <span className="font-bold text-slate-900 block text-xs sm:text-sm">
                          {item.employeeName}
                        </span>
                      </td>

                      {/* Column 3: PUNCH DATE (Formatted MM/DD/YYYY as in image) */}
                      <td className="py-3 px-4 whitespace-nowrap align-middle">
                        <span className="text-blue-900 font-medium text-xs sm:text-sm font-sans">
                          {item.punchDateFormatted}
                        </span>
                      </td>

                      {/* Column 4: ATTENDANCE RECORD (Clean bold timestamp like 16:41:42) */}
                      <td className="py-3 px-4 align-middle">
                        <span className="font-semibold text-slate-900 text-xs sm:text-sm font-mono tracking-tight">
                          {item.attendanceRecord}
                        </span>
                      </td>

                      {/* Action Column */}
                      {(isAdmin || isManager) && (
                        <td className="py-3 px-3 text-right whitespace-nowrap align-middle">
                          <button
                            onClick={() => onEditRecord(item.rawRecord)}
                            title="Adjust attendance record"
                            className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )
              ) : (
                // DAILY GROUPED VIEW
                filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin || isManager ? 5 : 4} className="py-12 text-center text-slate-500">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">No attendance records found matching filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, idx) => {
                    const emp = employeeMap.get(record.employeeId) || employeeMap.get(record.employeeNumber);
                    const displayEmployeeId = record.employeeNumber || emp?.employeeNumber || record.employeeId;
                    const displayBiometrixId = record.biometrixId || emp?.biometrixId || '—';
                    const employeeFullName = record.employeeName || `${emp?.firstName} ${emp?.lastName}`;

                    return (
                      <tr
                        key={`dtr-overview-row-${record.id || record.employeeId}-${record.date}-${idx}`}
                        className={`transition-colors border-b border-slate-100 hover:bg-slate-50/80 ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                        }`}
                      >
                        {/* Column 1: EMPLOYEE ID */}
                        <td className="py-3 px-4 whitespace-nowrap align-middle">
                          <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                            {displayEmployeeId}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <span className="text-slate-400 font-sans font-medium">Bio ID:</span>
                            <span className="font-bold text-blue-900 bg-blue-50 px-1 rounded border border-blue-200">
                              {displayBiometrixId}
                            </span>
                          </div>
                        </td>

                        {/* Column 2: EMPLOYEE NAME */}
                        <td className="py-3 px-4 align-middle">
                          <span className="font-bold text-slate-900 block text-xs sm:text-sm">
                            {employeeFullName}
                          </span>
                        </td>

                        {/* Column 3: PUNCH DATE */}
                        <td className="py-3 px-4 whitespace-nowrap align-middle">
                          <span className="text-blue-900 font-medium text-xs sm:text-sm font-sans">
                            {formatPunchDateMMDDYYYY(record.date)}
                          </span>
                        </td>

                        {/* Column 4: ATTENDANCE RECORD */}
                        <td className="py-3 px-4 align-middle">
                          {renderAttendanceRecord(record)}
                        </td>

                        {/* Action Column */}
                        {(isAdmin || isManager) && (
                          <td className="py-3 px-3 text-right whitespace-nowrap align-middle">
                            <button
                              onClick={() => onEditRecord(record)}
                              title="Adjust attendance record"
                              className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-3 text-xs">
            <span>
              Showing <strong>{viewMode === 'punchLogs' ? punchLogList.length : filteredRecords.length}</strong> {viewMode === 'punchLogs' ? 'punch log entries' : 'daily records'}
            </span>
            {selectedEmployeeId !== 'ALL' && (
              <span className="text-blue-800 font-semibold bg-blue-100/60 px-1.5 py-0.2 rounded text-[11px]">
                Filtered for {employeeMap.get(selectedEmployeeId)?.lastName || selectedEmployeeId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Info className="w-3 h-3 text-slate-400" />
            <span>Biometric log data synced with NMR2253900026 device logs</span>
          </div>
        </div>
      </div>
    </div>
  );
};
