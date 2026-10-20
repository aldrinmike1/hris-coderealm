export type UserRole = 'super admin' | 'admin' | 'manager' | 'staff' | 'super_admin';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'super admin' | 'admin' | 'manager' | 'staff';
  department?: string;
  position?: string;
  status: 'active' | 'inactive';
  password?: string;
  avatarUrl?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export type EmployeeStatus = 'active' | 'inactive';

export interface EmergencyContact {
  name: string;
  relationship: string;
  mobile: string;
  address?: string;
}

export interface Employee {
  id: string; // Unique ID
  employeeNumber: string; // e.g. "EMP-2024-001"
  firstName: string;
  lastName: string;
  middleInitial?: string;
  nickname?: string;
  email: string;
  mobile: string;
  address: string;
  birthday: string; // YYYY-MM-DD
  emergencyContact: EmergencyContact;
  sssNumber: string; // e.g. "34-1234567-8"
  philhealthNumber: string; // e.g. "12-345678901-2"
  pagibigNumber: string; // e.g. "1234-5678-9012"
  dateStarted: string; // YYYY-MM-DD
  dateResigned?: string | null; // YYYY-MM-DD or null/undefined
  biometrixId: string; // e.g. "BIO-101"
  dailyRate: number; // e.g. 850 (PHP)
  status: EmployeeStatus;
  
  // Additional essential HR fields
  role: UserRole;
  department: string;
  position: string;
  tinNumber?: string;
  avatarUrl?: string;
  employmentType?: 'Regular' | 'Probationary' | 'Contractual' | 'Part-time';
  mlsDeduction?: number; // Member Loan Scheme / Monthly Loan Sinking deduction
  cashAdvanceDeduction?: number; // Cash Advance / Vale deduction
  restDays?: string[]; // e.g. ['Sunday'] or ['Saturday', 'Sunday']
  shiftId?: string; // Assigned WorkShift ID (used to calculate tardiness/late)

  // Government Contribution & Tax calculation toggles
  sssEnabled?: boolean;
  philhealthEnabled?: boolean;
  pagibigEnabled?: boolean;
  tinEnabled?: boolean;
}

export type DTRStatus = 'Present' | 'Late' | 'Half Day' | 'Absent' | 'On Leave' | 'Rest Day' | 'Holiday';

export type DayType = 'Regular Working Day' | 'Rest Day' | 'Regular Holiday' | 'Special Non-Working Holiday';

export interface DTRPunchPair {
  timeIn: string;
  timeOut: string | null;
  durationMinutes?: number;
  durationHours?: number;
}

export type DTRAnomalyType = 
  | 'INCOMPLETE_PUNCH' // Odd number of punches (e.g. In without Out)
  | 'MULTIPLE_PUNCHES' // More than 4 punches in a day
  | 'RAPID_PUNCH' // Duplicate consecutive punches < 2 minutes apart
  | 'UNMATCHED_EMPLOYEE' // Person ID in biometrics not mapped to employee roster
  | 'EXCESSIVE_HOURS' // Worked > 14 hours
  | 'OUT_OF_SEQUENCE' // Out time before In time
  | 'INVALID_SEQUENCE'
  | 'NO_PUNCHES';

export interface DTRAnomaly {
  type: DTRAnomalyType;
  severity: 'warning' | 'error' | 'info';
  message: string;
  punchIndex?: number;
}

export interface DTRDraftRecord {
  id: string;
  biometrixPersonId: string;
  biometrixId?: string;
  employeeId?: string;
  employeeNumber?: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  rawPunches: string[]; // e.g. ["08:09:48", "12:01:59", "12:57:10", "16:20:19"]
  punchPairs: DTRPunchPair[];
  totalHours: number; // e.g. 7.3
  totalMinutes: number;
  overtimeHours: number; // e.g. 1.5 (rounded down by 30 mins after 8 hrs)
  undertimeMinutes: number; // e.g. 43
  undertimeHours: number; // e.g. 0.72
  lateMinutes?: number; // e.g. 15
  anomalies: DTRAnomaly[];
  status: 'PENDING' | 'VALIDATED' | 'REJECTED' | 'COMMITTED';
  rejectionReason?: string;
  isEdited?: boolean;
  remarks?: string;
}

export interface DTRRecord {
  id: string;
  employeeId: string;
  employeeNumber: string;
  biometrixId?: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  dayType: DayType;
  
  timeIn: string | null; // HH:mm format, e.g. "08:00"
  timeOut: string | null; // HH:mm format, e.g. "17:00"
  punchPairs?: DTRPunchPair[];
  rawPunches?: string[];
  
  regularHours: number; // e.g. 8
  totalHours?: number; // e.g. 8.2 or 12.5
  lateMinutes: number; // e.g. 15
  undertimeMinutes: number; // e.g. 0
  undertimeHours?: number; // e.g. 2.63
  overtimeHours: number; // e.g. 2.0 (rounded down by 30 mins)
  nightDiffHours: number; // e.g. 0
  
  status: DTRStatus;
  remarks?: string;
  source: 'Biometrics' | 'Manual' | 'Web Punch' | 'Adjustment';
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export interface PeriodHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string; // e.g. "National Heroes Day"
  type: 'Regular Holiday' | 'Special Non-Working Holiday';
}

export interface PayPeriod {
  id: string;
  name: string; // e.g., "August 15 - 21, 2026 (Weekly Cutoff)"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  payoutDate: string; // YYYY-MM-DD
  status: 'Draft' | 'Pending Review' | 'Approved';
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  processedEmployeesCount: number;
  holidays?: PeriodHoliday[];
  createdAt: string;
  isLastCutoffOfMonth?: boolean; // True if this cutoff is the final payroll of the calendar month
}

export interface PayslipItem {
  name: string;
  amount: number;
}

export interface Payslip {
  id: string;
  payPeriodId: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  department: string;
  position: string;
  dailyRate: number;
  hourlyRate: number;
  
  // DTR summary for period
  daysWorked: number;
  lateMinutes: number;
  undertimeMinutes: number;
  overtimeHours: number;
  holidayDays: number;
  regularHolidayDays?: number;
  specialHolidayDays?: number;
  wdoHours?: number; // Work Day Off / Rest Day Work hours
  
  // Earnings
  basicPay: number;
  overtimePay: number;
  holidayPay: number;
  wdoPay?: number; // Work Day Off / Rest Day Pay (130% premium)
  nightDiffHours?: number; // Night Differential hours (10 PM to 6 AM)
  nightDiffPay?: number; // Night Differential Pay (10% premium)
  allowances: PayslipItem[];
  totalAllowances: number;
  grossPay: number;
  
  // Deductions
  lateUndertimeDeduction: number;
  sssDeduction: number;
  sssEmployerShare: number;
  philhealthDeduction: number;
  philhealthEmployerShare: number;
  pagibigDeduction: number;
  pagibigEmployerShare: number;
  withholdingTax: number;
  mlsDeduction: number; // Member Loan Scheme / Monthly Loan Sinking deduction
  cashAdvanceDeduction?: number; // Cash Advance / Vale deduction
  otherDeductions: PayslipItem[];
  totalOtherDeductions: number;
  totalDeductions: number;
  
  // Net
  netPay: number;
  
  // Status & Manual Adjustments
  status: 'Draft' | 'Approved';
  paymentDate?: string;
  remarks?: string;
  generatedAt: string;
  isManuallyAdjusted?: boolean;
  manualOverrides?: Partial<Payslip>;
}

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'STATUS_CHANGE' 
  | 'DTR_PUNCH' 
  | 'DTR_ADJUSTMENT' 
  | 'PAYROLL_CALCULATE' 
  | 'PAYROLL_APPROVE' 
  | 'PAYSLIP_EDIT'
  | 'DEDUCTION_CREATE'
  | 'DEDUCTION_UPDATE'
  | 'DEDUCTION_DELETE'
  | 'DEDUCTION_PAYMENT'
  | 'LOGIN';

export type AuditModule = 'EMPLOYEE' | 'DTR' | 'PAYROLL' | 'DEDUCTION' | 'AUTH' | 'SYSTEM' | 'SETTINGS';

export interface FieldDiff {
  field: string;
  fieldLabel: string;
  oldValue: any;
  newValue: any;
}

export type NavigationTab =
  | 'dashboard'
  | 'employees'
  | 'dtr'
  | 'payroll'
  | 'deductions'
  | 'thirteenth-month'
  | 'users'
  | 'audit'
  | 'settings'
  | 'sss-matrix';

// ==========================================
// DEDUCTION MODULE TYPES
// ==========================================

export type DeductionType = 'Loan' | 'Salary Deduction' | 'Others';
export type DeductionStatus = 'Active' | 'Completed' | 'Paused';

export interface DeductionLedgerEntry {
  id: string;
  deductionId: string;
  date: string; // YYYY-MM-DD
  reference: string; // e.g. "DED-2026-001-GRANT", "PP-2026-W36", "OR-1002"
  description: string; // e.g. "Initial Loan Grant", "Weekly Cutoff Deduction", "Over-the-counter Cash Payment"
  type: 'GRANT' | 'CUTOFF_DEDUCTION' | 'PAYMENT' | 'ADJUSTMENT';
  debit: number; // Addition to balance (principal, interest, fee)
  credit: number; // Subtraction from balance (deduction, payment)
  runningBalance: number; // Balance after transaction
  remarks?: string;
  payslipId?: string; // Connected payslip ID if linked to a payslip
  payPeriodId?: string; // Connected pay period ID
  isManual?: boolean; // Whether the payment was manually recorded (true) or payroll-deducted (false)
  createdAt: string;
}

export type DeductionPaymentRecord = DeductionLedgerEntry;

export interface EmployeeDeduction {
  id: string;
  deductionId: string; // e.g. "DED-2026-001"
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department?: string;
  position?: string;
  description: string; // e.g. "SSS Salary Loan", "Company Emergency Loan", "Uniform Deduction"
  amount: number; // Principal Amount
  interest: number; // Interest amount (or interest rate percentage)
  interestType?: 'fixed' | 'percentage';
  interestRate?: number; // e.g. 5 for 5%
  totalAmount: number; // Principal + Interest (Total obligation)
  date: string; // Date granted/effective (YYYY-MM-DD)
  type: DeductionType; // 'Loan' | 'Salary Deduction' | 'Others'
  cutoffDeductionAmount: number; // Amount to deduct per cutoff period
  totalPaid: number; // Total amount paid/deducted so far
  runningBalance: number; // Remaining outstanding balance
  status: DeductionStatus; // 'Active' | 'Completed' | 'Paused'
  ledger: DeductionLedgerEntry[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeWithDeductionSummary {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  department: string;
  position: string;
  avatarUrl?: string;
  totalDeductionsCount: number;
  activeDeductionsCount: number;
  totalOriginalAmount: number;
  totalPaid: number;
  totalRunningBalance: number;
  totalCutoffDeductionAmount: number;
  deductions: EmployeeDeduction[];
}

export interface ThirteenthMonthItem {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  department: string;
  position: string;
  dailyRate: number;
  monthsWorkedCount: number; // e.g. 12
  totalBasicSalaryEarned: number; // Sum of annual basic salary
  thirteenthMonthPay: number; // (totalBasicSalaryEarned / 12)
  taxableAmount: number; // Portion exceeding ₱90,000 threshold
  status: 'Draft' | 'Approved' | 'Paid';
  paymentDate?: string;
  remarks?: string;
}

export interface ThirteenthMonthRecord {
  id: string; // e.g. "13TH-2026"
  year: number; // e.g. 2026
  status: 'Draft' | 'Approved' | 'Paid';
  totalEmployees: number;
  totalBasicEarnings: number;
  totalThirteenthMonthPay: number;
  payoutDate: string; // e.g. "2026-12-15"
  generatedAt: string;
  approvedAt?: string;
  items: ThirteenthMonthItem[];
}

export interface WorkShift {
  id: string; // e.g. "shift-regular"
  name: string; // e.g. "Regular Day Shift (08:00 AM - 05:00 PM)"
  startTime: string; // "08:00" in 24h format HH:mm
  endTime: string; // "17:00" in 24h format HH:mm
  gracePeriodMinutes: number; // e.g. 5
  breakMinutes?: number; // e.g. 60
  description?: string;
  isDefault?: boolean;
}

export interface CompanyProfile {
  name: string;
  address: string;
  contactNumber?: string;
  email?: string;
  tin?: string;
  rdo?: string;
  logoUrl?: string; // Company logo data URL or asset URL
  enableLateDeduction?: boolean; // Default true. When false, late minutes are tracked in attendance but excluded from payroll deductions
  enableNightShiftPay?: boolean; // Default false (off). When on, 10% night differential is included in payslip calculations
  enableWithholdingTax?: boolean; // Default false (Disabled). When disabled, withholding tax is hidden on adjustment forms & payslips
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO String
  action: AuditAction;
  module: AuditModule;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: UserRole;
  targetId: string; // Entity ID (e.g. Employee ID or DTR ID)
  targetName: string; // Entity Name or summary description
  description: string;
  changes?: FieldDiff[];
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: string;
  avatarUrl?: string;
  department?: string;
  position?: string;
}
