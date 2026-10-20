import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  EmployeeDeduction,
  DeductionType,
  DeductionStatus,
  EmployeeWithDeductionSummary,
} from '../../types';
import {
  Plus,
  Search,
  Filter,
  DollarSign,
  CreditCard,
  Receipt,
  User,
  ChevronRight,
  ArrowLeft,
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Building2,
  Layers,
  ArrowUpDown,
  FileText,
} from 'lucide-react';
import { AddDeductionModal } from './AddDeductionModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { PaymentRecordsModal } from './PaymentRecordsModal';

export const DeductionsDashboard: React.FC = () => {
  const {
    employees,
    employeeDeductions,
    deleteEmployeeDeduction,
    showToast,
  } = useApp();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Modal triggers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<EmployeeDeduction | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [preselectedDeductionForPayment, setPreselectedDeductionForPayment] = useState<string | undefined>(undefined);

  // Payment Records Modal triggers
  const [isPaymentRecordsModalOpen, setIsPaymentRecordsModalOpen] = useState(false);
  const [selectedDeductionForRecords, setSelectedDeductionForRecords] = useState<EmployeeDeduction | null>(null);

  // 1. Group deductions by employee for the "List of employees who have a deduction"
  const employeesWithDeductions: EmployeeWithDeductionSummary[] = useMemo(() => {
    const map = new Map<string, EmployeeDeduction[]>();

    employeeDeductions.forEach(d => {
      if (!map.has(d.employeeId)) {
        map.set(d.employeeId, []);
      }
      map.get(d.employeeId)!.push(d);
    });

    const list: EmployeeWithDeductionSummary[] = [];

    map.forEach((deds, empId) => {
      const emp = employees.find(e => e.id === empId);
      const activeCount = deds.filter(d => d.status === 'Active' && d.runningBalance > 0).length;
      const totalOrig = deds.reduce((sum, d) => sum + d.totalAmount, 0);
      const totalPaid = deds.reduce((sum, d) => sum + d.totalPaid, 0);
      const totalBalance = deds.reduce((sum, d) => sum + d.runningBalance, 0);
      const totalCutoff = deds
        .filter(d => d.status === 'Active' && d.runningBalance > 0)
        .reduce((sum, d) => sum + d.cutoffDeductionAmount, 0);

      list.push({
        employeeId: empId,
        employeeNumber: emp?.employeeNumber || deds[0]?.employeeNumber || 'EMP-UNKNOWN',
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : deds[0]?.employeeName || 'Unknown Employee',
        department: emp?.department || deds[0]?.department || 'General',
        position: emp?.position || deds[0]?.position || 'Staff',
        avatarUrl: emp?.avatarUrl,
        totalDeductionsCount: deds.length,
        activeDeductionsCount: activeCount,
        totalOriginalAmount: totalOrig,
        totalPaid: totalPaid,
        totalRunningBalance: totalBalance,
        totalCutoffDeductionAmount: totalCutoff,
        deductions: deds,
      });
    });

    // Sort by largest running balance first, then name
    return list.sort((a, b) => b.totalRunningBalance - a.totalRunningBalance);
  }, [employeeDeductions, employees]);

  // Overall KPI metrics
  const stats = useMemo(() => {
    const totalDeds = employeeDeductions.length;
    const activeDeds = employeeDeductions.filter(d => d.status === 'Active' && d.runningBalance > 0).length;
    const employeesCount = employeesWithDeductions.length;
    const totalOutstanding = employeeDeductions.reduce((sum, d) => sum + d.runningBalance, 0);
    const totalPaid = employeeDeductions.reduce((sum, d) => sum + d.totalPaid, 0);
    const totalCutoffWeekly = employeeDeductions
      .filter(d => d.status === 'Active' && d.runningBalance > 0)
      .reduce((sum, d) => sum + d.cutoffDeductionAmount, 0);

    return {
      totalDeds,
      activeDeds,
      employeesCount,
      totalOutstanding,
      totalPaid,
      totalCutoffWeekly,
    };
  }, [employeeDeductions, employeesWithDeductions]);

  // Filtered list of employees who have deductions
  const filteredEmployeesWithDeductions = useMemo(() => {
    return employeesWithDeductions.filter(empSummary => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        empSummary.employeeName.toLowerCase().includes(q) ||
        empSummary.employeeNumber.toLowerCase().includes(q) ||
        empSummary.department.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Type filter
      if (selectedTypeFilter !== 'ALL') {
        const hasType = empSummary.deductions.some(d => d.type === selectedTypeFilter);
        if (!hasType) return false;
      }

      // Status filter
      if (selectedStatusFilter === 'ACTIVE') {
        if (empSummary.totalRunningBalance <= 0 || empSummary.activeDeductionsCount === 0) return false;
      } else if (selectedStatusFilter === 'COMPLETED') {
        if (empSummary.totalRunningBalance > 0) return false;
      }

      return true;
    });
  }, [employeesWithDeductions, searchQuery, selectedTypeFilter, selectedStatusFilter]);

  // Currently viewed employee in detail view
  const viewingEmployeeData = useMemo(() => {
    if (!selectedEmployeeId) return null;
    const emp = employees.find(e => e.id === selectedEmployeeId);
    const summary = employeesWithDeductions.find(s => s.employeeId === selectedEmployeeId);
    const deds = employeeDeductions.filter(d => d.employeeId === selectedEmployeeId);

    return {
      employee: emp,
      summary,
      deductions: deds,
    };
  }, [selectedEmployeeId, employees, employeesWithDeductions, employeeDeductions]);

  // Handlers
  const handleOpenAdd = (empId?: string) => {
    setEditingDeduction(null);
    setIsAddModalOpen(true);
  };

  const handleEditDeduction = (ded: EmployeeDeduction) => {
    setEditingDeduction(ded);
    setIsAddModalOpen(true);
  };

  const handleDeleteDeduction = (id: string, code: string) => {
    if (window.confirm(`Are you sure you want to delete deduction ${code}? This will remove all associated payment records.`)) {
      deleteEmployeeDeduction(id);
    }
  };

  const handleOpenPayment = (dedId?: string) => {
    setPreselectedDeductionForPayment(dedId);
    setIsPaymentModalOpen(true);
  };

  const handleOpenPaymentRecords = (ded: EmployeeDeduction | null) => {
    setSelectedDeductionForRecords(ded);
    setIsPaymentRecordsModalOpen(true);
  };

  return (
    <div className="space-y-5" id="deductions-module-container">
      {/* ======================================================== */}
      {/* 1. TOP OVERVIEW METRICS BAR                             */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Outstanding Balance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Outstanding Balance
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
              ₱{stats.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Total Obligation Remaining
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Active Deductions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Active Deductions
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
              {stats.activeDeds}{' '}
              <span className="text-sm font-normal text-slate-400">/ {stats.totalDeds} total</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Currently being amortized
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Employees with Deductions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Employees with Deductions
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
              {stats.employeesCount}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Holding loans or salary deductions
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600">
            <User className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Weekly Cutoff Deductions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Weekly Cutoff Deductions
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 font-mono mt-1">
              ₱{stats.totalCutoffWeekly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Automated weekly payroll amort.
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MAIN CONTENT AREA                                    */}
      {/* ======================================================== */}
      {!selectedEmployeeId ? (
        /* ====================================================== */
        /* A. HOME OF DEDUCTIONS: LIST OF EMPLOYEES WITH DEDUCTION */
        /* ====================================================== */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Header & Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Employees with Deductions
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 font-mono">
                  {filteredEmployeesWithDeductions.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of employees holding active loans and salary deductions. Click any employee to view their individual accounts and payment records.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5 self-start md:self-auto">
              <button
                type="button"
                onClick={() => handleOpenAdd()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-blue-600/20 transition-all cursor-pointer"
                id="deductions-new-btn"
              >
                <Plus className="w-4 h-4" />
                <span>New Deduction</span>
              </button>
            </div>
          </div>

          {/* Search & Filters Strip */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search employee name, number, or department..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 text-[11px] font-semibold">Type:</span>
                <select
                  value={selectedTypeFilter}
                  onChange={e => setSelectedTypeFilter(e.target.value)}
                  className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="ALL">All Types</option>
                  <option value="Loan">Loans Only</option>
                  <option value="Salary Deduction">Salary Deductions Only</option>
                  <option value="Others">Others Only</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 text-[11px] font-semibold">Status:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={e => setSelectedStatusFilter(e.target.value)}
                  className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">With Remaining Balance</option>
                  <option value="COMPLETED">Fully Settled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Employees List Table */}
          {filteredEmployeesWithDeductions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Employee Deductions Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery || selectedTypeFilter !== 'ALL' || selectedStatusFilter !== 'ALL'
                  ? 'No employees match the selected search or filter criteria.'
                  : 'No employees currently have registered loans or salary deductions. Click "+ New Deduction" to grant a loan or create a salary deduction.'}
              </p>
              <button
                onClick={() => handleOpenAdd()}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Deduction</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 text-[11px] uppercase font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3">Department & Position</th>
                    <th className="py-3 px-3">Deduction Accounts</th>
                    <th className="py-3 px-3 text-right">Total Obligation</th>
                    <th className="py-3 px-3 text-right">Total Paid</th>
                    <th className="py-3 px-3 text-right bg-blue-50/50">Running Balance</th>
                    <th className="py-3 px-3 text-right">Cutoff Amort.</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {filteredEmployeesWithDeductions.map((row) => (
                    <tr
                      key={row.employeeId}
                      onClick={() => setSelectedEmployeeId(row.employeeId)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Employee Column */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          {row.avatarUrl ? (
                            <img
                              src={row.avatarUrl}
                              alt={row.employeeName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs shrink-0">
                              {row.employeeName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {row.employeeName}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {row.employeeNumber}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department & Position */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{row.department}</div>
                        <div className="text-[11px] text-slate-500">{row.position}</div>
                      </td>

                      {/* Deduction Accounts Pills */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {row.totalDeductionsCount} {row.totalDeductionsCount === 1 ? 'account' : 'accounts'}
                          </span>
                          {row.deductions.map((d) => (
                            <span
                              key={d.id}
                              className={`text-[10px] px-1.5 py-0.2 rounded font-semibold whitespace-nowrap ${
                                d.type === 'Loan'
                                  ? 'bg-purple-100 text-purple-800'
                                  : d.type === 'Salary Deduction'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                              title={`${d.deductionId}: ${d.description}`}
                            >
                              {d.type}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Total Obligation */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                        ₱{row.totalOriginalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Total Paid */}
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 font-semibold whitespace-nowrap">
                        ₱{row.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Running Balance */}
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900 bg-blue-50/50 whitespace-nowrap">
                        <span className={row.totalRunningBalance > 0 ? 'text-blue-950 font-black' : 'text-slate-400'}>
                          ₱{row.totalRunningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Cutoff Amortization */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                        {row.totalCutoffDeductionAmount > 0 ? (
                          <span>₱{row.totalCutoffDeductionAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} / wk</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {row.totalRunningBalance > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Active ({row.activeDeductionsCount})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ Settled
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEmployeeId(row.employeeId);
                              setSelectedDeductionForRecords(row.deductions[0] || null);
                              setIsPaymentRecordsModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200/80 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            title="Open Payment Records Modal"
                          >
                            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Payment Records</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEmployeeId(row.employeeId);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            title="View Deductions"
                          >
                            <span>View</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ====================================================== */
        /* B. INDIVIDUAL EMPLOYEE DEDUCTIONS VIEW                 */
        /* ====================================================== */
        viewingEmployeeData && (
          <div className="space-y-4">
            {/* Top Navigation & Profile Strip */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeId(null)}
                  className="p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Back to All Employees with Deductions"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                {viewingEmployeeData.employee?.avatarUrl ? (
                  <img
                    src={viewingEmployeeData.employee.avatarUrl}
                    alt={viewingEmployeeData.employee.firstName}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-base">
                    {viewingEmployeeData.employee?.firstName?.charAt(0) || 'E'}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-slate-900">
                      {viewingEmployeeData.employee
                        ? `${viewingEmployeeData.employee.firstName} ${viewingEmployeeData.employee.lastName}`
                        : viewingEmployeeData.summary?.employeeName || 'Employee'}
                    </h2>
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {viewingEmployeeData.employee?.employeeNumber || viewingEmployeeData.summary?.employeeNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {viewingEmployeeData.employee?.department} • {viewingEmployeeData.employee?.position} • Daily Rate: ₱{viewingEmployeeData.employee?.dailyRate.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons for this employee */}
              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDeductionForRecords(viewingEmployeeData.deductions[0] || null);
                    setIsPaymentRecordsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-blue-600/20 cursor-pointer"
                  title="Open Payment Records modal"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Payment Records</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenPayment()}
                  disabled={viewingEmployeeData.summary?.totalRunningBalance === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAdd(selectedEmployeeId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Deduction</span>
                </button>
              </div>
            </div>

            {/* Employee Financial Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Total Granted Obligation
                </span>
                <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                  ₱{viewingEmployeeData.summary?.totalOriginalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                </span>
                <span className="text-[10px] text-slate-400">Principal + Total Interest</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                  Total Deducted / Paid
                </span>
                <span className="text-base font-black text-emerald-700 font-mono mt-0.5 block">
                  ₱{viewingEmployeeData.summary?.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                </span>
                <span className="text-[10px] text-slate-400">Payroll cutoffs & payments</span>
              </div>

              <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-blue-800 block">
                  Current Running Balance
                </span>
                <span className="text-base font-black text-blue-950 font-mono mt-0.5 block">
                  ₱{viewingEmployeeData.summary?.totalRunningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                </span>
                <span className="text-[10px] text-blue-700">Remaining unpaid balance</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-indigo-700 block">
                  Cutoff Amortization
                </span>
                <span className="text-base font-black text-indigo-900 font-mono mt-0.5 block">
                  ₱{viewingEmployeeData.summary?.totalCutoffDeductionAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                </span>
                <span className="text-[10px] text-slate-400">Weekly payroll deduction</span>
              </div>
            </div>

            {/* Deductions Accounts Table (Primary list view, ledger page removed) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Deduction Accounts ({viewingEmployeeData.deductions.length})
                  </h3>
                </div>
                <div className="text-xs text-slate-500">
                  Click <span className="font-semibold text-blue-600">Payment Records</span> on any deduction to view its date, amount, running balance, and connected payslips.
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/80 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Deduction ID</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Date Granted</th>
                      <th className="py-2.5 px-3 text-right">Principal</th>
                      <th className="py-2.5 px-3 text-right">Interest</th>
                      <th className="py-2.5 px-3 text-right">Total Due</th>
                      <th className="py-2.5 px-3 text-right">Cutoff Amort.</th>
                      <th className="py-2.5 px-3 text-right">Total Paid</th>
                      <th className="py-2.5 px-3 text-right bg-blue-50/50">Running Balance</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80">
                    {viewingEmployeeData.deductions.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {d.deductionId}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.type === 'Loan'
                              ? 'bg-purple-100 text-purple-800'
                              : d.type === 'Salary Deduction'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {d.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                          {d.description}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{d.date}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                          ₱{d.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                          ₱{d.interest.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          ₱{d.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                          ₱{d.cutoffDeductionAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-medium whitespace-nowrap">
                          ₱{d.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 bg-blue-50/50 whitespace-nowrap">
                          <span className={d.runningBalance > 0 ? 'text-blue-950 font-black' : 'text-slate-400'}>
                            ₱{d.runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.status === 'Paused'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Payment Records Button replacing View Ledger */}
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentRecords(d)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200/80 hover:border-blue-600 rounded-lg text-xs font-bold transition-all shadow-2xs group cursor-pointer"
                              title="Open Payment Records modal"
                            >
                              <Receipt className="w-3.5 h-3.5 text-blue-600 group-hover:text-white transition-colors" />
                              <span>Payment Records</span>
                            </button>

                            {d.runningBalance > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOpenPayment(d.id)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Record Payment / Deduction"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleEditDeduction(d)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Deduction"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteDeduction(d.id, d.deductionId)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Deduction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* ======================================================== */}
      {/* 3. MODALS                                                */}
      {/* ======================================================== */}

      {/* Add / Edit Deduction Modal */}
      <AddDeductionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        preselectedEmployeeId={selectedEmployeeId || undefined}
        editingDeduction={editingDeduction}
      />

      {/* Record Payment Modal */}
      {viewingEmployeeData && (
        <RecordPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          deductions={viewingEmployeeData.deductions}
          preselectedDeductionId={preselectedDeductionForPayment}
          employeeName={
            viewingEmployeeData.employee
              ? `${viewingEmployeeData.employee.firstName} ${viewingEmployeeData.employee.lastName}`
              : undefined
          }
        />
      )}

      {/* Payment Records Modal (Replaces View Ledger with Table matching screenshot & Payslip Modal Linkage) */}
      <PaymentRecordsModal
        isOpen={isPaymentRecordsModalOpen}
        onClose={() => {
          setIsPaymentRecordsModalOpen(false);
          setSelectedDeductionForRecords(null);
        }}
        employee={viewingEmployeeData?.employee || null}
        deduction={selectedDeductionForRecords}
        allEmployeeDeductions={viewingEmployeeData?.deductions || []}
        onSelectDeduction={(ded) => setSelectedDeductionForRecords(ded)}
      />
    </div>
  );
};
