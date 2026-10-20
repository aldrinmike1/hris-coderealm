import { Payslip, CompanyProfile, PayPeriod, Employee } from '../types';

/**
 * Normalizes period names into concise strings like "Payroll Sep 5-11, 2026".
 */
export function formatCompactPeriod(periodName?: string, payPeriodId?: string): string {
  if (!periodName && !payPeriodId) return 'Payroll Period';
  const str = periodName || payPeriodId || '';

  // Clean off parentheticals like "(Weekly Cutoff)"
  let cleaned = str.replace(/\s*\([^)]*\)/g, '').trim();

  // Convert full month names to short abbreviations
  const monthMap: Record<string, string> = {
    January: 'Jan',
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

  // Normalize hyphens spacing: " - " -> "-"
  cleaned = cleaned.replace(/\s*-\s*/g, '-');

  if (cleaned.toLowerCase().startsWith('payroll')) {
    return cleaned;
  }
  return `Payroll ${cleaned}`;
}

/**
 * Formats numbers into currency text (without currency symbol for compact tables).
 */
function fmtAmt(val?: number): string {
  if (val === undefined || val === null || val === 0) return '';
  return val.toFixed(2);
}

function fmtTotal(val?: number): string {
  if (val === undefined || val === null) return '0.00';
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Generates the compact HTML table matching the spreadsheet-style format from image.png.
 */
export function generateCompactPayslipTableHtml(
  payslip: Payslip,
  companyProfile: CompanyProfile,
  periodName?: string
): string {
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

  if (companyProfile.enableWithholdingTax && (payslip.withholdingTax || 0) > 0) {
    otherDedsTotal += payslip.withholdingTax;
  }

  const others = otherDedsTotal > 0 ? otherDedsTotal.toFixed(2) : '';
  const totalLateUTMinutes = (payslip.lateMinutes || 0) + (payslip.undertimeMinutes || 0);

  // Holiday breakdown
  const regHolDays =
    payslip.regularHolidayDays && payslip.regularHolidayDays > 0
      ? payslip.regularHolidayDays.toFixed(1)
      : payslip.holidayDays && !payslip.specialHolidayDays && payslip.holidayDays > 0
      ? payslip.holidayDays.toFixed(1)
      : '';
  const regHolPay = payslip.holidayPay && payslip.holidayPay > 0 ? payslip.holidayPay.toFixed(2) : '';
  const specHolDays = payslip.specialHolidayDays && payslip.specialHolidayDays > 0 ? payslip.specialHolidayDays.toFixed(1) : '';
  const specHolPay = '';

  const wdoHours = payslip.wdoHours && payslip.wdoHours > 0 ? payslip.wdoHours.toFixed(1) : '';
  const wdoPay = payslip.wdoPay && payslip.wdoPay > 0 ? payslip.wdoPay.toFixed(2) : '';

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

  let logoHtml = '';
  if (companyProfile.logoUrl) {
    logoHtml = `<img src="${companyProfile.logoUrl}" alt="${companyName}" style="max-height: 26px; max-width: 62px; object-fit: contain; margin: 0 auto; display: block;" onerror="this.style.display='none'" />`;
  } else {
    logoHtml = `
      <div style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <svg width="34" height="17" viewBox="0 0 70 36" fill="#000" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto;">
          <rect x="2" y="2" width="66" height="32" rx="4" fill="none" stroke="#000" stroke-width="2.5" />
          <text x="35" y="24" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="900" text-anchor="middle" fill="#000" letter-spacing="1">${companyInitials}</text>
        </svg>
        <div style="font-size: 6.5px; font-weight: 800; letter-spacing: 0.8px; text-align: center; margin-top: 1px; color: #000; font-family: Arial, sans-serif; text-transform: uppercase; white-space: nowrap; overflow: hidden; max-width: 64px;">
          ${companyShort}
        </div>
      </div>
    `;
  }

  return `
    <div class="compact-payslip-box">
      <table class="compact-table">
        <colgroup>
          <col style="width: 41%;" />
          <col style="width: 21%;" />
          <col style="width: 38%;" />
        </colgroup>
        <tbody>
          <!-- Header Row: Company Logo at Top-Left & Title (No bottom border) -->
          <tr>
            <td colspan="3" style="padding: 10px 12px; vertical-align: middle; border: none !important;">
              <table style="width: 100%; border-collapse: collapse; border: none; table-layout: fixed;">
                <tr style="border: none;">
                  <td style="border: none; width: 66px; text-align: center; vertical-align: middle; padding: 0 1px;">
                    ${logoHtml}
                  </td>
                  <td style="border: none; text-align: center; vertical-align: middle; padding: 0 2px;">
                    <div class="company-name" title="${companyName}">${companyName}</div>
                    <div class="doc-title">PAYSLIP</div>
                    <div class="period-text">${payrollPeriodText}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Name Row (Spacing close together, no vertical divider) -->
          <tr class="border-t-thin border-b-thin">
            <td colspan="3" class="bold name-cell" style="padding: 2px 4px;">
              <span>Name:</span>
              <span style="margin-left: 8px; text-transform: uppercase; font-weight: 600;">${payslip.employeeName}</span>
            </td>
          </tr>

          <!-- Basic Rate Row (Spacing close together, no vertical divider) -->
          <tr class="border-b-thin">
            <td colspan="3" style="padding: 2px 4px;">
              <span class="bold">Basic Rate</span>
              <span style="margin-left: 12px; font-family: 'Courier New', Courier, monospace; font-weight: 600;">${payslip.dailyRate % 1 === 0 ? payslip.dailyRate : payslip.dailyRate.toFixed(2)}</span>
            </td>
          </tr>

          <!-- No. of days weekly (Underline under amount only) -->
          <tr>
            <td class="label-right">No. of days weekly</td>
            <td class="text-center">${payslip.daysWorked > 0 ? payslip.daysWorked.toFixed(1) : ''}</td>
            <td class="text-right underline-cell">${fmtAmt(payslip.basicPay)}</td>
          </tr>

          <!-- Overtime (Underline under amount only) -->
          <tr>
            <td class="label-right">Overtime:</td>
            <td class="text-center">${payslip.overtimeHours > 0 ? payslip.overtimeHours.toFixed(1) : ''}</td>
            <td class="text-right underline-cell">${fmtAmt(payslip.overtimePay)}</td>
          </tr>

          <!-- Regular Holiday (Underline under amount only) -->
          <tr>
            <td class="label-right">Regular Holiday</td>
            <td class="text-center">${regHolDays}</td>
            <td class="text-right underline-cell">${regHolPay}</td>
          </tr>

          <!-- Special Holiday (Underline under amount only) -->
          <tr>
            <td class="label-right">Special Holiday</td>
            <td class="text-center">${specHolDays}</td>
            <td class="text-right underline-cell">${specHolPay}</td>
          </tr>

          <!-- WDO -->
          <tr>
            <td class="label-right">WDO</td>
            <td class="text-center">${wdoHours}</td>
            <td class="text-right">${wdoPay}</td>
          </tr>

          <!-- Gross pay (Thick border top & bottom, no vertical divider) -->
          <tr class="bold border-t-thick border-b-thick">
            <td colspan="2" class="total-label" style="padding: 2.5px 4px;">Gross pay</td>
            <td class="total-amount" style="padding: 2.5px 4px;">${payslip.grossPay.toFixed(2)}</td>
          </tr>

          <!-- Deductions header (No row border) -->
          <tr>
            <td colspan="3" class="bold" style="padding: 3px 4px 1px 4px;">Deductions</td>
          </tr>

          <!-- Days / Minutes sub-header -->
          <tr class="subhead-row">
            <td style="border: none;"></td>
            <td class="text-center subhead-text" style="border: none;">Days / Minutes</td>
            <td style="border: none;"></td>
          </tr>

          <!-- Absence (s) (Boxed center cell, no full row border) -->
          <tr>
            <td class="label-right">Absence (s)</td>
            <td class="text-center box-cell" style="height: 16px;"></td>
            <td></td>
          </tr>

          <!-- Late/UT (Center cell continues box, amount has underline) -->
          <tr>
            <td class="label-right">Late/UT</td>
            <td class="text-center font-medium box-cell-bottom">${totalLateUTMinutes > 0 ? totalLateUTMinutes : ''}</td>
            <td class="text-right underline-cell">${fmtAmt(payslip.lateUndertimeDeduction)}</td>
          </tr>

          <!-- SSS Contribution (Amount has underline) -->
          <tr>
            <td class="label-right">SSS Contribution</td>
            <td class="text-center"></td>
            <td class="text-right underline-cell">${fmtAmt(payslip.sssDeduction)}</td>
          </tr>

          <!-- PHIC Contribution (Amount has underline) -->
          <tr>
            <td class="label-right">PHIC Contribution</td>
            <td class="text-center"></td>
            <td class="text-right underline-cell">${fmtAmt(payslip.philhealthDeduction)}</td>
          </tr>

          <!-- HMDF Contribution (Amount has underline) -->
          <tr>
            <td class="label-right">HMDF Contribution</td>
            <td class="text-center"></td>
            <td class="text-right underline-cell">${fmtAmt(payslip.pagibigDeduction)}</td>
          </tr>

          <!-- SSS Loan (Empty amount underline) -->
          <tr>
            <td class="label-right">SSS Loan</td>
            <td class="text-center"></td>
            <td class="text-right underline-cell">${sssLoan}</td>
          </tr>

          <!-- HDMF Loan (Empty amount underline) -->
          <tr>
            <td class="label-right">HDMF Loan</td>
            <td class="text-center"></td>
            <td class="text-right underline-cell">${hdmfLoan}</td>
          </tr>

          <!-- Cash Advance (Amount has underline) -->
          <tr>
            <td class="label-right">Cash Advance</td>
            <td class="text-center"></td>
            <td class="text-right underline-cell">${cashAdvance}</td>
          </tr>

          <!-- Others (Empty amount underline) -->
          <tr>
            <td class="label-right">Others</td>
            <td class="text-center"></td>
            <td class="text-right underline-cell">${others}</td>
          </tr>

          <!-- MLS (Empty amount underline) -->
          <tr>
            <td class="label-right">MLS</td>
            <td class="text-center"></td>
            <td class="text-right underline-cell">${mls}</td>
          </tr>

          <!-- Total Deductions (Thick border top & bottom, no vertical divider) -->
          <tr class="bold border-t-thick border-b-thick">
            <td colspan="2" class="total-label" style="padding: 2.5px 4px;">Total</td>
            <td class="total-amount" style="padding: 2.5px 4px;">${payslip.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>

          <!-- Net Pay (Soft blue, thick bottom border, no vertical divider) -->
          <tr class="net-pay-row">
            <td colspan="2" class="net-pay-label" style="padding: 2.5px 4px;">Net Pay</td>
            <td class="net-pay-amount" style="padding: 2.5px 4px;">${payslip.netPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>

          <!-- Date & Signature (Signature moved to the left) -->
          <tr>
            <td class="sig-cell" style="padding: 3px 4px;">Date</td>
            <td colspan="2" class="sig-cell" style="text-align: left; padding: 3px 4px 3px 8px;">Signature</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Returns standard CSS rules for compact payslip rendering and multi-page print tiling.
 * Configured specifically for A4 portrait: 3 payslips per row, 2 rows per page = 6 per page.
 */
function getSharedCompactStyles(): string {
  return `
    @page {
      size: A4 portrait;
      margin: 4mm 4mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      color: #000000;
      background: #f8fafc;
      margin: 0;
      padding: 0;
      font-size: 6.5px;
      line-height: 1.08;
    }
    .no-print-bar {
      background: #ffffff;
      border-bottom: 1px solid #cbd5e1;
      padding: 8px 16px;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 5px rgba(0,0,0,0.06);
    }
    .preview-container {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }
    .print-btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 7px 16px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .print-btn:hover {
      background: #1d4ed8;
    }
    .close-btn {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      padding: 7px 12px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 11px;
      cursor: pointer;
    }
    .close-btn:hover {
      background: #e2e8f0;
    }

    /* Print Tiling Sheets: 6 payslips per A4 page (3 columns x 2 rows) */
    .page-sheet {
      width: 202mm;
      max-width: 202mm;
      margin: 16px auto 24px auto;
      padding: 6mm 0;
      box-sizing: border-box;
      display: grid;
      grid-template-columns: repeat(3, 65mm);
      grid-auto-rows: max-content;
      justify-content: center;
      gap: 4mm 3.5mm;
      background: #ffffff;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      border-radius: 4px;
      page-break-after: always;
      break-after: page;
    }
    .page-sheet:last-child {
      page-break-after: avoid;
      break-after: avoid;
      margin-bottom: 16px;
    }

    /* Single view container */
    .single-sheet-container {
      width: 66mm;
      max-width: 66mm;
      margin: 20px auto;
      background: #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }

    /* Compact payslip table styling - matches CompactPayslipView exactly */
    .compact-payslip-box {
      width: 65mm;
      max-width: 65mm;
      margin: 0 auto;
      box-sizing: border-box;
      border: 2px solid #000000;
      background: #ffffff;
      color: #000000;
      display: block;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
      font-size: 10px;
      line-height: 1.2;
    }
    .compact-table {
      width: 100%;
      border-collapse: collapse;
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      font-size: 10px;
      line-height: 1.2;
      color: #000000;
      table-layout: fixed;
    }
    .compact-table td, .compact-table th {
      border: none;
      padding: 1.5px 3px;
      box-sizing: border-box;
      vertical-align: middle;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 10px;
    }
    .compact-table tr.border-b-thick td,
    .compact-table td.border-b-thick {
      border-bottom: 1.5px solid #000000 !important;
    }
    .compact-table tr.border-t-thick td,
    .compact-table td.border-t-thick {
      border-top: 1.5px solid #000000 !important;
    }
  
    .compact-table tr.border-t-thin td,
    .compact-table td.border-t-thin {
      border-top: 1px solid #000000 !important;
    }
    .compact-table tr.border-b-thin td,
    .compact-table td.border-b-thin {
      border-bottom: 1px solid #000000 !important;
    }
    .compact-table td.underline-cell {
      border-bottom: 1px solid #000000 !important;
    }
    .compact-table td.box-cell {
      border: 1px solid #000000 !important;
    }
    .compact-table td.box-cell-bottom {
      border-left: 1px solid #000000 !important;
      border-right: 1px solid #000000 !important;
      border-bottom: 1px solid #000000 !important;
    }
    .compact-table .company-name {
      font-size: 10.5px;
      font-weight: 700;
      line-height: 1.05;
      color: #000000;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 44mm;
      margin: 0 auto;
    }
    .compact-table .doc-title {
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #000000;
      line-height: 1.1;
      margin-top: 1px;
    }
    .compact-table .period-text {
      font-size: 8.5px;
      font-weight: 500;
      margin-top: 1px;
      color: #000000;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 44mm;
      margin-left: auto;
      margin-right: auto;
    }
    .compact-table .name-cell {
      font-size: 10px;
      font-weight: bold;
    }
    .compact-table .bold {
      font-weight: bold;
    }
    .compact-table .text-center {
      text-align: center;
    }
    .compact-table .label-right {
      text-align: right;
      padding-right: 4px;
      white-space: nowrap;
    }
    .compact-table .text-right {
      text-align: right;
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
    }
    .compact-table .total-label {
      font-size: 10.5px !important;
      font-weight: 600 !important;
      color: #000000 !important;
    }
    .compact-table .total-amount {
      text-align: right !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif !important;
      color: #000000 !important;
    }
    .compact-table .subhead-row td {
      overflow: visible !important;
      text-overflow: clip !important;
      white-space: nowrap !important;
      line-height: 1 !important;
      padding: 0 !important;
      height: auto !important;
    }
    .compact-table .subhead-text {
      font-size: 8px !important;
      color: #000000 !important;
      font-weight: 700 !important;
      overflow: visible !important;
      text-overflow: clip !important;
      white-space: nowrap !important;
      display: inline-block;
      width: 100%;
      text-align: center;
    }
    .compact-table .net-pay-row td {
      background-color: #b4c6e7 !important;
      color: #000000 !important;
      border-bottom: 1.5px solid #000000 !important;
    }
    .compact-table .net-pay-label {
      font-size: 11.5px !important;
      font-weight: 600 !important;
    }
    .compact-table .net-pay-amount {
      text-align: right !important;
      font-size: 11.5px !important;
      font-weight: 600 !important;
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif !important;
    }
    .compact-table .sig-cell {
      padding: 3px 4px;
      font-size: 9.5px;
      font-weight: 500;
    }

    @media print {
      @page {
        size: A4 portrait;
        margin: 6mm 4mm;
      }
      html, body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 202mm !important;
      }
      .no-print-bar {
        display: none !important;
      }
      .single-sheet-container {
        box-shadow: none !important;
        margin: 0 auto !important;
        width: 65mm !important;
        max-width: 65mm !important;
      }
      .page-sheet {
        margin: 0 auto !important;
        width: 202mm !important;
        max-width: 202mm !important;
        height: auto !important;
        min-height: 0 !important;
        box-shadow: none !important;
        border: none !important;
        padding: 4mm 0 !important;
        display: grid !important;
        grid-template-columns: repeat(3, 65mm) !important;
        grid-auto-rows: max-content !important;
        justify-content: center !important;
        gap: 4mm 3.5mm !important;
        page-break-after: always !important;
        break-after: page !important;
        overflow: visible !important;
      }
      .page-sheet:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      .compact-payslip-box {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  `;
}

/**
 * Generates high-fidelity, self-contained HTML for an individual compact Philippine payslip.
 */
export function generatePayslipHtml(
  payslip: Payslip,
  companyProfile: CompanyProfile,
  periodName?: string
): string {
  const tableHtml = generateCompactPayslipTableHtml(payslip, companyProfile, periodName);
  const compactStyles = getSharedCompactStyles();

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Payslip - ${payslip.employeeName} (${payslip.employeeNumber})</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      ${compactStyles}
    </style>
  </head>
  <body>
    <div class="no-print-bar">
      <div class="preview-container">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #10b981;"></span>
          <span style="font-weight: 700; font-size: 12px; color: #0f172a;">Printable Compact Payslip</span>
          <span style="font-size: 10.5px; color: #64748b; font-family: monospace;">(${payslip.employeeName} • ${payslip.employeeNumber})</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="print-btn" onclick="window.print()">
            🖨️ Print / Save as PDF
          </button>
          <button class="close-btn" onclick="window.close()">
            ✕ Close
          </button>
        </div>
      </div>
    </div>
    <div class="single-sheet-container">
      ${tableHtml}
    </div>
  </body>
</html>`;
}

/**
 * Opens a dedicated payslip print preview in a clean new browser tab.
 */
export function printPayslip(
  payslip: Payslip,
  companyProfile: CompanyProfile,
  periodName?: string
) {
  const html = generatePayslipHtml(payslip, companyProfile, periodName);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const newWin = window.open(url, '_blank');
  if (!newWin) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener,noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 300);
  }
}

/**
 * Opens a dedicated print preview in a clean new browser tab.
 */
export function openPayslipInNewWindow(
  payslip: Payslip,
  companyProfile: CompanyProfile,
  periodName?: string
) {
  printPayslip(payslip, companyProfile, periodName);
}

/**
 * Downloads a standalone, offline-viewable HTML payslip file.
 */
export function downloadPayslipHtml(
  payslip: Payslip,
  companyProfile: CompanyProfile,
  periodName?: string
) {
  const html = generatePayslipHtml(payslip, companyProfile, periodName);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Payslip_${payslip.employeeNumber}_${(periodName || payslip.payPeriodId).replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Opens all payslips for a given pay period in one continuous document preview.
 * Formatted as compact payslips with EXACTLY 6 payslips per printed page (3 per row, 2 rows = 6 per page, fitting A4).
 */
export function printAllPayslips(
  payslips: Payslip[],
  companyProfile: CompanyProfile,
  periodName?: string
) {
  if (payslips.length === 0) return;

  const CHUNK_SIZE = 6;
  const pages: Payslip[][] = [];
  for (let i = 0; i < payslips.length; i += CHUNK_SIZE) {
    pages.push(payslips.slice(i, i + CHUNK_SIZE));
  }

  const pagesHtml = pages
    .map((pagePayslips, pageIdx) => {
      const itemsHtml = pagePayslips
        .map(ps => generateCompactPayslipTableHtml(ps, companyProfile, periodName))
        .join('');

      return `
        <div class="page-sheet" data-page="${pageIdx + 1}">
          ${itemsHtml}
        </div>
      `;
    })
    .join('');

  const totalPages = pages.length;
  const compactStyles = getSharedCompactStyles();

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>All Payslips - ${periodName || 'Cutoff'} (${payslips.length} Employees)</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      ${compactStyles}
    </style>
  </head>
  <body>
    <div class="no-print-bar">
      <div class="preview-container">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #2563eb;"></span>
          <span style="font-weight: 700; font-size: 12px; color: #0f172a;">All Payslips (A4 • 3/row • 6 per page)</span>
          <span style="font-size: 10.5px; color: #64748b; font-family: monospace;">
            (${payslips.length} Employees • ${totalPages} Page${totalPages > 1 ? 's' : ''} • A4 Portrait)
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="print-btn" onclick="window.print()">
            🖨️ Print All Payslips / Save as PDF
          </button>
          <button class="close-btn" onclick="window.close()">
            ✕ Close
          </button>
        </div>
      </div>
    </div>
    ${pagesHtml}
  </body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const newWin = window.open(url, '_blank');
  if (!newWin) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener,noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 300);
  }
}

function escapeHtml(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats a pay period date range cleanly as "Month DD-DD, YYYY".
 */
export function formatSummaryPeriodRange(period: PayPeriod): string {
  if (period.startDate && period.endDate) {
    const [sy, sm, sd] = period.startDate.split('-').map(Number);
    const [ey, em, ed] = period.endDate.split('-').map(Number);
    if (!isNaN(sy) && !isNaN(ey)) {
      const sDate = new Date(sy, sm - 1, sd);
      const eDate = new Date(ey, em - 1, ed);
      const sMonth = sDate.toLocaleDateString('en-US', { month: 'long' });
      const eMonth = eDate.toLocaleDateString('en-US', { month: 'long' });
      if (sMonth === eMonth && sy === ey) {
        return `${sMonth} ${sd}-${ed}, ${sy}`;
      } else if (sy === ey) {
        return `${sMonth} ${sd} - ${eMonth} ${ed}, ${sy}`;
      } else {
        return `${sMonth} ${sd}, ${sy} - ${eMonth} ${ed}, ${ey}`;
      }
    }
  }
  return (period.name || '').replace(/\s*\([^)]*\)/g, '').trim();
}

/**
 * Formats a payout date as "Month DD, YYYY".
 */
export function formatSummaryPayoutDate(period: PayPeriod): string {
  if (period.payoutDate) {
    const [py, pm, pd] = period.payoutDate.split('-').map(Number);
    if (!isNaN(py)) {
      const pDate = new Date(py, pm - 1, pd);
      return pDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  }
  return '';
}

/**
 * Extracts surname, first name, and middle initial for the payroll summary.
 */
export function extractEmployeeNameParts(
  payslip: Payslip,
  employee?: Employee
): { surname: string; firstName: string; mi: string } {
  if (employee) {
    const surname = (employee.lastName || '').trim().toUpperCase();
    let firstName = (employee.firstName || '').trim().toUpperCase();
    let mi = (employee.middleInitial || '').trim().toUpperCase();

    if (!mi) {
      const match = firstName.match(/\s+([A-Z])\.?$/i);
      if (match) {
        mi = match[1].toUpperCase();
        firstName = firstName.replace(/\s+([A-Z])\.?$/i, '').trim();
      }
    }
    return { surname, firstName, mi };
  }

  const raw = (payslip.employeeName || '').trim();
  if (raw.includes(',')) {
    const [lastPart, firstPart] = raw.split(',');
    const surname = (lastPart || '').trim().toUpperCase();
    let firstName = (firstPart || '').trim().toUpperCase();
    let mi = '';
    const match = firstName.match(/\s+([A-Z])\.?$/i);
    if (match) {
      mi = match[1].toUpperCase();
      firstName = firstName.replace(/\s+([A-Z])\.?$/i, '').trim();
    }
    return { surname, firstName, mi };
  }

  const tokens = raw.split(/\s+/);
  if (tokens.length <= 1) {
    return { surname: raw.toUpperCase(), firstName: '', mi: '' };
  }
  const surname = tokens[tokens.length - 1].toUpperCase();
  let firstName = tokens.slice(0, -1).join(' ').toUpperCase();
  let mi = '';
  const match = firstName.match(/\s+([A-Z])\.?$/i);
  if (match) {
    mi = match[1].toUpperCase();
    firstName = firstName.replace(/\s+([A-Z])\.?$/i, '').trim();
  }
  return { surname, firstName, mi };
}

/**
 * Generates and opens the spreadsheet-style Payroll Summary in a new tab for print preview.
 * Matches the requested Excel layout:
 * - Columns: No., SURNAME, FIRST NAME, MI, Daily Rate, Number of Days, Hourly Rate, OT Rate,
 *   OT (hrs), UT (mins), Late (mins), Basic Pay,
 *   OTHER INCOME: [OT Pay, Holiday Pay (Regular, Special), WDO Hour, WDO Pay, Reg Pay, SH Pay, Allowance],
 *   Deductions: [UT, Late],
 *   Total Basic Pay, Remarks.
 * - Colors: Light blue (#d9e1f2), gold/tan (#d6c8a5), red employee names, and black TOTAL AMOUNT bar.
 */
export function printPayrollSummary(
  payslips: Payslip[],
  payPeriod: PayPeriod,
  employees: Employee[],
  companyProfile?: CompanyProfile
) {
  if (payslips.length === 0) return;

  const periodText = formatSummaryPeriodRange(payPeriod);
  const payoutText = formatSummaryPayoutDate(payPeriod);

  // Totals accumulators
  let totDailyRate = 0;
  let totDaysWorked = 0;
  let totHourlyRate = 0;
  let totOTRate = 0;
  let totOTHours = 0;
  let totUTMinutes = 0;
  let totLateMinutes = 0;
  let totBasicPay = 0;
  let totOTPay = 0;
  let totRegHolQty = 0;
  let totSpecHolQty = 0;
  let totWDOHours = 0;
  let totWDOPay = 0;
  let totRegHolPay = 0;
  let totSpecHolPay = 0;
  let totAllowances = 0;
  let totUTDed = 0;
  let totLateDed = 0;
  let totOverallBasicPay = 0;

  const rowsHtml = payslips
    .map(ps => {
      const emp = employees.find(
        e => e.id === ps.employeeId || e.employeeNumber === ps.employeeNumber
      );
      const { surname, firstName, mi } = extractEmployeeNameParts(ps, emp);

      const dailyRate = ps.dailyRate || 0;
      const daysWorked = ps.daysWorked || 0;
      const hourlyRate = ps.hourlyRate || Math.round((dailyRate / 8) * 100) / 100;
      const otRate = Math.round(hourlyRate * 1.25 * 100) / 100;

      const otHours = ps.overtimeHours || 0;
      const utMinutes = ps.undertimeMinutes || 0;
      const lateMinutes = ps.lateMinutes || 0;
      const basicPay = ps.basicPay || Math.round(daysWorked * dailyRate * 100) / 100;

      const otPay = ps.overtimePay || 0;

      // Holiday Breakdown: "SH is special holiday"
      const regHolQty =
        ps.regularHolidayDays ||
        (ps.specialHolidayDays ? 0 : ps.holidayDays) ||
        0;
      const specHolQty = ps.specialHolidayDays || 0;

      const regHolPay = ps.regularHolidayDays
        ? Math.round(ps.regularHolidayDays * dailyRate * 1.0 * 100) / 100
        : ps.specialHolidayDays
        ? 0
        : ps.holidayPay || 0;

      const specHolPay = ps.specialHolidayDays
        ? Math.round(ps.specialHolidayDays * dailyRate * 0.30 * 100) / 100
        : 0;

      const wdoHours = ps.wdoHours || 0;
      const wdoPay =
        ps.wdoPay !== undefined && ps.wdoPay > 0
          ? ps.wdoPay
          : wdoHours > 0
          ? Math.round(wdoHours * hourlyRate * 1.30 * 100) / 100
          : 0;

      const allowance = ps.totalAllowances || 0;

      // Deductions: UT and Late amounts (yellow circle: amount equivalent)
      const minuteRate = hourlyRate / 60;
      let utDed = 0;
      let lateDed = 0;
      const totalMins = utMinutes + lateMinutes;
      if (ps.lateUndertimeDeduction && ps.lateUndertimeDeduction > 0) {
        if (totalMins > 0) {
          utDed = Math.round((ps.lateUndertimeDeduction * (utMinutes / totalMins)) * 100) / 100;
          lateDed = Math.round((ps.lateUndertimeDeduction - utDed) * 100) / 100;
        }
      } else {
        utDed = Math.round(utMinutes * minuteRate * 100) / 100;
        lateDed = Math.round(lateMinutes * minuteRate * 100) / 100;
      }

      // Total Basic Pay = Basic Pay + Other Income
      const totalBasicPay = Math.round(
        (basicPay + otPay + wdoPay + regHolPay + specHolPay + allowance) * 100
      ) / 100;

      // Accumulate
      totDailyRate += dailyRate;
      totDaysWorked += daysWorked;
      totHourlyRate += hourlyRate;
      totOTRate += otRate;
      totOTHours += otHours;
      totUTMinutes += utMinutes;
      totLateMinutes += lateMinutes;
      totBasicPay += basicPay;
      totOTPay += otPay;
      totRegHolQty += regHolQty;
      totSpecHolQty += specHolQty;
      totWDOHours += wdoHours;
      totWDOPay += wdoPay;
      totRegHolPay += regHolPay;
      totSpecHolPay += specHolPay;
      totAllowances += allowance;
      totUTDed += utDed;
      totLateDed += lateDed;
      totOverallBasicPay += totalBasicPay;

      const dailyRateStr = dailyRate % 1 === 0 ? dailyRate.toFixed(0) : dailyRate.toFixed(2);
      const daysWorkedStr = daysWorked.toFixed(1);
      const hourlyRateStr = hourlyRate.toFixed(2);
      const otRateStr = otRate.toFixed(2);
      const otHoursStr = otHours > 0 ? (otHours % 1 === 0 ? otHours.toFixed(0) : otHours.toFixed(1)) : '';
      const utMinutesStr = utMinutes > 0 ? utMinutes.toString() : '';
      const lateMinutesStr = lateMinutes > 0 ? lateMinutes.toString() : '';
      const basicPayStr = basicPay % 1 === 0 ? basicPay.toFixed(0) : basicPay.toFixed(2);
      const otPayStr = otPay > 0 ? otPay.toFixed(2) : '0.00';
      const regHolQtyStr = regHolQty > 0 ? (regHolQty % 1 === 0 ? regHolQty.toFixed(0) : regHolQty.toFixed(1)) : '';
      const specHolQtyStr = specHolQty > 0 ? (specHolQty % 1 === 0 ? specHolQty.toFixed(0) : specHolQty.toFixed(1)) : '';
      const wdoHoursStr = wdoHours > 0 ? (wdoHours % 1 === 0 ? wdoHours.toFixed(0) : wdoHours.toFixed(1)) : '';
      const wdoPayStr = wdoPay > 0 ? wdoPay.toFixed(2) : '0';
      const regPayStr = regHolPay > 0 ? regHolPay.toFixed(2) : '0';
      const shPayStr = specHolPay > 0 ? specHolPay.toFixed(2) : '0';
      const allowanceStr = allowance > 0 ? allowance.toFixed(2) : '';
      const utDedStr = utDed > 0 ? utDed.toFixed(2) : '0.00';
      const lateDedStr = lateDed > 0 ? lateDed.toFixed(2) : '0.0';
      const totalBasicPayStr = totalBasicPay.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      return `
        <tr class="data-row">
          <td class="text-center font-mono">${escapeHtml(ps.employeeNumber)}</td>
          <td class="text-left text-red font-semibold">${escapeHtml(surname)}</td>
          <td class="text-left text-red font-semibold">${escapeHtml(firstName)}</td>
          <td class="text-center text-red font-semibold">${escapeHtml(mi)}</td>
          <td class="text-right">${dailyRateStr}</td>
          <td class="text-right">${daysWorkedStr}</td>
          <td class="text-right">${hourlyRateStr}</td>
          <td class="text-right">${otRateStr}</td>
          <td class="text-right font-medium">${otHoursStr}</td>
          <td class="text-right font-medium">${utMinutesStr}</td>
          <td class="text-right font-medium">${lateMinutesStr}</td>
          <td class="text-right font-semibold bg-gold">${basicPayStr}</td>
          <td class="text-right">${otPayStr}</td>
          <td class="text-right">${regHolQtyStr}</td>
          <td class="text-right">${specHolQtyStr}</td>
          <td class="text-right">${wdoHoursStr}</td>
          <td class="text-right">${wdoPayStr}</td>
          <td class="text-right">${regPayStr}</td>
          <td class="text-right">${shPayStr}</td>
          <td class="text-right">${allowanceStr}</td>
          <td class="text-right">${utDedStr}</td>
          <td class="text-right">${lateDedStr}</td>
          <td class="text-right font-bold bg-gold">${totalBasicPayStr}</td>
          <td class="text-left">${escapeHtml(ps.remarks || '')}</td>
        </tr>
      `;
    })
    .join('');

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Payroll Summary - ${escapeHtml(periodText)} (${payslips.length} Employees)</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      @page {
        size: landscape;
        margin: 6mm 8mm;
      }
      * {
        box-sizing: border-box;
      }
      body {
        font-family: Calibri, Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #000000;
        background: #f1f5f9;
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print-bar {
        position: sticky;
        top: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        background: #ffffff;
        border-bottom: 1px solid #cbd5e1;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        padding: 8px 16px;
        margin-bottom: 16px;
      }
      .preview-container {
        max-width: 1440px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .print-btn {
        background: #059669;
        color: #ffffff;
        border: none;
        padding: 6px 14px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: background 0.15s;
      }
      .print-btn:hover {
        background: #047857;
      }
      .close-btn {
        background: #f1f5f9;
        color: #475569;
        border: 1px solid #cbd5e1;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
      }
      .close-btn:hover {
        background: #e2e8f0;
      }
      .sheet-container {
        max-width: 1440px;
        margin: 0 auto;
        padding: 16px 20px;
        background: #ffffff;
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        border-radius: 2px;
      }
      .summary-meta {
        margin-bottom: 14px;
        font-size: 13.5px;
        line-height: 1.5;
        color: #000000;
      }
      .meta-row {
        display: flex;
        align-items: baseline;
        margin-bottom: 3px;
      }
      .meta-label {
        font-weight: bold;
        width: 130px;
        flex-shrink: 0;
      }
      .meta-val {
        font-weight: bold;
      }
      .table-wrapper {
        width: 100%;
        overflow-x: auto;
      }
      table.summary-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
        border: 1px solid #000000;
      }
      table.summary-table th,
      table.summary-table td {
        border: 1px solid #000000;
        padding: 3px 5px;
        white-space: nowrap;
        line-height: 1.25;
      }
      table.summary-table th {
        font-weight: bold;
        text-align: center;
        background-color: #ffffff;
        vertical-align: middle;
      }
      table.summary-table th.bg-blue {
        background-color: #d9e1f2 !important;
      }
      table.summary-table th.bg-gold,
      table.summary-table td.bg-gold {
        background-color: #d6c8a5 !important;
      }
      table.summary-table tr.data-row td {
        background-color: #ffffff;
      }
      table.summary-table tr.total-row {
        background-color: #000000 !important;
        color: #ffffff !important;
        font-weight: bold;
      }
      table.summary-table tr.total-row td {
        border: 1px solid #000000;
        color: #ffffff !important;
        background-color: #000000 !important;
        padding: 4px 5px;
      }
      .total-label {
        text-align: left;
        font-weight: bold;
        padding-left: 6px !important;
        letter-spacing: 0.2px;
      }
      .text-left { text-align: left; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .text-red { color: #dc2626 !important; }
      .font-medium { font-weight: 500; }
      .font-semibold { font-weight: 600; }
      .font-bold { font-weight: bold; }
      .font-mono { font-family: monospace; }
      @media print {
        .no-print-bar {
          display: none !important;
        }
        body {
          background: #ffffff !important;
        }
        .sheet-container {
          padding: 0 !important;
          box-shadow: none !important;
          max-width: none !important;
          width: 100% !important;
        }
        table.summary-table {
          font-size: 9.5px !important;
        }
        table.summary-table th,
        table.summary-table td {
          padding: 2.5px 3.5px !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="no-print-bar">
      <div class="preview-container">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #059669;"></span>
          <span style="font-weight: 700; font-size: 12px; color: #0f172a;">Payroll Summary - ${escapeHtml(periodText)}</span>
          <span style="font-size: 10.5px; color: #64748b; font-family: monospace;">
            (${payslips.length} Employees • Landscape Print Preview)
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="print-btn" onclick="window.print()">
            🖨️ Print Payroll Summary / Save as PDF
          </button>
          <button class="close-btn" onclick="window.close()">
            ✕ Close
          </button>
        </div>
      </div>
    </div>

    <div class="sheet-container">
      <div class="summary-meta">
        <div class="meta-row">
          <span class="meta-label">Payroll Period:</span>
          <span class="meta-val">${escapeHtml(periodText)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Payout:</span>
          <span class="meta-val">${escapeHtml(payoutText)}</span>
        </div>
      </div>

      <div class="table-wrapper">
        <table class="summary-table">
          <thead>
            <!-- Header Row 1 -->
            <tr>
              <th rowspan="3">No.</th>
              <th rowspan="3">SURNAME</th>
              <th rowspan="3">FIRST NAME</th>
              <th rowspan="3">MI</th>
              <th rowspan="3" class="bg-blue">Daily<br/>Rate</th>
              <th rowspan="3" class="bg-blue">Number<br/>of Days</th>
              <th rowspan="3" class="bg-blue">Hourly<br/>Rate</th>
              <th rowspan="3" class="bg-blue">OT Rate</th>
              <th rowspan="3" class="bg-blue">OT</th>
              <th rowspan="3" class="bg-blue">UT</th>
              <th rowspan="3" class="bg-blue">Late</th>
              <th rowspan="3" class="bg-gold">Basic Pay</th>
              <th colspan="8">OTHER INCOME</th>
              <th colspan="2">Deductions</th>
              <th rowspan="3" class="bg-gold">Total Basic<br/>Pay</th>
              <th rowspan="3">Remarks</th>
            </tr>
            <!-- Header Row 2 -->
            <tr>
              <th rowspan="2">OT Pay</th>
              <th colspan="2" class="bg-blue">Holiday Pay</th>
              <th rowspan="2" class="bg-blue">WDO<br/>Hour</th>
              <th rowspan="2">WDO Pay</th>
              <th rowspan="2">Reg Pay</th>
              <th rowspan="2">SH Pay</th>
              <th rowspan="2" class="bg-blue">Allowance</th>
              <th rowspan="2">UT</th>
              <th rowspan="2">Late</th>
            </tr>
            <!-- Header Row 3 -->
            <tr>
              <th class="bg-blue">Regular</th>
              <th class="bg-blue">Special</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <!-- TOTAL AMOUNT Row -->
            <tr class="total-row">
              <td colspan="4" class="total-label">TOTAL AMOUNT:</td>
              <td class="text-right">${fmtTotal(totDailyRate)}</td>
              <td class="text-right">${fmtTotal(totDaysWorked)}</td>
              <td class="text-right">${fmtTotal(totHourlyRate)}</td>
              <td class="text-right">${fmtTotal(totOTRate)}</td>
              <td class="text-right">${totOTHours > 0 ? (totOTHours % 1 === 0 ? totOTHours.toFixed(0) : totOTHours.toFixed(1)) : '0'}</td>
              <td class="text-right">${fmtTotal(totUTMinutes)}</td>
              <td class="text-right">${fmtTotal(totLateMinutes)}</td>
              <td class="text-right">${fmtTotal(totBasicPay)}</td>
              <td class="text-right">${fmtTotal(totOTPay)}</td>
              <td class="text-right">${fmtTotal(totRegHolQty)}</td>
              <td class="text-right">${fmtTotal(totSpecHolQty)}</td>
              <td class="text-right">${fmtTotal(totWDOHours)}</td>
              <td class="text-right">${fmtTotal(totWDOPay)}</td>
              <td class="text-right">${fmtTotal(totRegHolPay)}</td>
              <td class="text-right">${fmtTotal(totSpecHolPay)}</td>
              <td class="text-right">${fmtTotal(totAllowances)}</td>
              <td class="text-right">${fmtTotal(totUTDed)}</td>
              <td class="text-right">${fmtTotal(totLateDed)}</td>
              <td class="text-right font-bold">${fmtTotal(totOverallBasicPay)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const newWin = window.open(url, '_blank');
  if (!newWin) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener,noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 300);
  }
}

