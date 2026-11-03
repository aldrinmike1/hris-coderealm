import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { DeductionType } from '../../types';
import {
  CreditCard,
  Receipt,
  Layers,
  FileText,
  Search,
  Calendar,
  Filter,
  Eye,
  ArrowUpDown,
  Download,
  RotateCcw,
} from 'lucide-react';
import {
  PaymentSummaryGroup,
  IndividualPaymentItem,
  PaymentSummaryListModal,
} from './PaymentSummaryListModal';

export const PaymentSummaryTab: React.FC = () => {
  const { employeeDeductions, employees } = useApp();

  // Filters state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<'date' | 'totalPaid' | 'type' | 'employees'>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Modal inspection state
  const [selectedGroup, setSelectedGroup] = useState<PaymentSummaryGroup | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // 1. Extract all payment entries and group by Date & Deduction Type
  const summaryGroups = useMemo(() => {
    const groupMap = new Map<string, PaymentSummaryGroup>();

    employeeDeductions.forEach(ded => {
      const emp = employees.find(e => e.id === ded.employeeId);
      const empName = emp ? `${emp.firstName} ${emp.lastName}` : ded.employeeName;
      const empNumber = emp?.employeeNumber || ded.employeeNumber;
      const dept = emp?.department || ded.department || 'General';
      const pos = emp?.position || ded.position || 'Staff';
      const avatar = emp?.avatarUrl;

      // Extract all payment-like transactions (credit > 0 or payment/cutoff transaction)
      const paymentEntries = (ded.ledger || []).filter(
        entry =>
          entry.type !== 'GRANT' &&
          (entry.credit > 0 ||
            entry.type === 'PAYMENT' ||
            entry.type === 'CUTOFF_DEDUCTION')
      );

      paymentEntries.forEach(entry => {
        const dateKey = entry.date || 'Unknown';
        const typeKey: DeductionType = ded.type || 'Others';
        const compositeKey = `${dateKey}___${typeKey}`;

        const paymentAmount = entry.credit > 0 ? entry.credit : 0;

        const paymentItem: IndividualPaymentItem = {
          id: `${ded.id}_${entry.id}`,
          entryId: entry.id,
          date: dateKey,
          deductionId: ded.id,
          deductionCode: ded.deductionId,
          deductionTitle: ded.description,
          deductionType: typeKey,
          employeeId: ded.employeeId,
          employeeName: empName,
          employeeNumber: empNumber,
          department: dept,
          position: pos,
          avatarUrl: avatar,
          amount: paymentAmount,
          runningBalanceAfter: entry.runningBalance ?? ded.runningBalance,
          reference: entry.reference || '',
          remarks: entry.remarks || entry.description,
          transactionType: entry.type === 'GRANT' ? 'PAYMENT' : entry.type,
          isManual: entry.isManual ?? (entry.type === 'PAYMENT'),
          payslipId: entry.payslipId,
          payPeriodId: entry.payPeriodId,
          thirteenthMonthYear: entry.thirteenthMonthYear,
        };

        if (!groupMap.has(compositeKey)) {
          groupMap.set(compositeKey, {
            key: compositeKey,
            date: dateKey,
            deductionType: typeKey,
            totalPaid: 0,
            paymentCount: 0,
            uniqueEmployeesCount: 0,
            payments: [],
          });
        }

        const group = groupMap.get(compositeKey)!;
        group.totalPaid += paymentAmount;
        group.paymentCount += 1;
        group.payments.push(paymentItem);
      });
    });

    // Compute unique employees count per group
    groupMap.forEach(group => {
      const empIds = new Set(group.payments.map(p => p.employeeId));
      group.uniqueEmployeesCount = empIds.size;
    });

    return Array.from(groupMap.values());
  }, [employeeDeductions, employees]);

  // 2. Filter summary groups
  const filteredGroups = useMemo(() => {
    return summaryGroups.filter(grp => {
      // Date range filter
      if (startDate && grp.date < startDate) return false;
      if (endDate && grp.date > endDate) return false;

      // Deduction Type filter
      if (selectedType !== 'ALL' && grp.deductionType !== selectedType) {
        return false;
      }

      // Search query (date string, type, or employee contained in payments)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchDate = grp.date.toLowerCase().includes(q);
        const matchType = grp.deductionType.toLowerCase().includes(q);
        const matchEmployee = grp.payments.some(
          p =>
            p.employeeName.toLowerCase().includes(q) ||
            p.employeeNumber.toLowerCase().includes(q) ||
            p.deductionTitle.toLowerCase().includes(q) ||
            p.deductionCode.toLowerCase().includes(q)
        );

        if (!matchDate && !matchType && !matchEmployee) return false;
      }

      return true;
    });
  }, [summaryGroups, startDate, endDate, selectedType, searchQuery]);

  // 3. Sort summary groups
  const sortedGroups = useMemo(() => {
    const list = [...filteredGroups];
    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else if (sortField === 'totalPaid') {
        comparison = a.totalPaid - b.totalPaid;
      } else if (sortField === 'type') {
        comparison = a.deductionType.localeCompare(b.deductionType);
      } else if (sortField === 'employees') {
        comparison = a.uniqueEmployeesCount - b.uniqueEmployeesCount;
      }
      return sortAsc ? comparison : -comparison;
    });
    return list;
  }, [filteredGroups, sortField, sortAsc]);

  // 4. Overall metrics for filtered view
  const metrics = useMemo(() => {
    const totalPaid = sortedGroups.reduce((acc, g) => acc + g.totalPaid, 0);
    const totalTransactions = sortedGroups.reduce((acc, g) => acc + g.paymentCount, 0);
    const uniqueDates = new Set(sortedGroups.map(g => g.date)).size;
    const uniqueEmployeeIds = new Set(
      sortedGroups.flatMap(g => g.payments.map(p => p.employeeId))
    );

    return {
      totalPaid,
      totalTransactions,
      uniqueDates,
      uniqueEmployeesCount: uniqueEmployeeIds.size,
      groupCount: sortedGroups.length,
    };
  }, [sortedGroups]);

  // Format currency helper
  const formatCurrency = (val: number) => {
    return '₱' + (val || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format date helper: returns readable full date e.g. "Sep 12, 2026"
  const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr || dateStr === 'Unknown') return 'Unknown Date';
    try {
      const [y, m, d] = dateStr.split('-');
      if (y && m && d) {
        const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        return dt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const getTypeIcon = (type: DeductionType) => {
    switch (type) {
      case 'Loan':
        return <CreditCard className="w-4 h-4 text-indigo-600" />;
      case 'Salary Deduction':
        return <Receipt className="w-4 h-4 text-blue-600" />;
      case 'MLS':
        return <Layers className="w-4 h-4 text-emerald-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  const handleOpenModal = (group: PaymentSummaryGroup) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedType('ALL');
    setSearchQuery('');
    setSortField('date');
    setSortAsc(false);
  };

  const handleExportAllCSV = () => {
    if (sortedGroups.length === 0) return;

    const headers = [
      'Deduction Type',
      'Date',
      'Total Paid',
      'Number of Payments',
      'Unique Employees',
    ];

    const rows = sortedGroups.map(g => [
      `"${g.deductionType}"`,
      `"${g.date}"`,
      g.totalPaid.toFixed(2),
      g.paymentCount,
      g.uniqueEmployeesCount,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Deduction_Payment_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSort = (field: 'date' | 'totalPaid' | 'type' | 'employees') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Filter & Search Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Date Range & Type Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Start Date */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-medium focus:outline-hidden cursor-pointer"
              />
            </div>

            {/* End Date */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-medium focus:outline-hidden cursor-pointer"
              />
            </div>

            {/* Deduction Type Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">Type:</span>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Types</option>
                <option value="Loan">Loan</option>
                <option value="Salary Deduction">Salary Deduction</option>
                <option value="MLS">MLS</option>
                <option value="Others">Others</option>
              </select>
            </div>

            {/* Reset Button */}
            {(startDate || endDate || selectedType !== 'ALL' || searchQuery) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Right: Search & Export */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search date, type, employee..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={handleExportAllCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="Export visible summary as CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Payment Summary Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {sortedGroups.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6" />
            </div>
            <h4 className="text-base font-semibold text-slate-800">
              No Payment Summaries Found
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {startDate || endDate || selectedType !== 'ALL' || searchQuery
                ? 'Try broadening your date range or clearing your search filters.'
                : 'There are currently no deduction payment records logged in the system.'}
            </p>
            {(startDate || endDate || selectedType !== 'ALL' || searchQuery) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  {/* Column 1: Deduction Type */}
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    onClick={() => toggleSort('type')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Deduction Type</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Column 2: Date */}
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    onClick={() => toggleSort('date')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Column 3: Employees */}
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    onClick={() => toggleSort('employees')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Employees</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Column 4: Total Paid */}
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    onClick={() => toggleSort('totalPaid')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Total Paid</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Column 5: Last column - View list of payments */}
                  <th className="py-3 px-4 text-right">
                    <span className="sr-only">Actions</span>
                    <span>View Payments</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sortedGroups.map((group, idx) => {
                  const dateFormatted = formatDateDisplay(group.date);
                  return (
                    <tr
                      key={group.key || idx}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* Column 1: Deduction Type */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-slate-100 group-hover:bg-white rounded-xl border border-slate-200 transition-colors shrink-0">
                            {getTypeIcon(group.deductionType)}
                          </div>
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">
                            {group.deductionType}
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Date */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 font-mono text-xs sm:text-sm">
                          {dateFormatted}
                        </div>
                      </td>

                      {/* Column 3: Employees */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 font-mono text-xs sm:text-sm tabular-nums">
                          {group.uniqueEmployeesCount}
                        </div>
                      </td>

                      {/* Column 4: Total Paid */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-semibold font-mono text-sm sm:text-base text-emerald-600 tabular-nums">
                          {formatCurrency(group.totalPaid)}
                        </div>
                      </td>

                      {/* Column 5: View List Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenModal(group)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl font-semibold text-xs border border-blue-200 hover:border-transparent transition-all shadow-2xs hover:shadow-xs cursor-pointer group-hover:scale-102"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View List</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold border-t border-slate-200 text-slate-800">
                  <td className="py-3 px-4">
                    <span className="text-xs font-bold text-slate-700">Total Filtered:</span>{' '}
                    <span className="text-xs text-slate-500 font-normal">
                      {sortedGroups.length} summary {sortedGroups.length === 1 ? 'row' : 'rows'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500">
                    {metrics.totalTransactions.toLocaleString()} total payments
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-700 text-xs tabular-nums">
                    {metrics.uniqueEmployeesCount.toLocaleString()} {metrics.uniqueEmployeesCount === 1 ? 'employee' : 'employees'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums text-sm sm:text-base">
                    {formatCurrency(metrics.totalPaid)}
                  </td>
                  <td className="py-3 px-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* 4. Inspection Modal for the Group */}
      <PaymentSummaryListModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedGroup(null);
        }}
        summaryGroup={selectedGroup}
      />
    </div>
  );
};
