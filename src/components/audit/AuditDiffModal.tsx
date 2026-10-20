import React from 'react';
import { AuditLogEntry } from '../../types';
import { formatDateTime } from '../../utils/formatters';
import { X, ShieldCheck, ArrowRight, User, History, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuditDiffModalProps {
  isOpen: boolean;
  log: AuditLogEntry | null;
  onClose: () => void;
}

export const AuditDiffModal: React.FC<AuditDiffModalProps> = ({
  isOpen,
  log,
  onClose,
}) => {
  if (!isOpen || !log) return null;

  return (
    <AnimatePresence>
      <div key="audit-diff-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200"
          id="audit-diff-viewer-modal"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight">Audit Trail Inspection</h2>
                    <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md">
                      {log.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(log.timestamp)}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Metadata Summary Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">MODULE</span>
                <span className="font-bold text-indigo-700 block mt-0.5">{log.module}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ACTION PERFORMED</span>
                <span className="font-mono font-bold text-slate-900 block mt-0.5">{log.action}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ACTOR (USER)</span>
                <span className="font-semibold text-slate-900 block mt-0.5">{log.actorName}</span>
                <span className="text-[10px] text-slate-500 uppercase">{log.actorRole}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TARGET ENTITY</span>
                <span className="font-semibold text-slate-900 block mt-0.5 truncate" title={log.targetName}>
                  {log.targetName}
                </span>
              </div>
            </div>

            {/* Description / Remarks */}
            <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs">
              <span className="font-bold text-indigo-900 uppercase tracking-wider block mb-1">
                Audit Log Description:
              </span>
              <p className="text-slate-700 leading-relaxed font-medium">{log.description}</p>
            </div>

            {/* Changes Diff Table */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                Detailed Field-Level Differences ({log.changes?.length || 0} modified)
              </h3>

              {!log.changes || log.changes.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs border border-dashed rounded-xl">
                  No individual field diff recorded for this operation.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Field Name</th>
                        <th className="py-2.5 px-3">Previous Value (Before)</th>
                        <th className="py-2.5 px-3 text-center w-8"></th>
                        <th className="py-2.5 px-3">New Value (After Edit)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {log.changes.map((diff, idx) => (
                        <tr key={`change-${log.id}-${diff.field}-${idx}`} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800 font-sans">
                            {diff.fieldLabel || diff.field}
                          </td>
                          <td className="py-2.5 px-3 text-rose-700 bg-rose-50/30 break-all">
                            {diff.oldValue === null || diff.oldValue === undefined || diff.oldValue === ''
                              ? '<empty / null>'
                              : String(diff.oldValue)}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-400">
                            <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                          </td>
                          <td className="py-2.5 px-3 text-emerald-700 bg-emerald-50/40 font-bold break-all">
                            {diff.newValue === null || diff.newValue === undefined || diff.newValue === ''
                              ? '<empty / null>'
                              : String(diff.newValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
