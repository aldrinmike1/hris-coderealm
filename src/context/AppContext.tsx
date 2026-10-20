import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  Employee,
  DTRRecord,
  DTRDraftRecord,
  PayPeriod,
  Payslip,
  AuditLogEntry,
  CurrentUser,
  FieldDiff,
  AuditAction,
  AuditModule,
  UserRole,
  CompanyProfile,
  ThirteenthMonthRecord,
  ThirteenthMonthItem,
  SystemUser,
  WorkShift,
  EmployeeDeduction,
  DeductionLedgerEntry,
  DeductionType,
  DeductionStatus,
} from '../types';
import {
  INITIAL_CURRENT_USER,
  INITIAL_SYSTEM_USERS,
  INITIAL_EMPLOYEES,
  INITIAL_DTR_RECORDS,
  INITIAL_PAY_PERIODS,
  INITIAL_PAYSLIPS,
  INITIAL_AUDIT_LOGS,
  INITIAL_COMPANY_PROFILE,
  INITIAL_THIRTEENTH_MONTH_RECORDS,
  INITIAL_WORK_SHIFTS,
  INITIAL_DEDUCTIONS,
  generateSampleDTR,
} from '../data/initialData';
import { calculateDTRMetrics, generateEmployeePayslip, calculateLateMinutes } from '../utils/calculations';
import {
  parseRawBiometricsText,
  buildDraftDTRRecords,
  calculatePunchMetrics,
  evaluateDTRAnomalies,
  SAMPLE_BIOMETRIC_DATA_CSV,
} from '../utils/biometricsParser';

interface AppContextType {
  currentUser: CurrentUser;
  setCurrentUser: (user: CurrentUser) => void;
  systemUsers: SystemUser[];
  isAuthenticated: boolean;
  employees: Employee[];
  dtrRecords: DTRRecord[];
  dtrDrafts: DTRDraftRecord[];
  payPeriods: PayPeriod[];
  payslips: Payslip[];
  auditLogs: AuditLogEntry[];
  
  // Authentication & System Users
  login: (email: string, password?: string) => { success: boolean; message?: string };
  logout: () => void;
  addSystemUser: (userData: Omit<SystemUser, 'id'>) => SystemUser;
  updateSystemUser: (id: string, updates: Partial<SystemUser>) => void;
  deleteSystemUser: (id: string) => boolean;
  assignUserRole: (id: string, role: 'super admin' | 'admin' | 'manager' | 'staff') => void;

  // Role permission helpers
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  
  // Employee actions
  addEmployee: (employeeData: Omit<Employee, 'id'>) => Employee;
  updateEmployee: (id: string, updates: Partial<Employee>, changeReason?: string) => void;
  deleteEmployee: (id: string) => void;
  
  // DTR actions
  punchClock: (employeeId: string, type: 'IN' | 'OUT', customTime?: string, customDate?: string) => DTRRecord;
  updateDTRRecord: (id: string, updates: Partial<DTRRecord>, adjustmentReason: string) => void;
  batchUpdateDTRRecords?: (records: DTRRecord[], adjustmentReason?: string) => void;
  generateBulkDTR: (startDate: string, endDate: string, employeeIds?: string[]) => void;
  
  // Biometrics & DTR Draft Actions
  importBiometricPunches: (csvText: string) => { importedCount: number; anomalyCount: number };
  updateDraftRecord: (draftId: string, updates: Partial<DTRDraftRecord>) => void;
  validateDraftRecord: (draftId: string) => void;
  rejectDraftRecord: (draftId: string, reason?: string) => void;
  commitDraftsToDTR: (draftIds?: string[]) => { committedCount: number };
  clearDrafts: () => void;
  quickLoadSampleBiometrics: () => { importedCount: number; anomalyCount: number };
  
  // Payroll actions
  generatePayrollForPeriod: (payPeriodId: string, periodOverride?: PayPeriod, silent?: boolean) => void;
  clearCutoff: (payPeriodId: string) => void;
  deletePayPeriod: (payPeriodId: string) => void;
  deletePayslip: (payslipId: string) => void;
  deletePayslips: (payslipIds: string[]) => void;
  updatePayPeriod: (payPeriodId: string, updates: Partial<PayPeriod>) => void;
  updatePayPeriodStatus: (payPeriodId: string, status: PayPeriod['status']) => void;
  updatePayslip: (payslipId: string, updates: Partial<Payslip>, editReason?: string) => void;
  createPayPeriod: (period: Omit<PayPeriod, 'id' | 'totalGrossPay' | 'totalDeductions' | 'totalNetPay' | 'processedEmployeesCount' | 'createdAt'>) => PayPeriod;
  
  // 13th Month Pay actions
  thirteenthMonthRecords: ThirteenthMonthRecord[];
  generateThirteenthMonthPay: (year: number, customPayoutDate?: string) => ThirteenthMonthRecord;
  approveThirteenthMonthPay: (year: number) => void;
  deleteThirteenthMonthRecord: (year: number) => void;

  // Deductions & Loans actions
  employeeDeductions: EmployeeDeduction[];
  addEmployeeDeduction: (data: {
    employeeId: string;
    description: string;
    amount: number;
    interest?: number;
    interestType?: 'fixed' | 'percentage';
    interestRate?: number;
    date: string;
    type: DeductionType;
    cutoffDeductionAmount: number;
    notes?: string;
    deductionId?: string;
  }) => EmployeeDeduction;
  updateEmployeeDeduction: (id: string, updates: Partial<EmployeeDeduction>) => void;
  deleteEmployeeDeduction: (id: string) => void;
  recordDeductionPayment: (
    deductionId: string,
    payment: {
      amount: number;
      date: string;
      reference?: string;
      description?: string;
      remarks?: string;
      type?: 'PAYMENT' | 'CUTOFF_DEDUCTION';
      payslipId?: string;
      payPeriodId?: string;
      isManual?: boolean;
    }
  ) => void;
  deleteDeductionLedgerEntry: (deductionId: string, entryId: string) => void;
  getEmployeeDeductions: (employeeId: string) => EmployeeDeduction[];
  
  // Audit logging
  logAudit: (data: {
    action: AuditAction;
    module: AuditModule;
    targetId: string;
    targetName: string;
    description: string;
    changes?: FieldDiff[];
  }) => void;
  
  // Work Shift Schedules & Late Rules
  shifts: WorkShift[];
  addShift: (shiftData: Omit<WorkShift, 'id'>) => WorkShift;
  updateShift: (id: string, updates: Partial<WorkShift>) => void;
  deleteShift: (id: string) => boolean;
  setDefaultShift: (id: string) => void;
  getEmployeeShift: (employee: Employee | string | undefined) => WorkShift;

  // Utility & Company Settings
  companyProfile: CompanyProfile;
  updateCompanyProfile: (profile: Partial<CompanyProfile>) => void;
  resetAllData: () => void;
  toast: { message: string; type: 'success' | 'info' | 'error' | 'warning'; isOpen: boolean };
  toastMessage: { text: string; type: 'success' | 'info' | 'error' | 'warning' } | null;
  showToast: (text: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  hideToast: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'hris_current_user_weekly_v1',
  SYSTEM_USERS: 'hris_system_users_weekly_v1',
  IS_AUTHENTICATED: 'hris_is_authenticated_weekly_v1',
  EMPLOYEES: 'hris_employees_weekly_v1',
  SHIFTS: 'hris_work_shifts_weekly_v1',
  DTR: 'hris_dtr_weekly_v1',
  DTR_DRAFTS: 'hris_dtr_drafts_weekly_v1',
  PAY_PERIODS: 'hris_pay_periods_weekly_v1',
  PAYSLIPS: 'hris_payslips_weekly_v1',
  AUDIT: 'hris_audit_logs_weekly_v1',
  COMPANY_PROFILE: 'hris_company_profile_weekly_v1',
  THIRTEENTH_MONTH: 'hris_13th_month_weekly_v1',
  DEDUCTIONS: 'hris_employee_deductions_weekly_v1',
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load state from localStorage or initial seed
  const [currentUser, setCurrentUserState] = useState<CurrentUser>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    return saved ? JSON.parse(saved) : INITIAL_CURRENT_USER;
  });

  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SYSTEM_USERS);
    return saved ? JSON.parse(saved) : INITIAL_SYSTEM_USERS;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED);
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [shifts, setShifts] = useState<WorkShift[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SHIFTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load shifts from localStorage', e);
    }
    return INITIAL_WORK_SHIFTS;
  });

  const [dtrRecords, setDtrRecords] = useState<DTRRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DTR);
    return saved ? JSON.parse(saved) : INITIAL_DTR_RECORDS;
  });

  const [dtrDrafts, setDtrDrafts] = useState<DTRDraftRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DTR_DRAFTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((d: DTRDraftRecord) => d.status !== 'COMMITTED')
            .map((d: DTRDraftRecord) => {
              // Automatically sanitize and re-evaluate anomalies so stale warnings (e.g. 5 punches on an edited 6 or 4 punch log) are resolved
              if (d.isEdited || d.status === 'VALIDATED') {
                const cleanAnomalies = evaluateDTRAnomalies({
                  rawPunches: d.rawPunches || [],
                  punchPairs: d.punchPairs || [],
                  totalHours: d.totalHours || 0,
                  hasMatchedEmployee: Boolean(d.employeeId),
                  biometrixPersonId: d.biometrixPersonId,
                  isEdited: true,
                });
                return {
                  ...d,
                  anomalies: cleanAnomalies,
                  status: cleanAnomalies.some(a => a.severity === 'error') ? 'PENDING' : d.status,
                };
              }
              return d;
            });
        }
      } catch (e) {
        console.error('Failed to parse saved drafts', e);
      }
    }
    // Preload draft records from the sample biometric data
    const initialRaw = parseRawBiometricsText(SAMPLE_BIOMETRIC_DATA_CSV);
    return buildDraftDTRRecords(initialRaw, INITIAL_EMPLOYEES);
  });

  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAY_PERIODS);
    return saved ? JSON.parse(saved) : INITIAL_PAY_PERIODS;
  });

  const [payslips, setPayslips] = useState<Payslip[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYSLIPS);
    return saved ? JSON.parse(saved) : INITIAL_PAYSLIPS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COMPANY_PROFILE);
    return saved ? JSON.parse(saved) : INITIAL_COMPANY_PROFILE;
  });

  const [thirteenthMonthRecords, setThirteenthMonthRecords] = useState<ThirteenthMonthRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THIRTEENTH_MONTH);
    return saved ? JSON.parse(saved) : INITIAL_THIRTEENTH_MONTH_RECORDS;
  });

  const [employeeDeductions, setEmployeeDeductions] = useState<EmployeeDeduction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEDUCTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved deductions', e);
    }
    return INITIAL_DEDUCTIONS;
  });

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' | 'warning' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === text ? null : prev));
    }, 3500);
  }, []);

  const hideToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const toast = {
    message: toastMessage?.text || '',
    type: toastMessage?.type || 'info',
    isOpen: !!toastMessage,
  };

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SYSTEM_USERS, JSON.stringify(systemUsers));
  }, [systemUsers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, JSON.stringify(isAuthenticated));
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
  }, [shifts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DTR, JSON.stringify(dtrRecords));
  }, [dtrRecords]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DTR_DRAFTS, JSON.stringify(dtrDrafts));
  }, [dtrDrafts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAY_PERIODS, JSON.stringify(payPeriods));
  }, [payPeriods]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYSLIPS, JSON.stringify(payslips));
  }, [payslips]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMPANY_PROFILE, JSON.stringify(companyProfile));
  }, [companyProfile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THIRTEENTH_MONTH, JSON.stringify(thirteenthMonthRecords));
  }, [thirteenthMonthRecords]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DEDUCTIONS, JSON.stringify(employeeDeductions));
  }, [employeeDeductions]);

  // Log Audit Entry Helper
  const logAudit = useCallback((data: {
    action: AuditAction;
    module: AuditModule;
    targetId: string;
    targetName: string;
    description: string;
    changes?: FieldDiff[];
  }) => {
    const newEntry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      action: data.action,
      module: data.module,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      targetId: data.targetId,
      targetName: data.targetName,
      description: data.description,
      changes: data.changes || [],
    };

    setAuditLogs(prev => [newEntry, ...prev]);
  }, [currentUser]);

  const setCurrentUser = useCallback((user: CurrentUser) => {
    setCurrentUserState(user);
    logAudit({
      action: 'LOGIN',
      module: 'AUTH',
      targetId: user.id,
      targetName: `${user.name} (${user.role.toUpperCase()})`,
      description: `User authenticated / switched session to ${user.name} with ${user.role} role.`,
    });
    showToast(`Logged in as ${user.name} (${user.role.toUpperCase()})`, 'info');
  }, [logAudit, showToast]);

  // Authentication Actions
  const login = useCallback((email: string, password?: string) => {
    const input = email.trim().toLowerCase();
    const userMatch = systemUsers.find(
      u => u.email.toLowerCase() === input || u.name.toLowerCase() === input || u.id.toLowerCase() === input
    );

    if (!userMatch) {
      showToast('Invalid username or email. Account not found.', 'error');
      return { success: false, message: 'Invalid username or email. Account not found.' };
    }

    if (userMatch.status === 'inactive') {
      showToast('This account has been disabled. Please contact a Super Admin.', 'error');
      return { success: false, message: 'This account has been disabled.' };
    }

    if (password && userMatch.password && userMatch.password !== password) {
      showToast('Incorrect password.', 'error');
      return { success: false, message: 'Incorrect password.' };
    }

    const newCurrentUser: CurrentUser = {
      id: userMatch.id,
      name: userMatch.name,
      email: userMatch.email,
      role: userMatch.role,
      department: userMatch.department,
      position: userMatch.position,
      avatarUrl: userMatch.avatarUrl,
    };

    setCurrentUserState(newCurrentUser);
    setIsAuthenticated(true);

    const now = new Date().toISOString();
    setSystemUsers(prev => prev.map(u => u.id === userMatch.id ? { ...u, lastLoginAt: now } : u));

    logAudit({
      action: 'LOGIN',
      module: 'AUTH',
      targetId: userMatch.id,
      targetName: userMatch.name,
      description: `User authenticated as ${userMatch.name} (${userMatch.role}).`,
    });

    showToast(`Welcome back, ${userMatch.name}!`, 'success');
    return { success: true };
  }, [systemUsers, logAudit, showToast]);

  const logout = useCallback(() => {
    logAudit({
      action: 'LOGIN',
      module: 'AUTH',
      targetId: currentUser.id,
      targetName: currentUser.name,
      description: `User ${currentUser.name} logged out.`,
    });
    setIsAuthenticated(false);
    showToast('Logged out of system session.', 'info');
  }, [currentUser, logAudit, showToast]);

  // System User Management Actions
  const addSystemUser = useCallback((userData: Omit<SystemUser, 'id'>): SystemUser => {
    const id = `usr-${Date.now()}`;
    const newUser: SystemUser = {
      ...userData,
      id,
      createdAt: new Date().toISOString(),
    };

    setSystemUsers(prev => [newUser, ...prev]);

    logAudit({
      action: 'CREATE',
      module: 'SYSTEM',
      targetId: newUser.id,
      targetName: newUser.name,
      description: `Created System User account "${newUser.name}" (${newUser.email}) with role [${newUser.role}].`,
    });

    showToast(`System User "${newUser.name}" created successfully.`);
    return newUser;
  }, [logAudit, showToast]);

  const updateSystemUser = useCallback((id: string, updates: Partial<SystemUser>) => {
    setSystemUsers(prev => {
      const target = prev.find(u => u.id === id);
      if (!target) return prev;

      const updated = { ...target, ...updates };

      if (id === currentUser.id) {
        setCurrentUserState(prevUser => ({
          ...prevUser,
          name: updated.name ?? prevUser.name,
          email: updated.email ?? prevUser.email,
          role: updated.role ?? prevUser.role,
          department: updated.department ?? prevUser.department,
          position: updated.position ?? prevUser.position,
          avatarUrl: updated.avatarUrl ?? prevUser.avatarUrl,
        }));
      }

      return prev.map(u => u.id === id ? updated : u);
    });

    logAudit({
      action: 'UPDATE',
      module: 'SYSTEM',
      targetId: id,
      targetName: updates.name || id,
      description: `Updated System User account details (${Object.keys(updates).join(', ')}).`,
    });

    showToast('System User updated successfully.');
  }, [currentUser.id, logAudit, showToast]);

  const deleteSystemUser = useCallback((id: string): boolean => {
    if (id === currentUser.id) {
      showToast('Cannot delete your own active system user account.', 'error');
      return false;
    }

    const target = systemUsers.find(u => u.id === id);
    if (!target) return false;

    if (target.role === 'super admin' || target.role === 'super_admin') {
      const activeSuperAdmins = systemUsers.filter(
        u => (u.role === 'super admin' || u.role === 'super_admin') && u.status === 'active'
      );
      if (activeSuperAdmins.length <= 1) {
        showToast('Cannot delete the last remaining Super Admin account.', 'error');
        return false;
      }
    }

    setSystemUsers(prev => prev.filter(u => u.id !== id));

    logAudit({
      action: 'DELETE',
      module: 'SYSTEM',
      targetId: id,
      targetName: target.name,
      description: `Deleted System User account "${target.name}" (${target.email}).`,
    });

    showToast(`System User "${target.name}" deleted successfully.`);
    return true;
  }, [currentUser.id, systemUsers, logAudit, showToast]);

  const assignUserRole = useCallback((id: string, role: 'super admin' | 'admin' | 'manager' | 'staff') => {
    updateSystemUser(id, { role });
    showToast(`Assigned role [${role}] to system user.`);
  }, [updateSystemUser, showToast]);

  // Role Permissions
  const isSuperAdmin = currentUser.role === 'super admin' || currentUser.role === 'super_admin';
  const isAdmin = isSuperAdmin || currentUser.role === 'admin';
  const isManager = currentUser.role === 'manager';
  const isStaff = currentUser.role === 'staff';
  const hasRole = useCallback((roles: UserRole[]) => roles.includes(currentUser.role), [currentUser.role]);

  // EMPLOYEE CRUD
  const addEmployee = useCallback((employeeData: Omit<Employee, 'id'>): Employee => {
    const id = `emp-${Date.now()}`;
    const newEmployee: Employee = { ...employeeData, id };
    
    setEmployees(prev => [newEmployee, ...prev]);

    const changes: FieldDiff[] = Object.keys(employeeData).map(k => ({
      field: k,
      fieldLabel: k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      oldValue: null,
      newValue: (employeeData as any)[k] !== undefined && (employeeData as any)[k] !== null 
        ? typeof (employeeData as any)[k] === 'object' 
          ? JSON.stringify((employeeData as any)[k]) 
          : (employeeData as any)[k] 
        : '',
    }));

    logAudit({
      action: 'CREATE',
      module: 'EMPLOYEE',
      targetId: newEmployee.id,
      targetName: `${newEmployee.employeeNumber} - ${newEmployee.firstName} ${newEmployee.lastName}`,
      description: `Created new employee profile for ${newEmployee.firstName} ${newEmployee.lastName} (${newEmployee.position}).`,
      changes,
    });

    showToast(`Employee ${newEmployee.firstName} ${newEmployee.lastName} added successfully!`);
    return newEmployee;
  }, [logAudit, showToast]);

  const updateEmployee = useCallback((id: string, updates: Partial<Employee>, changeReason?: string) => {
    setEmployees(prev => {
      const existing = prev.find(e => e.id === id);
      if (!existing) return prev;

      const diffs: FieldDiff[] = [];
      (Object.keys(updates) as (keyof Employee)[]).forEach(k => {
        const oldVal = existing[k];
        const newVal = updates[k];
        
        // Deep compare emergencyContact or objects
        const isDifferent = typeof oldVal === 'object' 
          ? JSON.stringify(oldVal) !== JSON.stringify(newVal)
          : oldVal !== newVal;

        if (isDifferent && newVal !== undefined) {
          diffs.push({
            field: k,
            fieldLabel: k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            oldValue: typeof oldVal === 'object' && oldVal !== null ? JSON.stringify(oldVal) : (oldVal ?? '—'),
            newValue: typeof newVal === 'object' && newVal !== null ? JSON.stringify(newVal) : (newVal ?? '—'),
          });
        }
      });

      const updated = { ...existing, ...updates };

      if (diffs.length > 0) {
        logAudit({
          action: updates.status && updates.status !== existing.status ? 'STATUS_CHANGE' : 'UPDATE',
          module: 'EMPLOYEE',
          targetId: updated.id,
          targetName: `${updated.employeeNumber} - ${updated.firstName} ${updated.lastName}`,
          description: changeReason 
            ? `Updated employee info: ${changeReason}`
            : `Updated ${diffs.length} field(s) on ${updated.firstName} ${updated.lastName}'s record.`,
          changes: diffs,
        });
      }

      return prev.map(e => (e.id === id ? updated : e));
    });

    showToast('Employee information updated!');
  }, [logAudit, showToast]);

  const deleteEmployee = useCallback((id: string) => {
    setEmployees(prev => {
      const target = prev.find(e => e.id === id);
      if (!target) return prev;

      logAudit({
        action: 'DELETE',
        module: 'EMPLOYEE',
        targetId: target.id,
        targetName: `${target.employeeNumber} - ${target.firstName} ${target.lastName}`,
        description: `Deleted employee profile for ${target.firstName} ${target.lastName}.`,
      });

      return prev.filter(e => e.id !== id);
    });

    showToast('Employee removed from records.', 'warning');
  }, [logAudit, showToast]);

  // SHIFT MANAGEMENT ACTIONS
  const getEmployeeShift = useCallback((empOrId: Employee | string | undefined): WorkShift => {
    let emp: Employee | undefined;
    if (typeof empOrId === 'string') {
      emp = employees.find(e => e.id === empOrId || e.employeeNumber === empOrId);
    } else {
      emp = empOrId;
    }

    if (emp && emp.shiftId) {
      const matched = shifts.find(s => s.id === emp!.shiftId);
      if (matched) return matched;
    }

    const defaultShift = shifts.find(s => s.isDefault) || shifts[0] || INITIAL_WORK_SHIFTS[0];
    return defaultShift;
  }, [employees, shifts]);

  const addShift = useCallback((shiftData: Omit<WorkShift, 'id'>): WorkShift => {
    const newId = `shift-${Date.now().toString(36)}`;
    const isFirst = shifts.length === 0;
    const shouldBeDefault = Boolean(shiftData.isDefault || isFirst);

    let updatedShifts = shifts;
    if (shouldBeDefault) {
      updatedShifts = shifts.map(s => ({ ...s, isDefault: false }));
    }

    const newShift: WorkShift = {
      ...shiftData,
      id: newId,
      isDefault: shouldBeDefault,
    };

    setShifts([...updatedShifts, newShift]);
    logAudit({
      action: 'CREATE',
      module: 'SETTINGS',
      targetId: newId,
      targetName: newShift.name,
      description: `Created new work shift "${newShift.name}" (${newShift.startTime} - ${newShift.endTime}, grace: ${newShift.gracePeriodMinutes}m)`,
    });
    showToast(`Work Shift "${newShift.name}" created successfully.`, 'success');
    return newShift;
  }, [shifts, logAudit, showToast]);

  const updateShift = useCallback((id: string, updates: Partial<WorkShift>) => {
    setShifts(prev => {
      let next = [...prev];
      if (updates.isDefault) {
        next = next.map(s => ({ ...s, isDefault: s.id === id }));
      }
      return next.map(s => (s.id === id ? { ...s, ...updates } : s));
    });
    logAudit({
      action: 'UPDATE',
      module: 'SETTINGS',
      targetId: id,
      targetName: updates.name || id,
      description: `Updated work shift schedule "${updates.name || id}"`,
    });
    showToast('Shift schedule updated successfully.', 'success');
  }, [logAudit, showToast]);

  const deleteShift = useCallback((id: string): boolean => {
    if (shifts.length <= 1) {
      showToast('Cannot delete the only remaining shift schedule.', 'error');
      return false;
    }
    const shiftToDelete = shifts.find(s => s.id === id);
    if (!shiftToDelete) return false;

    const remaining = shifts.filter(s => s.id !== id);
    if (shiftToDelete.isDefault && remaining.length > 0) {
      remaining[0].isDefault = true;
    }

    // Reassign employees that had this deleted shift to the default shift
    const fallbackDefaultId = remaining.find(s => s.isDefault)?.id || remaining[0].id;
    setEmployees(prev => prev.map(e => (e.shiftId === id ? { ...e, shiftId: fallbackDefaultId } : e)));

    setShifts(remaining);
    logAudit({
      action: 'DELETE',
      module: 'SETTINGS',
      targetId: id,
      targetName: shiftToDelete.name,
      description: `Deleted work shift schedule "${shiftToDelete.name}". Reassigned affected employees to default shift.`,
    });
    showToast(`Shift "${shiftToDelete.name}" deleted. Assigned employees migrated to default shift.`, 'info');
    return true;
  }, [shifts, logAudit, showToast]);

  const setDefaultShift = useCallback((id: string) => {
    setShifts(prev => prev.map(s => ({ ...s, isDefault: s.id === id })));
    const target = shifts.find(s => s.id === id);
    if (target) {
      logAudit({
        action: 'UPDATE',
        module: 'SETTINGS',
        targetId: id,
        targetName: target.name,
        description: `Set "${target.name}" as the company default shift`,
      });
      showToast(`"${target.name}" set as the default company shift.`, 'success');
    }
  }, [shifts, logAudit, showToast]);

  // DTR ACTIONS
  const punchClock = useCallback((employeeId: string, type: 'IN' | 'OUT', customTime?: string, customDate?: string): DTRRecord => {
    const emp = employees.find(e => e.id === employeeId);
    const now = new Date();
    const dateStr = customDate || now.toISOString().split('T')[0];
    const timeStr = customTime || `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    let updatedRecord: DTRRecord;

    setDtrRecords(prev => {
      const existingIdx = prev.findIndex(r => r.employeeId === employeeId && r.date === dateStr);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = days[new Date(dateStr).getDay()];

      let currentRec: DTRRecord;

      if (existingIdx >= 0) {
        currentRec = { ...prev[existingIdx] };
      } else {
        currentRec = {
          id: `DTR-${employeeId}-${dateStr}`,
          employeeId,
          employeeNumber: emp?.employeeNumber || '',
          employeeName: emp ? `${emp.firstName} ${emp.lastName}` : '',
          date: dateStr,
          dayOfWeek,
          dayType: (new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6) ? 'Rest Day' : 'Regular Working Day',
          timeIn: null,
          timeOut: null,
          regularHours: 0,
          lateMinutes: 0,
          undertimeMinutes: 0,
          overtimeHours: 0,
          nightDiffHours: 0,
          status: 'Present',
          source: 'Web Punch',
        };
      }

      const prevTimeIn = currentRec.timeIn;
      const prevTimeOut = currentRec.timeOut;

      if (type === 'IN') {
        currentRec.timeIn = timeStr;
      } else {
        currentRec.timeOut = timeStr;
      }

      // Recompute metrics
      const metrics = calculateDTRMetrics(currentRec.timeIn, currentRec.timeOut, "08:00", "17:00", currentRec.dayType);
      currentRec = {
        ...currentRec,
        regularHours: metrics.regularHours,
        lateMinutes: metrics.lateMinutes,
        undertimeMinutes: metrics.undertimeMinutes,
        overtimeHours: metrics.overtimeHours,
        status: metrics.status,
        lastModifiedBy: currentUser.name,
        lastModifiedAt: new Date().toISOString(),
      };

      updatedRecord = currentRec;

      const diffs: FieldDiff[] = [];
      if (type === 'IN') {
        diffs.push({ field: 'timeIn', fieldLabel: 'Time In', oldValue: prevTimeIn, newValue: timeStr });
      } else {
        diffs.push({ field: 'timeOut', fieldLabel: 'Time Out', oldValue: prevTimeOut, newValue: timeStr });
      }

      logAudit({
        action: 'DTR_PUNCH',
        module: 'DTR',
        targetId: currentRec.id,
        targetName: `${currentRec.employeeName} (${dateStr})`,
        description: `Punch ${type} recorded at ${timeStr} for ${currentRec.employeeName} on ${dateStr}.`,
        changes: diffs,
      });

      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = currentRec;
        return next;
      } else {
        return [currentRec, ...prev];
      }
    });

    showToast(`Punch ${type} registered at ${timeStr} for ${emp?.firstName || 'employee'}`);
    return updatedRecord!;
  }, [employees, currentUser, logAudit, showToast]);

  const updateDTRRecord = useCallback((id: string, updates: Partial<DTRRecord>, adjustmentReason: string) => {
    setDtrRecords(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx < 0) return prev;

      const existing = prev[idx];
      const timeIn = updates.timeIn !== undefined ? updates.timeIn : existing.timeIn;
      const timeOut = updates.timeOut !== undefined ? updates.timeOut : existing.timeOut;
      const dayType = updates.dayType !== undefined ? updates.dayType : existing.dayType;

      const metrics = calculateDTRMetrics(timeIn, timeOut, "08:00", "17:00", dayType);

      const updated: DTRRecord = {
        ...existing,
        ...updates,
        regularHours: updates.regularHours !== undefined ? updates.regularHours : metrics.regularHours,
        lateMinutes: updates.lateMinutes !== undefined ? updates.lateMinutes : metrics.lateMinutes,
        undertimeMinutes: updates.undertimeMinutes !== undefined ? updates.undertimeMinutes : metrics.undertimeMinutes,
        overtimeHours: updates.overtimeHours !== undefined ? updates.overtimeHours : metrics.overtimeHours,
        status: updates.status !== undefined ? updates.status : metrics.status,
        remarks: adjustmentReason ? `${adjustmentReason} (Adjusted by ${currentUser.name})` : existing.remarks,
        source: 'Adjustment',
        lastModifiedBy: currentUser.name,
        lastModifiedAt: new Date().toISOString(),
      };

      const diffs: FieldDiff[] = [];
      (Object.keys(updates) as (keyof DTRRecord)[]).forEach(k => {
        if (existing[k] !== updated[k]) {
          diffs.push({
            field: k,
            fieldLabel: k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            oldValue: (existing as any)[k] ?? '—',
            newValue: (updated as any)[k] ?? '—',
          });
        }
      });

      logAudit({
        action: 'DTR_ADJUSTMENT',
        module: 'DTR',
        targetId: updated.id,
        targetName: `${updated.employeeName} (${updated.date})`,
        description: `DTR Manual Adjustment: ${adjustmentReason || 'Updated timecard parameters'}.`,
        changes: diffs,
      });

      const next = [...prev];
      next[idx] = updated;
      return next;
    });

    showToast('DTR Record updated successfully!');
  }, [currentUser, logAudit, showToast]);

  const batchUpdateDTRRecords = useCallback((recordsToUpsert: DTRRecord[], adjustmentReason?: string) => {
    if (!recordsToUpsert || recordsToUpsert.length === 0) return;

    setDtrRecords(prev => {
      const upsertMap = new Map(recordsToUpsert.map(r => [r.id, r]));
      const empDateMap = new Map(recordsToUpsert.map(r => [`${r.employeeId}__${r.date}`, r]));

      const updatedExisting = prev.map(existing => {
        const byId = upsertMap.get(existing.id);
        if (byId) {
          upsertMap.delete(existing.id);
          empDateMap.delete(`${existing.employeeId}__${existing.date}`);
          return {
            ...existing,
            ...byId,
            lastModifiedBy: currentUser.name,
            lastModifiedAt: new Date().toISOString(),
          };
        }
        const byEmpDate = empDateMap.get(`${existing.employeeId}__${existing.date}`);
        if (byEmpDate) {
          upsertMap.delete(byEmpDate.id);
          empDateMap.delete(`${existing.employeeId}__${existing.date}`);
          return {
            ...existing,
            ...byEmpDate,
            lastModifiedBy: currentUser.name,
            lastModifiedAt: new Date().toISOString(),
          };
        }
        return existing;
      });

      // Add remaining new records
      const remainingNew = Array.from(upsertMap.values());
      return [...remainingNew, ...updatedExisting];
    });

    logAudit({
      action: 'DTR_ADJUSTMENT',
      module: 'DTR',
      targetId: `BATCH-${Date.now()}`,
      targetName: `Attendance Adjustments (${recordsToUpsert.length} records)`,
      description: adjustmentReason || `Updated ${recordsToUpsert.length} attendance record(s) during payslip adjustment.`,
    });
  }, [currentUser, logAudit]);

  const generateBulkDTR = useCallback((startDate: string, endDate: string, employeeIds?: string[]) => {
    const targetEmps = employeeIds && employeeIds.length > 0 
      ? employees.filter(e => employeeIds.includes(e.id))
      : employees.filter(e => e.status === 'active');

    const generated = generateSampleDTR(targetEmps, startDate, endDate);

    setDtrRecords(prev => {
      // Filter out overlapping IDs
      const generatedIds = new Set(generated.map(g => g.id));
      const remaining = prev.filter(p => !generatedIds.has(p.id));
      return [...generated, ...remaining];
    });

    logAudit({
      action: 'DTR_PUNCH',
      module: 'DTR',
      targetId: `BULK-${startDate}-${endDate}`,
      targetName: `Bulk Biometrics Sync (${startDate} to ${endDate})`,
      description: `Generated/Synchronized ${generated.length} biometric DTR logs for ${targetEmps.length} active employees.`,
    });

    showToast(`Generated ${generated.length} DTR attendance records!`);
  }, [employees, logAudit, showToast]);

  // BIOMETRICS & DTR DRAFT ACTIONS
  const importBiometricPunches = useCallback((csvText: string) => {
    const rawRows = parseRawBiometricsText(csvText);
    if (rawRows.length === 0) {
      showToast('No valid biometric attendance records found in file/text.', 'error');
      return { importedCount: 0, anomalyCount: 0 };
    }

    const newDrafts = buildDraftDTRRecords(rawRows, employees);
    const anomalyCount = newDrafts.filter(d => d.anomalies.length > 0).length;

    setDtrDrafts(prev => {
      // Merge: replace drafts with same (personId + date)
      const newKeys = new Set(newDrafts.map(d => `${d.biometrixPersonId}__${d.date}`));
      const kept = prev.filter(p => !newKeys.has(`${p.biometrixPersonId}__${p.date}`));
      return [...newDrafts, ...kept];
    });

    logAudit({
      action: 'DTR_PUNCH',
      module: 'DTR',
      targetId: `BIO-IMPORT-${Date.now()}`,
      targetName: `Biometrics Attendance Parser (${newDrafts.length} day logs)`,
      description: `Imported ${rawRows.length} raw punches into ${newDrafts.length} draft daily records. Identified ${anomalyCount} records with validation anomalies.`,
    });

    showToast(`Parsed ${rawRows.length} biometric logs into ${newDrafts.length} drafts (${anomalyCount} need review).`);
    return { importedCount: newDrafts.length, anomalyCount };
  }, [employees, logAudit, showToast]);

  const updateDraftRecord = useCallback((draftId: string, updates: Partial<DTRDraftRecord>) => {
    setDtrDrafts(prev => {
      const idx = prev.findIndex(d => d.id === draftId);
      if (idx < 0) return prev;

      const existing = prev[idx];
      const punchPairs = updates.punchPairs || existing.punchPairs;
      const metrics = calculatePunchMetrics(punchPairs);
      const rawPunches = updates.rawPunches || existing.rawPunches || [];
      const totalHours = updates.totalHours !== undefined ? updates.totalHours : metrics.totalHours;
      const matchedEmp = updates.employeeId || existing.employeeId;

      // Re-evaluate anomalies accurately based on current punches & data
      const evaluatedAnomalies = updates.anomalies !== undefined
        ? updates.anomalies
        : evaluateDTRAnomalies({
            rawPunches,
            punchPairs,
            totalHours,
            hasMatchedEmployee: Boolean(matchedEmp),
            biometrixPersonId: existing.biometrixPersonId,
            isEdited: true,
          });

      const hasErrors = evaluatedAnomalies.some(a => a.severity === 'error');
      const hasAnyAnomaly = evaluatedAnomalies.length > 0;

      // Only allow VALIDATED if there are no errors
      let finalStatus = updates.status !== undefined
        ? (updates.status === 'VALIDATED' && hasErrors ? 'PENDING' : updates.status)
        : (hasAnyAnomaly ? 'PENDING' : 'VALIDATED');

      const updated: DTRDraftRecord = {
        ...existing,
        ...updates,
        rawPunches,
        punchPairs,
        totalHours,
        totalMinutes: updates.totalMinutes !== undefined ? updates.totalMinutes : metrics.totalMinutes,
        overtimeHours: updates.overtimeHours !== undefined ? updates.overtimeHours : metrics.overtimeHours,
        undertimeMinutes: updates.undertimeMinutes !== undefined ? updates.undertimeMinutes : metrics.undertimeMinutes,
        undertimeHours: updates.undertimeHours !== undefined ? updates.undertimeHours : metrics.undertimeHours,
        lateMinutes: updates.lateMinutes !== undefined ? updates.lateMinutes : (existing.lateMinutes !== undefined ? existing.lateMinutes : 0),
        anomalies: evaluatedAnomalies,
        status: finalStatus,
        isEdited: true,
      };

      const next = [...prev];
      next[idx] = updated;
      return next;
    });
  }, []);

  const validateDraftRecord = useCallback((draftId: string) => {
    let validated = false;
    let anomalyMsg = '';
    setDtrDrafts(prev => prev.map(d => {
      if (d.id !== draftId) return d;
      const hasErrors = d.anomalies.some(a => a.severity === 'error');
      if (hasErrors) {
        anomalyMsg = d.anomalies[0].message;
        return d;
      }
      validated = true;
      return { ...d, status: 'VALIDATED' };
    }));

    if (validated) {
      showToast('Draft record validated and approved for official DTR.', 'success');
    } else if (anomalyMsg) {
      showToast(`Cannot approve incomplete record: ${anomalyMsg}`, 'error');
    }
  }, [showToast]);

  const rejectDraftRecord = useCallback((draftId: string, reason: string = 'Rejected during supervisor verification') => {
    setDtrDrafts(prev => prev.map(d => (d.id === draftId ? { ...d, status: 'REJECTED', rejectionReason: reason } : d)));
    showToast('Draft record rejected.', 'warning');
  }, [showToast]);

  const commitDraftsToDTR = useCallback((draftIds?: string[]) => {
    const targetDrafts = dtrDrafts.filter(d => {
      if (d.status === 'REJECTED' || d.status === 'COMMITTED') return false;
      if (draftIds && draftIds.length > 0) {
        return draftIds.includes(d.id);
      }
      return true; // Commit all active drafts (pending or validated)
    });

    if (targetDrafts.length === 0) {
      showToast('No eligible draft records to commit to DTR.', 'warning');
      return { committedCount: 0 };
    }

    const newDTRRecords: DTRRecord[] = targetDrafts.map(draft => {
      const emp = employees.find(e => e.id === draft.employeeId || e.employeeNumber === draft.employeeNumber || e.biometrixId === draft.biometrixPersonId);
      
      const firstIn = draft.punchPairs[0]?.timeIn || draft.rawPunches[0] || null;
      const lastPair = draft.punchPairs[draft.punchPairs.length - 1];
      const lastOut = lastPair?.timeOut || (draft.rawPunches.length > 1 ? draft.rawPunches[draft.rawPunches.length - 1] : null);

      const d = new Date(draft.date + 'T00:00:00');
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = !isNaN(d.getTime()) ? dayNames[d.getDay()] : draft.dayOfWeek;
      const empRestDays = (emp?.restDays && emp.restDays.length > 0) ? emp.restDays : ['Sunday'];
      const isRestDay = empRestDays.includes(dayName);

      const empShift = getEmployeeShift(emp);
      let calculatedLate = 0;
      if (draft.lateMinutes !== undefined) {
        calculatedLate = draft.lateMinutes;
      } else if (firstIn) {
        calculatedLate = calculateLateMinutes(firstIn, empShift.startTime, empShift.gracePeriodMinutes);
      }

      return {
        id: `DTR-${emp?.id || draft.biometrixPersonId}-${draft.date}`,
        employeeId: emp?.id || draft.employeeId || `UNKNOWN-${draft.biometrixPersonId}`,
        employeeNumber: emp?.employeeNumber || draft.employeeNumber || draft.biometrixPersonId,
        biometrixId: emp?.biometrixId || draft.biometrixId || draft.biometrixPersonId,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : draft.employeeName,
        date: draft.date,
        dayOfWeek: draft.dayOfWeek,
        dayType: draft.dayType || (isRestDay ? 'Rest Day' : 'Regular Working Day'),
        timeIn: firstIn,
        timeOut: lastOut,
        punchPairs: draft.punchPairs,
        rawPunches: draft.rawPunches,
        regularHours: Math.min(8, draft.totalHours),
        totalHours: draft.totalHours,
        lateMinutes: calculatedLate,
        undertimeMinutes: draft.undertimeMinutes,
        undertimeHours: draft.undertimeHours,
        overtimeHours: draft.overtimeHours,
        nightDiffHours: 0,
        status: draft.totalHours >= 4 ? 'Present' : draft.totalHours > 0 ? 'Half Day' : 'Absent',
        source: 'Biometrics',
        remarks: draft.anomalies.length > 0 ? `Verified from Draft (${draft.anomalies.map(a => a.type).join(', ')})` : 'Imported from Biometrics',
        lastModifiedBy: currentUser.name,
        lastModifiedAt: new Date().toISOString(),
      };
    });

    // Merge into dtrRecords
    setDtrRecords(prev => {
      const newKeys = new Set(newDTRRecords.map(r => `${r.employeeId}__${r.date}`));
      const remaining = prev.filter(r => !newKeys.has(`${r.employeeId}__${r.date}`));
      return [...newDTRRecords, ...remaining];
    });

    // Remove committed drafts from draft staging (they are now in official DTR)
    const committedIds = new Set(targetDrafts.map(d => d.id));
    setDtrDrafts(prev => prev.filter(d => !committedIds.has(d.id)));

    logAudit({
      action: 'DTR_BIOMETRIC_IMPORT',
      module: 'DTR',
      targetId: `COMMIT-${Date.now()}`,
      targetName: `Committed ${newDTRRecords.length} Draft Attendance Records to Official DTR`,
      description: `Finalized and committed ${newDTRRecords.length} validated attendance entries into official employee timesheets.`,
    });

    showToast(`Successfully committed ${newDTRRecords.length} records to official DTR!`, 'success');
    return { committedCount: newDTRRecords.length };
  }, [dtrDrafts, employees, currentUser, logAudit, showToast]);

  const clearDrafts = useCallback(() => {
    setDtrDrafts([]);
    localStorage.removeItem(STORAGE_KEYS.DTR_DRAFTS);
    showToast('All DTR draft records cleared.', 'info');
  }, [showToast]);

  const quickLoadSampleBiometrics = useCallback(() => {
    return importBiometricPunches(SAMPLE_BIOMETRIC_DATA_CSV);
  }, [importBiometricPunches]);

  // PAYROLL ACTIONS
  const generatePayrollForPeriod = useCallback((payPeriodId: string, periodOverride?: PayPeriod, silent?: boolean) => {
    const period = periodOverride || payPeriods.find(p => p.id === payPeriodId);
    if (!period) return;

    const activeEmps = employees.filter(e => e.status === 'active');
    const newPayslips: Payslip[] = [];
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    const periodMonth = (period.payoutDate || period.startDate).substring(0, 7); // e.g. "2026-08" based on payday
    const isLastCutoff = Boolean(period.isLastCutoffOfMonth);

    // Find other periods in the same calendar month based on payday
    const sameMonthOtherPeriodIds = new Set(
      payPeriods
        .filter(p => p.id !== payPeriodId && (p.payoutDate || p.startDate).substring(0, 7) === periodMonth)
        .map(p => p.id)
    );

    activeEmps.forEach(emp => {
      // Find DTR for this period
      const empDTR = dtrRecords.filter(
        d => d.employeeId === emp.id && d.date >= period.startDate && d.date <= period.endDate
      );

      // If this is the last cutoff of the month, gather previous contributions in this month
      let previousContributionsInMonth;
      if (isLastCutoff) {
        const empPrevMonthSlips = payslips.filter(
          ps => ps.employeeId === emp.id && sameMonthOtherPeriodIds.has(ps.payPeriodId)
        );
        previousContributionsInMonth = {
          sssEE: empPrevMonthSlips.reduce((s, ps) => s + (ps.sssDeduction || 0), 0),
          sssER: empPrevMonthSlips.reduce((s, ps) => s + (ps.sssEmployerShare || 0), 0),
          philhealthEE: empPrevMonthSlips.reduce((s, ps) => s + (ps.philhealthDeduction || 0), 0),
          philhealthER: empPrevMonthSlips.reduce((s, ps) => s + (ps.philhealthEmployerShare || 0), 0),
          pagibigEE: empPrevMonthSlips.reduce((s, ps) => s + (ps.pagibigDeduction || 0), 0),
          pagibigER: empPrevMonthSlips.reduce((s, ps) => s + (ps.pagibigEmployerShare || 0), 0),
          basicPaySum: empPrevMonthSlips.reduce((s, ps) => s + (ps.basicPay || 0), 0),
        };
      }

      // Map active employee deductions to customDeductions line items
      const empActiveDeds = employeeDeductions
        .filter(d => d.employeeId === emp.id && d.status === 'Active' && d.runningBalance > 0 && d.cutoffDeductionAmount > 0)
        .map(d => ({
          id: `ded-${d.id}`,
          name: `${d.type === 'Loan' ? 'Loan' : 'Ded'}: ${d.description} (${d.deductionId})`,
          amount: Math.min(d.cutoffDeductionAmount, d.runningBalance),
        }));

      let payslip = generateEmployeePayslip(
        emp,
        payPeriodId,
        empDTR,
        [],
        empActiveDeds,
        period.holidays || [],
        {
          enableLateDeduction: companyProfile.enableLateDeduction !== false,
          enableNightShiftPay: companyProfile.enableNightShiftPay,
          enableWithholdingTax: companyProfile.enableWithholdingTax,
          isLastCutoffOfMonth: isLastCutoff,
          previousContributionsInMonth,
        }
      );

      // Preserve existing manual adjustments when re-generating
      const existingPs = payslips.find(ps => ps.payPeriodId === payPeriodId && ps.employeeId === emp.id);
      if (existingPs && existingPs.isManuallyAdjusted && existingPs.manualOverrides) {
        payslip = {
          ...payslip,
          ...existingPs.manualOverrides,
          isManuallyAdjusted: true,
          manualOverrides: existingPs.manualOverrides,
        };
        const gross = (payslip.basicPay || 0) + (payslip.overtimePay || 0) + (payslip.holidayPay || 0) + (payslip.wdoPay || 0) + (payslip.nightDiffPay || 0) + (payslip.totalAllowances || 0);
        const withholdingTaxAmount = companyProfile.enableWithholdingTax ? (payslip.withholdingTax || 0) : 0;
        const totalDed = (payslip.lateUndertimeDeduction || 0) + (payslip.sssDeduction || 0) + (payslip.philhealthDeduction || 0) + (payslip.pagibigDeduction || 0) + withholdingTaxAmount + (payslip.mlsDeduction || 0) + (payslip.cashAdvanceDeduction || 0) + (payslip.totalOtherDeductions || 0);
        payslip.grossPay = Math.round(gross * 100) / 100;
        payslip.totalDeductions = Math.round(totalDed * 100) / 100;
        payslip.netPay = Math.max(0, Math.round((payslip.grossPay - payslip.totalDeductions) * 100) / 100);
      }

      newPayslips.push(payslip);

      totalGross += payslip.grossPay;
      totalDeductions += payslip.totalDeductions;
      totalNet += payslip.netPay;
    });

    // Update payslips state
    setPayslips(prev => {
      const filtered = prev.filter(ps => ps.payPeriodId !== payPeriodId);
      return [...newPayslips, ...filtered];
    });

    // Update PayPeriod summary
    setPayPeriods(prev =>
      prev.map(p => {
        if (p.id === payPeriodId) {
          return {
            ...p,
            totalGrossPay: Math.round(totalGross * 100) / 100,
            totalDeductions: Math.round(totalDeductions * 100) / 100,
            totalNetPay: Math.round(totalNet * 100) / 100,
            processedEmployeesCount: activeEmps.length,
            status: p.status === 'Draft' ? 'Pending Review' : p.status,
          };
        }
        return p;
      })
    );

    logAudit({
      action: 'PAYROLL_CALCULATE',
      module: 'PAYROLL',
      targetId: payPeriodId,
      targetName: period.name,
      description: `Calculated payroll for ${activeEmps.length} employees (Gross: ₱${totalGross.toLocaleString()}, Net: ₱${totalNet.toLocaleString()})${isLastCutoff ? ' [Month-End Final Cutoff True-up]' : ''}${companyProfile.enableNightShiftPay ? ' [Night Shift Pay Enabled]' : ''}.`,
      changes: [
        { field: 'processedEmployeesCount', fieldLabel: 'Processed Employees', oldValue: period.processedEmployeesCount, newValue: activeEmps.length },
        { field: 'totalGrossPay', fieldLabel: 'Total Gross Pay', oldValue: period.totalGrossPay, newValue: totalGross },
        { field: 'totalNetPay', fieldLabel: 'Total Net Pay', oldValue: period.totalNetPay, newValue: totalNet },
      ],
    });

    if (!silent) {
      showToast(`Payroll generated for ${activeEmps.length} employees!`);
    }
  }, [payPeriods, employees, dtrRecords, payslips, companyProfile, logAudit, showToast]);

  const clearCutoff = useCallback((payPeriodId: string) => {
    const targetPeriod = payPeriods.find(p => p.id === payPeriodId);
    if (!targetPeriod) return;

    const countDeleted = payslips.filter(ps => ps.payPeriodId === payPeriodId).length;

    // Delete all payslips for this period
    setPayslips(prev => prev.filter(ps => ps.payPeriodId !== payPeriodId));

    // Reset the pay period summary
    setPayPeriods(prev =>
      prev.map(p => {
        if (p.id === payPeriodId) {
          return {
            ...p,
            totalGrossPay: 0,
            totalDeductions: 0,
            totalNetPay: 0,
            processedEmployeesCount: 0,
            status: 'Draft',
          };
        }
        return p;
      })
    );

    logAudit({
      action: 'PAYROLL_CLEAR',
      module: 'PAYROLL',
      targetId: payPeriodId,
      targetName: targetPeriod.name,
      description: `Cleared cutoff and deleted ${countDeleted} generated payslip(s) for period: ${targetPeriod.name}.`,
    });

    showToast(`Cleared all payslips for "${targetPeriod.name}"!`, 'info');
  }, [payPeriods, payslips, logAudit, showToast]);

  const deletePayPeriod = useCallback((payPeriodId: string) => {
    const targetPeriod = payPeriods.find(p => p.id === payPeriodId);
    if (!targetPeriod) return;

    const countSlips = payslips.filter(ps => ps.payPeriodId === payPeriodId).length;

    // Remove all associated payslips
    setPayslips(prev => prev.filter(ps => ps.payPeriodId !== payPeriodId));

    // Remove the pay period
    setPayPeriods(prev => prev.filter(p => p.id !== payPeriodId));

    logAudit({
      action: 'DELETE',
      module: 'PAYROLL',
      targetId: payPeriodId,
      targetName: targetPeriod.name,
      description: `Deleted payroll cutoff period "${targetPeriod.name}" (${targetPeriod.startDate} to ${targetPeriod.endDate}) and removed ${countSlips} associated payslip(s).`,
    });

    showToast(`Deleted cutoff period "${targetPeriod.name}" and ${countSlips} payslip(s).`, 'warning');
  }, [payPeriods, payslips, logAudit, showToast]);

  const deletePayslip = useCallback((payslipId: string) => {
    const targetPayslip = payslips.find(ps => ps.id === payslipId);
    if (!targetPayslip) return;

    const periodName = payPeriods.find(p => p.id === targetPayslip.payPeriodId)?.name || targetPayslip.payPeriodId;

    setPayslips(prev => {
      const remaining = prev.filter(ps => ps.id !== payslipId);

      // Recalculate parent PayPeriod totals
      setPayPeriods(prevPeriods =>
        prevPeriods.map(p => {
          if (p.id === targetPayslip.payPeriodId) {
            const periodSlips = remaining.filter(s => s.payPeriodId === p.id);
            const totalGross = periodSlips.reduce((sum, s) => sum + s.grossPay, 0);
            const totalDeds = periodSlips.reduce((sum, s) => sum + s.totalDeductions, 0);
            const totalNet = periodSlips.reduce((sum, s) => sum + s.netPay, 0);
            return {
              ...p,
              totalGrossPay: Math.round(totalGross * 100) / 100,
              totalDeductions: Math.round(totalDeds * 100) / 100,
              totalNetPay: Math.round(totalNet * 100) / 100,
              processedEmployeesCount: periodSlips.length,
            };
          }
          return p;
        })
      );

      return remaining;
    });

    logAudit({
      action: 'DELETE',
      module: 'PAYROLL',
      targetId: payslipId,
      targetName: `Payslip: ${targetPayslip.employeeName}`,
      description: `Deleted payslip for ${targetPayslip.employeeName} (${targetPayslip.employeeNumber}) from cutoff "${periodName}".`,
    });

    showToast(`Deleted payslip for ${targetPayslip.employeeName}`, 'warning');
  }, [payslips, payPeriods, logAudit, showToast]);

  const deletePayslips = useCallback((payslipIds: string[]) => {
    if (!payslipIds || payslipIds.length === 0) return;
    const idsSet = new Set(payslipIds);
    const targetPayslips = payslips.filter(ps => idsSet.has(ps.id));
    if (targetPayslips.length === 0) return;

    // Collect affected period IDs
    const affectedPeriodIds = new Set(targetPayslips.map(ps => ps.payPeriodId));

    setPayslips(prev => {
      const remaining = prev.filter(ps => !idsSet.has(ps.id));

      // Recalculate all affected PayPeriod totals
      setPayPeriods(prevPeriods =>
        prevPeriods.map(p => {
          if (affectedPeriodIds.has(p.id)) {
            const periodSlips = remaining.filter(s => s.payPeriodId === p.id);
            const totalGross = periodSlips.reduce((sum, s) => sum + s.grossPay, 0);
            const totalDeds = periodSlips.reduce((sum, s) => sum + s.totalDeductions, 0);
            const totalNet = periodSlips.reduce((sum, s) => sum + s.netPay, 0);
            return {
              ...p,
              totalGrossPay: Math.round(totalGross * 100) / 100,
              totalDeductions: Math.round(totalDeds * 100) / 100,
              totalNetPay: Math.round(totalNet * 100) / 100,
              processedEmployeesCount: periodSlips.length,
            };
          }
          return p;
        })
      );

      return remaining;
    });

    logAudit({
      action: 'DELETE',
      module: 'PAYROLL',
      targetId: payslipIds.join(','),
      targetName: `${targetPayslips.length} Payslip(s)`,
      description: `Bulk deleted ${targetPayslips.length} payslip(s): ${targetPayslips.map(p => p.employeeName).slice(0, 5).join(', ')}${targetPayslips.length > 5 ? ' and more' : ''}.`,
    });

    showToast(`Deleted ${targetPayslips.length} selected payslip(s).`, 'warning');
  }, [payslips, payPeriods, logAudit, showToast]);

  const updatePayPeriod = useCallback((payPeriodId: string, updates: Partial<PayPeriod>) => {
    let updatedPeriodObj: PayPeriod | undefined;

    setPayPeriods(prev =>
      prev.map(p => {
        if (p.id === payPeriodId) {
          updatedPeriodObj = { ...p, ...updates };
          return updatedPeriodObj;
        }
        return p;
      })
    );

    if (updates.holidays && updatedPeriodObj) {
      const periodHolidays = updates.holidays;
      const holidayMap = new Map<string, string>();
      periodHolidays.forEach(h => {
        const normType = (h.type as string) === 'Regular' || h.type === 'Regular Holiday'
          ? 'Regular Holiday'
          : 'Special Non-Working Holiday';
        holidayMap.set(h.date, normType);
      });

      const startDate = updatedPeriodObj.startDate;
      const endDate = updatedPeriodObj.endDate;

      setDtrRecords(prev =>
        prev.map(rec => {
          if (rec.date >= startDate && rec.date <= endDate) {
            const hType = holidayMap.get(rec.date);
            if (hType) {
              return { ...rec, dayType: hType as any };
            } else if (rec.dayType.includes('Holiday')) {
              // Holiday was removed for this date
              const d = new Date(rec.date + 'T00:00:00');
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return { ...rec, dayType: isWeekend ? 'Rest Day' : 'Regular Working Day' };
            }
          }
          return rec;
        })
      );

      // Trigger automatic recalculation for this period
      generatePayrollForPeriod(payPeriodId);
    }

    showToast('Pay period settings updated!', 'success');
  }, [generatePayrollForPeriod, showToast]);

  const updatePayPeriodStatus = useCallback((payPeriodId: string, status: PayPeriod['status']) => {
    setPayPeriods(prev => {
      const target = prev.find(p => p.id === payPeriodId);
      if (!target) return prev;

      logAudit({
        action: status === 'Approved' ? 'PAYROLL_APPROVE' : 'STATUS_CHANGE',
        module: 'PAYROLL',
        targetId: payPeriodId,
        targetName: target.name,
        description: `Changed payroll status from ${target.status} to ${status}.`,
        changes: [{ field: 'status', fieldLabel: 'Payroll Status', oldValue: target.status, newValue: status }],
      });

      return prev.map(p => (p.id === payPeriodId ? { ...p, status } : p));
    });

    // Also update constituent payslips
    setPayslips(prev =>
      prev.map(ps => {
        if (ps.payPeriodId === payPeriodId) {
          return {
            ...ps,
            status: status === 'Approved' ? 'Approved' : 'Draft',
          };
        }
        return ps;
      })
    );

    showToast(`Payroll status updated to "${status}"`);
  }, [logAudit, showToast]);

  const updatePayslip = useCallback((payslipId: string, updates: Partial<Payslip>, editReason?: string) => {
    setPayslips(prev => {
      const idx = prev.findIndex(p => p.id === payslipId);
      if (idx < 0) return prev;

      const existing = prev[idx];
      const updatedOverrides = {
        ...(existing.manualOverrides || {}),
        ...updates,
      };
      const updated = {
        ...existing,
        ...updates,
        isManuallyAdjusted: true,
        manualOverrides: updatedOverrides,
      };

      // Recalculate gross and net if components were adjusted
      const gross = (updated.basicPay || 0) + (updated.overtimePay || 0) + (updated.holidayPay || 0) + (updated.wdoPay || 0) + (updated.nightDiffPay || 0) + (updated.totalAllowances || 0);
      const withholdingTaxAmount = companyProfile.enableWithholdingTax ? (updated.withholdingTax || 0) : 0;
      const totalDed = (updated.lateUndertimeDeduction || 0) + (updated.sssDeduction || 0) + (updated.philhealthDeduction || 0) + (updated.pagibigDeduction || 0) + withholdingTaxAmount + (updated.mlsDeduction || 0) + (updated.cashAdvanceDeduction || 0) + (updated.totalOtherDeductions || 0);
      updated.grossPay = Math.round(gross * 100) / 100;
      updated.totalDeductions = Math.round(totalDed * 100) / 100;
      updated.netPay = Math.max(0, Math.round((updated.grossPay - updated.totalDeductions) * 100) / 100);

      const diffs: FieldDiff[] = [];
      (Object.keys(updates) as (keyof Payslip)[]).forEach(k => {
        if (existing[k] !== updated[k]) {
          diffs.push({
            field: k,
            fieldLabel: k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            oldValue: typeof existing[k] === 'object' ? JSON.stringify(existing[k]) : (existing[k] as any) ?? '—',
            newValue: typeof updated[k] === 'object' ? JSON.stringify(updated[k]) : (updated[k] as any) ?? '—',
          });
        }
      });

      logAudit({
        action: 'PAYSLIP_EDIT',
        module: 'PAYROLL',
        targetId: payslipId,
        targetName: `Payslip: ${updated.employeeName} (${updated.payPeriodId})`,
        description: editReason?.trim() ? `Payslip adjusted: ${editReason.trim()}` : `Manual adjustment on ${updated.employeeName}'s payslip.`,
        changes: diffs,
      });

      const next = [...prev];
      next[idx] = updated;

      // Also synchronize the parent PayPeriod summary
      setPayPeriods(prevPeriods =>
        prevPeriods.map(p => {
          if (p.id === updated.payPeriodId) {
            const periodSlips = next.filter(s => s.payPeriodId === p.id);
            const totalGross = periodSlips.reduce((sum, s) => sum + s.grossPay, 0);
            const totalDeds = periodSlips.reduce((sum, s) => sum + s.totalDeductions, 0);
            const totalNet = periodSlips.reduce((sum, s) => sum + s.netPay, 0);
            return {
              ...p,
              totalGrossPay: Math.round(totalGross * 100) / 100,
              totalDeductions: Math.round(totalDeds * 100) / 100,
              totalNetPay: Math.round(totalNet * 100) / 100,
            };
          }
          return p;
        })
      );

      return next;
    });

    showToast('Payslip updated and recalculation applied!');
  }, [logAudit, showToast]);

  const createPayPeriod = useCallback((periodData: Omit<PayPeriod, 'id' | 'totalGrossPay' | 'totalDeductions' | 'totalNetPay' | 'processedEmployeesCount' | 'createdAt'>): PayPeriod => {
    const id = `PP-${Date.now()}`;
    const newPeriod: PayPeriod = {
      ...periodData,
      id,
      totalGrossPay: 0,
      totalDeductions: 0,
      totalNetPay: 0,
      processedEmployeesCount: 0,
      createdAt: new Date().toISOString(),
    };

    setPayPeriods(prev => [newPeriod, ...prev]);

    // Automatically generate initial payslips for active employees for this new cutoff
    generatePayrollForPeriod(newPeriod.id, newPeriod, true);

    logAudit({
      action: 'CREATE',
      module: 'PAYROLL',
      targetId: newPeriod.id,
      targetName: newPeriod.name,
      description: `Created new payroll cutoff period: ${newPeriod.name} (${newPeriod.startDate} to ${newPeriod.endDate}).`,
    });

    showToast(`Pay period "${newPeriod.name}" created!`);
    return newPeriod;
  }, [generatePayrollForPeriod, logAudit, showToast]);

  const generateThirteenthMonthPay = useCallback((year: number, customPayoutDate?: string): ThirteenthMonthRecord => {
    const payoutDate = customPayoutDate || `${year}-12-15`;
    const activeEmployees = employees.filter(e => e.status === 'active');

    const items: ThirteenthMonthItem[] = activeEmployees.map(emp => {
      const empSlipsYear = payslips.filter(ps => ps.employeeId === emp.id && ps.generatedAt.startsWith(`${year}`));
      const actualEarnedBasic = empSlipsYear.reduce((sum, ps) => sum + (ps.basicPay || 0), 0);

      const totalBasicSalaryEarned = actualEarnedBasic > 0
        ? Math.round(actualEarnedBasic * 100) / 100
        : Math.round(emp.dailyRate * 260);

      const thirteenthMonthPay = Math.round((totalBasicSalaryEarned / 12) * 100) / 100;
      const taxableAmount = Math.max(0, thirteenthMonthPay - 90000);

      return {
        employeeId: emp.id,
        employeeNumber: emp.employeeNumber,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        position: emp.position,
        dailyRate: emp.dailyRate,
        monthsWorkedCount: 12,
        totalBasicSalaryEarned,
        thirteenthMonthPay,
        taxableAmount,
        status: 'Draft',
        paymentDate: payoutDate,
        remarks: actualEarnedBasic > 0 ? 'Calculated from accumulated payslips' : 'Projected (Daily Rate x 260 / 12)',
      };
    });

    const totalBasicEarnings = items.reduce((sum, i) => sum + i.totalBasicSalaryEarned, 0);
    const totalThirteenthMonthPay = items.reduce((sum, i) => sum + i.thirteenthMonthPay, 0);

    const newRecord: ThirteenthMonthRecord = {
      id: `13TH-${year}`,
      year,
      status: 'Draft',
      totalEmployees: items.length,
      totalBasicEarnings: Math.round(totalBasicEarnings * 100) / 100,
      totalThirteenthMonthPay: Math.round(totalThirteenthMonthPay * 100) / 100,
      payoutDate,
      generatedAt: new Date().toISOString(),
      items,
    };

    setThirteenthMonthRecords(prev => {
      const filtered = prev.filter(r => r.year !== year);
      return [newRecord, ...filtered].sort((a, b) => b.year - a.year);
    });

    logAudit({
      action: 'PAYROLL_CALCULATE',
      module: 'PAYROLL',
      targetId: newRecord.id,
      targetName: `13th Month Pay (${year})`,
      description: `Generated 13th Month Pay computation for year ${year} (${items.length} employees, Total: ₱${totalThirteenthMonthPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}).`,
    });

    showToast(`13th Month Pay for ${year} generated!`);
    return newRecord;
  }, [employees, payslips, logAudit, showToast]);

  const approveThirteenthMonthPay = useCallback((year: number) => {
    setThirteenthMonthRecords(prev => prev.map(r => {
      if (r.year === year) {
        const updatedItems = r.items.map(item => ({ ...item, status: 'Approved' as const }));
        return {
          ...r,
          status: 'Approved',
          approvedAt: new Date().toISOString(),
          items: updatedItems,
        };
      }
      return r;
    }));

    logAudit({
      action: 'PAYROLL_APPROVE',
      module: 'PAYROLL',
      targetId: `13TH-${year}`,
      targetName: `13th Month Pay (${year})`,
      description: `Approved 13th Month Pay for year ${year}.`,
    });

    showToast(`13th Month Pay for ${year} approved!`);
  }, [logAudit, showToast]);

  const deleteThirteenthMonthRecord = useCallback((year: number) => {
    setThirteenthMonthRecords(prev => prev.filter(r => r.year !== year));

    logAudit({
      action: 'DELETE',
      module: 'PAYROLL',
      targetId: `13TH-${year}`,
      targetName: `13th Month Pay (${year})`,
      description: `Deleted 13th Month Pay record for year ${year}.`,
    });

    showToast(`13th Month Pay record for year ${year} deleted.`, 'info');
  }, [logAudit, showToast]);

  // ==========================================
  // DEDUCTION & LOAN ACTIONS
  // ==========================================

  const addEmployeeDeduction = useCallback((data: {
    employeeId: string;
    description: string;
    amount: number;
    interest?: number;
    interestType?: 'fixed' | 'percentage';
    interestRate?: number;
    date: string;
    type: DeductionType;
    cutoffDeductionAmount: number;
    notes?: string;
    deductionId?: string;
  }): EmployeeDeduction => {
    const matchedEmp = employees.find(e => e.id === data.employeeId);
    const empName = matchedEmp ? `${matchedEmp.firstName} ${matchedEmp.lastName}` : 'Employee';
    const empNumber = matchedEmp?.employeeNumber || '';
    const dept = matchedEmp?.department || '';
    const pos = matchedEmp?.position || '';

    const id = `ded-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    
    // Auto-generate deduction ID if not provided
    let finalDeductionId = data.deductionId?.trim();
    if (!finalDeductionId) {
      const year = new Date(data.date || new Date()).getFullYear();
      const existingCount = employeeDeductions.length + 1;
      finalDeductionId = `DED-${year}-${String(existingCount).padStart(3, '0')}`;
    }

    const principal = Math.max(0, Number(data.amount) || 0);
    let calculatedInterest = 0;
    if (data.interestType === 'percentage' && data.interestRate !== undefined) {
      calculatedInterest = Math.round((principal * (data.interestRate / 100)) * 100) / 100;
    } else {
      calculatedInterest = Math.max(0, Number(data.interest) || 0);
    }

    const totalAmount = Math.round((principal + calculatedInterest) * 100) / 100;
    const cutoffAmount = Math.max(0, Number(data.cutoffDeductionAmount) || 0);

    const initialLedgerEntry: DeductionLedgerEntry = {
      id: `led-${Date.now()}-grant`,
      deductionId: id,
      date: data.date || new Date().toISOString().split('T')[0],
      reference: `${finalDeductionId}-GRANT`,
      description: `Initial Grant (${data.type}): ${data.description}${calculatedInterest > 0 ? ` (Principal: ₱${principal.toLocaleString()} + Interest: ₱${calculatedInterest.toLocaleString()})` : ''}`,
      type: 'GRANT',
      debit: totalAmount,
      credit: 0,
      runningBalance: totalAmount,
      remarks: data.notes || undefined,
      createdAt: new Date().toISOString(),
    };

    const newDeduction: EmployeeDeduction = {
      id,
      deductionId: finalDeductionId,
      employeeId: data.employeeId,
      employeeName: empName,
      employeeNumber: empNumber,
      department: dept,
      position: pos,
      description: data.description.trim(),
      amount: principal,
      interest: calculatedInterest,
      interestType: data.interestType || 'fixed',
      interestRate: data.interestRate,
      totalAmount,
      date: data.date || new Date().toISOString().split('T')[0],
      type: data.type,
      cutoffDeductionAmount: cutoffAmount,
      totalPaid: 0,
      runningBalance: totalAmount,
      status: 'Active',
      ledger: [initialLedgerEntry],
      notes: data.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setEmployeeDeductions(prev => [newDeduction, ...prev]);

    logAudit({
      action: 'DEDUCTION_CREATE',
      module: 'DEDUCTION',
      targetId: newDeduction.deductionId,
      targetName: `${newDeduction.deductionId} - ${empName}`,
      description: `Created ${newDeduction.type}: "${newDeduction.description}" for ${empName} (Total: ₱${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}, Cutoff: ₱${cutoffAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}).`,
    });

    showToast(`Deduction ${newDeduction.deductionId} created for ${empName}!`, 'success');
    return newDeduction;
  }, [employees, employeeDeductions.length, logAudit, showToast]);

  const updateEmployeeDeduction = useCallback((id: string, updates: Partial<EmployeeDeduction>) => {
    setEmployeeDeductions(prev => {
      const idx = prev.findIndex(d => d.id === id);
      if (idx < 0) return prev;

      const existing = prev[idx];
      const nextDeduction = { ...existing, ...updates, updatedAt: new Date().toISOString() };

      // If amount or interest changed, adjust totalAmount and running balance
      if (updates.amount !== undefined || updates.interest !== undefined) {
        const p = updates.amount !== undefined ? updates.amount : existing.amount;
        const i = updates.interest !== undefined ? updates.interest : existing.interest;
        nextDeduction.totalAmount = Math.round((p + i) * 100) / 100;
        nextDeduction.runningBalance = Math.max(0, Math.round((nextDeduction.totalAmount - nextDeduction.totalPaid) * 100) / 100);
        if (nextDeduction.runningBalance === 0) {
          nextDeduction.status = 'Completed';
        }
      }

      logAudit({
        action: 'DEDUCTION_UPDATE',
        module: 'DEDUCTION',
        targetId: nextDeduction.deductionId,
        targetName: `${nextDeduction.deductionId} - ${nextDeduction.employeeName}`,
        description: `Updated deduction ${nextDeduction.deductionId} details.`,
      });

      const next = [...prev];
      next[idx] = nextDeduction;
      return next;
    });

    showToast('Deduction record updated!', 'success');
  }, [logAudit, showToast]);

  const deleteEmployeeDeduction = useCallback((id: string) => {
    setEmployeeDeductions(prev => {
      const target = prev.find(d => d.id === id);
      if (!target) return prev;

      logAudit({
        action: 'DEDUCTION_DELETE',
        module: 'DEDUCTION',
        targetId: target.deductionId,
        targetName: `${target.deductionId} - ${target.employeeName}`,
        description: `Deleted deduction ${target.deductionId} (${target.description}) for ${target.employeeName}.`,
      });

      return prev.filter(d => d.id !== id);
    });

    showToast('Deduction record deleted.', 'info');
  }, [logAudit, showToast]);

  const recordDeductionPayment = useCallback((
    deductionId: string,
    payment: {
      amount: number;
      date: string;
      reference?: string;
      description?: string;
      remarks?: string;
      type?: 'PAYMENT' | 'CUTOFF_DEDUCTION';
      payslipId?: string;
      payPeriodId?: string;
      isManual?: boolean;
    }
  ) => {
    setEmployeeDeductions(prev => {
      const idx = prev.findIndex(d => d.id === deductionId || d.deductionId === deductionId);
      if (idx < 0) return prev;

      const deduction = prev[idx];
      const paymentAmount = Math.max(0, Math.min(payment.amount, deduction.runningBalance));
      if (paymentAmount <= 0) return prev;

      const newTotalPaid = Math.round((deduction.totalPaid + paymentAmount) * 100) / 100;
      const newRunningBalance = Math.max(0, Math.round((deduction.totalAmount - newTotalPaid) * 100) / 100);
      const isCompleted = newRunningBalance <= 0;

      const entryType = payment.type || 'PAYMENT';
      const isManual = payment.isManual !== undefined ? payment.isManual : (entryType === 'PAYMENT');
      const newEntry: DeductionLedgerEntry = {
        id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        deductionId: deduction.id,
        date: payment.date || new Date().toISOString().split('T')[0],
        reference: payment.reference?.trim() || `${deduction.deductionId}-PAY`,
        description: payment.description?.trim() || (entryType === 'CUTOFF_DEDUCTION' ? 'Payroll Cutoff Deduction' : 'Payment Received / Amortization'),
        type: entryType,
        debit: 0,
        credit: paymentAmount,
        runningBalance: newRunningBalance,
        remarks: payment.remarks?.trim() || undefined,
        payslipId: payment.payslipId,
        payPeriodId: payment.payPeriodId,
        isManual,
        createdAt: new Date().toISOString(),
      };

      const updatedDeduction: EmployeeDeduction = {
        ...deduction,
        totalPaid: newTotalPaid,
        runningBalance: newRunningBalance,
        status: isCompleted ? 'Completed' : deduction.status,
        ledger: [...deduction.ledger, newEntry],
        updatedAt: new Date().toISOString(),
      };

      logAudit({
        action: 'DEDUCTION_PAYMENT',
        module: 'DEDUCTION',
        targetId: deduction.deductionId,
        targetName: `${deduction.deductionId} - ${deduction.employeeName}`,
        description: `Recorded payment of ₱${paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} on ${deduction.deductionId}. New balance: ₱${newRunningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`,
      });

      const next = [...prev];
      next[idx] = updatedDeduction;
      return next;
    });

    showToast('Payment recorded and ledger updated!', 'success');
  }, [logAudit, showToast]);

  const deleteDeductionLedgerEntry = useCallback((deductionId: string, entryId: string) => {
    setEmployeeDeductions(prev => {
      const idx = prev.findIndex(d => d.id === deductionId || d.deductionId === deductionId);
      if (idx < 0) return prev;

      const deduction = prev[idx];
      // Do not allow deleting initial grant entry
      const targetEntry = deduction.ledger.find(e => e.id === entryId);
      if (!targetEntry || targetEntry.type === 'GRANT') {
        return prev;
      }

      // Rebuild ledger running balance from scratch
      const filteredLedger = deduction.ledger.filter(e => e.id !== entryId);
      let balance = 0;
      let totalPaid = 0;

      const recalculatedLedger = filteredLedger.map((entry, eIdx) => {
        if (eIdx === 0 && entry.type === 'GRANT') {
          balance = entry.debit;
          return { ...entry, runningBalance: balance };
        }
        balance = Math.max(0, balance + entry.debit - entry.credit);
        totalPaid += entry.credit;
        return { ...entry, runningBalance: Math.round(balance * 100) / 100 };
      });

      const updatedDeduction: EmployeeDeduction = {
        ...deduction,
        totalPaid: Math.round(totalPaid * 100) / 100,
        runningBalance: Math.round(balance * 100) / 100,
        status: balance <= 0 ? 'Completed' : 'Active',
        ledger: recalculatedLedger,
        updatedAt: new Date().toISOString(),
      };

      const next = [...prev];
      next[idx] = updatedDeduction;
      return next;
    });

    showToast('Ledger entry removed and balance adjusted.', 'info');
  }, [showToast]);

  const getEmployeeDeductions = useCallback((employeeId: string) => {
    return employeeDeductions.filter(d => d.employeeId === employeeId);
  }, [employeeDeductions]);

  const updateCompanyProfile = useCallback((updates: Partial<CompanyProfile>) => {
    setCompanyProfile(prev => {
      const next = { ...prev, ...updates };
      const changesDesc = [];
      if (updates.name !== undefined && updates.name !== prev.name) changesDesc.push(`Name: "${next.name}"`);
      if (updates.logoUrl !== undefined && updates.logoUrl !== prev.logoUrl) changesDesc.push(updates.logoUrl ? 'Company Logo updated' : 'Company Logo removed');
      if (updates.enableNightShiftPay !== undefined && updates.enableNightShiftPay !== prev.enableNightShiftPay) {
        changesDesc.push(`Night Shift Pay: ${next.enableNightShiftPay ? 'ENABLED (10% NSD)' : 'DISABLED'}`);
      }
      if (updates.enableWithholdingTax !== undefined && updates.enableWithholdingTax !== prev.enableWithholdingTax) {
        changesDesc.push(`Withholding Tax: ${next.enableWithholdingTax ? 'ENABLED (TRAIN Law)' : 'DISABLED'}`);
      }

      logAudit({
        action: 'UPDATE',
        module: 'SETTINGS',
        targetId: 'COMPANY-PROFILE',
        targetName: next.name,
        description: `Updated Company Settings: ${changesDesc.length > 0 ? changesDesc.join(', ') : `Name: "${next.name}"`}.`,
      });
      return next;
    });
    showToast('Company settings updated successfully!');
  }, [logAudit, showToast]);

  const resetAllData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.SYSTEM_USERS);
    localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
    localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
    localStorage.removeItem(STORAGE_KEYS.DTR);
    localStorage.removeItem(STORAGE_KEYS.DTR_DRAFTS);
    localStorage.removeItem(STORAGE_KEYS.PAY_PERIODS);
    localStorage.removeItem(STORAGE_KEYS.PAYSLIPS);
    localStorage.removeItem(STORAGE_KEYS.AUDIT);
    localStorage.removeItem(STORAGE_KEYS.COMPANY_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.THIRTEENTH_MONTH);
    localStorage.removeItem(STORAGE_KEYS.SHIFTS);
    localStorage.removeItem(STORAGE_KEYS.DEDUCTIONS);

    setCurrentUserState(INITIAL_CURRENT_USER);
    setSystemUsers(INITIAL_SYSTEM_USERS);
    setIsAuthenticated(true);
    setEmployees(INITIAL_EMPLOYEES);
    setShifts(INITIAL_WORK_SHIFTS);
    setDtrRecords(INITIAL_DTR_RECORDS);
    const initialRaw = parseRawBiometricsText(SAMPLE_BIOMETRIC_DATA_CSV);
    setDtrDrafts(buildDraftDTRRecords(initialRaw, INITIAL_EMPLOYEES));
    setPayPeriods(INITIAL_PAY_PERIODS);
    setPayslips(INITIAL_PAYSLIPS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setCompanyProfile(INITIAL_COMPANY_PROFILE);
    setThirteenthMonthRecords(INITIAL_THIRTEENTH_MONTH_RECORDS);
    setEmployeeDeductions(INITIAL_DEDUCTIONS);

    showToast('System data reset to initial Philippine demo database.', 'info');
  }, [showToast]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        systemUsers,
        isAuthenticated,
        login,
        logout,
        addSystemUser,
        updateSystemUser,
        deleteSystemUser,
        assignUserRole,
        employees,
        shifts,
        addShift,
        updateShift,
        deleteShift,
        setDefaultShift,
        getEmployeeShift,
        dtrRecords,
        dtrDrafts,
        payPeriods,
        payslips,
        auditLogs,
        companyProfile,
        updateCompanyProfile,
        thirteenthMonthRecords,
        generateThirteenthMonthPay,
        approveThirteenthMonthPay,
        deleteThirteenthMonthRecord,
        employeeDeductions,
        addEmployeeDeduction,
        updateEmployeeDeduction,
        deleteEmployeeDeduction,
        recordDeductionPayment,
        deleteDeductionLedgerEntry,
        getEmployeeDeductions,
        isSuperAdmin,
        isAdmin,
        isManager,
        isStaff,
        hasRole,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        punchClock,
        updateDTRRecord,
        batchUpdateDTRRecords,
        generateBulkDTR,
        importBiometricPunches,
        updateDraftRecord,
        validateDraftRecord,
        rejectDraftRecord,
        commitDraftsToDTR,
        clearDrafts,
        quickLoadSampleBiometrics,
        generatePayrollForPeriod,
        clearCutoff,
        deletePayPeriod,
        deletePayslip,
        deletePayslips,
        updatePayPeriod,
        updatePayPeriodStatus,
        updatePayslip,
        createPayPeriod,
        logAudit,
        resetAllData,
        toast,
        toastMessage,
        showToast,
        hideToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
