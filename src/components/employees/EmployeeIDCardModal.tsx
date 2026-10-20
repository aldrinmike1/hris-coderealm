import React from 'react';
import { Employee } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, Printer, Fingerprint, Building2, ShieldCheck, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EmployeeIDCardModalProps {
  isOpen: boolean;
  employee: Employee | null;
  onClose: () => void;
}

export const EmployeeIDCardModal: React.FC<EmployeeIDCardModalProps> = ({
  isOpen,
  employee,
  onClose,
}) => {
  const { companyProfile } = useApp();
  if (!isOpen || !employee) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div key="employee-id-card-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200"
          id="employee-id-badge-modal"
        >
          {/* Action Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Employee ID Card & Biometric Badge
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                id="print-badge-btn"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Badge
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ID CARD VISUAL (PRINTABLE) */}
          <div className="p-6 flex justify-center bg-slate-100/70">
            <div
              className="w-80 bg-white rounded-3xl shadow-xl border border-slate-300 overflow-hidden relative"
              id="printable-company-id"
            >
              {/* Card Top Header */}
              <div className="bg-gradient-to-tr from-indigo-900 to-indigo-700 text-white p-5 text-center relative">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs mx-auto flex items-center justify-center mb-1.5 border border-white/30">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-extrabold text-sm uppercase tracking-wider truncate px-2">
                  {companyProfile.name || 'Enterprise Corp. PH'}
                </h4>
                <p className="text-[10px] text-indigo-200">Official Personnel Identification Card</p>

                {/* Hole punch simulation */}
                <div className="w-10 h-2 bg-slate-900/30 rounded-full mx-auto mt-2 border border-white/20" />
              </div>

              {/* Card Body */}
              <div className="p-5 text-center -mt-6">
                <div className="relative inline-block">
                  <img
                    src={employee.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                    alt=""
                    className="w-24 h-24 rounded-2xl object-cover mx-auto border-4 border-white shadow-md bg-slate-200"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                      employee.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-3 tracking-tight leading-snug">
                  {employee.firstName} {employee.lastName}
                </h3>
                <p className="text-xs font-semibold text-indigo-600">{employee.position}</p>
                <p className="text-[11px] text-slate-500">{employee.department}</p>

                {/* Details Grid */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-left bg-slate-50 p-2.5 rounded-xl border">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">EMP NO.</span>
                    <span className="font-mono font-bold text-xs text-slate-800">{employee.employeeNumber}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">BIOMETRIX ID</span>
                    <span className="font-mono font-bold text-xs text-indigo-600">{employee.biometrixId}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">DATE HIRED</span>
                    <span className="text-[11px] font-semibold text-slate-700">{employee.dateStarted}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">BLOOD/ROLE</span>
                    <span className="text-[11px] font-bold uppercase text-slate-700">{employee.role}</span>
                  </div>
                </div>

                {/* Barcode / Fingerprint simulation */}
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between px-2">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Fingerprint className="w-5 h-5 text-indigo-600" />
                    <span className="text-[10px] font-mono font-semibold">{employee.biometrixId}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified</span>
                  </div>
                </div>
              </div>

              {/* Bottom strip */}
              <div className="bg-slate-900 text-slate-400 text-[8px] py-1 text-center font-mono">
                PROPERTY OF HRIS ENTERPRISE • IF FOUND RETURN TO HR
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
