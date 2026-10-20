import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AuditLogEntry, AuditModule, AuditAction } from '../../types';
import { formatDateTime, exportToCSV } from '../../utils/formatters';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Eye,
  History,
  User,
  Layers,
  ArrowRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { AuditDiffModal } from './AuditDiffModal';

export const AuditTrailView: React.FC = () => {
  const { auditLogs } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<'ALL' | AuditModule>('ALL');
  const [selectedAction, setSelectedAction] = useState<'ALL' | AuditAction>('ALL');
  const [inspectedLog, setInspectedLog] = useState<AuditLogEntry | null>(null);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        log.actorName.toLowerCase().includes(q) ||
        log.targetName.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q) ||
        log.id.toLowerCase().includes(q);

      const matchesModule = selectedModule === 'ALL' || log.module === selectedModule;
      const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;

      return matchesSearch && matchesModule && matchesAction;
    });
  }, [auditLogs, searchQuery, selectedModule, selectedAction]);

  const handleExportCSV = () => {
    const data = filteredLogs.map(log => ({
      'Log ID': log.id,
      'Timestamp': log.timestamp,
      'Module': log.module,
      'Action': log.action,
      'Actor Name': log.actorName,
      'Actor Role': log.actorRole,
      'Target Entity': log.targetName,
      'Description': log.description,
      'Number of Fields Changed': log.changes?.length || 0,
    }));
    exportToCSV(`Audit_Trail_${new Date().toISOString().split('T')[0]}`, data);
  };

  return (
    <div className="space-y-3" id="audit-trail-view">
      {/* High Density Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded border border-slate-300 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Audit Entries
            </span>
            <span className="text-xl font-bold text-slate-900 font-mono">
              {auditLogs.length}
            </span>
          </div>
          <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <History className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded border border-slate-300 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Employee Master Edits
            </span>
            <span className="text-xl font-bold text-blue-700 font-mono">
              {auditLogs.filter(l => l.module === 'EMPLOYEE').length}
            </span>
          </div>
          <div className="w-8 h-8 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded border border-slate-300 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              DTR Time Adjustments
            </span>
            <span className="text-xl font-bold text-emerald-700 font-mono">
              {auditLogs.filter(l => l.module === 'DTR').length}
            </span>
          </div>
          <div className="w-8 h-8 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded border border-slate-300 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Payroll Modifications
            </span>
            <span className="text-xl font-bold text-amber-700 font-mono">
              {auditLogs.filter(l => l.module === 'PAYROLL').length}
            </span>
          </div>
          <div className="w-8 h-8 rounded bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main High Density Audit Trail Container */}
      <div className="bg-white rounded border border-slate-300 shadow-xs overflow-hidden">
        {/* Header & Controls */}
        <div className="p-3 bg-white border-b border-slate-300 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  System Audit Trail & Compliance Log
                </h2>
                <span className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded uppercase">
                  Tamper-Evident
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Full chronological history of employee records, rate updates, DTR biometric edits, and payroll revisions
              </p>
            </div>

            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
              id="export-audit-csv-btn"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Search & Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search actor, target entity, remarks..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                id="audit-search-input"
              />
            </div>

            {/* Module Filter */}
            <div>
              <select
                value={selectedModule}
                onChange={e => setSelectedModule(e.target.value as any)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                id="audit-module-filter"
              >
                <option value="ALL">All System Modules</option>
                <option value="EMPLOYEE">Employee Masterlist</option>
                <option value="DTR">DTR & Attendance</option>
                <option value="PAYROLL">Payroll & Payslips</option>
                <option value="AUTH">Authentication / RBAC</option>
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <select
                value={selectedAction}
                onChange={e => setSelectedAction(e.target.value as any)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                id="audit-action-filter"
              >
                <option value="ALL">All Actions (Create, Update, Delete, Punch)</option>
                <option value="CREATE">CREATE (New Record)</option>
                <option value="UPDATE">UPDATE (Modified Data)</option>
                <option value="DELETE">DELETE (Removed Record)</option>
                <option value="DTR_PUNCH">DTR_PUNCH (Attendance)</option>
                <option value="PAYROLL_GENERATE">PAYROLL_GENERATE</option>
                <option value="PAYROLL_APPROVE">PAYROLL_APPROVE</option>
              </select>
            </div>
          </div>
        </div>

        {/* Audit Log High Density Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-300">
              <tr>
                <th className="py-2.5 px-3">Timestamp & ID</th>
                <th className="py-2.5 px-3">Module</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Actor (Initiator)</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-3">Description & Remarks</th>
                <th className="py-2.5 px-3 text-center">Changes Diff</th>
                <th className="py-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    <History className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                    <p className="font-semibold text-xs text-slate-600">No audit log entries match the search criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => {
                  const hasDiff = log.changes && log.changes.length > 0;
                  return (
                    <tr
                      key={`${log.id}-${idx}`}
                      className="hover:bg-blue-50/60 transition-colors border-l-2 border-l-transparent hover:border-l-blue-600"
                      id={`audit-row-${log.id}`}
                    >
                      {/* Timestamp */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{formatDateTime(log.timestamp)}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.id}</div>
                      </td>

                      {/* Module */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            log.module === 'EMPLOYEE'
                              ? 'bg-blue-100 text-blue-800'
                              : log.module === 'DTR'
                              ? 'bg-green-100 text-green-800'
                              : log.module === 'PAYROLL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {log.module}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-[10px]">
                        <span
                          className={
                            log.action === 'CREATE'
                              ? 'text-emerald-700'
                              : log.action === 'UPDATE'
                              ? 'text-amber-700'
                              : log.action === 'DELETE'
                              ? 'text-rose-700'
                              : 'text-blue-700'
                          }
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Actor */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{log.actorName}</div>
                        <div className="text-[9px] text-slate-400 uppercase font-mono">
                          {log.actorRole}
                        </div>
                      </td>

                      {/* Target */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-900">
                        {log.targetName}
                      </td>

                      {/* Description */}
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={log.description}>
                        {log.description}
                      </td>

                      {/* Changes Diff Badge */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {hasDiff ? (
                          <button
                            onClick={() => setInspectedLog(log)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded text-[10px] border border-blue-200 transition-colors"
                          >
                            <Layers className="w-3 h-3" />
                            <span>{log.changes?.length} fields</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
                      </td>

                      {/* Inspect */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setInspectedLog(log)}
                          title="Inspect Audit Log"
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          id={`inspect-audit-${log.id}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-300 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-[11px]">
            Total: <strong>{filteredLogs.length}</strong> logged events in audit trail
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            Immutable system logs compliant with DOLE & statutory regulations
          </span>
        </div>
      </div>

      {/* Diff Inspector Modal */}
      <AuditDiffModal
        isOpen={!!inspectedLog}
        log={inspectedLog}
        onClose={() => setInspectedLog(null)}
      />
    </div>
  );
};
