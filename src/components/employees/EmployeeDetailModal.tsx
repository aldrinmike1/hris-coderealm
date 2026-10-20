import React from 'react';
import { Employee } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, formatSSS, formatPhilHealth, formatPagIbig } from '../../utils/formatters';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Building,
  HeartHandshake,
  DollarSign,
  Fingerprint,
  FileBadge,
  CheckCircle2,
  Clock,
  IdCard,
  Edit,
  History,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EmployeeDetailModalProps {
  isOpen: boolean;
  employee: Employee | null;
  onClose: () => void;
  onEdit?: (emp: Employee) => void;
  onEditEmployee?: (emp: Employee) => void;
  onViewDTR?: (emp: Employee) => void;
  onViewIDCard: (emp: Employee) => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  isOpen,
  employee,
  onClose,
  onEdit,
  onEditEmployee,
  onViewDTR,
  onViewIDCard,
}) => {
  if (!isOpen || !employee) return null;

  const { getEmployeeShift } = useApp();
  const assignedShift = employee ? getEmployeeShift(employee) : null;

  const handleEdit = (emp: Employee) => {
    if (onEdit) onEdit(emp);
    else if (onEditEmployee) onEditEmployee(emp);
  };

  return (
    <AnimatePresence>
      <div key="employee-detail-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="bg-white rounded border border-slate-300 shadow-2xl max-w-3xl w-full overflow-hidden my-8"
          id="employee-detail-modal"
        >
          {/* High Density Header Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={employee.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                alt=""
                className="w-12 h-12 rounded object-cover border border-slate-300 bg-slate-200 shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    {employee.lastName}, {employee.firstName}
                  </h2>
                  <span className="font-mono bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-1.5 py-0.2 rounded font-bold">
                    {employee.employeeNumber}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      employee.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {employee.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {employee.position} • {employee.department} • <span className="font-mono text-blue-600 font-semibold">{employee.biometrixId}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  handleEdit(employee);
                }}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded font-medium transition-colors"
                id="edit-employee-header-btn"
              >
                Edit Employee Data
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200"
                id="close-detail-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* High Density Content Grid */}
          <div className="p-5 grid grid-cols-3 gap-y-4 gap-x-4 max-h-[60vh] overflow-y-auto text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">First Name</p>
              <p className="text-sm font-medium text-slate-900">{employee.firstName}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Last Name</p>
              <p className="text-sm font-medium text-slate-900">{employee.lastName}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Mobile</p>
              <p className="text-sm font-medium font-mono text-slate-900">{employee.mobile}</p>
            </div>

            <div className="col-span-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Residential Address</p>
              <p className="text-sm font-medium text-slate-800">{employee.address}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Birthday</p>
              <p className="text-sm font-medium text-slate-800">{formatDate(employee.birthday)}</p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Emergency Contact</p>
              <p className="text-sm font-medium text-slate-800">
                {employee.emergencyContact?.name || '—'} ({employee.emergencyContact?.relationship || 'Contact'})
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Emergency Number</p>
              <p className="text-sm font-medium font-mono text-slate-800">{employee.emergencyContact?.mobile || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Biometrix ID</p>
              <p className="text-sm font-mono text-blue-600 font-bold">{employee.biometrixId}</p>
            </div>

            <div className="col-span-3 border-t border-slate-100 pt-2"></div>

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">SSS Number</p>
                {employee.sssEnabled === false && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded">Exempt</span>
                )}
              </div>
              <p className={`text-sm font-mono font-medium ${employee.sssEnabled === false ? 'text-slate-400' : 'text-slate-900'}`}>
                {formatSSS(employee.sssNumber)}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">PhilHealth</p>
                {employee.philhealthEnabled === false && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded">Exempt</span>
                )}
              </div>
              <p className={`text-sm font-mono font-medium ${employee.philhealthEnabled === false ? 'text-slate-400' : 'text-slate-900'}`}>
                {formatPhilHealth(employee.philhealthNumber)}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Pag-IBIG HDMF</p>
                {employee.pagibigEnabled === false && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded">Exempt</span>
                )}
              </div>
              <p className={`text-sm font-mono font-medium ${employee.pagibigEnabled === false ? 'text-slate-400' : 'text-slate-900'}`}>
                {formatPagIbig(employee.pagibigNumber)}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">TIN (BIR)</p>
                {employee.tinEnabled === false && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded">Exempt</span>
                )}
              </div>
              <p className={`text-sm font-mono font-medium ${employee.tinEnabled === false ? 'text-slate-400' : 'text-slate-900'}`}>
                {employee.tinNumber || 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Date Started</p>
              <p className="text-sm font-medium text-slate-800">{formatDate(employee.dateStarted)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Date Resigned</p>
              <p className="text-sm font-medium text-slate-500">{employee.dateResigned ? formatDate(employee.dateResigned) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-0.5">Daily Rate</p>
              <p className="text-sm font-bold font-mono text-green-700">{formatCurrency(employee.dailyRate)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-0.5">Rest Day(s)</p>
              <p className="text-sm font-semibold text-indigo-900">
                {employee.restDays && employee.restDays.length > 0 ? employee.restDays.join(', ') : 'Sunday'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">Assigned Shift</p>
              <p className="text-sm font-semibold text-slate-800">
                {assignedShift?.name || 'Regular Day Shift'}
              </p>
              <span className="text-[11px] text-slate-500">
                {assignedShift ? `${assignedShift.startTime} – ${assignedShift.endTime} (${assignedShift.gracePeriodMinutes}m grace)` : '08:00 – 17:00 (5m grace)'}
              </span>
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onViewIDCard(employee)}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 font-medium flex items-center gap-1.5"
                id="view-id-badge-btn"
              >
                <IdCard className="w-3.5 h-3.5 text-blue-600" />
                Print ID Card
              </button>
              {onViewDTR && (
                <button
                  onClick={() => onViewDTR(employee)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 font-medium flex items-center gap-1.5"
                  id="view-dtr-history-btn"
                >
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  View DTR Logs
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded font-medium"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
