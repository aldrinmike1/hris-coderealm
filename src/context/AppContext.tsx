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
import { calculateDTRMetrics, generateEmployeePayslip, calculateLateMinutes, recalculateDeductionLedger } from '../utils/calculations';
import {
  parseRawBiometricsText,
  buildDraftDTRRecords,
  calculatePunchMetrics,
  evaluateDTRAnomalies,
  SAMPLE_BIOMETRIC_DATA_CSV,
} from '../utils/biometricsParser';
import {
  COLLECTIONS,
  getCollectionDocs,
  syncDocToFirestore,
  deleteDocFromFirestore,
  batchSyncDocsToFirestore,
  batchDeleteDocsFromFirestore,
  seedCollectionIfEmpty,
  testConnection,
} from '../services/firestoreService';

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
  updateThirteenthMonthItem: (year: number, employeeId: string, updates: Partial<ThirteenthMonthItem>, applyToLedger?: boolean) => void;

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
  updateDeductionPayment: (
    deductionId: string,
    entryId: string,
    updates: {
      amount: number;
      date: string;
      remarks?: string;
      reference?: string;
      description?: string;
    }
  ) => void;
  deleteDeductionLedgerEntry: (deductionId: string, entryId: string) => void;
  adjustDeductionPrincipal: (
    deductionId: string,
    adjustment: {
      amount: number;
      date: string;
      reason?: string;
      reference?: string;
      remarks?: string;
      payPeriodId?: string;
    }
  ) => void;
  getEmployeeDeductions: (employeeId: string) => EmployeeDeduction[];
  
  // Cloud Firestore Status
  isCloudConnected: boolean;
  isCloudSyncing: boolean;
  
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
  IS_AUTHENTICATED: 'hris_is_authenticated_weekly_v1',
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Session & Auth state (persisted in session)
  const [currentUser, setCurrentUserState] = useState<CurrentUser>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    return saved ? JSON.parse(saved) : INITIAL_CURRENT_USER;
  });

  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(INITIAL_SYSTEM_USERS);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED);
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Pure Cloud Firestore state (no localStorage caching)
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [shifts, setShifts] = useState<WorkShift[]>(INITIAL_WORK_SHIFTS);
  const [dtrRecords, setDtrRecords] = useState<DTRRecord[]>(INITIAL_DTR_RECORDS);
  const [dtrDrafts, setDtrDrafts] = useState<DTRDraftRecord[]>([]);
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>(INITIAL_PAY_PERIODS);
  const [payslips, setPayslips] = useState<Payslip[]>(INITIAL_PAYSLIPS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(INITIAL_COMPANY_PROFILE);
  const [thirteenthMonthRecords, setThirteenthMonthRecords] = useState<ThirteenthMonthRecord[]>(INITIAL_THIRTEENTH_MONTH_RECORDS);
  const [employeeDeductions, setEmployeeDeductions] = useState<EmployeeDeduction[]>(INITIAL_DEDUCTIONS);

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

  // Save session & auth state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, JSON.stringify(isAuthenticated));
  }, [isAuthenticated]);

  // Cloud Firestore database connection & synchronization states
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const isCloudInitializedRef = React.useRef<boolean>(false);

  // Test and initialize Firestore Cloud database connection on mount
  useEffect(() => {
    let isMounted = true;
    const initCloud = async () => {
      try {
        const connected = await testConnection();
        if (!isMounted) return;
        setIsCloudConnected(connected);

        if (connected && !isCloudInitializedRef.current) {
          setIsCloudSyncing(true);

          // 1. Employees
          const remoteEmployees = await getCollectionDocs<Employee>(COLLECTIONS.EMPLOYEES);
          if (remoteEmployees.length > 0) {
            setEmployees(remoteEmployees);
          } else {
            await seedCollectionIfEmpty(COLLECTIONS.EMPLOYEES, INITIAL_EMPLOYEES);
          }

          // 2. Shifts
          const remoteShifts = await getCollectionDocs<WorkShift>(COLLECTIONS.SHIFTS);
          if (remoteShifts.length > 0) {
            setShifts(remoteShifts);
          } else {
            await seedCollectionIfEmpty(COLLECTIONS.SHIFTS, INITIAL_WORK_SHIFTS);
          }

          // 3. Deductions
          const remoteDeductions = await getCollectionDocs<EmployeeDeduction>(COLLECTIONS.DEDUCTIONS);
          if (remoteDeductions.length > 0) {
            setEmployeeDeductions(remoteDeductions);
          } else {
            await seedCollectionIfEmpty(COLLECTIONS.DEDUCTIONS, INITIAL_DEDUCTIONS);
          }

          // 4. Pay Periods
          const remotePeriods = await getCollectionDocs<PayPeriod>(COLLECTIONS.PAY_PERIODS);
          if (remotePeriods.length > 0) {
            setPayPeriods(remotePeriods);
          } else {
            await seedCollectionIfEmpty(COLLECTIONS.PAY_PERIODS, INITIAL_PAY_PERIODS);
          }

          // 5. Payslips
          const remotePayslips = await getCollectionDocs<Payslip>(COLLECTIONS.PAYSLIPS);
          if (remotePayslips.length > 0) {
            setPayslips(remotePayslips);
          } else {
            await seedCollectionIfEmpty(COLLECTIONS.PAYSLIPS, INITIAL_PAYSLIPS);
          }

          // 6. Company Profile
          const remoteCompany = await getCollectionDocs<CompanyProfile>(COLLECTIONS.COMPANY_PROFILE);
          if (remoteCompany.length > 0 && remoteCompany[0]) {
            setCompanyProfile(remoteCompany[0]);
          } else {
            await syncDocToFirestore(COLLECTIONS.COMPANY_PROFILE, 'default', INITIAL_COMPANY_PROFILE);
          }

          // 7. DTR Records
          const remoteDTR = await getCollectionDocs<DTRRecord>(COLLECTIONS.DTR_RECORDS);
          if (remoteDTR.length > 0) {
            setDtrRecords(remoteDTR);
          } else {
            await seedCollectionIfEmpty(COLLECTIONS.DTR_RECORDS, INITIAL_DTR_RECORDS);
          }

          // 7b. DTR Drafts (Biometrics Staging)
          const remoteDrafts = await getCollectionDocs<DTRDraftRecord>(COLLECTIONS.DTR_DRAFTS);
          setDtrDrafts(remoteDrafts);

          // 8. 13th Month Records
          const remote13th = await getCollectionDocs<ThirteenthMonthRecord>(COLLECTIONS.THIRTEENTH_MONTH);
          if (remote13th.length > 0) {
            setThirteenthMonthRecords(remote13th);
          } else {
            await seedCollectionIfEmpty(COLLECTIONS.THIRTEENTH_MONTH, INITIAL_THIRTEENTH_MONTH_RECORDS, 'id');
          }

          // 9. System Users
          const remoteUsers = await getCollectionDocs<SystemUser>(COLLECTIONS.SYSTEM_USERS);
          if (remoteUsers.length > 0) {
            setSystemUsers(remoteUsers);
          } else {
            await seedCollectionIfEmpty(COLLECTIONS.SYSTEM_USERS, INITIAL_SYSTEM_USERS);
          }

          // 10. Audit Logs
          const remoteLogs = await getCollectionDocs<AuditLogEntry>(COLLECTIONS.AUDIT_LOGS);
          if (remoteLogs.length > 0) {
            setAuditLogs(remoteLogs);
          }

          if (isMounted) {
            isCloudInitializedRef.current = true;
            setIsCloudSyncing(false);
          }
        }
      } catch (err) {
        console.warn('[Firestore] Initialization notice:', err);
        if (isMounted) setIsCloudSyncing(false);
      }
    };
    initCloud();
    return () => {
      isMounted = false;
    };
  }, []);

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
    syncDocToFirestore(COLLECTIONS.AUDIT_LOGS, newEntry.id, newEntry);
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
    syncDocToFirestore(COLLECTIONS.SYSTEM_USERS, userMatch.id, { ...userMatch, lastLoginAt: now });

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

    syncDocToFirestore(COLLECTIONS.SYSTEM_USERS, newUser.id, newUser).then(ok => {
      if (!ok) showToast('Failed to save user account to database.', 'error');
    });

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

      syncDocToFirestore(COLLECTIONS.SYSTEM_USERS, id, updated).then(ok => {
        if (!ok) showToast('Failed to update user account in database.', 'error');
      });

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

    deleteDocFromFirestore(COLLECTIONS.SYSTEM_USERS, id).then(ok => {
      if (!ok) showToast('Failed to delete user account from database.', 'error');
    });

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

    syncDocToFirestore(COLLECTIONS.EMPLOYEES, newEmployee.id, newEmployee).then(ok => {
      if (!ok) showToast('Failed to save employee to cloud database.', 'error');
    });

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

      syncDocToFirestore(COLLECTIONS.EMPLOYEES, id, updated).then(ok => {
        if (!ok) showToast('Failed to update employee in database.', 'error');
      });

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
    deleteDocFromFirestore(COLLECTIONS.EMPLOYEES, id).then(ok => {
      if (!ok) showToast('Failed to delete employee from database.', 'error');
    });

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

    if (updatedRecord) {
      syncDocToFirestore(COLLECTIONS.DTR_RECORDS, (updatedRecord as DTRRecord).id, updatedRecord).then(ok => {
        if (!ok) showToast('Failed to save punch to database.', 'error');
      });
    }

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

      syncDocToFirestore(COLLECTIONS.DTR_RECORDS, id, updated).then(ok => {
        if (!ok) showToast('Failed to update DTR in database.', 'error');
      });

      const next = [...prev];
      next[idx] = updated;
      return next;
    });

    showToast('DTR Record updated successfully!');
  }, [currentUser, logAudit, showToast]);

  const batchUpdateDTRRecords = useCallback((recordsToUpsert: DTRRecord[], adjustmentReason?: string) => {
    if (!recordsToUpsert || recordsToUpsert.length === 0) return;

    batchSyncDocsToFirestore(COLLECTIONS.DTR_RECORDS, recordsToUpsert).then(ok => {
      if (!ok) showToast('Failed to save batch DTR records to database.', 'error');
    });

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
  }, [currentUser, logAudit, showToast]);

  const generateBulkDTR = useCallback((startDate: string, endDate: string, employeeIds?: string[]) => {
    const targetEmps = employeeIds && employeeIds.length > 0 
      ? employees.filter(e => employeeIds.includes(e.id))
      : employees.filter(e => e.status === 'active');

    const generated = generateSampleDTR(targetEmps, startDate, endDate);

    batchSyncDocsToFirestore(COLLECTIONS.DTR_RECORDS, generated).then(ok => {
      if (!ok) showToast('Failed to save bulk DTR records to database.', 'error');
    });

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

    // Save imported drafts to Cloud Firestore
    batchSyncDocsToFirestore(COLLECTIONS.DTR_DRAFTS, newDrafts).then(ok => {
      if (!ok) showToast('Failed to save biometric drafts to cloud database.', 'error');
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

      syncDocToFirestore(COLLECTIONS.DTR_DRAFTS, draftId, updated);

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
      syncDocToFirestore(COLLECTIONS.DTR_DRAFTS, draftId, { status: 'VALIDATED' });
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
    syncDocToFirestore(COLLECTIONS.DTR_DRAFTS, draftId, { status: 'REJECTED', rejectionReason: reason });
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
    const committedIds = new Set<string>(targetDrafts.map(d => d.id));
    setDtrDrafts(prev => prev.filter(d => !committedIds.has(d.id)));

    // Direct Firestore persistence: save official DTR records and remove drafts
    batchSyncDocsToFirestore(COLLECTIONS.DTR_RECORDS, newDTRRecords).then(ok => {
      if (!ok) showToast('Failed to save official DTR records to cloud database.', 'error');
    });

    const committedIdsList = Array.from(committedIds);
    if (committedIdsList.length > 0) {
      batchDeleteDocsFromFirestore(COLLECTIONS.DTR_DRAFTS, committedIdsList);
    }

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
    const allDraftIds = dtrDrafts.map(d => d.id);
    if (allDraftIds.length > 0) {
      batchDeleteDocsFromFirestore(COLLECTIONS.DTR_DRAFTS, allDraftIds);
    }
    setDtrDrafts([]);
    showToast('All DTR draft records cleared.', 'info');
  }, [dtrDrafts, showToast]);

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
        const totalDed = (payslip.lateUndertimeDeduction || 0) + (payslip.sssDeduction || 0) + (payslip.philhealthDeduction || 0) + (payslip.pagibigDeduction || 0) + withholdingTaxAmount + (payslip.cashAdvanceDeduction || 0) + (payslip.totalOtherDeductions || 0);
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

    // Synchronize deduction ledger records with newly generated payslips
    setEmployeeDeductions(prevDeds => {
      let hasChanges = false;
      const nextDeds = prevDeds.map(ded => {
        const empSlip = newPayslips.find(ps => ps.employeeId === ded.employeeId);
        if (!empSlip) return ded;

        const matchedItem = empSlip.otherDeductions?.find(
          od => od.name.includes(ded.deductionId) ||
                (ded.description && od.name.toLowerCase().includes(ded.description.toLowerCase()))
        );
        const amount = matchedItem && matchedItem.amount > 0 ? Math.round(matchedItem.amount * 100) / 100 : 0;
        const existingEntryIndex = ded.ledger.findIndex(
          entry => entry.payslipId === empSlip.id || (entry.payPeriodId === payPeriodId && entry.type === 'CUTOFF_DEDUCTION')
        );

        if (amount > 0) {
          if (existingEntryIndex >= 0) {
            if (ded.ledger[existingEntryIndex].credit !== amount) {
              hasChanges = true;
              const newLedger = [...ded.ledger];
              newLedger[existingEntryIndex] = {
                ...newLedger[existingEntryIndex],
                credit: amount,
                payslipId: empSlip.id,
                payPeriodId,
              };
              return recalculateDeductionLedger({ ...ded, ledger: newLedger });
            }
          } else {
            hasChanges = true;
            const newEntry: DeductionLedgerEntry = {
              id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              deductionId: ded.id,
              date: period.payoutDate || period.endDate || new Date().toISOString().split('T')[0],
              reference: payPeriodId,
              description: `Payroll Cutoff Deduction (${period.name || payPeriodId})`,
              type: 'CUTOFF_DEDUCTION',
              debit: 0,
              credit: amount,
              runningBalance: 0,
              remarks: `Cutoff deduction via payroll register`,
              payslipId: empSlip.id,
              payPeriodId,
              isManual: false,
              createdAt: new Date().toISOString(),
            };
            return recalculateDeductionLedger({ ...ded, ledger: [...ded.ledger, newEntry] });
          }
        } else if (existingEntryIndex >= 0) {
          hasChanges = true;
          const newLedger = ded.ledger.filter((_, idx) => idx !== existingEntryIndex);
          return recalculateDeductionLedger({ ...ded, ledger: newLedger });
        }

        return ded;
      });

      return hasChanges ? nextDeds : prevDeds;
    });

    // Update PayPeriod summary
    const updatedPeriod = {
      ...period,
      totalGrossPay: Math.round(totalGross * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalNetPay: Math.round(totalNet * 100) / 100,
      processedEmployeesCount: activeEmps.length,
      status: (period.status === 'Draft' ? 'Pending Review' : period.status) as PayPeriod['status'],
    };

    setPayPeriods(prev =>
      prev.map(p => {
        if (p.id === payPeriodId) {
          return updatedPeriod;
        }
        return p;
      })
    );

    // Direct Firestore persistence
    batchSyncDocsToFirestore(COLLECTIONS.PAYSLIPS, newPayslips).then(ok => {
      if (!ok) showToast('Failed to save payslips to cloud database.', 'error');
    });
    syncDocToFirestore(COLLECTIONS.PAY_PERIODS, payPeriodId, updatedPeriod).then(ok => {
      if (!ok) showToast('Failed to save payroll register to database.', 'error');
    });

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
    const slipsToDelete = payslips.filter(ps => ps.payPeriodId === payPeriodId).map(ps => ps.id);
    if (slipsToDelete.length > 0) {
      batchDeleteDocsFromFirestore(COLLECTIONS.PAYSLIPS, slipsToDelete);
    }

    // Delete all payslips for this period
    setPayslips(prev => prev.filter(ps => ps.payPeriodId !== payPeriodId));

    // Remove deduction payments tied to this cutoff period
    setEmployeeDeductions(prevDeds => {
      let hasChanges = false;
      const nextDeds = prevDeds.map(ded => {
        const hasMatchingEntry = ded.ledger.some(
          entry => entry.payPeriodId === payPeriodId || (entry.reference === payPeriodId && entry.type === 'CUTOFF_DEDUCTION')
        );
        if (!hasMatchingEntry) return ded;

        hasChanges = true;
        const newLedger = ded.ledger.filter(
          entry => entry.payPeriodId !== payPeriodId && !(entry.reference === payPeriodId && entry.type === 'CUTOFF_DEDUCTION')
        );
        return recalculateDeductionLedger({ ...ded, ledger: newLedger });
      });
      return hasChanges ? nextDeds : prevDeds;
    });

    const resetPeriod = {
      ...targetPeriod,
      totalGrossPay: 0,
      totalDeductions: 0,
      totalNetPay: 0,
      processedEmployeesCount: 0,
      status: 'Draft' as const,
    };

    // Reset the pay period summary
    setPayPeriods(prev =>
      prev.map(p => {
        if (p.id === payPeriodId) {
          return resetPeriod;
        }
        return p;
      })
    );

    syncDocToFirestore(COLLECTIONS.PAY_PERIODS, payPeriodId, resetPeriod).then(ok => {
      if (!ok) showToast('Failed to reset pay period in database.', 'error');
    });

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
    const slipsToDelete = payslips.filter(ps => ps.payPeriodId === payPeriodId).map(ps => ps.id);
    if (slipsToDelete.length > 0) {
      batchDeleteDocsFromFirestore(COLLECTIONS.PAYSLIPS, slipsToDelete);
    }
    deleteDocFromFirestore(COLLECTIONS.PAY_PERIODS, payPeriodId).then(ok => {
      if (!ok) showToast('Failed to delete pay period from database.', 'error');
    });

    // Remove all associated payslips
    setPayslips(prev => prev.filter(ps => ps.payPeriodId !== payPeriodId));

    // Remove deduction payments tied to this cutoff period
    setEmployeeDeductions(prevDeds => {
      let hasChanges = false;
      const nextDeds = prevDeds.map(ded => {
        const hasMatchingEntry = ded.ledger.some(
          entry => entry.payPeriodId === payPeriodId || (entry.reference === payPeriodId && entry.type === 'CUTOFF_DEDUCTION')
        );
        if (!hasMatchingEntry) return ded;

        hasChanges = true;
        const newLedger = ded.ledger.filter(
          entry => entry.payPeriodId !== payPeriodId && !(entry.reference === payPeriodId && entry.type === 'CUTOFF_DEDUCTION')
        );
        return recalculateDeductionLedger({ ...ded, ledger: newLedger });
      });
      return hasChanges ? nextDeds : prevDeds;
    });

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

    // Remove payment in deduction if payslip with deduction has been removed
    setEmployeeDeductions(prevDeds => {
      let hasChanges = false;
      const nextDeds = prevDeds.map(ded => {
        const hasMatchingEntry = ded.ledger.some(
          entry => entry.payslipId === payslipId || (ded.employeeId === targetPayslip.employeeId && entry.payPeriodId === targetPayslip.payPeriodId && entry.type === 'CUTOFF_DEDUCTION')
        );
        if (!hasMatchingEntry) return ded;

        hasChanges = true;
        const newLedger = ded.ledger.filter(
          entry => entry.payslipId !== payslipId && !(ded.employeeId === targetPayslip.employeeId && entry.payPeriodId === targetPayslip.payPeriodId && entry.type === 'CUTOFF_DEDUCTION')
        );
        return recalculateDeductionLedger({ ...ded, ledger: newLedger });
      });
      return hasChanges ? nextDeds : prevDeds;
    });

    deleteDocFromFirestore(COLLECTIONS.PAYSLIPS, payslipId).then(ok => {
      if (!ok) showToast('Failed to delete payslip from database.', 'error');
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

    batchDeleteDocsFromFirestore(COLLECTIONS.PAYSLIPS, payslipIds).then(ok => {
      if (!ok) showToast('Failed to delete selected payslips from database.', 'error');
    });

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
            const updatedP = {
              ...p,
              totalGrossPay: Math.round(totalGross * 100) / 100,
              totalDeductions: Math.round(totalDeds * 100) / 100,
              totalNetPay: Math.round(totalNet * 100) / 100,
              processedEmployeesCount: periodSlips.length,
            };
            syncDocToFirestore(COLLECTIONS.PAY_PERIODS, p.id, updatedP);
            return updatedP;
          }
          return p;
        })
      );

      return remaining;
    });

    // Remove payments in deduction for all deleted payslips
    setEmployeeDeductions(prevDeds => {
      let hasChanges = false;
      const nextDeds = prevDeds.map(ded => {
        const hasMatchingEntry = ded.ledger.some(entry => entry.payslipId && idsSet.has(entry.payslipId));
        if (!hasMatchingEntry) return ded;

        hasChanges = true;
        const newLedger = ded.ledger.filter(entry => !entry.payslipId || !idsSet.has(entry.payslipId));
        return recalculateDeductionLedger({ ...ded, ledger: newLedger });
      });
      return hasChanges ? nextDeds : prevDeds;
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

    if (updatedPeriodObj) {
      syncDocToFirestore(COLLECTIONS.PAY_PERIODS, payPeriodId, updatedPeriodObj).then(ok => {
        if (!ok) showToast('Failed to update pay period in database.', 'error');
      });
    }

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

      const updated = { ...target, status };
      syncDocToFirestore(COLLECTIONS.PAY_PERIODS, payPeriodId, updated).then(ok => {
        if (!ok) showToast('Failed to update pay period status in database.', 'error');
      });

      logAudit({
        action: status === 'Approved' ? 'PAYROLL_APPROVE' : 'STATUS_CHANGE',
        module: 'PAYROLL',
        targetId: payPeriodId,
        targetName: target.name,
        description: `Changed payroll status from ${target.status} to ${status}.`,
        changes: [{ field: 'status', fieldLabel: 'Payroll Status', oldValue: target.status, newValue: status }],
      });

      return prev.map(p => (p.id === payPeriodId ? updated : p));
    });

    // Also update constituent payslips
    setPayslips(prev =>
      prev.map(ps => {
        if (ps.payPeriodId === payPeriodId) {
          const updSlip = { ...ps, status: status === 'Approved' ? 'Approved' as const : 'Draft' as const };
          syncDocToFirestore(COLLECTIONS.PAYSLIPS, ps.id, updSlip);
          return updSlip;
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
      const totalDed = (updated.lateUndertimeDeduction || 0) + (updated.sssDeduction || 0) + (updated.philhealthDeduction || 0) + (updated.pagibigDeduction || 0) + withholdingTaxAmount + (updated.cashAdvanceDeduction || 0) + (updated.totalOtherDeductions || 0);
      updated.grossPay = Math.round(gross * 100) / 100;
      updated.totalDeductions = Math.round(totalDed * 100) / 100;
      updated.netPay = Math.max(0, Math.round((updated.grossPay - updated.totalDeductions) * 100) / 100);

      syncDocToFirestore(COLLECTIONS.PAYSLIPS, payslipId, updated).then(ok => {
        if (!ok) showToast('Failed to update payslip in database.', 'error');
      });

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

    // Synchronize employee deductions module when otherDeductions are modified
    if (updates.otherDeductions !== undefined) {
      const targetPayslip = payslips.find(ps => ps.id === payslipId);
      const empId = targetPayslip?.employeeId;
      const periodId = targetPayslip?.payPeriodId;

      if (empId && periodId) {
        setEmployeeDeductions(prevDeds => {
          let hasChanges = false;
          const nextDeds = prevDeds.map(ded => {
            if (ded.employeeId !== empId) return ded;

            // Check if updated payslip has a deduction matching this account
            const matchedItem = updates.otherDeductions?.find(
              od => od.name.includes(ded.deductionId) ||
                    (ded.description && od.name.toLowerCase().includes(ded.description.toLowerCase()))
            );
            const newAmount = matchedItem && matchedItem.amount > 0 ? Math.round(matchedItem.amount * 100) / 100 : 0;

            const existingEntryIndex = ded.ledger.findIndex(
              entry => entry.payslipId === payslipId || (entry.payPeriodId === periodId && entry.type === 'CUTOFF_DEDUCTION')
            );

            if (newAmount > 0) {
              if (existingEntryIndex >= 0) {
                if (ded.ledger[existingEntryIndex].credit !== newAmount) {
                  hasChanges = true;
                  const newLedger = [...ded.ledger];
                  newLedger[existingEntryIndex] = {
                    ...newLedger[existingEntryIndex],
                    credit: newAmount,
                    payslipId,
                    payPeriodId: periodId,
                  };
                  return recalculateDeductionLedger({ ...ded, ledger: newLedger });
                }
              } else {
                hasChanges = true;
                const period = payPeriods.find(p => p.id === periodId);
                const newEntry: DeductionLedgerEntry = {
                  id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  deductionId: ded.id,
                  date: period?.payoutDate || period?.endDate || new Date().toISOString().split('T')[0],
                  reference: periodId,
                  description: `Payroll Cutoff Deduction (${period?.name || periodId})`,
                  type: 'CUTOFF_DEDUCTION',
                  debit: 0,
                  credit: newAmount,
                  runningBalance: 0,
                  remarks: `Cutoff deduction via payslip ${payslipId}`,
                  payslipId,
                  payPeriodId: periodId,
                  isManual: false,
                  createdAt: new Date().toISOString(),
                };
                return recalculateDeductionLedger({ ...ded, ledger: [...ded.ledger, newEntry] });
              }
            } else if (existingEntryIndex >= 0) {
              hasChanges = true;
              const newLedger = ded.ledger.filter((_, idx) => idx !== existingEntryIndex);
              return recalculateDeductionLedger({ ...ded, ledger: newLedger });
            }

            return ded;
          });

          return hasChanges ? nextDeds : prevDeds;
        });
      }
    }

    showToast('Payslip updated and recalculation applied!');
  }, [logAudit, showToast, payslips, payPeriods]);

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

    syncDocToFirestore(COLLECTIONS.PAY_PERIODS, newPeriod.id, newPeriod).then(ok => {
      if (!ok) showToast('Failed to save pay period to database.', 'error');
    });

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

    syncDocToFirestore(COLLECTIONS.THIRTEENTH_MONTH, newRecord.id, newRecord).then(ok => {
      if (!ok) showToast('Failed to save 13th month record to database.', 'error');
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
        const updatedRecord = {
          ...r,
          status: 'Approved' as const,
          approvedAt: new Date().toISOString(),
          items: updatedItems,
        };
        syncDocToFirestore(COLLECTIONS.THIRTEENTH_MONTH, `13TH-${year}`, updatedRecord).then(ok => {
          if (!ok) showToast('Failed to update 13th month status in database.', 'error');
        });
        return updatedRecord;
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
    deleteDocFromFirestore(COLLECTIONS.THIRTEENTH_MONTH, `13TH-${year}`).then(ok => {
      if (!ok) showToast('Failed to delete 13th month record from database.', 'error');
    });

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

    syncDocToFirestore(COLLECTIONS.DEDUCTIONS, newDeduction.id, newDeduction).then(ok => {
      if (!ok) showToast('Failed to save deduction to cloud database.', 'error');
    });

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

      syncDocToFirestore(COLLECTIONS.DEDUCTIONS, id, nextDeduction).then(ok => {
        if (!ok) showToast('Failed to update deduction in database.', 'error');
      });

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
    deleteDocFromFirestore(COLLECTIONS.DEDUCTIONS, id).then(ok => {
      if (!ok) showToast('Failed to delete deduction from database.', 'error');
    });

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
      thirteenthMonthYear?: number;
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
      const thYear = payment.thirteenthMonthYear || (payment.reference?.startsWith('13TH-') ? parseInt(payment.reference.replace('13TH-', ''), 10) : undefined);

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
        thirteenthMonthYear: thYear,
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

      syncDocToFirestore(COLLECTIONS.DEDUCTIONS, updatedDeduction.id, updatedDeduction).then(ok => {
        if (!ok) showToast('Failed to save payment record to database.', 'error');
      });

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

  const adjustDeductionPrincipal = useCallback((
    deductionId: string,
    adjustment: {
      amount: number;
      date: string;
      reason?: string;
      reference?: string;
      remarks?: string;
      payPeriodId?: string;
    }
  ) => {
    setEmployeeDeductions(prev => {
      const idx = prev.findIndex(d => d.id === deductionId || d.deductionId === deductionId);
      if (idx < 0) return prev;

      const deduction = prev[idx];
      const adjAmount = Math.max(0, Number(adjustment.amount) || 0);
      if (adjAmount <= 0) return prev;

      const newPrincipal = Math.round((deduction.amount + adjAmount) * 100) / 100;
      const newTotalAmount = Math.round((deduction.totalAmount + adjAmount) * 100) / 100;
      const newRunningBalance = Math.round((deduction.runningBalance + adjAmount) * 100) / 100;

      const ref = adjustment.reference?.trim() || `ADJ-${Math.floor(100000 + Math.random() * 900000)}`;
      const desc = adjustment.reason?.trim() || 'Principal Increment Adjustment';

      const newEntry: DeductionLedgerEntry = {
        id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        deductionId: deduction.id,
        date: adjustment.date || new Date().toISOString().split('T')[0],
        reference: ref,
        description: desc,
        type: 'ADJUSTMENT',
        debit: adjAmount,
        credit: 0,
        runningBalance: newRunningBalance,
        remarks: adjustment.remarks?.trim() || undefined,
        payPeriodId: adjustment.payPeriodId,
        isManual: true,
        createdAt: new Date().toISOString(),
      };

      const updatedDeduction: EmployeeDeduction = {
        ...deduction,
        amount: newPrincipal,
        totalAmount: newTotalAmount,
        runningBalance: newRunningBalance,
        status: newRunningBalance > 0 ? 'Active' : deduction.status,
        ledger: [...deduction.ledger, newEntry],
        updatedAt: new Date().toISOString(),
      };

      syncDocToFirestore(COLLECTIONS.DEDUCTIONS, updatedDeduction.id, updatedDeduction).then(ok => {
        if (!ok) showToast('Failed to save principal adjustment to database.', 'error');
      });

      logAudit({
        action: 'DEDUCTION_UPDATE',
        module: 'DEDUCTION',
        targetId: deduction.deductionId,
        targetName: `${deduction.deductionId} - ${deduction.employeeName}`,
        description: `Added principal adjustment of ₱${adjAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} on ${deduction.deductionId} (${deduction.description}). Reason: ${desc}. New balance: ₱${newRunningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`,
      });

      const next = [...prev];
      next[idx] = updatedDeduction;
      return next;
    });

    showToast(`Principal adjusted by +₱${Number(adjustment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}. Balance updated!`, 'success');
  }, [logAudit, showToast]);

  const deleteDeductionLedgerEntry = useCallback((deductionId: string, entryId: string) => {
    setEmployeeDeductions(prev => {
      const idx = prev.findIndex(d => d.id === deductionId || d.deductionId === deductionId);
      if (idx < 0) return prev;

      const deduction = prev[idx];
      // Do not allow deleting initial grant entry
      const targetEntry = deduction.ledger.find(e => e.id === entryId || (e.reference && e.reference === entryId));
      if (!targetEntry || targetEntry.type === 'GRANT') {
        return prev;
      }

      const targetId = targetEntry.id;
      const filteredLedger = deduction.ledger.filter(e => e.id !== targetId);

      // Rebuild ledger running balance from scratch using standard calculation engine
      const updatedDeduction = recalculateDeductionLedger({
        ...deduction,
        ledger: filteredLedger,
      });

      syncDocToFirestore(COLLECTIONS.DEDUCTIONS, updatedDeduction.id, updatedDeduction).then(ok => {
        if (!ok) showToast('Failed to update deduction ledger in database.', 'error');
      });

      logAudit({
        action: 'DEDUCTION_UPDATE',
        module: 'DEDUCTION',
        targetId: deduction.deductionId,
        targetName: `${deduction.deductionId} - ${deduction.employeeName}`,
        description: `Deleted manual payment entry (₱${(targetEntry.credit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}) from ${deduction.deductionId}. Running balance recalculated to ₱${updatedDeduction.runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`,
      });

      const next = [...prev];
      next[idx] = updatedDeduction;
      return next;
    });

    showToast('Payment entry deleted and balance recalculated!', 'info');
  }, [logAudit, showToast]);

  const updateDeductionPayment = useCallback((
    deductionId: string,
    entryId: string,
    updates: {
      amount: number;
      date: string;
      remarks?: string;
      reference?: string;
      description?: string;
    }
  ) => {
    setEmployeeDeductions(prev => {
      const idx = prev.findIndex(d => d.id === deductionId || d.deductionId === deductionId);
      if (idx < 0) return prev;

      const deduction = prev[idx];
      const targetEntryIndex = deduction.ledger.findIndex(e => e.id === entryId);
      if (targetEntryIndex < 0) return prev;

      const targetEntry = deduction.ledger[targetEntryIndex];
      // Only manual payments can be edited (not GRANT, not payslip connected)
      if (targetEntry.type === 'GRANT' || targetEntry.payslipId) {
        showToast('Cannot edit this payment entry directly.', 'error');
        return prev;
      }

      const newAmount = Math.max(0, updates.amount);
      const updatedEntry: DeductionLedgerEntry = {
        ...targetEntry,
        credit: newAmount,
        date: updates.date || targetEntry.date,
        remarks: updates.remarks !== undefined ? updates.remarks.trim() : targetEntry.remarks,
        description: updates.description !== undefined ? updates.description.trim() : targetEntry.description,
        reference: updates.reference !== undefined ? updates.reference.trim() : targetEntry.reference,
      };

      const newLedger = [...deduction.ledger];
      newLedger[targetEntryIndex] = updatedEntry;

      const recalculated = recalculateDeductionLedger({
        ...deduction,
        ledger: newLedger,
      });

      syncDocToFirestore(COLLECTIONS.DEDUCTIONS, recalculated.id, recalculated).then(ok => {
        if (!ok) showToast('Failed to save payment updates to database.', 'error');
      });

      logAudit({
        action: 'DEDUCTION_UPDATE',
        module: 'DEDUCTION',
        targetId: deduction.deductionId,
        targetName: `${deduction.deductionId} - ${deduction.employeeName}`,
        description: `Updated manual payment of ₱${newAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} on ${deduction.deductionId}. New running balance: ₱${recalculated.runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`,
      });

      const next = [...prev];
      next[idx] = recalculated;
      return next;
    });

    showToast('Manual payment updated successfully!', 'success');
  }, [logAudit, showToast]);

  const getEmployeeDeductions = useCallback((employeeId: string) => {
    return employeeDeductions.filter(d => d.employeeId === employeeId);
  }, [employeeDeductions]);

  const updateThirteenthMonthItem = useCallback((
    year: number,
    employeeId: string,
    updates: Partial<ThirteenthMonthItem>,
    applyToLedger: boolean = true
  ) => {
    let affectedEmployeeName = '';
    setThirteenthMonthRecords(prev => {
      return prev.map(record => {
        if (record.year !== year) return record;

        const updatedItems = record.items.map(item => {
          if (item.employeeId !== employeeId) return item;

          affectedEmployeeName = item.employeeName;
          const merged = { ...item, ...updates };
          const baseBonus = Number(merged.thirteenthMonthPay) || 0;
          const incentives = Number(merged.incentives) || 0;
          const otherEarnings = Number(merged.otherEarnings) || 0;
          const totalGross = Math.round((baseBonus + incentives + otherEarnings) * 100) / 100;
          const deds = merged.deductions || [];
          const totalDeds = Math.round(deds.reduce((sum, d) => sum + (Number(d.amount) || 0), 0) * 100) / 100;
          const net = Math.max(0, Math.round((totalGross - totalDeds) * 100) / 100);

          return {
            ...merged,
            thirteenthMonthPay: baseBonus,
            incentives,
            otherEarnings,
            totalGrossPay: totalGross,
            totalDeductions: totalDeds,
            netPay: net,
            status: 'adjusted' as const,
          };
        });

        const totalThirteenthMonthPay = Math.round(updatedItems.reduce((s, i) => s + (i.totalGrossPay ?? i.thirteenthMonthPay), 0) * 100) / 100;
        const totalDeductions = Math.round(updatedItems.reduce((s, i) => s + (i.totalDeductions || 0), 0) * 100) / 100;
        const totalNetPay = Math.round(updatedItems.reduce((s, i) => s + (i.netPay !== undefined ? i.netPay : (i.totalGrossPay ?? i.thirteenthMonthPay)), 0) * 100) / 100;

        return {
          ...record,
          totalThirteenthMonthPay,
          totalDeductions,
          totalNetPay,
          items: updatedItems,
        };
      });
    });

    // Automatically record payment in employee deductions module
    if (applyToLedger && updates.deductions) {
      updates.deductions.forEach(dedItem => {
        if (dedItem.deductionId && dedItem.amount > 0) {
          recordDeductionPayment(dedItem.deductionId, {
            amount: dedItem.amount,
            date: new Date().toISOString().split('T')[0],
            reference: `13TH-${year}`,
            description: `13th Month Pay Deduction (${year})`,
            remarks: dedItem.remarks || `Settled via 13th Month Pay Voucher for Year ${year}`,
            type: 'PAYMENT',
            thirteenthMonthYear: year,
            isManual: true,
          });
        }
      });
    }

    logAudit({
      action: 'PAYSLIP_EDIT',
      module: 'PAYROLL',
      targetId: `13TH-${year}-${employeeId}`,
      targetName: `13th Month Voucher (${year})`,
      description: `Updated 13th Month Pay voucher gross/incentives/deductions for ${affectedEmployeeName || employeeId} (${year}).`,
    });

    showToast('13th Month Pay voucher updated successfully!', 'success');
  }, [recordDeductionPayment, logAudit, showToast]);

  const updateCompanyProfile = useCallback((updates: Partial<CompanyProfile>) => {
    setCompanyProfile(prev => {
      const next = { ...prev, ...updates };

      syncDocToFirestore(COLLECTIONS.COMPANY_PROFILE, 'default', next).then(ok => {
        if (!ok) showToast('Failed to save company settings to database.', 'error');
      });

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
    localStorage.clear();

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

    // Re-seed Cloud database
    seedCollectionIfEmpty(COLLECTIONS.EMPLOYEES, INITIAL_EMPLOYEES);
    seedCollectionIfEmpty(COLLECTIONS.SHIFTS, INITIAL_WORK_SHIFTS);
    seedCollectionIfEmpty(COLLECTIONS.DEDUCTIONS, INITIAL_DEDUCTIONS);
    seedCollectionIfEmpty(COLLECTIONS.PAY_PERIODS, INITIAL_PAY_PERIODS);
    seedCollectionIfEmpty(COLLECTIONS.PAYSLIPS, INITIAL_PAYSLIPS);
    syncDocToFirestore(COLLECTIONS.COMPANY_PROFILE, 'default', INITIAL_COMPANY_PROFILE);

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
        updateThirteenthMonthItem,
        employeeDeductions,
        addEmployeeDeduction,
        updateEmployeeDeduction,
        deleteEmployeeDeduction,
        recordDeductionPayment,
        updateDeductionPayment,
        adjustDeductionPrincipal,
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
        isCloudConnected,
        isCloudSyncing,
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
