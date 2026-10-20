import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SAMPLE_BIOMETRIC_DATA_CSV, parseRawBiometricsText } from '../../utils/biometricsParser';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileText,
  HelpCircle,
  Sparkles
} from 'lucide-react';

interface DTRBiometricsUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const DTRBiometricsUploadModal: React.FC<DTRBiometricsUploadModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const { importBiometricPunches, showToast } = useApp();

  const [rawText, setRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [previewSummary, setPreviewSummary] = useState<{
    totalPunches: number;
    sampleRows: any[];
  } | null>(null);

  const handleTextChange = (text: string) => {
    setRawText(text);
    if (text.trim().length > 0) {
      const rows = parseRawBiometricsText(text);
      setPreviewSummary({
        totalPunches: rows.length,
        sampleRows: rows.slice(0, 5),
      });
    } else {
      setPreviewSummary(null);
    }
  };

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      handleTextChange(content);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSampleData = () => {
    setFileName('sample_biometrics_face_recognition.csv');
    handleTextChange(SAMPLE_BIOMETRIC_DATA_CSV);
    showToast('Loaded standard Philippine biometrics test dataset with multiple punches & anomalies.');
  };

  const handleImport = () => {
    if (!rawText.trim()) {
      showToast('Please paste biometric attendance text or upload a CSV file.', 'error');
      return;
    }

    const res = importBiometricPunches(rawText);
    if (res.importedCount > 0) {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-lg border border-slate-300 shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold">Import Biometrics Log (Staging Drafts)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Instructions & Staging Concept */}
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded text-xs text-blue-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-950">
              <Sparkles className="w-3.5 h-3.5 text-blue-700" />
              <span>Draft Staging & Attendance Anomaly Detection</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Imported biometric scans will be parsed into <strong>Draft Records</strong> first. You can inspect anomalies (incomplete punches, missing Time In/Out, multiple stamps) before committing them to the official employee DTR and payroll.
            </p>
          </div>

          {/* Quick Load Demo Button */}
          <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded border border-slate-200">
            <div className="text-xs font-semibold text-slate-700">
              Want to test with real sample biometric data?
            </div>
            <button
              type="button"
              onClick={handleLoadSampleData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold bg-blue-700 text-white hover:bg-blue-600 transition-colors shadow-2xs cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Load Sample Biometrics CSV</span>
            </button>
          </div>

          {/* File Upload Zone */}
          <div
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
          >
            <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
            <div className="text-xs font-semibold text-slate-700">
              Drag & drop biometric .csv / .txt file here, or{' '}
              <label className="text-blue-700 hover:text-blue-800 underline cursor-pointer">
                browse file
                <input
                  type="file"
                  accept=".csv,.txt,.tsv,.log"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>
            {fileName && (
              <div className="mt-2 text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded inline-block border border-emerald-200">
                Loaded: {fileName}
              </div>
            )}
          </div>

          {/* Raw Text Input / Editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="raw-csv-textarea" className="text-xs font-bold text-slate-700">
                Or Paste Biometric Raw CSV / Log Text:
              </label>
              {previewSummary && (
                <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                  ✓ {previewSummary.totalPunches} punch scans detected
                </span>
              )}
            </div>
            <textarea
              id="raw-csv-textarea"
              value={rawText}
              onChange={e => handleTextChange(e.target.value)}
              placeholder="Person ID,Person Name,Punch Date,Attendance record,Verify Type,TimeZone,Source&#10;008,Jerome Guitguit,08/21/2026,16:41:42,Face,+08:00,NMR2253900026&#10;009,Leandro San Andres,08/21/2026,16:20:19,Face,+08:00,NMR2253900026..."
              className="w-full h-36 p-2.5 font-mono text-[11px] bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-slate-400 focus:bg-white text-slate-800"
            />
          </div>

          {/* Parsed Preview Table */}
          {previewSummary && previewSummary.sampleRows.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block">
                Sample Parsed Entries (First 5 Punches)
              </span>
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-[11px] font-sans">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-1 px-2">Person ID</th>
                      <th className="py-1 px-2">Name</th>
                      <th className="py-1 px-2">Date</th>
                      <th className="py-1 px-2">Time</th>
                      <th className="py-1 px-2">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                    {previewSummary.sampleRows.map((row, idx) => (
                      <tr key={`sample-row-${row.personId}-${row.date}-${row.time}-${idx}`} className="bg-white">
                        <td className="py-1 px-2 font-bold text-slate-800">{row.personId}</td>
                        <td className="py-1 px-2 text-slate-700">{row.personName}</td>
                        <td className="py-1 px-2 text-slate-600">{row.date}</td>
                        <td className="py-1 px-2 text-emerald-700 font-bold">{row.time}</td>
                        <td className="py-1 px-2 text-slate-500">{row.verifyType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={!rawText.trim()}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold transition-colors shadow-2xs ${
              rawText.trim()
                ? 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Process & Create Draft Records</span>
          </button>
        </div>
      </div>
    </div>
  );
};
