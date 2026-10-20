import { Employee, DTRRecord, PayPeriod, PeriodHoliday, Payslip, AuditLogEntry, CurrentUser, CompanyProfile, ThirteenthMonthRecord, SystemUser, WorkShift, EmployeeDeduction } from '../types';
import { generateEmployeePayslip } from '../utils/calculations';
import { SAMPLE_BIOMETRIC_DATA_CSV, generateDTRRecordsFromBiometricCSV } from '../utils/biometricsParser';

export const INITIAL_WORK_SHIFTS: WorkShift[] = [
  {
    id: 'shift-regular',
    name: 'Regular Day Shift (08:00 AM - 05:00 PM)',
    startTime: '08:00',
    endTime: '17:00',
    gracePeriodMinutes: 5,
    breakMinutes: 60,
    description: 'Standard 8-hour working shift with 5 minutes grace period for punctuality',
    isDefault: true,
  },
  {
    id: 'shift-morning',
    name: 'Early Morning Shift (07:00 AM - 04:00 PM)',
    startTime: '07:00',
    endTime: '16:00',
    gracePeriodMinutes: 5,
    breakMinutes: 60,
    description: 'Early morning shift for opening operations, facilities, and logistics staff',
    isDefault: false,
  },
  {
    id: 'shift-mid',
    name: 'Mid / Afternoon Shift (09:00 AM - 06:00 PM)',
    startTime: '09:00',
    endTime: '18:00',
    gracePeriodMinutes: 5,
    breakMinutes: 60,
    description: 'Mid-day corporate schedule with tardiness calculated after 09:05 AM',
    isDefault: false,
  },
  {
    id: 'shift-night',
    name: 'Night Shift Differential (10:00 PM - 06:00 AM)',
    startTime: '22:00',
    endTime: '06:00',
    gracePeriodMinutes: 5,
    breakMinutes: 60,
    description: 'Graveyard shift eligible for Philippine 10% Night Shift Differential',
    isDefault: false,
  },
];

export const INITIAL_SYSTEM_USERS: SystemUser[] = [
  {
    id: 'usr-super-admin-1',
    name: 'Maria Santos',
    email: 'superadmin@hris-corp.ph',
    role: 'super admin',
    department: 'Executive Management',
    position: 'Chief Systems Administrator',
    status: 'active',
    password: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: '2026-09-07T08:00:00.000Z',
  },
  {
    id: 'usr-admin-1',
    name: 'Juan Dela Cruz',
    email: 'admin@hris-corp.ph',
    role: 'admin',
    department: 'Human Resources',
    position: 'HR Manager & System Admin',
    status: 'active',
    password: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: '2026-09-07T08:00:00.000Z',
  },
  {
    id: 'usr-admin-2',
    name: 'Leandro San Andres',
    email: 'leandro.sanandres@hris.ph',
    role: 'admin',
    department: 'Operations',
    position: 'Operations System Admin',
    status: 'active',
    password: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-02-15T00:00:00.000Z',
    lastLoginAt: '2026-09-05T10:00:00.000Z',
  },
];

export const INITIAL_COMPANY_PROFILE: CompanyProfile = {
  name: 'Enterprise Holdings Corp. (PH)',
  address: '32nd Floor, Corporate Tower, Bonifacio Global City, Taguig City, Philippines',
  contactNumber: '+63 (02) 8888-7000',
  email: 'hr@enterprise-holdings.ph',
  tin: '008-123-456-000',
  rdo: 'RDO 044 - Taguig',
  logoUrl: undefined,
  enableLateDeduction: true,
  enableNightShiftPay: false,
  enableWithholdingTax: false,
};

export const INITIAL_CURRENT_USER: CurrentUser = {
  id: 'usr-admin-1',
  name: 'Juan Dela Cruz',
  email: 'admin@hris-corp.ph',
  role: 'admin',
  department: 'Executive / HR',
  position: 'HR Director',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
};

export const DEMO_USERS: CurrentUser[] = [
  {
    id: 'usr-demo-admin-1',
    name: 'Juan Dela Cruz',
    email: 'juan.admin@hris.ph',
    role: 'admin',
    department: 'Human Resources',
    position: 'HR Director',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-mgr-1',
    name: 'Leandro San Andres',
    email: 'leandro.sanandres@hris.ph',
    role: 'manager',
    department: 'Engineering & Operations',
    position: 'Senior Operations Lead',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-staff-1',
    name: 'Joshua Fontanilla',
    email: 'joshua.fontanilla@hris.ph',
    role: 'staff',
    employeeId: 'emp-006',
    department: 'Engineering & Operations',
    position: 'Field Operations Engineer',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  },
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-006',
    employeeNumber: 'EMP-006',
    firstName: 'Joshua',
    lastName: 'Fontanilla',
    email: 'joshua.fontanilla@hris.ph',
    mobile: '0916-222-3344',
    address: '29 Jupiter St., Bel-Air, Makati City, Metro Manila',
    birthday: '1996-04-25',
    emergencyContact: {
      name: 'Gabriel Fontanilla',
      relationship: 'Brother',
      mobile: '0919-444-5566',
      address: 'Makati City',
    },
    sssNumber: '03-9182740-9',
    philhealthNumber: '18-291039482-0',
    pagibigNumber: '2910-4829-1049',
    dateStarted: '2023-03-01',
    dateResigned: null,
    biometrixId: '006',
    dailyRate: 850,
    status: 'active',
    role: 'staff',
    department: 'Engineering & Operations',
    position: 'Field Operations Engineer',
    tinNumber: '192-839-401-000',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    employmentType: 'Regular',
    restDays: ['Sunday'],
    shiftId: 'shift-regular',
  },
  {
    id: 'emp-007',
    employeeNumber: 'EMP-007',
    firstName: 'Pacifico',
    lastName: 'Abapo',
    email: 'pacifico.abapo@hris.ph',
    mobile: '0917-889-1122',
    address: '52 Boni Ave., Mandaluyong City, Metro Manila',
    birthday: '1991-08-14',
    emergencyContact: {
      name: 'Maria Abapo',
      relationship: 'Spouse',
      mobile: '0917-111-2233',
      address: 'Mandaluyong City',
    },
    sssNumber: '34-8829102-1',
    philhealthNumber: '12-990182736-4',
    pagibigNumber: '1182-9920-3847',
    dateStarted: '2022-09-01',
    dateResigned: null,
    biometrixId: '007',
    dailyRate: 850,
    status: 'active',
    role: 'staff',
    department: 'Engineering & Operations',
    position: 'Technician Specialist',
    tinNumber: '382-910-294-000',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    employmentType: 'Regular',
    restDays: ['Sunday'],
    shiftId: 'shift-regular',
  },
  {
    id: 'emp-008',
    employeeNumber: 'EMP-008',
    firstName: 'Jerome',
    lastName: 'Guitguit',
    email: 'jerome.guitguit@hris.ph',
    mobile: '0928-112-9988',
    address: '104 Shaw Blvd., Pasig City, Metro Manila',
    birthday: '1994-02-18',
    emergencyContact: {
      name: 'Lita Guitguit',
      relationship: 'Mother',
      mobile: '0918-444-3322',
      address: 'Pasig City',
    },
    sssNumber: '02-7718290-8',
    philhealthNumber: '15-110293847-9',
    pagibigNumber: '3391-0293-8472',
    dateStarted: '2023-05-15',
    dateResigned: null,
    biometrixId: '008',
    dailyRate: 850,
    status: 'active',
    role: 'staff',
    department: 'Engineering & Operations',
    position: 'Systems Support Engineer',
    tinNumber: '772-910-283-000',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    employmentType: 'Regular',
    restDays: ['Sunday'],
    shiftId: 'shift-regular',
  },
  {
    id: 'emp-009',
    employeeNumber: 'EMP-009',
    firstName: 'Leandro',
    lastName: 'San Andres',
    email: 'leandro.sanandres@hris.ph',
    mobile: '0919-777-8899',
    address: '18 Marcos Highway, Marikina City, Metro Manila',
    birthday: '1993-10-09',
    emergencyContact: {
      name: 'Teresa San Andres',
      relationship: 'Spouse',
      mobile: '0920-555-1122',
      address: 'Marikina City',
    },
    sssNumber: '33-8819203-4',
    philhealthNumber: '19-228192039-1',
    pagibigNumber: '8829-1029-3847',
    dateStarted: '2022-04-01',
    dateResigned: null,
    biometrixId: '009',
    dailyRate: 900,
    status: 'active',
    role: 'staff',
    department: 'Engineering & Operations',
    position: 'Senior Operations Engineer',
    tinNumber: '551-928-102-000',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    employmentType: 'Regular',
    restDays: ['Sunday'],
    shiftId: 'shift-mid',
  },
  {
    id: 'emp-010',
    employeeNumber: 'EMP-010',
    firstName: 'Raymond',
    lastName: 'Ole',
    email: 'raymond.ole@hris.ph',
    mobile: '0908-444-5566',
    address: '88 Commonwealth Ave., Quezon City, Metro Manila',
    birthday: '1990-06-30',
    emergencyContact: {
      name: 'Gina Ole',
      relationship: 'Spouse',
      mobile: '0917-888-2211',
      address: 'Quezon City',
    },
    sssNumber: '33-1029384-7',
    philhealthNumber: '14-920192847-8',
    pagibigNumber: '9201-9482-1029',
    dateStarted: '2022-01-15',
    dateResigned: null,
    biometrixId: '010',
    dailyRate: 850,
    status: 'active',
    role: 'staff',
    department: 'Engineering & Operations',
    position: 'Infrastructure Support',
    tinNumber: '910-293-847-000',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    employmentType: 'Regular',
    restDays: ['Sunday'],
    shiftId: 'shift-regular',
  },
  {
    id: 'emp-001',
    employeeNumber: 'EMP-001',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    email: 'juan.delacruz@hris.ph',
    mobile: '0917-123-4567',
    address: '123 Mahogany St., Ayala Alabang, Muntinlupa City, Metro Manila',
    birthday: '1988-05-14',
    emergencyContact: {
      name: 'Elena Dela Cruz',
      relationship: 'Spouse',
      mobile: '0917-987-6543',
      address: 'Same as employee address',
    },
    sssNumber: '34-5829103-9',
    philhealthNumber: '12-059283719-4',
    pagibigNumber: '1284-9021-3482',
    dateStarted: '2021-02-15',
    dateResigned: null,
    biometrixId: '001',
    dailyRate: 1500,
    status: 'active',
    role: 'admin',
    department: 'Human Resources',
    position: 'HR Director',
    tinNumber: '293-182-940-000',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    employmentType: 'Regular',
    restDays: ['Saturday', 'Sunday'],
  },
];

// Helper to generate realistic DTR records for an employee across a date range
export function generateSampleDTR(employees: Employee[], startDate = '2026-08-15', endDate = '2026-08-21'): DTRRecord[] {
  const records: DTRRecord[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  employees.forEach((emp) => {
    if (emp.status !== 'active') return;
    const empRestDays = (emp.restDays && emp.restDays.length > 0) ? emp.restDays : ['Sunday'];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeekNum = d.getDay(); // 0 = Sunday, 6 = Saturday
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = days[dayOfWeekNum];

      const isRestDay = empRestDays.includes(dayOfWeek);
      let dayType: DTRRecord['dayType'] = isRestDay ? 'Rest Day' : 'Regular Working Day';
      
      // Aug 10 Holiday simulation
      if (dateStr === '2026-08-10') {
        dayType = 'Special Non-Working Holiday';
      }

      let timeIn: string | null = null;
      let timeOut: string | null = null;
      let regularHours = 0;
      let lateMinutes = 0;
      let undertimeMinutes = 0;
      let overtimeHours = 0;
      let status: DTRRecord['status'] = isRestDay ? 'Rest Day' : 'Present';

      if (!isRestDay && dayType !== 'Special Non-Working Holiday') {
        // Vary times based on employee ID
        const seed = (d.getDate() + parseInt(emp.employeeNumber.slice(-2) || '1')) % 10;
        
        if (seed === 7) {
          // Late
          timeIn = '08:24';
          timeOut = '17:05';
          lateMinutes = 24;
          regularHours = 8;
          status = 'Late';
        } else if (seed === 8 && emp.id === 'emp-3') {
          // Overtime
          timeIn = '07:55';
          timeOut = '19:30';
          regularHours = 8;
          overtimeHours = 2.5;
          status = 'Present';
        } else if (seed === 9 && emp.id === 'emp-5') {
          // Half day
          timeIn = '08:00';
          timeOut = '12:00';
          regularHours = 4;
          status = 'Half Day';
        } else {
          // Normal on-time day
          timeIn = seed % 2 === 0 ? '07:52' : '07:58';
          timeOut = seed % 3 === 0 ? '17:15' : '17:02';
          regularHours = 8;
          status = 'Present';
        }
      } else if (dayType === 'Special Non-Working Holiday') {
        status = 'Holiday';
      }

      const punches: string[] = [];
      if (timeIn) punches.push(timeIn);
      if (timeIn && timeOut && status !== 'Half Day') {
        punches.push('12:00');
        punches.push('13:00');
      }
      if (timeOut) punches.push(timeOut);

      records.push({
        id: `DTR-${emp.id}-${dateStr}`,
        employeeId: emp.id,
        employeeNumber: emp.employeeNumber,
        biometrixId: emp.biometrixId,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        date: dateStr,
        dayOfWeek,
        dayType,
        timeIn,
        timeOut,
        rawPunches: punches.length > 0 ? punches : undefined,
        regularHours,
        lateMinutes,
        undertimeMinutes,
        overtimeHours,
        nightDiffHours: 0,
        status,
        source: 'Biometrics',
        remarks: status === 'Late' ? 'Traffic in EDSA / Commute' : undefined,
      });
    }
  });

  return records;
}

export const INITIAL_DTR_RECORDS: DTRRecord[] = generateDTRRecordsFromBiometricCSV(
  SAMPLE_BIOMETRIC_DATA_CSV,
  INITIAL_EMPLOYEES
);

const w34Payslips: Payslip[] = INITIAL_EMPLOYEES
  .filter((e) => e.status === 'active')
  .map((emp) => {
    const empDtr = INITIAL_DTR_RECORDS.filter(
      (d) => d.employeeId === emp.id && d.date >= '2026-08-15' && d.date <= '2026-08-21'
    );
    const w34Holidays: PeriodHoliday[] = [
      {
        id: 'hol-w34-1',
        date: '2026-08-21',
        name: 'Ninoy Aquino Day',
        type: 'Special Non-Working Holiday',
      },
    ];
    const slip = generateEmployeePayslip(emp, 'PP-2026-W34', empDtr, [], [], w34Holidays);
    slip.status = 'Approved';
    return slip;
  });

const w35Payslips: Payslip[] = INITIAL_EMPLOYEES
  .filter((e) => e.status === 'active')
  .map((emp) => {
    const empDtr = INITIAL_DTR_RECORDS.filter(
      (d) => d.employeeId === emp.id && d.date >= '2026-08-22' && d.date <= '2026-08-28'
    );
    const slip = generateEmployeePayslip(emp, 'PP-2026-W35', empDtr, [], [], []);
    slip.status = 'Approved';
    return slip;
  });

const w36Payslips: Payslip[] = INITIAL_EMPLOYEES
  .filter((e) => e.status === 'active')
  .map((emp) => {
    const empDtr = INITIAL_DTR_RECORDS.filter(
      (d) => d.employeeId === emp.id && d.date >= '2026-08-29' && d.date <= '2026-09-04'
    );
    const slip = generateEmployeePayslip(emp, 'PP-2026-W36', empDtr, [], [], []);
    slip.status = 'Approved';
    return slip;
  });

export const INITIAL_PAYSLIPS: Payslip[] = [...w34Payslips, ...w35Payslips, ...w36Payslips];

const w34Gross = Math.round(w34Payslips.reduce((sum, ps) => sum + ps.grossPay, 0) * 100) / 100;
const w34Deductions = Math.round(w34Payslips.reduce((sum, ps) => sum + ps.totalDeductions, 0) * 100) / 100;
const w34Net = Math.round(w34Payslips.reduce((sum, ps) => sum + ps.netPay, 0) * 100) / 100;

export const INITIAL_PAY_PERIODS: PayPeriod[] = [
  {
    id: 'PP-2026-W37',
    name: 'September 5 - 11, 2026 (Weekly Cutoff)',
    startDate: '2026-09-05',
    endDate: '2026-09-11',
    payoutDate: '2026-09-12',
    status: 'Draft',
    totalGrossPay: 0,
    totalDeductions: 0,
    totalNetPay: 0,
    processedEmployeesCount: 0,
    createdAt: '2026-09-05T08:00:00.000Z',
  },
  {
    id: 'PP-2026-W36',
    name: 'August 29 - September 4, 2026 (Weekly Cutoff)',
    startDate: '2026-08-29',
    endDate: '2026-09-04',
    payoutDate: '2026-09-05',
    status: 'Draft',
    totalGrossPay: 0,
    totalDeductions: 0,
    totalNetPay: 0,
    processedEmployeesCount: 0,
    holidays: [
      {
        id: 'hol-aug31',
        date: '2026-08-31',
        name: 'National Heroes Day',
        type: 'Regular Holiday',
      },
    ],
    createdAt: '2026-08-29T08:00:00.000Z',
  },
  {
    id: 'PP-2026-W35',
    name: 'August 22 - 28, 2026 (Weekly Cutoff)',
    startDate: '2026-08-22',
    endDate: '2026-08-28',
    payoutDate: '2026-08-29',
    status: 'Draft',
    isLastCutoffOfMonth: true,
    totalGrossPay: 0,
    totalDeductions: 0,
    totalNetPay: 0,
    processedEmployeesCount: 0,
    holidays: [
      {
        id: 'hol-2',
        date: '2026-08-26',
        name: 'National Heroes Day',
        type: 'Regular Holiday',
      },
    ],
    createdAt: '2026-08-22T08:00:00.000Z',
  },
  {
    id: 'PP-2026-W34',
    name: 'August 15 - 21, 2026 (Weekly Cutoff)',
    startDate: '2026-08-15',
    endDate: '2026-08-21',
    payoutDate: '2026-08-22',
    status: 'Approved',
    totalGrossPay: w34Gross,
    totalDeductions: w34Deductions,
    totalNetPay: w34Net,
    processedEmployeesCount: INITIAL_PAYSLIPS.length,
    holidays: [
      {
        id: 'hol-w34-1',
        date: '2026-08-21',
        name: 'Ninoy Aquino Day',
        type: 'Special Non-Working Holiday',
      },
    ],
    createdAt: '2026-08-21T18:00:00.000Z',
  },
  {
    id: 'PP-2026-W33',
    name: 'August 8 - 14, 2026 (Weekly Cutoff)',
    startDate: '2026-08-08',
    endDate: '2026-08-14',
    payoutDate: '2026-08-15',
    status: 'Approved',
    totalGrossPay: 35900,
    totalDeductions: 2180,
    totalNetPay: 33720,
    processedEmployeesCount: 6,
    createdAt: '2026-08-14T18:00:00.000Z',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-001',
    timestamp: '2026-08-01T08:00:00.000Z',
    action: 'CREATE',
    module: 'EMPLOYEE',
    actorId: 'usr-admin-1',
    actorName: 'Juan Dela Cruz',
    actorEmail: 'juan.admin@hris.ph',
    actorRole: 'admin',
    targetId: 'emp-6',
    targetName: 'EMP-2024-006 (Patricia Villanueva)',
    description: 'Enrolled new employee record for Patricia Villanueva (Marketing Associate).',
    changes: [
      { field: 'employeeNumber', fieldLabel: 'Employee Number', oldValue: null, newValue: 'EMP-2024-006' },
      { field: 'firstName', fieldLabel: 'First Name', oldValue: null, newValue: 'Patricia' },
      { field: 'lastName', fieldLabel: 'Last Name', oldValue: null, newValue: 'Villanueva' },
      { field: 'dailyRate', fieldLabel: 'Daily Rate', oldValue: null, newValue: 850 },
      { field: 'biometrixId', fieldLabel: 'Biometrix ID', oldValue: null, newValue: 'BIO-106' },
      { field: 'status', fieldLabel: 'Status', oldValue: null, newValue: 'active' },
    ],
  },
  {
    id: 'log-002',
    timestamp: '2026-08-05T10:15:00.000Z',
    action: 'UPDATE',
    module: 'EMPLOYEE',
    actorId: 'usr-admin-1',
    actorName: 'Juan Dela Cruz',
    actorEmail: 'juan.admin@hris.ph',
    actorRole: 'admin',
    targetId: 'emp-3',
    targetName: 'EMP-2024-003 (Carlos Reyes)',
    description: 'Promoted Carlos Reyes and adjusted daily rate from ₱950 to ₱1,100.',
    changes: [
      { field: 'position', fieldLabel: 'Position', oldValue: 'Software Engineer', newValue: 'Senior Software Engineer' },
      { field: 'dailyRate', fieldLabel: 'Daily Rate', oldValue: 950, newValue: 1100 },
    ],
  },
  {
    id: 'log-003',
    timestamp: '2026-08-18T09:30:00.000Z',
    action: 'DTR_ADJUSTMENT',
    module: 'DTR',
    actorId: 'usr-mgr-1',
    actorName: 'Leandro San Andres',
    actorEmail: 'leandro.sanandres@hris.ph',
    actorRole: 'manager',
    targetId: 'DTR-emp-006-2026-08-18',
    targetName: 'Joshua Fontanilla (2026-08-18)',
    description: 'Approved official site deployment overtime (+1.5 hrs).',
    changes: [
      { field: 'overtimeHours', fieldLabel: 'Overtime Hours', oldValue: 0, newValue: 1.5 },
      { field: 'remarks', fieldLabel: 'Remarks', oldValue: null, newValue: 'Site installation support' },
    ],
  },
  {
    id: 'log-004',
    timestamp: '2026-08-21T17:30:00.000Z',
    action: 'PAYROLL_CALCULATE',
    module: 'PAYROLL',
    actorId: 'usr-admin-1',
    actorName: 'Juan Dela Cruz',
    actorEmail: 'juan.admin@hris.ph',
    actorRole: 'admin',
    targetId: 'PP-2026-W34',
    targetName: 'Weekly Payroll: Aug 15 - 21, 2026 (Payday: Aug 22)',
    description: 'Generated weekly payroll computations for Saturday–Friday cutoff.',
    changes: [
      { field: 'status', fieldLabel: 'Payroll Status', oldValue: 'Draft', newValue: 'Pending Review' },
      { field: 'totalGrossPay', fieldLabel: 'Total Gross Pay', oldValue: 0, newValue: 36800 },
      { field: 'totalNetPay', fieldLabel: 'Total Net Pay', oldValue: 0, newValue: 34560 },
    ],
  },
  {
    id: 'log-005',
    timestamp: '2026-08-22T08:00:00.000Z',
    action: 'PAYROLL_APPROVE',
    module: 'PAYROLL',
    actorId: 'usr-admin-1',
    actorName: 'Juan Dela Cruz',
    actorEmail: 'juan.admin@hris.ph',
    actorRole: 'admin',
    targetId: 'PP-2026-W34',
    targetName: 'Weekly Payroll: Aug 15 - 21, 2026 (Payday: Aug 22)',
    description: 'Approved and finalized Aug 15-21 weekly cutoff for Saturday disbursement.',
    changes: [
      { field: 'status', fieldLabel: 'Status', oldValue: 'Pending Review', newValue: 'Approved' },
    ],
  },
];

export const INITIAL_THIRTEENTH_MONTH_RECORDS: ThirteenthMonthRecord[] = [
  {
    id: '13TH-2026',
    year: 2026,
    status: 'Draft',
    totalEmployees: INITIAL_EMPLOYEES.filter(e => e.status === 'active').length,
    totalBasicEarnings: Math.round(
      INITIAL_EMPLOYEES.filter(e => e.status === 'active').reduce((sum, e) => sum + e.dailyRate * 260, 0)
    ),
    totalThirteenthMonthPay: Math.round(
      INITIAL_EMPLOYEES.filter(e => e.status === 'active').reduce((sum, e) => sum + (e.dailyRate * 260) / 12, 0)
    ),
    payoutDate: '2026-12-15',
    generatedAt: '2026-08-20T10:00:00.000Z',
    items: INITIAL_EMPLOYEES.filter(e => e.status === 'active').map((emp) => {
      const annualBasic = Math.round(emp.dailyRate * 260);
      const thirteenthPay = Math.round((annualBasic / 12) * 100) / 100;
      return {
        employeeId: emp.id,
        employeeNumber: emp.employeeNumber,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        position: emp.position,
        dailyRate: emp.dailyRate,
        monthsWorkedCount: 12,
        totalBasicSalaryEarned: annualBasic,
        thirteenthMonthPay: thirteenthPay,
        taxableAmount: Math.max(0, thirteenthPay - 90000),
        status: 'Draft',
        paymentDate: '2026-12-15',
        remarks: 'Computed (Daily Rate x 260 days / 12)',
      };
    }),
  },
  {
    id: '13TH-2025',
    year: 2025,
    status: 'Approved',
    totalEmployees: INITIAL_EMPLOYEES.filter(e => e.status === 'active').length,
    totalBasicEarnings: Math.round(
      INITIAL_EMPLOYEES.filter(e => e.status === 'active').reduce((sum, e) => sum + e.dailyRate * 256, 0)
    ),
    totalThirteenthMonthPay: Math.round(
      INITIAL_EMPLOYEES.filter(e => e.status === 'active').reduce((sum, e) => sum + (e.dailyRate * 256) / 12, 0)
    ),
    payoutDate: '2025-12-15',
    generatedAt: '2025-12-10T09:00:00.000Z',
    approvedAt: '2025-12-12T14:30:00.000Z',
    items: INITIAL_EMPLOYEES.filter(e => e.status === 'active').map((emp) => {
      const annualBasic = Math.round(emp.dailyRate * 256);
      const thirteenthPay = Math.round((annualBasic / 12) * 100) / 100;
      return {
        employeeId: emp.id,
        employeeNumber: emp.employeeNumber,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        position: emp.position,
        dailyRate: emp.dailyRate,
        monthsWorkedCount: 12,
        totalBasicSalaryEarned: annualBasic,
        thirteenthMonthPay: thirteenthPay,
        taxableAmount: Math.max(0, thirteenthPay - 90000),
        status: 'Approved',
        paymentDate: '2025-12-15',
        remarks: 'Disbursed via direct deposit',
      };
    }),
  },
];

export const INITIAL_DEDUCTIONS: EmployeeDeduction[] = [
  {
    id: 'ded-init-001',
    deductionId: 'DED-2026-001',
    employeeId: 'emp-006',
    employeeName: 'Joshua Fontanilla',
    employeeNumber: 'EMP-006',
    department: 'Engineering & Operations',
    position: 'Field Operations Engineer',
    description: 'Company Emergency Cash Loan',
    amount: 10000,
    interest: 500,
    interestType: 'fixed',
    interestRate: 5,
    totalAmount: 10500,
    date: '2026-08-01',
    type: 'Loan',
    cutoffDeductionAmount: 1000,
    totalPaid: 3500,
    runningBalance: 7000,
    status: 'Active',
    notes: 'Approved emergency financial assistance. Weekly salary deduction.',
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-09-05T12:00:00.000Z',
    ledger: [
      {
        id: 'led-001-1',
        deductionId: 'ded-init-001',
        date: '2026-08-01',
        reference: 'DED-2026-001-GRANT',
        description: 'Initial Loan Grant (Principal: ₱10,000 + Fixed Interest: ₱500)',
        type: 'GRANT',
        debit: 10500,
        credit: 0,
        runningBalance: 10500,
        remarks: 'Emergency loan disbursed',
        createdAt: '2026-08-01T08:00:00.000Z',
      },
      {
        id: 'led-001-2',
        deductionId: 'ded-init-001',
        date: '2026-08-22',
        reference: 'PP-2026-W34',
        description: 'Payroll Cutoff Deduction (Week 34)',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 1000,
        runningBalance: 9500,
        remarks: 'Salary deduction via payroll register',
        payslipId: 'PS-PP-2026-W34-emp-006',
        payPeriodId: 'PP-2026-W34',
        isManual: false,
        createdAt: '2026-08-22T17:00:00.000Z',
      },
      {
        id: 'led-001-3',
        deductionId: 'ded-init-001',
        date: '2026-08-29',
        reference: 'PP-2026-W35',
        description: 'Payroll Cutoff Deduction (Week 35)',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 1000,
        runningBalance: 8500,
        remarks: 'Salary deduction via payroll register',
        payslipId: 'PS-PP-2026-W35-emp-006',
        payPeriodId: 'PP-2026-W35',
        isManual: false,
        createdAt: '2026-08-29T17:00:00.000Z',
      },
      {
        id: 'led-001-4',
        deductionId: 'ded-init-001',
        date: '2026-09-05',
        reference: 'PP-2026-W36',
        description: 'Payroll Cutoff Deduction (Week 36)',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 1000,
        runningBalance: 7500,
        remarks: 'Salary deduction via payroll register',
        payslipId: 'PS-PP-2026-W36-emp-006',
        payPeriodId: 'PP-2026-W36',
        isManual: false,
        createdAt: '2026-09-05T17:00:00.000Z',
      },
      {
        id: 'led-001-5',
        deductionId: 'ded-init-001',
        date: '2026-09-12',
        reference: 'OR-550912',
        description: 'Over-the-counter Cash Payment',
        type: 'PAYMENT',
        debit: 0,
        credit: 500,
        runningBalance: 7000,
        remarks: 'Manual partial amortization paid in cash to HR office',
        isManual: true,
        createdAt: '2026-09-12T14:30:00.000Z',
      },
    ],
  },
  {
    id: 'ded-init-002',
    deductionId: 'DED-2026-002',
    employeeId: 'emp-006',
    employeeName: 'Joshua Fontanilla',
    employeeNumber: 'EMP-006',
    department: 'Engineering & Operations',
    position: 'Field Operations Engineer',
    description: 'Company Uniform & Safety Gear Package',
    amount: 1800,
    interest: 0,
    interestType: 'fixed',
    interestRate: 0,
    totalAmount: 1800,
    date: '2026-08-15',
    type: 'Salary Deduction',
    cutoffDeductionAmount: 300,
    totalPaid: 900,
    runningBalance: 900,
    status: 'Active',
    notes: '2 sets polo shirt uniforms and heavy duty safety boots.',
    createdAt: '2026-08-15T09:00:00.000Z',
    updatedAt: '2026-09-05T12:00:00.000Z',
    ledger: [
      {
        id: 'led-002-1',
        deductionId: 'ded-init-002',
        date: '2026-08-15',
        reference: 'DED-2026-002-GRANT',
        description: 'Uniform & Safety Gear Package Issue',
        type: 'GRANT',
        debit: 1800,
        credit: 0,
        runningBalance: 1800,
        remarks: 'Supplies received and acknowledged',
        createdAt: '2026-08-15T09:00:00.000Z',
      },
      {
        id: 'led-002-2',
        deductionId: 'ded-init-002',
        date: '2026-08-22',
        reference: 'PP-2026-W34',
        description: 'Payroll Cutoff Deduction (Week 34)',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 300,
        runningBalance: 1500,
        remarks: 'Uniform deduction 1 of 6',
        payslipId: 'PS-PP-2026-W34-emp-006',
        payPeriodId: 'PP-2026-W34',
        isManual: false,
        createdAt: '2026-08-22T17:00:00.000Z',
      },
      {
        id: 'led-002-3',
        deductionId: 'ded-init-002',
        date: '2026-08-29',
        reference: 'PP-2026-W35',
        description: 'Payroll Cutoff Deduction (Week 35)',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 300,
        runningBalance: 1200,
        remarks: 'Uniform deduction 2 of 6',
        payslipId: 'PS-PP-2026-W35-emp-006',
        payPeriodId: 'PP-2026-W35',
        isManual: false,
        createdAt: '2026-08-29T17:00:00.000Z',
      },
      {
        id: 'led-002-4',
        deductionId: 'ded-init-002',
        date: '2026-09-05',
        reference: 'PP-2026-W36',
        description: 'Payroll Cutoff Deduction (Week 36)',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 300,
        runningBalance: 900,
        remarks: 'Uniform deduction 3 of 6',
        payslipId: 'PS-PP-2026-W36-emp-006',
        payPeriodId: 'PP-2026-W36',
        isManual: false,
        createdAt: '2026-09-05T17:00:00.000Z',
      },
    ],
  },
  {
    id: 'ded-init-003',
    deductionId: 'DED-2026-003',
    employeeId: 'emp-007',
    employeeName: 'Pacifico Abapo',
    employeeNumber: 'EMP-007',
    department: 'Engineering & Operations',
    position: 'Technician Specialist',
    description: 'SSS Salary Loan Monthly Amortization',
    amount: 15000,
    interest: 1500,
    interestType: 'percentage',
    interestRate: 10,
    totalAmount: 16500,
    date: '2026-07-15',
    type: 'Loan',
    cutoffDeductionAmount: 750,
    totalPaid: 4500,
    runningBalance: 12000,
    status: 'Active',
    notes: 'Government mandatory SSS salary loan amortized weekly.',
    createdAt: '2026-07-15T10:00:00.000Z',
    updatedAt: '2026-09-05T12:00:00.000Z',
    ledger: [
      {
        id: 'led-003-1',
        deductionId: 'ded-init-003',
        date: '2026-07-15',
        reference: 'SSS-LN-9921',
        description: 'SSS Salary Loan Grant (Principal: ₱15,000 + Interest: ₱1,500)',
        type: 'GRANT',
        debit: 16500,
        credit: 0,
        runningBalance: 16500,
        remarks: 'SSS Billing Letter Ref #2026-07-88',
        createdAt: '2026-07-15T10:00:00.000Z',
      },
      {
        id: 'led-003-2',
        deductionId: 'ded-init-003',
        date: '2026-08-01',
        reference: 'PP-2026-W31',
        description: 'Weekly Cutoff Deduction',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 750,
        runningBalance: 15750,
        remarks: 'Amortization 1',
        createdAt: '2026-08-01T17:00:00.000Z',
      },
      {
        id: 'led-003-3',
        deductionId: 'ded-init-003',
        date: '2026-08-08',
        reference: 'PP-2026-W32',
        description: 'Weekly Cutoff Deduction',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 750,
        runningBalance: 15000,
        remarks: 'Amortization 2',
        createdAt: '2026-08-08T17:00:00.000Z',
      },
      {
        id: 'led-003-4',
        deductionId: 'ded-init-003',
        date: '2026-08-15',
        reference: 'PP-2026-W33',
        description: 'Weekly Cutoff Deduction',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 750,
        runningBalance: 14250,
        remarks: 'Amortization 3',
        createdAt: '2026-08-15T17:00:00.000Z',
      },
      {
        id: 'led-003-5',
        deductionId: 'ded-init-003',
        date: '2026-08-22',
        reference: 'PP-2026-W34',
        description: 'Weekly Cutoff Deduction',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 750,
        runningBalance: 13500,
        remarks: 'Amortization 4',
        createdAt: '2026-08-22T17:00:00.000Z',
      },
      {
        id: 'led-003-6',
        deductionId: 'ded-init-003',
        date: '2026-08-29',
        reference: 'PP-2026-W35',
        description: 'Weekly Cutoff Deduction',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 750,
        runningBalance: 12750,
        remarks: 'Amortization 5',
        createdAt: '2026-08-29T17:00:00.000Z',
      },
      {
        id: 'led-003-7',
        deductionId: 'ded-init-003',
        date: '2026-09-05',
        reference: 'PP-2026-W36',
        description: 'Weekly Cutoff Deduction',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 750,
        runningBalance: 12000,
        remarks: 'Amortization 6',
        createdAt: '2026-09-05T17:00:00.000Z',
      },
    ],
  },
  {
    id: 'ded-init-004',
    deductionId: 'DED-2026-004',
    employeeId: 'emp-008',
    employeeName: 'Jerome Guitguit',
    employeeNumber: 'EMP-008',
    department: 'Engineering & Operations',
    position: 'Technician Specialist',
    description: 'Motorcycle Helmet & Tool Kit Cash Advance',
    amount: 3500,
    interest: 0,
    interestType: 'fixed',
    interestRate: 0,
    totalAmount: 3500,
    date: '2026-08-05',
    type: 'Others',
    cutoffDeductionAmount: 500,
    totalPaid: 1500,
    runningBalance: 2000,
    status: 'Active',
    notes: 'Approved field kit advance.',
    createdAt: '2026-08-05T11:00:00.000Z',
    updatedAt: '2026-09-05T12:00:00.000Z',
    ledger: [
      {
        id: 'led-004-1',
        deductionId: 'ded-init-004',
        date: '2026-08-05',
        reference: 'ADV-2026-004',
        description: 'Advance Grant for Safety Equipment',
        type: 'GRANT',
        debit: 3500,
        credit: 0,
        runningBalance: 3500,
        remarks: 'Cash voucher #9021',
        createdAt: '2026-08-05T11:00:00.000Z',
      },
      {
        id: 'led-004-2',
        deductionId: 'ded-init-004',
        date: '2026-08-22',
        reference: 'PP-2026-W34',
        description: 'Weekly Cutoff Deduction',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 500,
        runningBalance: 3000,
        createdAt: '2026-08-22T17:00:00.000Z',
      },
      {
        id: 'led-004-3',
        deductionId: 'ded-init-004',
        date: '2026-08-29',
        reference: 'PP-2026-W35',
        description: 'Weekly Cutoff Deduction',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 500,
        runningBalance: 2500,
        createdAt: '2026-08-29T17:00:00.000Z',
      },
      {
        id: 'led-004-4',
        deductionId: 'ded-init-004',
        date: '2026-09-05',
        reference: 'PP-2026-W36',
        description: 'Weekly Cutoff Deduction',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 500,
        runningBalance: 2000,
        createdAt: '2026-09-05T17:00:00.000Z',
      },
    ],
  },
  {
    id: 'ded-init-005',
    deductionId: 'DED-2026-005',
    employeeId: 'emp-008',
    employeeName: 'Jerome Guitguit',
    employeeNumber: 'EMP-008',
    department: 'Engineering & Operations',
    position: 'Technician Specialist',
    description: 'HMO Dependent Health Coverage Premium',
    amount: 2400,
    interest: 0,
    interestType: 'fixed',
    interestRate: 0,
    totalAmount: 2400,
    date: '2026-07-01',
    type: 'Salary Deduction',
    cutoffDeductionAmount: 600,
    totalPaid: 2400,
    runningBalance: 0,
    status: 'Completed',
    notes: 'Q3 dependent healthcare premium. Fully paid.',
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-08-15T12:00:00.000Z',
    ledger: [
      {
        id: 'led-005-1',
        deductionId: 'ded-init-005',
        date: '2026-07-01',
        reference: 'HMO-2026-Q3',
        description: 'HMO Dependent Premium Enrollment',
        type: 'GRANT',
        debit: 2400,
        credit: 0,
        runningBalance: 2400,
        createdAt: '2026-07-01T08:00:00.000Z',
      },
      {
        id: 'led-005-2',
        deductionId: 'ded-init-005',
        date: '2026-07-11',
        reference: 'PP-2026-W28',
        description: 'Weekly Cutoff Deduction',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 600,
        runningBalance: 1800,
        createdAt: '2026-07-11T17:00:00.000Z',
      },
      {
        id: 'led-005-3',
        deductionId: 'ded-init-005',
        date: '2026-07-18',
        reference: 'PP-2026-W29',
        description: 'Weekly Cutoff Deduction',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 600,
        runningBalance: 1200,
        createdAt: '2026-07-18T17:00:00.000Z',
      },
      {
        id: 'led-005-4',
        deductionId: 'ded-init-005',
        date: '2026-07-25',
        reference: 'PP-2026-W30',
        description: 'Weekly Cutoff Deduction',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 600,
        runningBalance: 600,
        createdAt: '2026-07-25T17:00:00.000Z',
      },
      {
        id: 'led-005-5',
        deductionId: 'ded-init-005',
        date: '2026-08-01',
        reference: 'PP-2026-W31',
        description: 'Weekly Cutoff Deduction (Final)',
        type: 'CUTOFF_DEDUCTION',
        debit: 0,
        credit: 600,
        runningBalance: 0,
        remarks: 'Account fully paid and closed',
        createdAt: '2026-08-01T17:00:00.000Z',
      },
    ],
  },
];

