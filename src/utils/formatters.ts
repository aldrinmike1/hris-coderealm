/**
 * Utility formatters for Philippine HRIS & Payroll system
 */

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₱0.00';
  }
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatPunchDateMMDDYYYY(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const clean = dateString.trim();
  // If already MM/DD/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    return clean;
  }
  // If YYYY-MM-DD
  const ymd = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    return `${ymd[2]}/${ymd[3]}/${ymd[1]}`;
  }
  try {
    const d = new Date(clean);
    if (isNaN(d.getTime())) return clean;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  } catch {
    return clean;
  }
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatAttendanceTime(timeStr: string | null | undefined, includeSeconds: boolean = false): string {
  if (!timeStr) return '—';
  const clean = timeStr.trim();
  // Check if string is purely a timezone like "+08:00", "-05:00", "GMT+8", "UTC"
  if (/^[+-]\d{2}(:\d{2})?$/.test(clean) || /^[+-]\d{4}$/.test(clean) || /^GMT/i.test(clean) || /^UTC/i.test(clean)) {
    return includeSeconds ? '08:00:00' : '08:00';
  }
  // Extract time portion HH:mm:ss or HH:mm from strings like "16:41:42", "16:41:42+08:00", "2026-08-21T16:41:42"
  const timeMatch = clean.match(/(?:^|T|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    const hh = timeMatch[1].padStart(2, '0');
    const mm = timeMatch[2];
    const ss = timeMatch[3] ? timeMatch[3] : '00';
    return includeSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
  }
  return clean;
}

export function cleanAndNormalizeTime(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed || trimmed === '—' || trimmed === '-') return '';

  // Extract digits and colon
  const cleaned = trimmed.replace(/[^0-9:]/g, '');
  if (!cleaned) return '';

  // If already has colon: H:M or HH:MM
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || '0', 10);
    if (isNaN(h)) return '';
    const safeH = Math.min(23, Math.max(0, h)).toString().padStart(2, '0');
    const safeM = Math.min(59, Math.max(0, isNaN(m) ? 0 : m)).toString().padStart(2, '0');
    return `${safeH}:${safeM}`;
  }

  // Pure digits:
  // 1 or 2 digits: "8" -> "08:00", "17" -> "17:00"
  if (cleaned.length <= 2) {
    const h = parseInt(cleaned, 10);
    if (isNaN(h)) return '';
    const safeH = Math.min(23, Math.max(0, h)).toString().padStart(2, '0');
    return `${safeH}:00`;
  }

  // 3 digits: "830" -> "08:30"
  if (cleaned.length === 3) {
    const h = parseInt(cleaned.slice(0, 1), 10);
    const m = parseInt(cleaned.slice(1, 3), 10);
    const safeH = Math.min(23, Math.max(0, h)).toString().padStart(2, '0');
    const safeM = Math.min(59, Math.max(0, m)).toString().padStart(2, '0');
    return `${safeH}:${safeM}`;
  }

  // 4 digits: "0830" -> "08:30", "1700" -> "17:00"
  if (cleaned.length >= 4) {
    const h = parseInt(cleaned.slice(0, 2), 10);
    const m = parseInt(cleaned.slice(2, 4), 10);
    const safeH = Math.min(23, Math.max(0, h)).toString().padStart(2, '0');
    const safeM = Math.min(59, Math.max(0, m)).toString().padStart(2, '0');
    return `${safeH}:${safeM}`;
  }

  return '';
}

export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '—';
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return timeStr;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch {
    return timeStr;
  }
}

export function formatSSS(sss: string | undefined): string {
  if (!sss) return '—';
  const clean = sss.replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 9)}-${clean.slice(9)}`;
  }
  return sss;
}

export function formatPhilHealth(ph: string | undefined): string {
  if (!ph) return '—';
  const clean = ph.replace(/\D/g, '');
  if (clean.length === 12) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 11)}-${clean.slice(11)}`;
  }
  return ph;
}

export function formatPagIbig(pagibig: string | undefined): string {
  if (!pagibig) return '—';
  const clean = pagibig.replace(/\D/g, '');
  if (clean.length === 12) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8)}`;
  }
  return pagibig;
}

export function exportToCSV(filename: string, rows: Record<string, any>[]): void {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map(row => {
        return keys
          .map(k => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k];
            cell = cell instanceof Date ? cell.toLocaleString() : cell.toString();
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
