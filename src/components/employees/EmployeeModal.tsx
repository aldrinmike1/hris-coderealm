import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Employee, EmployeeStatus, UserRole } from '../../types';
import {
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Building,
  Shield,
  Clock,
  HeartHandshake,
  DollarSign,
  Fingerprint,
  FileBadge,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EmployeeModalProps {
  isOpen: boolean;
  employeeToEdit?: Employee | null;
  employee?: Employee | null;
  onClose: () => void;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  employeeToEdit: propEmployeeToEdit,
  employee: propEmployee,
  onClose,
}) => {
  const { addEmployee, updateEmployee, employees, currentUser, showToast, shifts } = useApp();
  const employeeToEdit = propEmployeeToEdit ?? propEmployee;

  const [activeSection, setActiveSection] = useState<'basic' | 'gov' | 'emergency' | 'work'>('basic');
  const [changeReason, setChangeReason] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [validationSummary, setValidationSummary] = useState<string[] | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    employeeNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    address: '',
    birthday: '',
    dateStarted: '',
    dateResigned: '',
    biometrixId: '',
    dailyRate: 850,
    status: 'active' as EmployeeStatus,
    role: 'staff' as UserRole,
    department: 'Engineering & IT',
    position: 'Staff Engineer',
    tinNumber: '',
    avatarUrl: '',
    employmentType: 'Regular' as Employee['employmentType'],
    emergencyName: '',
    emergencyRelationship: '',
    emergencyMobile: '',
    emergencyAddress: '',
    sssNumber: '',
    sssEnabled: true,
    philhealthNumber: '',
    philhealthEnabled: true,
    pagibigNumber: '',
    pagibigEnabled: true,
    tinEnabled: true,
    mlsDeduction: 0,
    restDays: ['Sunday'] as string[],
    shiftId: 'shift-regular',
  });

  // Helper to update individual field and clear its error
  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (validationErrors[key]) {
      setValidationErrors(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
    if (validationSummary) {
      setValidationSummary(null);
    }
  };

  // Populate employee data when editing or reset for new employee
  useEffect(() => {
    if (employeeToEdit) {
      setFormData({
        employeeNumber: employeeToEdit.employeeNumber || '',
        firstName: employeeToEdit.firstName || '',
        lastName: employeeToEdit.lastName || '',
        email: employeeToEdit.email || '',
        mobile: employeeToEdit.mobile || '',
        address: employeeToEdit.address || '',
        birthday: employeeToEdit.birthday || '',
        dateStarted: employeeToEdit.dateStarted || '',
        dateResigned: employeeToEdit.dateResigned || '',
        biometrixId: employeeToEdit.biometrixId || '',
        dailyRate: employeeToEdit.dailyRate || 850,
        status: employeeToEdit.status || 'active',
        role: employeeToEdit.role || 'staff',
        department: employeeToEdit.department || 'Operations & Logistics',
        position: employeeToEdit.position || 'Staff Associate',
        tinNumber: employeeToEdit.tinNumber || '',
        tinEnabled: employeeToEdit.tinEnabled !== undefined ? employeeToEdit.tinEnabled : true,
        avatarUrl: employeeToEdit.avatarUrl || '',
        employmentType: employeeToEdit.employmentType || 'Regular',
        emergencyName: employeeToEdit.emergencyContact?.name || '',
        emergencyRelationship: employeeToEdit.emergencyContact?.relationship || '',
        emergencyMobile: employeeToEdit.emergencyContact?.mobile || '',
        emergencyAddress: employeeToEdit.emergencyContact?.address || '',
        sssNumber: employeeToEdit.sssNumber || '',
        sssEnabled: employeeToEdit.sssEnabled !== undefined ? employeeToEdit.sssEnabled : true,
        philhealthNumber: employeeToEdit.philhealthNumber || '',
        philhealthEnabled: employeeToEdit.philhealthEnabled !== undefined ? employeeToEdit.philhealthEnabled : true,
        pagibigNumber: employeeToEdit.pagibigNumber || '',
        pagibigEnabled: employeeToEdit.pagibigEnabled !== undefined ? employeeToEdit.pagibigEnabled : true,
        mlsDeduction: employeeToEdit.mlsDeduction || 0,
        restDays: employeeToEdit.restDays && employeeToEdit.restDays.length > 0 ? employeeToEdit.restDays : ['Sunday'],
        shiftId: employeeToEdit.shiftId || (shifts.find(s => s.isDefault)?.id || shifts[0]?.id || 'shift-regular'),
      });
      setChangeReason('');
      setValidationErrors({});
      setValidationSummary(null);
    } else {
      const nextNum = employees.length + 1;
      const empNumStr = `EMP-2024-${nextNum.toString().padStart(3, '0')}`;
      const bioIdStr = `BIO-${(100 + nextNum).toString()}`;
      
      setFormData({
        employeeNumber: empNumStr,
        firstName: '',
        lastName: '',
        email: '',
        mobile: '0917-',
        address: '',
        birthday: '1995-01-01',
        dateStarted: new Date().toISOString().split('T')[0],
        dateResigned: '',
        biometrixId: bioIdStr,
        dailyRate: 850,
        status: 'active',
        role: 'staff',
        department: 'Operations & Logistics',
        position: 'Operations Staff',
        tinNumber: '',
        tinEnabled: true,
        avatarUrl: '',
        employmentType: 'Regular',
        emergencyName: '',
        emergencyRelationship: '',
        emergencyMobile: '0917-',
        emergencyAddress: '',
        sssNumber: '',
        sssEnabled: true,
        philhealthNumber: '',
        philhealthEnabled: true,
        pagibigNumber: '',
        pagibigEnabled: true,
        mlsDeduction: 0,
        restDays: ['Sunday'],
        shiftId: shifts.find(s => s.isDefault)?.id || shifts[0]?.id || 'shift-regular',
      });
      setChangeReason('');
      setValidationErrors({});
      setValidationSummary(null);
    }
  }, [employeeToEdit, employees.length, isOpen, shifts]);

  if (!isOpen) return null;

  // Validation function
  const validateForm = () => {
    const errors: Record<string, string> = {};
    const missingItems: { field: string; label: string; section: 'basic' | 'work' | 'gov' | 'emergency' }[] = [];

    if (!formData.employeeNumber.trim()) {
      errors.employeeNumber = 'Employee Number is required';
      missingItems.push({ field: 'employeeNumber', label: 'Employee Number', section: 'basic' });
    }
    if (!formData.biometrixId.trim()) {
      errors.biometrixId = 'Biometrix ID is required';
      missingItems.push({ field: 'biometrixId', label: 'Biometrix ID', section: 'basic' });
    }
    if (!formData.firstName.trim()) {
      errors.firstName = 'First Name is required';
      missingItems.push({ field: 'firstName', label: 'First Name', section: 'basic' });
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last Name is required';
      missingItems.push({ field: 'lastName', label: 'Last Name', section: 'basic' });
    }
    if (!formData.mobile.trim() || formData.mobile.trim() === '0917-') {
      errors.mobile = 'Mobile Number is required';
      missingItems.push({ field: 'mobile', label: 'Mobile Number', section: 'basic' });
    }
    if (!formData.birthday) {
      errors.birthday = 'Birthday is required';
      missingItems.push({ field: 'birthday', label: 'Birthday', section: 'basic' });
    }
    if (!formData.address.trim()) {
      errors.address = 'Residential Address is required';
      missingItems.push({ field: 'address', label: 'Residential Address', section: 'basic' });
    }
    if (!formData.position.trim()) {
      errors.position = 'Job Position / Title is required';
      missingItems.push({ field: 'position', label: 'Job Position', section: 'work' });
    }
    if (!formData.dailyRate || Number(formData.dailyRate) <= 0) {
      errors.dailyRate = 'Valid Daily Rate is required (min ₱300)';
      missingItems.push({ field: 'dailyRate', label: 'Daily Rate (₱)', section: 'work' });
    }
    if (!formData.dateStarted) {
      errors.dateStarted = 'Date Started is required';
      missingItems.push({ field: 'dateStarted', label: 'Date Started', section: 'work' });
    }
    if (!formData.emergencyName.trim()) {
      errors.emergencyName = 'Emergency Contact Name is required';
      missingItems.push({ field: 'emergencyName', label: 'Emergency Contact Name', section: 'emergency' });
    }
    if (!formData.emergencyRelationship.trim()) {
      errors.emergencyRelationship = 'Emergency Relationship is required';
      missingItems.push({ field: 'emergencyRelationship', label: 'Emergency Relationship', section: 'emergency' });
    }
    if (!formData.emergencyMobile.trim() || formData.emergencyMobile.trim() === '0917-') {
      errors.emergencyMobile = 'Emergency Contact Number is required';
      missingItems.push({ field: 'emergencyMobile', label: 'Emergency Contact Number', section: 'emergency' });
    }

    return { errors, missingItems };
  };

  const sectionHasErrors = (section: 'basic' | 'work' | 'gov' | 'emergency') => {
    return Object.keys(validationErrors).some(field => {
      if (section === 'basic') return ['employeeNumber', 'biometrixId', 'firstName', 'lastName', 'mobile', 'birthday', 'address'].includes(field);
      if (section === 'work') return ['position', 'dailyRate', 'dateStarted'].includes(field);
      if (section === 'emergency') return ['emergencyName', 'emergencyRelationship', 'emergencyMobile'].includes(field);
      return false;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { errors, missingItems } = validateForm();

    if (missingItems.length > 0) {
      setValidationErrors(errors);
      const labelsList = missingItems.map(m => m.label);
      setValidationSummary(labelsList);

      // Toast Notification
      showToast(
        `⚠️ Cannot save ${employeeToEdit ? 'changes' : 'employee'}: Please fill out required field(s): ${labelsList.join(', ')}`,
        'warning'
      );

      // Auto-switch to section of first missing field
      setActiveSection(missingItems[0].section);
      return;
    }

    setValidationErrors({});
    setValidationSummary(null);

    const payload = {
      employeeNumber: formData.employeeNumber.trim(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim() || `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}@hris.ph`,
      mobile: formData.mobile.trim(),
      address: formData.address.trim(),
      birthday: formData.birthday,
      emergencyContact: {
        name: formData.emergencyName.trim(),
        relationship: formData.emergencyRelationship.trim(),
        mobile: formData.emergencyMobile.trim(),
        address: formData.emergencyAddress.trim(),
      },
      sssNumber: formData.sssNumber.trim(),
      sssEnabled: formData.sssEnabled,
      philhealthNumber: formData.philhealthNumber.trim(),
      philhealthEnabled: formData.philhealthEnabled,
      pagibigNumber: formData.pagibigNumber.trim(),
      pagibigEnabled: formData.pagibigEnabled,
      tinNumber: formData.tinNumber.trim(),
      tinEnabled: formData.tinEnabled,
      mlsDeduction: employeeToEdit?.mlsDeduction || 0,
      dateStarted: formData.dateStarted,
      dateResigned: formData.dateResigned ? formData.dateResigned : null,
      biometrixId: formData.biometrixId.trim(),
      dailyRate: Number(formData.dailyRate) || 850,
      status: formData.status,
      role: formData.role,
      department: formData.department,
      position: formData.position,
      avatarUrl: formData.avatarUrl.trim() || (employeeToEdit?.avatarUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`),
      employmentType: formData.employmentType,
      restDays: formData.restDays && formData.restDays.length > 0 ? formData.restDays : ['Sunday'],
      shiftId: formData.shiftId,
    };

    if (employeeToEdit) {
      updateEmployee(employeeToEdit.id, payload, changeReason);
    } else {
      addEmployee(payload);
    }

    onClose();
  };

  const departments = [
    'Executive & Leadership',
    'Human Resources',
    'Finance & Accounting',
    'Engineering & IT',
    'Marketing & Sales',
    'Operations & Logistics',
    'Customer Support',
  ];

  return (
    <AnimatePresence>
      <div key="employee-form-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-8"
          id="employee-form-modal"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {employeeToEdit ? 'Edit Employee Record' : 'Register New Employee'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {employeeToEdit
                      ? `Updating record for ${employeeToEdit.firstName} ${employeeToEdit.lastName} (${employeeToEdit.employeeNumber})`
                      : 'Complete employee profile, government statutory numbers, rates, and biometric mapping'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                id="close-employee-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveSection('basic')}
              className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeSection === 'basic'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              id="emp-tab-basic"
            >
              <User className="w-3.5 h-3.5" />
              <span>1. Basic Profile</span>
              {sectionHasErrors('basic') && (
                <span className="ml-1 w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('work')}
              className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeSection === 'work'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              id="emp-tab-work"
            >
              <Building className="w-3.5 h-3.5" />
              <span>2. Employment & Rates</span>
              {sectionHasErrors('work') && (
                <span className="ml-1 w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('gov')}
              className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeSection === 'gov'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              id="emp-tab-gov"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>3. Government Contribution</span>
              {sectionHasErrors('gov') && (
                <span className="ml-1 w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('emergency')}
              className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeSection === 'emergency'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              id="emp-tab-emergency"
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>4. Emergency Contact</span>
              {sectionHasErrors('emergency') && (
                <span className="ml-1 w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
              )}
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} id="employee-profile-form">
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
              {/* Validation Summary Alert Banner */}
              {validationSummary && validationSummary.length > 0 && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs text-rose-900 space-y-2 animate-pulse" id="employee-validation-alert">
                  <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>Incomplete Profile: {validationSummary.length} Required Field(s) Missing</span>
                  </div>
                  <p className="text-rose-700 font-medium">
                    Please complete the following mandatory fields before saving:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {validationSummary.map((lbl, idx) => (
                      <span key={`missing-field-tag-${lbl}-${idx}`} className="px-2.5 py-1 bg-rose-100 border border-rose-300 rounded-lg text-rose-800 font-bold text-[11px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 1: BASIC INFORMATION */}
              {activeSection === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Employee Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.employeeNumber}
                        onChange={e => updateField('employeeNumber', e.target.value)}
                        placeholder="EMP-2024-001"
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-mono font-medium focus:ring-2 ${
                          validationErrors.employeeNumber
                            ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-rose-500'
                            : 'border-slate-300 focus:ring-indigo-500'
                        }`}
                        id="emp-number-input"
                      />
                      {validationErrors.employeeNumber && (
                        <span className="text-xs font-semibold text-rose-600 mt-1 block">⚠️ {validationErrors.employeeNumber}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Biometrix ID <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Fingerprint className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={formData.biometrixId}
                          onChange={e => updateField('biometrixId', e.target.value)}
                          placeholder="BIO-101"
                          className={`w-full pl-9 pr-3 py-2 border rounded-xl text-sm font-mono font-medium focus:ring-2 ${
                            validationErrors.biometrixId
                              ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-rose-500'
                              : 'border-slate-300 focus:ring-indigo-500'
                          }`}
                          id="emp-biometrix-input"
                        />
                      </div>
                      {validationErrors.biometrixId && (
                        <span className="text-xs font-semibold text-rose-600 mt-1 block">⚠️ {validationErrors.biometrixId}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        First Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={e => updateField('firstName', e.target.value)}
                        placeholder="Juan"
                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 ${
                          validationErrors.firstName
                            ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-rose-500'
                            : 'border-slate-300 focus:ring-indigo-500'
                        }`}
                        id="emp-firstname-input"
                      />
                      {validationErrors.firstName && (
                        <span className="text-xs font-semibold text-rose-600 mt-1 block">⚠️ {validationErrors.firstName}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Last Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={e => updateField('lastName', e.target.value)}
                        placeholder="Dela Cruz"
                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 ${
                          validationErrors.lastName
                            ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-rose-500'
                            : 'border-slate-300 focus:ring-indigo-500'
                        }`}
                        id="emp-lastname-input"
                      />
                      {validationErrors.lastName && (
                        <span className="text-xs font-semibold text-rose-600 mt-1 block">⚠️ {validationErrors.lastName}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={formData.mobile}
                          onChange={e => updateField('mobile', e.target.value)}
                          placeholder="0917-123-4567"
                          className={`w-full pl-9 pr-3 py-2 border rounded-xl text-sm focus:ring-2 ${
                            validationErrors.mobile
                              ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-rose-500'
                              : 'border-slate-300 focus:ring-indigo-500'
                          }`}
                          id="emp-mobile-input"
                        />
                      </div>
                      {validationErrors.mobile && (
                        <span className="text-xs font-semibold text-rose-600 mt-1 block">⚠️ {validationErrors.mobile}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Birthday <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="date"
                          value={formData.birthday}
                          onChange={e => updateField('birthday', e.target.value)}
                          className={`w-full pl-9 pr-3 py-2 border rounded-xl text-sm focus:ring-2 ${
                            validationErrors.birthday
                              ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-rose-500'
                              : 'border-slate-300 focus:ring-indigo-500'
                          }`}
                          id="emp-birthday-input"
                        />
                      </div>
                      {validationErrors.birthday && (
                        <span className="text-xs font-semibold text-rose-600 mt-1 block">⚠️ {validationErrors.birthday}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Complete Residential Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <textarea
                        rows={2}
                        value={formData.address}
                        onChange={e => updateField('address', e.target.value)}
                        placeholder="e.g. Unit 402, Sunshine Condominium, BGC, Taguig City, Metro Manila"
                        className={`w-full pl-9 pr-3 py-2 border rounded-xl text-sm focus:ring-2 ${
                          validationErrors.address
                            ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-rose-500'
                            : 'border-slate-300 focus:ring-indigo-500'
                        }`}
                        id="emp-address-input"
                      />
                    </div>
                    {validationErrors.address && (
                      <span className="text-xs font-semibold text-rose-600 mt-1 block">⚠️ {validationErrors.address}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => updateField('email', e.target.value)}
                        placeholder="juan.delacruz@company.ph"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        id="emp-email-input"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Avatar / Profile Photo URL
                      </label>
                      <input
                        type="text"
                        value={formData.avatarUrl}
                        onChange={e => updateField('avatarUrl', e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        id="emp-avatar-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: EMPLOYMENT & COMPENSATION */}
              {activeSection === 'work' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Department
                      </label>
                      <select
                        value={formData.department}
                        onChange={e => updateField('department', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        id="emp-dept-select"
                      >
                        {departments.map((d, dIdx) => (
                          <option key={`${d}-${dIdx}`} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Job Position / Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.position}
                        onChange={e => updateField('position', e.target.value)}
                        placeholder="e.g. Operations Specialist"
                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 ${
                          validationErrors.position
                            ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-rose-500'
                            : 'border-slate-300 focus:ring-indigo-500'
                        }`}
                        id="emp-position-input"
                      />
                      {validationErrors.position && (
                        <span className="text-xs font-semibold text-rose-600 mt-1 block">⚠️ {validationErrors.position}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Daily Rate (PHP ₱) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="text-sm font-bold text-slate-500 absolute left-3 top-2">₱</span>
                        <input
                          type="number"
                          step="0.01"
                          min="300"
                          value={formData.dailyRate}
                          onChange={e => updateField('dailyRate', parseFloat(e.target.value) || 0)}
                          placeholder="850.00"
                          className={`w-full pl-8 pr-3 py-2 border rounded-xl text-sm font-semibold focus:ring-2 ${
                            validationErrors.dailyRate
                              ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-rose-500'
                              : 'border-slate-300 focus:ring-indigo-500'
                          }`}
                          id="emp-dailyrate-input"
                        />
                      </div>
                      {validationErrors.dailyRate ? (
                        <span className="text-xs font-semibold text-rose-600 mt-1 block">⚠️ {validationErrors.dailyRate}</span>
                      ) : (
                        <span className="text-[11px] text-slate-500 mt-1 block">
                          Hourly rate: ₱{((formData.dailyRate || 0) / 8).toFixed(2)}/hr • Est. Monthly: ₱{((formData.dailyRate || 0) * 22).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Employment Status <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.status}
                        onChange={e => updateField('status', e.target.value as EmployeeStatus)}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                          formData.status === 'active'
                            ? 'border-emerald-300 bg-emerald-50/50 text-emerald-800'
                            : 'border-rose-300 bg-rose-50/50 text-rose-800'
                        }`}
                        id="emp-status-select"
                      >
                        <option value="active">Active (Currently Employed)</option>
                        <option value="inactive">Inactive / Separated / On Leave</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Date Started <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.dateStarted}
                        onChange={e => updateField('dateStarted', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 ${
                          validationErrors.dateStarted
                            ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-rose-500'
                            : 'border-slate-300 focus:ring-indigo-500'
                        }`}
                        id="emp-datestarted-input"
                      />
                      {validationErrors.dateStarted && (
                        <span className="text-xs font-semibold text-rose-600 mt-1 block">⚠️ {validationErrors.dateStarted}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Date Resigned / Separated
                      </label>
                      <input
                        type="date"
                        value={formData.dateResigned}
                        onChange={e => updateField('dateResigned', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        id="emp-dateresigned-input"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">Leave empty if currently active</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        System User Role <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.role}
                        onChange={e => updateField('role', e.target.value as UserRole)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        id="emp-role-select"
                      >
                        <option value="staff">Staff (Self-service DTR & Payslips)</option>
                        <option value="manager">Manager (Approve DTR, View Team)</option>
                        <option value="admin">Admin (Full Access & Payroll Release)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Employment Classification
                      </label>
                      <select
                        value={formData.employmentType}
                        onChange={e => updateField('employmentType', e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        id="emp-classification-select"
                      >
                        <option value="Regular">Regular Full-time</option>
                        <option value="Probationary">Probationary (6 mos)</option>
                        <option value="Contractual">Contractual / Project-based</option>
                        <option value="Part-time">Part-time</option>
                      </select>
                    </div>
                  </div>

                  {/* Assigned Work Shift Schedule */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Assigned Work Shift Schedule <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-medium text-slate-500">
                        Controls tardiness & late minute calculation
                      </span>
                    </div>

                    <div className="space-y-2">
                      <select
                        value={formData.shiftId}
                        onChange={e => updateField('shiftId', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        id="emp-shift-select"
                      >
                        {shifts.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.isDefault ? '(Default Shift)' : ''} — {s.startTime} to {s.endTime} ({s.gracePeriodMinutes}m grace)
                          </option>
                        ))}
                      </select>

                      {/* Informational Callout regarding selected shift */}
                      {(() => {
                        const selectedShift = shifts.find(s => s.id === formData.shiftId) || shifts[0];
                        if (!selectedShift) return null;
                        return (
                          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-900">
                                {selectedShift.name} ({selectedShift.startTime} – {selectedShift.endTime})
                              </p>
                              <p className="text-[11px] text-slate-600">
                                Grace period: <strong>{selectedShift.gracePeriodMinutes} minutes</strong>. Arrivals after {selectedShift.startTime} + {selectedShift.gracePeriodMinutes}m will accrue late minutes starting from {selectedShift.startTime}.
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Rest Day(s) Multi-select Configuration */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Scheduled Rest Day(s) <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-medium text-slate-500">
                        {formData.restDays && formData.restDays.length > 0
                          ? `${formData.restDays.length} day(s) selected (${formData.restDays.join(', ')})`
                          : 'Sunday (Default)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {[
                        { day: 'Sunday', label: 'Sun' },
                        { day: 'Monday', label: 'Mon' },
                        { day: 'Tuesday', label: 'Tue' },
                        { day: 'Wednesday', label: 'Wed' },
                        { day: 'Thursday', label: 'Thu' },
                        { day: 'Friday', label: 'Fri' },
                        { day: 'Saturday', label: 'Sat' },
                      ].map((d, dIdx) => {
                        const isSelected = (formData.restDays || ['Sunday']).includes(d.day);
                        return (
                          <button
                            key={`${d.day}-${dIdx}`}
                            type="button"
                            onClick={() => {
                              const current = formData.restDays || ['Sunday'];
                              const next = isSelected
                                ? current.filter(x => x !== d.day)
                                : [...current, d.day];
                              updateField('restDays', next.length > 0 ? next : ['Sunday']);
                            }}
                            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                            id={`rest-day-toggle-${d.day.toLowerCase()}`}
                          >
                            <span>{d.label}</span>
                            <span
                              className={`text-[9px] mt-0.5 font-normal ${
                                isSelected ? 'text-indigo-100' : 'text-slate-400'
                              }`}
                            >
                              {isSelected ? 'Rest' : 'Work'}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <p>
                        Used in DTR attendance and payroll. Work rendered on rest days computes as <strong>Rest Day / Work Day Off (WDO) with 130% rate</strong>.
                      </p>
                      <div className="flex gap-1.5 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => updateField('restDays', ['Sunday'])}
                          className="text-[10px] text-indigo-600 hover:underline font-semibold"
                        >
                          Sunday only
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => updateField('restDays', ['Saturday', 'Sunday'])}
                          className="text-[10px] text-indigo-600 hover:underline font-semibold"
                        >
                          Sat & Sun
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: GOVERNMENT CONTRIBUTION */}
              {activeSection === 'gov' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
                    <FileBadge className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Government Contribution & Tax Settings</p>
                      <p className="text-blue-700 mt-0.5">
                        Toggle each statutory ID on or off for this employee. When disabled/off, the deduction will <strong>not be calculated</strong> during payroll runs.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* SSS Number */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      formData.sssEnabled
                        ? 'bg-white border-slate-200 shadow-xs'
                        : 'bg-slate-50/80 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div>
                          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                            SSS Number
                          </label>
                          <span className="text-[11px] text-slate-500 font-normal">
                            Social Security System
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            formData.sssEnabled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {formData.sssEnabled ? 'Active' : 'Off / Exempt'}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={formData.sssEnabled}
                            onClick={() => updateField('sssEnabled', !formData.sssEnabled)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                              formData.sssEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                            }`}
                            id="toggle-sss-payroll"
                            title={formData.sssEnabled ? "Click to disable SSS calculation in payroll" : "Click to enable SSS calculation in payroll"}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                formData.sssEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={formData.sssNumber}
                        onChange={e => updateField('sssNumber', e.target.value)}
                        disabled={!formData.sssEnabled}
                        placeholder={formData.sssEnabled ? "34-1234567-8" : "Disabled — exempt from SSS calculation"}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-mono transition-colors ${
                          formData.sssEnabled
                            ? 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                            : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        id="emp-sss-input"
                      />
                      <p className="text-[10px] text-slate-500 mt-1.5">
                        {formData.sssEnabled
                          ? 'Calculated in cutoff payroll based on SSS contribution schedule.'
                          : 'Exempt — SSS deduction will not be calculated in payroll.'}
                      </p>
                    </div>

                    {/* PhilHealth Number */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      formData.philhealthEnabled
                        ? 'bg-white border-slate-200 shadow-xs'
                        : 'bg-slate-50/80 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div>
                          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                            PhilHealth Number
                          </label>
                          <span className="text-[11px] text-slate-500 font-normal">
                            Philippine Health Insurance
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            formData.philhealthEnabled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {formData.philhealthEnabled ? 'Active' : 'Off / Exempt'}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={formData.philhealthEnabled}
                            onClick={() => updateField('philhealthEnabled', !formData.philhealthEnabled)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                              formData.philhealthEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                            }`}
                            id="toggle-philhealth-payroll"
                            title={formData.philhealthEnabled ? "Click to disable PhilHealth calculation in payroll" : "Click to enable PhilHealth calculation in payroll"}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                formData.philhealthEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={formData.philhealthNumber}
                        onChange={e => updateField('philhealthNumber', e.target.value)}
                        disabled={!formData.philhealthEnabled}
                        placeholder={formData.philhealthEnabled ? "12-059283719-4" : "Disabled — exempt from PhilHealth calculation"}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-mono transition-colors ${
                          formData.philhealthEnabled
                            ? 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                            : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        id="emp-philhealth-input"
                      />
                      <p className="text-[10px] text-slate-500 mt-1.5">
                        {formData.philhealthEnabled
                          ? 'Calculated in cutoff payroll based on PhilHealth 5% premium rate.'
                          : 'Exempt — PhilHealth deduction will not be calculated in payroll.'}
                      </p>
                    </div>

                    {/* Pag-IBIG (HDMF) Number */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      formData.pagibigEnabled
                        ? 'bg-white border-slate-200 shadow-xs'
                        : 'bg-slate-50/80 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div>
                          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                            Pag-IBIG HDMF Number
                          </label>
                          <span className="text-[11px] text-slate-500 font-normal">
                            Home Development Mutual Fund
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            formData.pagibigEnabled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {formData.pagibigEnabled ? 'Active' : 'Off / Exempt'}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={formData.pagibigEnabled}
                            onClick={() => updateField('pagibigEnabled', !formData.pagibigEnabled)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                              formData.pagibigEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                            }`}
                            id="toggle-pagibig-payroll"
                            title={formData.pagibigEnabled ? "Click to disable Pag-IBIG calculation in payroll" : "Click to enable Pag-IBIG calculation in payroll"}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                formData.pagibigEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={formData.pagibigNumber}
                        onChange={e => updateField('pagibigNumber', e.target.value)}
                        disabled={!formData.pagibigEnabled}
                        placeholder={formData.pagibigEnabled ? "1284-9021-3482" : "Disabled — exempt from Pag-IBIG calculation"}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-mono transition-colors ${
                          formData.pagibigEnabled
                            ? 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                            : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        id="emp-pagibig-input"
                      />
                      <p className="text-[10px] text-slate-500 mt-1.5">
                        {formData.pagibigEnabled
                          ? 'Calculated in cutoff payroll (₱200/mo split or standard rate).'
                          : 'Exempt — Pag-IBIG deduction will not be calculated in payroll.'}
                      </p>
                    </div>

                    {/* TIN (Tax Identification Number) */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      formData.tinEnabled
                        ? 'bg-white border-slate-200 shadow-xs'
                        : 'bg-slate-50/80 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div>
                          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                            TIN
                          </label>
                          <span className="text-[11px] text-slate-500 font-normal">
                            Tax Identification Number (BIR)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            formData.tinEnabled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {formData.tinEnabled ? 'Active' : 'Off / Exempt'}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={formData.tinEnabled}
                            onClick={() => updateField('tinEnabled', !formData.tinEnabled)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                              formData.tinEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                            }`}
                            id="toggle-tin-payroll"
                            title={formData.tinEnabled ? "Click to disable withholding tax calculation in payroll" : "Click to enable withholding tax calculation in payroll"}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                formData.tinEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={formData.tinNumber}
                        onChange={e => updateField('tinNumber', e.target.value)}
                        disabled={!formData.tinEnabled}
                        placeholder={formData.tinEnabled ? "293-182-940-000" : "Disabled — exempt from tax calculation"}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-mono transition-colors ${
                          formData.tinEnabled
                            ? 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                            : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        id="emp-tin-input"
                      />
                      <p className="text-[10px] text-slate-500 mt-1.5">
                        {formData.tinEnabled
                          ? 'Used for BIR tax reporting & TRAIN Law withholding tax calculations.'
                          : 'Exempt — Withholding tax will not be calculated in payroll.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: EMERGENCY CONTACT DETAILS */}
              {activeSection === 'emergency' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                    <HeartHandshake className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Emergency Point of Contact</p>
                      <p className="text-amber-700 mt-0.5">
                        Designated person to reach out to in case of work injuries, medical incidents, or urgent notifications.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Contact Person Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.emergencyName}
                        onChange={e => updateField('emergencyName', e.target.value)}
                        placeholder="e.g. Maria Dela Cruz"
                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 ${
                          validationErrors.emergencyName
                            ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-rose-500'
                            : 'border-slate-300 focus:ring-indigo-500'
                        }`}
                        id="emp-emergency-name-input"
                      />
                      {validationErrors.emergencyName && (
                        <span className="text-xs font-semibold text-rose-600 mt-1 block">⚠️ {validationErrors.emergencyName}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Relationship <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.emergencyRelationship}
                        onChange={e => updateField('emergencyRelationship', e.target.value)}
                        placeholder="e.g. Spouse / Mother / Sibling"
                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 ${
                          validationErrors.emergencyRelationship
                            ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-rose-500'
                            : 'border-slate-300 focus:ring-indigo-500'
                        }`}
                        id="emp-emergency-rel-input"
                      />
                      {validationErrors.emergencyRelationship && (
                        <span className="text-xs font-semibold text-rose-600 mt-1 block">⚠️ {validationErrors.emergencyRelationship}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Emergency Contact Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={formData.emergencyMobile}
                          onChange={e => updateField('emergencyMobile', e.target.value)}
                          placeholder="0917-987-6543"
                          className={`w-full pl-9 pr-3 py-2 border rounded-xl text-sm focus:ring-2 ${
                            validationErrors.emergencyMobile
                              ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:ring-rose-500'
                              : 'border-slate-300 focus:ring-indigo-500'
                          }`}
                          id="emp-emergency-phone-input"
                        />
                      </div>
                      {validationErrors.emergencyMobile && (
                        <span className="text-xs font-semibold text-rose-600 mt-1 block">⚠️ {validationErrors.emergencyMobile}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Emergency Contact Address
                      </label>
                      <input
                        type="text"
                        value={formData.emergencyAddress}
                        onChange={e => updateField('emergencyAddress', e.target.value)}
                        placeholder="Same as employee or city address"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        id="emp-emergency-addr-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Audit Trail Note (Required for updates) */}
              {employeeToEdit && (
                <div className="pt-4 border-t border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Audit Trail Remarks / Reason for Change
                  </label>
                  <input
                    type="text"
                    value={changeReason}
                    onChange={e => setChangeReason(e.target.value)}
                    placeholder="e.g. Annual salary increase, department transfer, mobile number update..."
                    className="w-full px-3 py-2 border border-indigo-200 bg-indigo-50/30 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    id="emp-edit-reason-input"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Logged to system audit trail under actor: {currentUser.name} ({currentUser.role})
                  </span>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <div className="flex gap-2">
                {activeSection !== 'basic' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeSection === 'work') setActiveSection('basic');
                      if (activeSection === 'gov') setActiveSection('work');
                      if (activeSection === 'emergency') setActiveSection('gov');
                    }}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl"
                  >
                    Back
                  </button>
                )}
                {activeSection !== 'emergency' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeSection === 'basic') setActiveSection('work');
                      if (activeSection === 'work') setActiveSection('gov');
                      if (activeSection === 'gov') setActiveSection('emergency');
                    }}
                    className="px-3 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl"
                  >
                    Next Section →
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors"
                  id="cancel-employee-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors shadow-indigo-600/20"
                  id="save-employee-btn"
                >
                  {employeeToEdit ? 'Save Changes & Log Audit' : 'Create Employee Profile'}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
