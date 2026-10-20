import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  Save,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  DollarSign,
  Info,
  RotateCcw,
  Sparkles,
  Layers,
  Clock,
  CreditCard,
  Building,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Moon,
  ReceiptText,
  ToggleLeft,
  ToggleRight,
  HelpCircle,
  Eye,
  Plus,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Timer,
  Coffee,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkShift } from '../../types';

export const SettingsView: React.FC = () => {
  const {
    companyProfile,
    updateCompanyProfile,
    resetAllData,
    isAdmin,
    isManager,
    showToast,
    shifts,
    addShift,
    updateShift,
    deleteShift,
    setDefaultShift,
    employees,
  } = useApp();

  const [name, setName] = useState(companyProfile.name || '');
  const [address, setAddress] = useState(companyProfile.address || '');
  const [contactNumber, setContactNumber] = useState(companyProfile.contactNumber || '');
  const [email, setEmail] = useState(companyProfile.email || '');
  const [tin, setTin] = useState(companyProfile.tin || '');
  const [rdo, setRdo] = useState(companyProfile.rdo || '');
  const [logoUrl, setLogoUrl] = useState(companyProfile.logoUrl || '');
  const [enableLateDeduction, setEnableLateDeduction] = useState(companyProfile.enableLateDeduction !== false);
  const [enableNightShiftPay, setEnableNightShiftPay] = useState(companyProfile.enableNightShiftPay ?? false);
  const [enableWithholdingTax, setEnableWithholdingTax] = useState(companyProfile.enableWithholdingTax ?? false);

  // Shift Management Form State
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null);
  const [shiftForm, setShiftForm] = useState({
    name: '',
    startTime: '08:00',
    endTime: '17:00',
    gracePeriodMinutes: 5,
    breakMinutes: 60,
    description: '',
    isDefault: false,
  });
  const [shiftToDelete, setShiftToDelete] = useState<WorkShift | null>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(companyProfile.name || '');
    setAddress(companyProfile.address || '');
    setContactNumber(companyProfile.contactNumber || '');
    setEmail(companyProfile.email || '');
    setTin(companyProfile.tin || '');
    setRdo(companyProfile.rdo || '');
    setLogoUrl(companyProfile.logoUrl || '');
    setEnableLateDeduction(companyProfile.enableLateDeduction !== false);
    setEnableNightShiftPay(companyProfile.enableNightShiftPay ?? false);
    setEnableWithholdingTax(companyProfile.enableWithholdingTax ?? false);
  }, [companyProfile]);

  const handleFileUpload = (file: File) => {
    setLogoError(null);
    if (!file.type.startsWith('image/')) {
      setLogoError('Please upload a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoError('Image size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setLogoUrl(result);
      showToast('Company logo loaded. Click "Save Company Profile" to commit.', 'info');
    };
    reader.onerror = () => {
      setLogoError('Failed to read the image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    showToast('Company logo removed from preview.', 'info');
  };

  const handleLateDeductionToggle = () => {
    const nextVal = !enableLateDeduction;
    setEnableLateDeduction(nextVal);
    updateCompanyProfile({
      enableLateDeduction: nextVal,
    });
    if (nextVal) {
      showToast('Late Deduction enabled. Tardiness will now be deducted in payroll calculations.', 'success');
    } else {
      showToast('Late Deduction disabled. Tardiness is recorded in attendance but excluded from payroll deductions.', 'info');
    }
  };

  const handleNightShiftToggle = () => {
    const nextVal = !enableNightShiftPay;
    setEnableNightShiftPay(nextVal);
    // Instant save for convenience
    updateCompanyProfile({
      enableNightShiftPay: nextVal,
    });
    if (nextVal) {
      showToast('Night Shift Pay (10% NSD) turned ON. Payslips will now include night shift differential.', 'success');
    } else {
      showToast('Night Shift Pay turned OFF. Payslips will exclude night differential premium.', 'info');
    }
  };

  const handleWithholdingTaxToggle = () => {
    const nextVal = !enableWithholdingTax;
    setEnableWithholdingTax(nextVal);
    // Instant save for convenience
    updateCompanyProfile({
      enableWithholdingTax: nextVal,
    });
    if (nextVal) {
      showToast('Withholding Tax (BIR TRAIN Law) turned ON. The field is now visible on adjustment forms and payslips.', 'success');
    } else {
      showToast('Withholding Tax turned OFF (Disabled). The field is now hidden on adjustment forms and payslips.', 'info');
    }
  };

  const handleOpenAddShift = () => {
    setEditingShift(null);
    setShiftForm({
      name: '',
      startTime: '08:00',
      endTime: '17:00',
      gracePeriodMinutes: 5,
      breakMinutes: 60,
      description: '',
      isDefault: shifts.length === 0,
    });
    setIsShiftModalOpen(true);
  };

  const handleOpenEditShift = (shift: WorkShift) => {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      gracePeriodMinutes: shift.gracePeriodMinutes,
      breakMinutes: shift.breakMinutes || 60,
      description: shift.description || '',
      isDefault: !!shift.isDefault,
    });
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.name.trim()) {
      showToast('Shift name is required.', 'error');
      return;
    }
    if (!shiftForm.startTime || !shiftForm.endTime) {
      showToast('Start time and End time are required.', 'error');
      return;
    }

    if (editingShift) {
      updateShift(editingShift.id, {
        name: shiftForm.name.trim(),
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        gracePeriodMinutes: Number(shiftForm.gracePeriodMinutes) || 0,
        breakMinutes: Number(shiftForm.breakMinutes) || 0,
        description: shiftForm.description.trim() || undefined,
        isDefault: shiftForm.isDefault,
      });
    } else {
      addShift({
        name: shiftForm.name.trim(),
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        gracePeriodMinutes: Number(shiftForm.gracePeriodMinutes) || 0,
        breakMinutes: Number(shiftForm.breakMinutes) || 0,
        description: shiftForm.description.trim() || undefined,
        isDefault: shiftForm.isDefault,
      });
    }
    setIsShiftModalOpen(false);
    setEditingShift(null);
  };

  const handleDeleteShift = () => {
    if (!shiftToDelete) return;
    const success = deleteShift(shiftToDelete.id);
    if (success) {
      setShiftToDelete(null);
    }
  };

  const getShiftEmployeeCount = (shiftId: string, isDefault?: boolean) => {
    return employees.filter(e => {
      if (e.shiftId) {
        return e.shiftId === shiftId;
      }
      return isDefault;
    }).length;
  };

  const formatTimeLabel = (timeStr: string) => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr || '00';
    if (isNaN(h)) return timeStr;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH.toString().padStart(2, '0')}:${m} ${period}`;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Company Name is required.');
      return;
    }
    updateCompanyProfile({
      name: name.trim(),
      address: address.trim(),
      contactNumber: contactNumber.trim(),
      email: email.trim(),
      tin: tin.trim(),
      rdo: rdo.trim(),
      logoUrl: logoUrl || undefined,
      enableLateDeduction,
      enableNightShiftPay,
      enableWithholdingTax,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" id="settings-view-container">
      {/* Top Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">System & Company Settings</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage company profile, organization logo, statutory policies, and payroll calculation parameters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSaved && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Settings Saved
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS: COMPANY PROFILE & STATUTORY CONFIG FORM */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Company Profile & Branding</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Used across payslips, ID cards & DTR reports</span>
            </div>

            <div className="p-6 space-y-6">
              {/* COMPANY LOGO UPLOAD SECTION */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Company Logo
                </label>
                
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {/* Current Logo Preview Thumbnail */}
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center overflow-hidden shrink-0 relative group">
                    {logoUrl ? (
                      <>
                        <img
                          src={logoUrl}
                          alt="Company Logo Preview"
                          className="w-full h-full object-contain p-2"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-xs font-medium"
                          title="Remove Logo"
                          id="remove-logo-thumbnail-btn"
                        >
                          <Trash2 className="w-5 h-5 text-rose-300" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                        <span className="text-[10px] block font-medium">No Logo</span>
                      </div>
                    )}
                  </div>

                  {/* Drag-and-Drop & Click Upload Box */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 w-full border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-indigo-500 bg-indigo-50/50'
                        : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                    id="company-logo-dropzone"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                      onChange={handleFileChange}
                      className="hidden"
                      id="company-logo-file-input"
                    />

                    <UploadCloud className="w-7 h-7 mx-auto text-indigo-500 mb-1.5" />
                    <p className="text-xs font-semibold text-slate-800">
                      <span className="text-indigo-600 hover:underline">Click to upload</span> or drag and drop logo here
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      PNG, JPG, SVG, WebP up to 5MB (Recommended: High-resolution PNG or SVG)
                    </p>
                  </div>
                </div>

                {logoError && (
                  <p className="text-xs text-rose-600 font-medium mt-2 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    {logoError}
                  </p>
                )}

                {logoUrl && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
                    <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Custom company logo attached
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 text-[11px]"
                      id="remove-company-logo-btn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove Logo
                    </button>
                  </div>
                )}
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Enterprise Holdings Corp. (PH)"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    id="settings-company-name-input"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Official registered corporate trade name.</p>
              </div>

              {/* Company Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Company Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <textarea
                    required
                    rows={3}
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="e.g. 32nd Floor, Corporate Tower, Bonifacio Global City, Taguig City, Philippines"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                    id="settings-company-address-input"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Full business address displayed in official payslip headers.</p>
              </div>

              {/* Supplementary Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Contact Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={contactNumber}
                      onChange={e => setContactNumber(e.target.value)}
                      placeholder="+63 (02) 8888-7000"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50/50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      id="settings-contact-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    HR / Payroll Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="hr@enterprise-holdings.ph"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50/50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      id="settings-email-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Company TIN
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={tin}
                      onChange={e => setTin(e.target.value)}
                      placeholder="008-123-456-000"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50/50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      id="settings-tin-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    BIR RDO Branch
                  </label>
                  <input
                    type="text"
                    value={rdo}
                    onChange={e => setRdo(e.target.value)}
                    placeholder="RDO 044 - Taguig"
                    className="w-full px-3 py-2 bg-slate-50/50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    id="settings-rdo-input"
                  />
                </div>
              </div>
            </div>

            {/* Form Action Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Changes are automatically logged in the audit trail.
              </span>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
                id="save-company-profile-btn"
              >
                <Save className="w-4 h-4" />
                Save Company Profile
              </button>
            </div>
          </form>

          {/* WORK SHIFT SCHEDULES & TARDINESS RULES */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5" id="work-shifts-settings-section">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Work Shift Schedules & Tardiness Rules</h3>
                  <p className="text-xs text-slate-500">Configure shifts and grace periods assigned to employees to compute tardiness.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenAddShift}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors self-start sm:self-auto"
                id="add-new-shift-btn"
              >
                <Plus className="w-4 h-4" />
                <span>Add Shift</span>
              </button>
            </div>

            {/* List of configured shifts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {shifts.map(shift => {
                const assignedCount = getShiftEmployeeCount(shift.id, shift.isDefault);
                return (
                  <div
                    key={shift.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      shift.isDefault
                        ? 'border-indigo-300 bg-indigo-50/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{shift.name}</h4>
                          {shift.isDefault && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditShift(shift)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit Shift"
                            aria-label={`Edit ${shift.name}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setShiftToDelete(shift)}
                            disabled={shifts.length <= 1}
                            className={`p-1.5 rounded-lg transition-colors ${
                              shifts.length <= 1
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title={shifts.length <= 1 ? 'Cannot delete the only shift' : 'Delete Shift'}
                            aria-label={`Delete ${shift.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {shift.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{shift.description}</p>
                      )}

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                            Working Hours
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            {formatTimeLabel(shift.startTime)} – {formatTimeLabel(shift.endTime)}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                            Grace Period
                          </span>
                          <span className="font-mono font-bold text-amber-700">
                            {shift.gracePeriodMinutes} mins grace
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold text-slate-700">{assignedCount}</span> {assignedCount === 1 ? 'employee' : 'employees'} assigned
                        </span>
                        <span className="text-slate-400">
                          Break: {shift.breakMinutes || 60}m
                        </span>
                      </div>
                    </div>

                    {!shift.isDefault && (
                      <div className="mt-3 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setDefaultShift(shift.id)}
                          className="w-full py-1 text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/60 rounded-md transition-colors"
                        >
                          Set as Default Shift
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>Shift Assignment:</strong> Employees can be assigned to any of these shifts under the <em>Employment & Rates</em> tab in the Employee Directory. Lateness is computed starting when an employee punches in after the shift start time plus the grace period.
              </span>
            </div>
          </div>

          {/* ACTIVE PAYROLL & STATUTORY CONFIGURATION */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5" id="statutory-configuration-section">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Active Payroll & Statutory Configuration</h3>
                  <p className="text-xs text-slate-500">Philippine Labor Code statutory rules, cut-off schedules, and premium pay settings.</p>
                </div>
              </div>
            </div>

            {/* LATE DEDUCTION CONFIGURATION CARD - Placed BEFORE Night Shift Pay */}
            <div className={`p-4 rounded-2xl border transition-all ${
              enableLateDeduction
                ? 'bg-indigo-50/70 border-indigo-200 shadow-xs'
                : 'bg-slate-50 border-slate-200'
            }`} id="late-deduction-config-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    enableLateDeduction
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">Late / Tardiness Payroll Deduction</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        enableLateDeduction
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {enableLateDeduction ? 'ACTIVE / DEDUCTED' : 'DISABLED (EXCLUDED)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {enableLateDeduction
                        ? 'Late arrival minutes are calculated against employee shifts and deducted from payroll earnings at the standard minute rate.'
                        : 'Late deduction is turned OFF. Tardiness minutes are recorded in attendance logs and timesheets for tracking, but will NOT be calculated or deducted from employee pay.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enableLateDeduction}
                    onClick={handleLateDeductionToggle}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      enableLateDeduction ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                    id="toggle-late-deduction-btn"
                  >
                    <span className="sr-only">Toggle Late Deduction</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        enableLateDeduction ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-xs font-bold text-slate-700 min-w-[50px]">
                    {enableLateDeduction ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* NIGHT SHIFT PAY CONFIGURATION CARD */}
            <div className={`p-4 rounded-2xl border transition-all ${
              enableNightShiftPay
                ? 'bg-indigo-50/70 border-indigo-200 shadow-xs'
                : 'bg-slate-50 border-slate-200'
            }`} id="night-shift-pay-config-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    enableNightShiftPay
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">Night Shift Pay (Night Differential)</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        enableNightShiftPay
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {enableNightShiftPay ? 'ACTIVE / ON' : 'OFF (Default)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {enableNightShiftPay
                        ? 'Night Shift Differential (10% premium) is included in payslip calculations for hours worked between 10:00 PM and 6:00 AM (Article 86, Labor Code of the Philippines).'
                        : 'By default, Night Shift Differential is turned OFF. Night shift hours are recorded in DTR attendance logs but excluded from compensation computation on payslips.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enableNightShiftPay}
                    onClick={handleNightShiftToggle}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      enableNightShiftPay ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                    id="toggle-night-shift-pay-btn"
                  >
                    <span className="sr-only">Toggle Night Shift Pay</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        enableNightShiftPay ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-xs font-bold text-slate-700 min-w-[50px]">
                    {enableNightShiftPay ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* WITHHOLDING TAX CONFIGURATION CARD */}
            <div className={`p-4 rounded-2xl border transition-all ${
              enableWithholdingTax
                ? 'bg-indigo-50/70 border-indigo-200 shadow-xs'
                : 'bg-slate-50 border-slate-200'
            }`} id="withholding-tax-config-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    enableWithholdingTax
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    <ReceiptText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">Withholding Tax (BIR TRAIN Law)</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        enableWithholdingTax
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {enableWithholdingTax ? 'ACTIVE / ON' : 'Disabled (Default)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {enableWithholdingTax
                        ? 'BIR Withholding Tax deduction is enabled. The Withholding Tax field is visible on the manual adjustment form and payslips, and applied during payroll calculation.'
                        : 'By default, Withholding Tax is Disabled. The Withholding Tax field is hidden on the manual adjustment form and employee payslips.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enableWithholdingTax}
                    onClick={handleWithholdingTaxToggle}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      enableWithholdingTax ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                    id="toggle-withholding-tax-btn"
                  >
                    <span className="sr-only">Toggle Withholding Tax</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        enableWithholdingTax ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-xs font-bold text-slate-700 min-w-[50px]">
                    {enableWithholdingTax ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Statutory Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Cut-off Cycle</span>
                </div>
                <p className="font-semibold text-slate-800">Weekly Cycle</p>
                <p className="text-[11px] text-slate-500">
                  Saturday to Friday cut-off. Payday is every Saturday (e.g. Aug 15–21 → Aug 22).
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Gov't Contributions</span>
                </div>
                <p className="font-semibold text-slate-800">Conditional Deduction</p>
                <p className="text-[11px] text-slate-500">
                  SSS, PhilHealth & Pag-IBIG are optional. Blank fields are exempt from deduction (₱0.00).
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Allowances</span>
                </div>
                <p className="font-semibold text-slate-800">Clean Base Calculation</p>
                <p className="text-[11px] text-slate-500">
                  Rice & Meal Subsidy and Transportation allowance excluded from standard auto-computation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE DOCUMENT PREVIEW & CONTROLS */}
        <div className="space-y-6">
          {/* Live Payslip Header Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Live Document Header Preview
              </span>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-100">
                Payslip Preview
              </span>
            </div>

            <div className="p-4 bg-slate-900 rounded-xl text-white space-y-3">
              <div className="flex items-start gap-2.5">
                {logoUrl ? (
                  <div className="h-9 w-12 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                    <img
                      src={logoUrl}
                      alt="Company Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-white uppercase truncate">
                    {name || 'YOUR COMPANY NAME'}
                  </h4>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight mt-0.5">
                    {address || 'Company Address line will appear here.'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400">
                <span>TIN: {tin || '000-000-000-000'}</span>
                <span>Tel: {contactNumber || '+63 2 0000 0000'}</span>
              </div>
            </div>

            {/* Late Deduction Active Pill Indicator in Preview */}
            <div className="flex items-center justify-between text-[11px] p-2 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-600 font-medium">Late Deduction:</span>
              <span className={`font-bold px-2 py-0.5 rounded ${
                enableLateDeduction ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {enableLateDeduction ? 'Deducted in Payroll' : 'Excluded (No Deduct)'}
              </span>
            </div>

            {/* Night Shift Pay Active Pill Indicator in Preview */}
            <div className="flex items-center justify-between text-[11px] p-2 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-600 font-medium">Night Shift Pay (NSD):</span>
              <span className={`font-bold px-2 py-0.5 rounded ${
                enableNightShiftPay ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {enableNightShiftPay ? 'Included (+10%)' : 'Excluded (Off)'}
              </span>
            </div>

            {/* Withholding Tax Active Pill Indicator in Preview */}
            <div className="flex items-center justify-between text-[11px] p-2 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-600 font-medium">Withholding Tax (BIR):</span>
              <span className={`font-bold px-2 py-0.5 rounded ${
                enableWithholdingTax ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {enableWithholdingTax ? 'Shown & Active' : 'Disabled (Hidden)'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Updates to the Company Logo, Name, and Address apply immediately to all printed payslips, employee ID cards, and generated reports.
            </p>
          </div>

          {/* Database & Reset Controls */}
          {isAdmin && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  Demo Data Management
                </h4>
              </div>

              <p className="text-xs text-slate-600">
                Reset all employees, biometric punch drafts, weekly DTRs, and payroll records to the initial Philippine seed data.
              </p>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="w-full py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  id="reset-demo-database-btn"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Database to Default Seed
                </button>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-rose-900">Are you sure you want to reset?</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetAllData();
                        setConfirmReset(false);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
                      id="confirm-reset-btn"
                    >
                      Yes, Reset Data
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SHIFT SCHEDULE CREATE / EDIT MODAL */}
      <AnimatePresence>
        {isShiftModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-300"
              id="shift-editor-modal"
            >
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {editingShift ? 'Edit Work Shift Schedule' : 'Create New Work Shift'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Configure daily hours and grace period for tardiness.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveShift} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Shift Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shiftForm.name}
                    onChange={e => setShiftForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Regular Day Shift (08:00 AM - 05:00 PM)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                    id="shift-name-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Start Time <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={shiftForm.startTime}
                      onChange={e => setShiftForm(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      id="shift-start-time-input"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {formatTimeLabel(shiftForm.startTime)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      End Time <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={shiftForm.endTime}
                      onChange={e => setShiftForm(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      id="shift-end-time-input"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {formatTimeLabel(shiftForm.endTime)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Grace Period (Minutes) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={shiftForm.gracePeriodMinutes}
                      onChange={e => setShiftForm(prev => ({ ...prev, gracePeriodMinutes: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      id="shift-grace-period-input"
                    />
                    <span className="text-[10px] text-amber-600 mt-1 block font-medium">
                      Late if arrival &gt; {shiftForm.gracePeriodMinutes} mins past start
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Break (Minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="180"
                      value={shiftForm.breakMinutes}
                      onChange={e => setShiftForm(prev => ({ ...prev, breakMinutes: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      id="shift-break-minutes-input"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Standard unpaid meal break
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Description / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={shiftForm.description}
                    onChange={e => setShiftForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g. Standard 8-hour work day with 1 hour lunch break."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    id="shift-desc-input"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <input
                    type="checkbox"
                    id="shift-is-default-checkbox"
                    checked={shiftForm.isDefault}
                    onChange={e => setShiftForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <label htmlFor="shift-is-default-checkbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Set as company default shift (automatically assigned to newly enrolled employees)
                  </label>
                </div>

                {/* Footer buttons */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsShiftModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    id="save-shift-btn"
                  >
                    {editingShift ? 'Save Shift Changes' : 'Create Shift'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE SHIFT CONFIRMATION MODAL */}
      <AnimatePresence>
        {shiftToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-300 space-y-4"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Delete Work Shift?</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Are you sure you want to delete <strong>{shiftToDelete.name}</strong>?
                  {getShiftEmployeeCount(shiftToDelete.id, shiftToDelete.isDefault) > 0 && (
                    <span className="block text-rose-600 font-semibold mt-1">
                      ⚠️ {getShiftEmployeeCount(shiftToDelete.id, shiftToDelete.isDefault)} employee(s) are currently assigned to this shift and will fall back to the default shift.
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShiftToDelete(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteShift}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
                  id="confirm-delete-shift-btn"
                >
                  Delete Shift
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
