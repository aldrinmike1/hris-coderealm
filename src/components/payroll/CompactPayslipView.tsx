import React from 'react';
import { Payslip, CompanyProfile } from '../../types';

interface CompactPayslipViewProps {
  payslip: Payslip;
  companyProfile: CompanyProfile;
  periodName?: string;
  className?: string;
}

export function formatCompactPeriod(periodName?: string, payPeriodId?: string): string {
  if (!periodName && !payPeriodId) return 'Payroll Period';
  const str = periodName || payPeriodId || '';

  // Clean off parentheticals like "(Weekly Cutoff)"
  let cleaned = str.replace(/\s*\([^)]*\)/g, '').trim();

  // Convert full month names to short abbreviations
  const monthMap: Record<string, string> = {
    January: 'Sep',
    February: 'Feb',
    March: 'Mar',
    April: 'Apr',
    May: 'May',
    June: 'Jun',
    July: 'Jul',
    August: 'Aug',
    September: 'Sep',
    October: 'Oct',
    November: 'Nov',
    December: 'Dec',
  };

  for (const [full, short] of Object.entries(monthMap)) {
    cleaned = cleaned.replace(new RegExp(full, 'gi'), short);
  }

  // Normalize spacing around hyphens
  cleaned = cleaned.replace(/\s*-\s*/g, '-');

  if (cleaned.toLowerCase().startsWith('payroll')) {
    return cleaned;
  }
  return `Payroll ${cleaned}`;
}

export const CompactPayslipView: React.FC<CompactPayslipViewProps> = ({
  payslip,
  companyProfile,
  periodName,
  className = '',
}) => {
  // Extract specific deductions
  let sssLoan = '';
  let hdmfLoan = '';
  let cashAdvance =
    payslip.cashAdvanceDeduction && payslip.cashAdvanceDeduction > 0
      ? payslip.cashAdvanceDeduction.toFixed(2)
      : '';
  let mls =
    payslip.mlsDeduction && payslip.mlsDeduction > 0
      ? payslip.mlsDeduction.toFixed(2)
      : '';
  let otherDedsTotal = 0;

  if (payslip.otherDeductions && payslip.otherDeductions.length > 0) {
    for (const d of payslip.otherDeductions) {
      const nameLower = d.name.toLowerCase();
      if (nameLower.includes('sss') && (nameLower.includes('loan') || nameLower.includes('calamity'))) {
        const current = Number(sssLoan) || 0;
        sssLoan = (current + d.amount).toFixed(2);
      } else if (
        (nameLower.includes('hdmf') || nameLower.includes('pagibig') || nameLower.includes('pag-ibig')) &&
        nameLower.includes('loan')
      ) {
        const current = Number(hdmfLoan) || 0;
        hdmfLoan = (current + d.amount).toFixed(2);
      } else if (nameLower.includes('cash advance') || nameLower.includes('vale')) {
        if (!cashAdvance) cashAdvance = d.amount.toFixed(2);
      } else if (nameLower.includes('mls')) {
        if (!mls) mls = d.amount.toFixed(2);
      } else {
        otherDedsTotal += d.amount;
      }
    }
  } else if ((payslip.totalOtherDeductions || 0) > 0) {
    otherDedsTotal = payslip.totalOtherDeductions || 0;
  }

  // If withholding tax is enabled and not exempt, add to others or show
  if (companyProfile.enableWithholdingTax && (payslip.withholdingTax || 0) > 0) {
    otherDedsTotal += payslip.withholdingTax;
  }

  const others = otherDedsTotal > 0 ? otherDedsTotal.toFixed(2) : '';

  // Late + Undertime combined minutes
  const effectiveLateMinutes = companyProfile.enableLateDeduction !== false ? (payslip.lateMinutes || 0) : 0;
  const totalLateUTMinutes = effectiveLateMinutes + (payslip.undertimeMinutes || 0);

  // Holiday breakdown
  const regHolDays =
    payslip.regularHolidayDays && payslip.regularHolidayDays > 0
      ? payslip.regularHolidayDays.toFixed(1)
      : payslip.holidayDays && !payslip.specialHolidayDays && payslip.holidayDays > 0
      ? payslip.holidayDays.toFixed(1)
      : '';
  const regHolPay =
    payslip.holidayPay && payslip.holidayPay > 0
      ? payslip.holidayPay.toFixed(2)
      : '';

  const specHolDays =
    payslip.specialHolidayDays && payslip.specialHolidayDays > 0
      ? payslip.specialHolidayDays.toFixed(1)
      : '';
  const specHolPay = '';

  const wdoHours =
    payslip.wdoHours && payslip.wdoHours > 0 ? payslip.wdoHours.toFixed(1) : '';
  const wdoPay =
    payslip.wdoPay && payslip.wdoPay > 0 ? payslip.wdoPay.toFixed(2) : '';

  const payrollPeriodText = formatCompactPeriod(periodName, payslip.payPeriodId);
  const companyName = companyProfile.name || 'Enterprise Holdings Corp. (PH)';
  const companyInitials = companyName
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map(w => w[0].toUpperCase())
    .join('') || 'CO';
  const companyShort = companyName.split(/\s+/)[0] || 'COMPANY';

  return (
    <div
      className={`bg-white text-black font-sans text-[10px] leading-tight border-2 border-black select-none w-[270px] max-w-[270px] mx-auto shadow-sm ${className}`}
      id={`compact-payslip-${payslip.employeeNumber}`}
    >
      <table className="w-full border-collapse text-[10px] table-fixed">
        <colgroup>
          <col className="w-[41%]" />
          <col className="w-[21%]" />
          <col className="w-[38%]" />
        </colgroup>
        <tbody>
          {/* Header Row: Company Logo at Top-Left & Company Title (No bottom border) */}
          <tr>
            <td colSpan={3} className="px-2 py-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="w-[66px] shrink-0 flex flex-col items-center justify-center pl-0.5">
                  {companyProfile.logoUrl ? (
                    <img
                      src={companyProfile.logoUrl}
                      alt={companyName}
                      className="max-h-[26px] max-w-[62px] object-contain mx-auto"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <svg
                        width="34"
                        height="17"
                        viewBox="0 0 70 36"
                        fill="#000"
                        xmlns="http://www.w3.org/2000/svg"
                        className="block"
                      >
                        <rect x="2" y="2" width="66" height="32" rx="4" fill="none" stroke="#000" strokeWidth="2.5" />
                        <text x="35" y="24" fontFamily="Arial, Helvetica, sans-serif" fontSize="18" fontWeight="900" textAnchor="middle" fill="#000" letterSpacing="1">{companyInitials}</text>
                      </svg>
                      <span className="text-[6.5px] font-bold tracking-[0.8px] text-black mt-0.5 uppercase truncate max-w-[64px]">
                        {companyShort}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center pr-1 pl-0.5">
                  <div className="font-bold text-[10.5px] text-black leading-none" title={companyName}>
                    {companyName}
                  </div>
                  <div className="font-bold text-[9.5px] text-black mt-0.5 tracking-wide">
                    PAYSLIP
                  </div>
                  <div className="text-[8.5px] text-black mt-0.5 font-medium">
                    {payrollPeriodText}
                  </div>
                </div>
              </div>
            </td>
          </tr>

          {/* Name Row (Spacing close together, no vertical divider) */}
          <tr className="border-b border-t border-black">
            <td colSpan={3} className="font-medium px-1.5 py-0.5 text-black truncate">
              <span>Name:</span>
              <span className="ml-2 font-medium uppercase">{payslip.employeeName}</span>
            </td>
          </tr>

          {/* Basic Rate Row (Spacing close together, no vertical divider) */}
          <tr className="border-b border-black">
            <td colSpan={3} className="px-1.5 py-0.5 text-black">
              <span className="font-medium">Basic Rate</span>
              <span className="ml-3 font-mono font-medium">{payslip.dailyRate % 1 === 0 ? payslip.dailyRate : payslip.dailyRate.toFixed(2)}</span>
            </td>
          </tr>

          {/* No. of days weekly (Underline under amount only) */}
          <tr>
            <td className="px-1 py-0.5 text-right text-black whitespace-nowrap">
              No. of days weekly
            </td>
            <td className="px-1 py-0.5 text-center text-black">
              {payslip.daysWorked > 0 ? payslip.daysWorked.toFixed(1) : ''}
            </td>
            <td className="px-1.5 py-0.5 text-right font-mono text-black border-b border-black">
              {payslip.basicPay > 0 ? payslip.basicPay.toFixed(2) : ''}
            </td>
          </tr>

          {/* Overtime: (Underline under amount only) */}
          <tr>
            <td className="px-1 py-0.5 text-right text-black whitespace-nowrap">
              Overtime:
            </td>
            <td className="px-1 py-0.5 text-center text-black">
              {payslip.overtimeHours > 0 ? payslip.overtimeHours.toFixed(1) : ''}
            </td>
            <td className="px-1.5 py-0.5 text-right font-mono text-black border-b border-black">
              {payslip.overtimePay > 0 ? payslip.overtimePay.toFixed(2) : ''}
            </td>
          </tr>

          {/* Regular Holiday (Underline under amount only) */}
          <tr>
            <td className="px-1 py-0.5 text-right text-black whitespace-nowrap">
              Regular Holiday
            </td>
            <td className="px-1 py-0.5 text-center text-black">
              {regHolDays}
            </td>
            <td className="px-1.5 py-0.5 text-right font-mono text-black border-b border-black">
              {regHolPay}
            </td>
          </tr>

          {/* Special Holiday (Underline under amount only) */}
          <tr>
            <td className="px-1 py-0.5 text-right text-black whitespace-nowrap">
              Special Holiday
            </td>
            <td className="px-1 py-0.5 text-center text-black">
              {specHolDays}
            </td>
            <td className="px-1.5 py-0.5 text-right font-mono text-black border-b border-black">
              {specHolPay}
            </td>
          </tr>

          {/* WDO */}
          <tr>
            <td className="px-1 py-0.5 text-right text-black whitespace-nowrap">
              WDO
            </td>
            <td className="px-1 py-0.5 text-center text-black">
              {wdoHours}
            </td>
            <td className="px-1.5 py-0.5 text-right font-mono text-black">
              {wdoPay}
            </td>
          </tr>

          {/* Gross pay (Thick border top & bottom, no vertical divider) */}
          <tr className="border-t-[1.5px] border-b-[1.5px] border-black">
            <td colSpan={2} className="px-1.5 py-0.5 text-black font-black text-[10.5px]  font-semibold">
              Gross pay
            </td>
            <td className="px-1.5 py-0.5 text-right font-sans font-black text-black text-[11px] font-semibold">
              {payslip.grossPay.toFixed(2)}
            </td>
          </tr>

          {/* Deductions Header (No row border) */}
          <tr>
            <td colSpan={3} className="px-1.5 pt-1 pb-0 text-black font-medium">
              Deductions
            </td>
          </tr>

          {/* Days / Minutes Sub-header */}
          <tr className="text-[8.5px] leading-none">
            <td className="px-1 py-0"></td>
            <td className="px-0 py-0 text-center text-black text-[8px] font-medium leading-none whitespace-nowrap overflow-visible">
              Days / Minutes
            </td>
            <td className="px-1.5 py-0"></td>
          </tr>

          {/* Absence (s) (Boxed center cell, no full row border) */}
          <tr>
            <td className="px-1 py-0.5 text-right text-black whitespace-nowrap">
              Absence (s)
            </td>
            <td className="border border-black px-1 py-0.5 text-center text-black h-[17px]"></td>
            <td className="px-1.5 py-0.5"></td>
          </tr>

          {/* Late/UT (Center cell continues box, amount has underline) */}
          <tr>
            <td className="px-1 py-0.5 text-right text-black whitespace-nowrap">
              Late/UT
            </td>
            <td className="border-l border-r border-b border-black px-1 py-0.5 text-center text-black font-medium">
              {totalLateUTMinutes > 0 ? totalLateUTMinutes : ''}
            </td>
            <td className="px-1.5 py-0.5 text-right font-mono text-black border-b border-black">
              {payslip.lateUndertimeDeduction > 0
                ? payslip.lateUndertimeDeduction.toFixed(2)
                : ''}
            </td>
          </tr>

          {/* SSS Contribution (Amount has underline) */}
          <tr>
            <td className="px-1 py-0.5 text-right text-black whitespace-nowrap">
              SSS Contribution
            </td>
            <td className="px-1 py-0.5"></td>
            <td className="px-1.5 py-0.5 text-right font-mono text-black border-b border-black">
              {payslip.sssDeduction > 0 ? payslip.sssDeduction.toFixed(2) : ''}
            </td>
          </tr>

          {/* PHIC Contribution (Amount has underline) */}
          <tr>
            <td className="px-1 py-0.5 text-right text-black whitespace-nowrap">
              PHIC Contribution
            </td>
            <td className="px-1 py-0.5"></td>
            <td className="px-1.5 py-0.5 text-right font-mono text-black border-b border-black">
              {payslip.philhealthDeduction > 0
                ? payslip.philhealthDeduction.toFixed(2)
                : ''}
            </td>
          </tr>

          {/* HMDF Contribution (Amount has underline) */}
          <tr>
            <td className="px-1 py-0.5 text-right text-black whitespace-nowrap">
              HMDF Contribution
            </td>
            <td className="px-1 py-0.5"></td>
            <td className="px-1.5 py-0.5 text-right font-mono text-black border-b border-black">
              {payslip.pagibigDeduction > 0
                ? payslip.pagibigDeduction.toFixed(2)
                : ''}
            </td>
          </tr>

          {/* SSS Loan (Empty amount underline) */}
          <tr>
            <td className="px-1 py-0.5 text-right text-black whitespace-nowrap">
              SSS Loan
            </td>
            <td className="px-1 py-0.5"></td>
            <td className="px-1.5 py-0.5 text-right font-mono text-black border-b border-black">
              {sssLoan}
            </td>
          </tr>

          {/* HDMF Loan (Empty amount underline) */}
          <tr>
            <td className="px-1 py-0.5 text-right text-black whitespace-nowrap">
              HDMF Loan
            </td>
            <td className="px-1 py-0.5"></td>
            <td className="px-1.5 py-0.5 text-right font-mono text-black border-b border-black">
              {hdmfLoan}
            </td>
          </tr>

          {/* Cash Advance (Amount has underline) */}
          <tr>
            <td className="px-1 py-0.5 text-right text-black whitespace-nowrap">
              Cash Advance
            </td>
            <td className="px-1 py-0.5"></td>
            <td className="px-1.5 py-0.5 text-right font-mono text-black border-b border-black">
              {cashAdvance}
            </td>
          </tr>

          {/* Others (Empty amount underline) */}
          <tr>
            <td className="px-1 py-0.5 text-right text-black whitespace-nowrap">
              Others
            </td>
            <td className="px-1 py-0.5"></td>
            <td className="px-1.5 py-0.5 text-right font-mono text-black border-b border-black">
              {others}
            </td>
          </tr>

          {/* MLS (Empty amount underline) */}
          <tr>
            <td className="px-1 py-0.5 text-right text-black whitespace-nowrap">
              MLS
            </td>
            <td className="px-1 py-0.5"></td>
            <td className="px-1.5 py-0.5 text-right font-mono text-black border-b border-black">
              {mls}
            </td>
          </tr>

          {/* Total Deductions (Thick border top & bottom, no vertical divider) */}
          <tr className="border-t-[1.5px] border-b-[1.5px] border-black">
            <td colSpan={2} className="px-1.5 py-0.5 text-black font-black text-[10.5px] font-semibold">
              Total
            </td>
            <td className="px-1.5 py-0.5 text-right font-sans font-black text-black text-[11px] font-semibold">
              {payslip.totalDeductions.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </td>
          </tr>

          {/* Net Pay Row (Highlight soft blue #b4c6e7, thick bottom border, no vertical divider) */}
          <tr className="border-b-[1.5px] border-black" style={{ backgroundColor: '#b4c6e7' }}>
            <td colSpan={2} className="px-1.5 py-0.5 text-black font-black text-[11.5px] font-semibold">
              Net Pay
            </td>
            <td className="px-1.5 py-0.5 text-right font-sans font-black text-black text-[11.5px] font-semibold">
              {payslip.netPay.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </td>
          </tr>

          {/* Date & Signature Row (Signature moved to the left) */}
          <tr>
            <td className="px-1.5 py-1 text-black font-medium">
              Date
            </td>
            <td colSpan={2} className="px-1.5 py-1 text-left pl-2 text-black font-medium">
              Signature
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
export default CompactPayslipView;
