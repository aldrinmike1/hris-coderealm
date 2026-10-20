import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Employee, EmployeeStatus, UserRole } from '../../types';
import { formatCurrency, formatDate, exportToCSV, formatSSS, formatPhilHealth, formatPagIbig } from '../../utils/formatters';
import {
  Search,
  Filter,
  Plus,
  Download,
  Eye,
  Edit2,
  Trash2,
  Users,
  CheckCircle,
  XCircle,
  IdCard,
  Building,
  Fingerprint,
  Phone,
  DollarSign,
  Briefcase,
  Layers,
} from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface EmployeeListProps {
  onAddEmployee: () => void;
  onEditEmployee: (emp: Employee) => void;
  onViewEmployee: (emp: Employee) => void;
  onViewIDCard: (emp: Employee) => void;
  onViewDTR: (emp: Employee) => void;
}

export const EmployeeList: React.FC<EmployeeListProps> = ({
  onAddEmployee,
  onEditEmployee,
  onViewEmployee,
  onViewIDCard,
  onViewDTR,
}) => {
  const { employees, deleteEmployee, isAdmin, isManager, currentUser } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  // Departments List
  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department));
    return ['ALL', ...Array.from(depts)];
  }, [employees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        emp.firstName.toLowerCase().includes(q) ||
        emp.lastName.toLowerCase().includes(q) ||
        emp.employeeNumber.toLowerCase().includes(q) ||
        emp.biometrixId.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.position.toLowerCase().includes(q);

      const matchesDept = departmentFilter === 'ALL' || emp.department === departmentFilter;
      const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;
      const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;

      return matchesSearch && matchesDept && matchesStatus && matchesRole;
    });
  }, [employees, searchQuery, departmentFilter, statusFilter, roleFilter]);

  // Statistics
  const activeCount = employees.filter(e => e.status === 'active').length;
  const inactiveCount = employees.filter(e => e.status === 'inactive').length;
  const totalDailyRateActive = employees
    .filter(e => e.status === 'active')
    .reduce((sum, e) => sum + (e.dailyRate || 0), 0);

  const handleExportCSV = () => {
    const data = filteredEmployees.map(emp => ({
      'Employee Number': emp.employeeNumber,
      'Biometrix ID': emp.biometrixId,
      'First Name': emp.firstName,
      'Last Name': emp.lastName,
      'Email': emp.email,
      'Mobile': emp.mobile,
      'Department': emp.department,
      'Position': emp.position,
      'Role': emp.role,
      'Daily Rate (PHP)': emp.dailyRate,
      'Status': emp.status,
      'Date Started': emp.dateStarted,
      'Date Resigned': emp.dateResigned || '',
      'SSS Number': emp.sssNumber,
      'PhilHealth Number': emp.philhealthNumber,
      'Pag-IBIG Number': emp.pagibigNumber,
      'Emergency Contact Name': emp.emergencyContact?.name || '',
      'Emergency Relationship': emp.emergencyContact?.relationship || '',
      'Emergency Mobile': emp.emergencyContact?.mobile || '',
      'Residential Address': emp.address,
    }));
    exportToCSV(`Employee_Masterlist_${new Date().toISOString().split('T')[0]}`, data);
  };

  return (
    <div className="space-y-3" id="employee-management-view">
      {/* High Density Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded border border-slate-300 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Headcount
            </span>
            <span className="text-xl font-bold text-slate-900 font-mono">
              {employees.length}
            </span>
          </div>
          <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded border border-slate-300 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Active Employees
            </span>
            <span className="text-xl font-bold text-emerald-700 font-mono">
              {activeCount}
            </span>
          </div>
          <div className="w-8 h-8 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded border border-slate-300 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Inactive / Separated
            </span>
            <span className="text-xl font-bold text-slate-600 font-mono">
              {inactiveCount}
            </span>
          </div>
          <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
            <XCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded border border-slate-300 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Daily Payroll Base
            </span>
            <span className="text-lg font-bold text-slate-900 font-mono">
              {formatCurrency(totalDailyRateActive)}
            </span>
          </div>
          <div className="w-8 h-8 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main High Density Table Card */}
      <div className="bg-white rounded border border-slate-300 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3 bg-white border-b border-slate-300 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Employee Directory Masterlist</h2>
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                  {filteredEmployees.length} records
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                14 Mandatory Personnel Fields • Biometric Assignment • SSS/PhilHealth/HDMF • Daily Rates
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
                id="export-employees-csv-btn"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              {(isAdmin || isManager) && (
                <button
                  onClick={onAddEmployee}
                  className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
                  id="add-employee-btn"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Employee</span>
                </button>
              )}
            </div>
          </div>

          {/* Search & Filters Compact Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search ID, name, biometrix..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                id="employee-search-input"
              />
            </div>

            {/* Department Filter */}
            <div>
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                id="dept-filter-select"
              >
                {departments.map((d, dIdx) => (
                  <option key={`${d}-${dIdx}`} value={d}>
                    {d === 'ALL' ? 'All Departments' : d}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                id="status-filter-select"
              >
                <option value="ALL">All Status (Active & Inactive)</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                id="role-filter-select"
              >
                <option value="ALL">All User Roles</option>
                <option value="admin">Admins</option>
                <option value="manager">Managers</option>
                <option value="staff">Staff (Regular)</option>
              </select>
            </div>
          </div>
        </div>

        {/* High Density Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-300">
              <tr>
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Emp No / Bio ID</th>
                <th className="py-2.5 px-3">Department & Position</th>
                <th className="py-2.5 px-3 text-right">Daily Rate</th>
                <th className="py-2.5 px-3">Contact & Address</th>
                <th className="py-2.5 px-3">Statutory (SSS/PH/HDMF)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    <Users className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                    <p className="font-semibold text-xs text-slate-600">No personnel records match the current filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, empIdx) => (
                  <tr
                    key={`${emp.id}-${empIdx}`}
                    className="hover:bg-blue-50/60 transition-colors group cursor-pointer border-l-2 border-l-transparent hover:border-l-blue-600"
                    onClick={() => onViewEmployee(emp)}
                    id={`emp-row-${emp.employeeNumber}`}
                  >
                    {/* Employee Profile */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={emp.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                          alt=""
                          className="w-8 h-8 rounded object-cover border border-slate-300 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 truncate">
                              {emp.lastName}, {emp.firstName}
                            </span>
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1 py-0.2 rounded ${
                                emp.role === 'admin'
                                  ? 'bg-rose-100 text-rose-700'
                                  : emp.role === 'manager'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {emp.role}
                            </span>
                          </div>
                          <span className="text-slate-400 text-[10px] block truncate">{emp.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Emp No & Bio ID */}
                    <td className="py-2.5 px-3 font-mono">
                      <div className="font-semibold text-slate-800">{emp.employeeNumber}</div>
                      <div className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold">
                        <Fingerprint className="w-3 h-3" />
                        <span>{emp.biometrixId}</span>
                      </div>
                    </td>

                    {/* Department & Position */}
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-800">{emp.position}</div>
                      <div className="text-[10px] text-slate-500">{emp.department}</div>
                    </td>

                    {/* Daily Rate */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="font-bold text-slate-900 font-mono">{formatCurrency(emp.dailyRate)}</div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        {formatCurrency(emp.dailyRate / 8)}/hr
                      </div>
                    </td>

                    {/* Contact & Address */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{emp.mobile}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 max-w-[140px] truncate" title={emp.address}>
                        {emp.address}
                      </div>
                    </td>

                    {/* Statutory IDs */}
                    <td className="py-2.5 px-3 text-[10px] font-mono space-y-0.2 text-slate-600">
                      <div>
                        <span className="text-slate-400">SSS:</span> {emp.sssEnabled === false ? <span className="text-slate-400 italic">Exempt</span> : formatSSS(emp.sssNumber)}
                      </div>
                      <div>
                        <span className="text-slate-400">PH:</span> {emp.philhealthEnabled === false ? <span className="text-slate-400 italic">Exempt</span> : formatPhilHealth(emp.philhealthNumber)}
                      </div>
                      <div>
                        <span className="text-slate-400">HDMF:</span> {emp.pagibigEnabled === false ? <span className="text-slate-400 italic">Exempt</span> : formatPagIbig(emp.pagibigNumber)}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          emp.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'active' ? 'bg-green-600' : 'bg-slate-400'}`} />
                        {emp.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td
                      className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onViewEmployee(emp)}
                        title="View Profile Details"
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        id={`view-emp-${emp.employeeNumber}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onViewIDCard(emp)}
                        title="Print ID Card"
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        id={`idcard-emp-${emp.employeeNumber}`}
                      >
                        <IdCard className="w-3.5 h-3.5" />
                      </button>

                      {(isAdmin || isManager) && (
                        <button
                          onClick={() => onEditEmployee(emp)}
                          title="Edit Record"
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          id={`edit-emp-${emp.employeeNumber}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => setDeleteTarget(emp)}
                          title="Delete Employee"
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          id={`del-emp-${emp.employeeNumber}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* High Density Footer info */}
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-300 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-[11px]">
            Showing <strong>{filteredEmployees.length}</strong> of <strong>{employees.length}</strong> total records
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            Audit logging active • All modifications are timestamped
          </span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        key="confirm-dialog-delete-employee"
        isOpen={!!deleteTarget}
        title="Delete Employee Record"
        message={`Are you sure you want to remove ${deleteTarget?.firstName} ${deleteTarget?.lastName} (${deleteTarget?.employeeNumber}) from the personnel database? This action is logged into the audit trail.`}
        confirmText="Delete Record"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) deleteEmployee(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
