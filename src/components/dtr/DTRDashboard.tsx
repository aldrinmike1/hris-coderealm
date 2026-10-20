import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { DTRRecord, Employee, DTRStatus } from '../../types';
import { formatDate, formatTime, exportToCSV } from '../../utils/formatters';
import {
  Calendar,
  Clock,
  Fingerprint,
  Filter,
  Search,
  Download,
  Plus,
  Edit2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Moon,
  Sun,
  User,
  ArrowUpDown,
  FileSpreadsheet,
  Layers,
  TableProperties
} from 'lucide-react';
import { DTREditModal } from './DTREditModal';
import { DTRPunchModal } from './DTRPunchModal';
import { DTRBatchGeneratorModal } from './DTRBatchGeneratorModal';
import { DTREmployeeSummaryView } from './DTREmployeeSummaryView';
import { DTRDraftStagingView } from './DTRDraftStagingView';
import { DTRBiometricsUploadModal } from './DTRBiometricsUploadModal';
import { DTROverviewView } from './DTROverviewView';

interface DTRDashboardProps {
  initialEmployeeId?: string;
}

export const DTRDashboard: React.FC<DTRDashboardProps> = ({ initialEmployeeId }) => {
  const { dtrRecords, dtrDrafts, employees, isAdmin, isManager, isStaff, currentUser } = useApp();

  // Active Sub-view: 'summary' | 'drafts' | 'overview'
  const [subView, setSubView] = useState<'summary' | 'drafts' | 'overview'>('summary');

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(() => {
    if (initialEmployeeId) return initialEmployeeId;
    if (isStaff) {
      const match = employees.find(e => `${e.firstName} ${e.lastName}` === currentUser.name || e.employeeNumber === currentUser.employeeId);
      return match ? match.id : 'ALL';
    }
    return 'ALL';
  });

  // Modals
  const [editingRecord, setEditingRecord] = useState<DTRRecord | null>(null);
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Count pending/anomalous drafts
  const draftAnomalyCount = useMemo(() => {
    return dtrDrafts.filter(d => (d.status === 'PENDING' || d.status === 'VALIDATED') && d.anomalies.length > 0).length;
  }, [dtrDrafts]);

  return (
    <div className="space-y-3" id="dtr-management-view">
      {/* Sub-view Navigation Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-2 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            id="tab-dtr-summary"
            onClick={() => setSubView('summary')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap ${
              subView === 'summary'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TableProperties className="w-3.5 h-3.5" />
            <span>Employee Timesheet Summary</span>
          </button>

          <button
            id="tab-dtr-drafts"
            onClick={() => setSubView('drafts')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap ${
              subView === 'drafts'
                ? 'bg-blue-800 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Biometric Draft Staging & Anomalies</span>
            {draftAnomalyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 animate-pulse">
                {draftAnomalyCount} review
              </span>
            )}
          </button>

          <button
            id="tab-dtr-logs"
            onClick={() => setSubView('overview')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap ${
              subView === 'overview'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>DTR Logs</span>
          </button>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-1.5">
          {(isAdmin || isManager) && (
            <button
              id="btn-batch-modal-top"
              onClick={() => setShowBatchModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Bulk Sync</span>
            </button>
          )}

          <button
            id="btn-open-upload-modal-top"
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-300" />
            <span>Upload Biometrics</span>
          </button>

          <button
            id="btn-open-punch-modal-top"
            onClick={() => setShowPunchModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-600 transition-colors shadow-2xs"
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Punch Clock</span>
          </button>
        </div>
      </div>

      {/* Render Active Sub-view */}
      {subView === 'overview' && (
        <DTROverviewView
          onOpenUploadModal={() => setShowUploadModal(true)}
          onOpenPunchModal={() => setShowPunchModal(true)}
          onOpenDraftStaging={() => setSubView('drafts')}
          onSelectEmployeeSummary={(empId) => {
            setSelectedEmployeeId(empId);
            setSubView('summary');
          }}
          onEditRecord={(rec) => setEditingRecord(rec)}
        />
      )}

      {subView === 'summary' && (
        <DTREmployeeSummaryView
          onOpenUploadModal={() => setShowUploadModal(true)}
          onOpenDraftStaging={() => setSubView('drafts')}
        />
      )}

      {subView === 'drafts' && (
        <DTRDraftStagingView
          onOpenUploadModal={() => setShowUploadModal(true)}
          onViewSummary={() => setSubView('summary')}
        />
      )}

      {/* Edit Adjustment Modal */}
      <DTREditModal
        isOpen={!!editingRecord}
        dtrRecord={editingRecord}
        onClose={() => setEditingRecord(null)}
      />

      {/* Punch Clock Modal */}
      <DTRPunchModal
        isOpen={showPunchModal}
        onClose={() => setShowPunchModal(false)}
      />

      {/* Batch Generator Modal */}
      <DTRBatchGeneratorModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
      />

      {/* Biometrics Upload / CSV Modal */}
      {showUploadModal && (
        <DTRBiometricsUploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => setSubView('drafts')}
        />
      )}
    </div>
  );
};
