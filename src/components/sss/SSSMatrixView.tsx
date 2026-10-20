import React, { useState, useMemo } from 'react';
import { Calculator, FileText, CheckCircle2, Info, Search, RefreshCw } from 'lucide-react';

export interface SSSBracket {
  rangeLabel: string;
  rangeStart: number;
  rangeEnd: number;
  regularMsc: number;
  mpfMsc: number;
  totalMsc: number;
  regularEr: number;
  mpfEr: number;
  ecEr: number;
  totalEr: number;
  regularEe: number;
  mpfEe: number;
  totalEe: number;
  grandTotal: number;
}

// Generate exact SSS Matrix based on SSS CIRCULAR NO. 2024-006 (Effective January 2025)
export const generateSSSMatrix = (): SSSBracket[] => {
  const brackets: SSSBracket[] = [];

  // Row 1: BELOW 5,250
  brackets.push({
    rangeLabel: 'BELOW 5,250.00',
    rangeStart: 0,
    rangeEnd: 5249.99,
    regularMsc: 5000,
    mpfMsc: 0,
    totalMsc: 5000,
    regularEr: 500,
    mpfEr: 0,
    ecEr: 10,
    totalEr: 510,
    regularEe: 250,
    mpfEe: 0,
    totalEe: 250,
    grandTotal: 760,
  });

  // Rows 2 to 31: 5,250.00 - 20,249.99 (Regular SS MSC 5,500 to 20,000)
  for (let i = 0; i < 30; i++) {
    const rangeStart = 5250 + i * 500;
    const rangeEnd = rangeStart + 499.99;
    const regularMsc = 5500 + i * 500;
    const mpfMsc = 0;
    const totalMsc = regularMsc;
    const regularEr = regularMsc * 0.10;
    const mpfEr = 0;
    const ecEr = regularMsc >= 14750 ? 30 : 10;
    const totalEr = regularEr + mpfEr + ecEr;
    const regularEe = regularMsc * 0.05;
    const mpfEe = 0;
    const totalEe = regularEe + mpfEe;
    const grandTotal = totalEr + totalEe;

    brackets.push({
      rangeLabel: `${rangeStart.toLocaleString('en-US', { minimumFractionDigits: 2 })} - ${rangeEnd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      rangeStart,
      rangeEnd,
      regularMsc,
      mpfMsc,
      totalMsc,
      regularEr,
      mpfEr,
      ecEr,
      totalEr,
      regularEe,
      mpfEe,
      totalEe,
      grandTotal,
    });
  }

  // Rows 32 to 61: 20,250.00 - 34,749.99 and Over (MPF / WISP ranges)
  for (let j = 0; j < 30; j++) {
    const rangeStart = 20250 + j * 500;
    const isOver = j === 29;
    const rangeEnd = isOver ? Infinity : rangeStart + 499.99;
    const regularMsc = 20000;
    const mpfMsc = 500 + j * 500;
    const totalMsc = regularMsc + mpfMsc;
    const regularEr = 2000;
    const mpfEr = mpfMsc * 0.10;
    const ecEr = 30;
    const totalEr = regularEr + mpfEr + ecEr;
    const regularEe = 1000;
    const mpfEe = mpfMsc * 0.05;
    const totalEe = regularEe + mpfEe;
    const grandTotal = totalEr + totalEe;

    brackets.push({
      rangeLabel: isOver 
        ? `${rangeStart.toLocaleString('en-US', { minimumFractionDigits: 2 })} - Over`
        : `${rangeStart.toLocaleString('en-US', { minimumFractionDigits: 2 })} - ${rangeEnd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      rangeStart,
      rangeEnd,
      regularMsc,
      mpfMsc,
      totalMsc,
      regularEr,
      mpfEr,
      ecEr,
      totalEr,
      regularEe,
      mpfEe,
      totalEe,
      grandTotal,
    });
  }

  return brackets;
};

export const SSS_MATRIX_2025 = generateSSSMatrix();

export const findSSSBracket = (pay: number): SSSBracket => {
  if (isNaN(pay) || pay <= 0) return SSS_MATRIX_2025[0];
  for (const bracket of SSS_MATRIX_2025) {
    if (pay >= bracket.rangeStart && pay <= bracket.rangeEnd) {
      return bracket;
    }
  }
  return SSS_MATRIX_2025[SSS_MATRIX_2025.length - 1];
};

export const SSSMatrixView: React.FC = () => {
  const [basicPay, setBasicPay] = useState<string>('25000');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeBracket = useMemo(() => {
    const val = parseFloat(basicPay);
    if (isNaN(val) || val < 0) return null;
    return findSSSBracket(val);
  }, [basicPay]);

  const filteredBrackets = useMemo(() => {
    if (!searchQuery.trim()) return SSS_MATRIX_2025;
    const q = searchQuery.toLowerCase();
    return SSS_MATRIX_2025.filter(b => 
      b.rangeLabel.toLowerCase().includes(q) ||
      b.totalMsc.toString().includes(q) ||
      b.grandTotal.toString().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner - Circular Info */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              <FileText className="w-3.5 h-3.5" />
              CIRCULAR NO. 2024-006 (Effective January 2025)
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Schedule of SSS Contributions
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl">
              Official contribution rates for Business Employers (ERs) and Employees (EEs) under R.A. No. 11199 (Social Security Act of 2018).
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-xs space-y-2 border border-white/10 min-w-[280px]">
            <div className="font-semibold text-blue-200 border-b border-white/10 pb-1.5 flex items-center justify-between">
              <span>Policy Highlights</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">R.A. 11199</span>
            </div>
            <div className="flex justify-between text-slate-200">
              <span>Total Rate:</span>
              <span className="font-bold text-white">15.0% (10% ER / 5% EE)</span>
            </div>
            <div className="flex justify-between text-slate-200">
              <span>Minimum MSC:</span>
              <span className="font-bold text-white">₱5,000.00</span>
            </div>
            <div className="flex justify-between text-slate-200">
              <span>Regular SS MSC Cap:</span>
              <span className="font-bold text-white">₱20,000.00</span>
            </div>
            <div className="flex justify-between text-slate-200">
              <span>Maximum Total MSC (WISP):</span>
              <span className="font-bold text-white">₱35,000.00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calculator Section */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
        <div className="p-4 lg:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">SSS Contribution Calculator</h3>
              <p className="text-xs text-slate-500">Calculate exact EE, ER, EC & MPF (WISP) contributions from basic pay</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Input Controls */}
            <div className="lg:col-span-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Monthly Basic Pay (PHP)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₱</span>
                  <input
                    type="number"
                    value={basicPay}
                    onChange={(e) => setBasicPay(e.target.value)}
                    placeholder="Enter basic pay e.g. 25000"
                    className="w-full h-11 pl-8 pr-4 border border-slate-300 rounded-lg text-slate-900 font-semibold text-base focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 block mb-2">Quick Preset Salaries:</span>
                <div className="flex flex-wrap gap-2">
                  {[10000, 15000, 20000, 25000, 30000, 35000].map((preset, pIdx) => (
                    <button
                      key={`preset-${preset}-${pIdx}`}
                      onClick={() => setBasicPay(preset.toString())}
                      className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                        basicPay === preset.toString()
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      ₱{preset.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Display */}
            <div className="lg:col-span-8 bg-gradient-to-br from-blue-50/70 to-slate-50 p-5 rounded-xl border border-blue-100 shadow-xs">
              {activeBracket ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between border-b border-blue-200/60 pb-3 gap-2">
                    <div>
                      <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Salary Range Match</span>
                      <h4 className="text-lg font-black text-slate-900">₱{activeBracket.rangeLabel}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-500">Total MSC:</span>
                      <span className="block text-base font-black text-blue-900">₱{activeBracket.totalMsc.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Detailed Breakdown Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Employer Share */}
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="font-bold text-xs uppercase text-slate-700">Employer Share (ER + EC)</span>
                        <span className="font-black text-sm text-slate-900">₱{activeBracket.totalEr.toFixed(2)}</span>
                      </div>
                      <div className="text-xs space-y-1.5 text-slate-600">
                        <div className="flex justify-between">
                          <span>Regular SS ER (10%):</span>
                          <span className="font-semibold text-slate-800">₱{activeBracket.regularEr.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>MPF / WISP ER (10%):</span>
                          <span className="font-semibold text-slate-800">₱{activeBracket.mpfEr.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>EC Program:</span>
                          <span className="font-semibold text-slate-800">₱{activeBracket.ecEr.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Employee Share */}
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="font-bold text-xs uppercase text-slate-700">Employee Share (EE)</span>
                        <span className="font-black text-sm text-blue-700">₱{activeBracket.totalEe.toFixed(2)}</span>
                      </div>
                      <div className="text-xs space-y-1.5 text-slate-600">
                        <div className="flex justify-between">
                          <span>Regular SS EE (5%):</span>
                          <span className="font-semibold text-slate-800">₱{activeBracket.regularEe.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>MPF / WISP EE (5%):</span>
                          <span className="font-semibold text-slate-800">₱{activeBracket.mpfEe.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="bg-blue-600 text-white p-4 rounded-lg flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-xs text-blue-100 font-semibold uppercase tracking-wider block">Total Monthly Remittance</span>
                      <span className="text-2xl font-black">₱{activeBracket.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-right text-xs text-blue-100 space-y-0.5">
                      <div>ER Share: <strong>₱{activeBracket.totalEr.toFixed(2)}</strong></div>
                      <div>EE Share: <strong>₱{activeBracket.totalEe.toFixed(2)}</strong></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Enter a valid basic pay to view contribution breakdown.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Official Schedule Table */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
        <div className="p-4 lg:p-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Official Contribution Schedule Matrix</h3>
            <p className="text-xs text-slate-500 mt-0.5">Full breakdown of Monthly Salary Credits (MSC) and Contributions</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search salary range..."
              className="w-full h-9 pl-9 pr-3 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[650px]">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-700 sticky top-0 shadow-xs z-10">
              <tr>
                <th rowSpan={2} className="px-3 py-3 border-b border-r border-slate-300 font-bold text-center bg-slate-100 text-slate-900 sticky left-0 z-20">
                  RANGE OF COMPENSATION
                </th>
                <th colSpan={3} className="px-3 py-2 border-b border-r border-slate-300 font-bold text-center bg-slate-200/80 text-slate-800">
                  MONTHLY SALARY CREDIT (MSC)
                </th>
                <th colSpan={4} className="px-3 py-2 border-b border-r border-slate-300 font-bold text-center bg-blue-100/70 text-blue-950">
                  EMPLOYER (ER) CONTRIBUTIONS
                </th>
                <th colSpan={3} className="px-3 py-2 border-b border-r border-slate-300 font-bold text-center bg-emerald-100/70 text-emerald-950">
                  EMPLOYEE (EE) CONTRIBUTIONS
                </th>
                <th rowSpan={2} className="px-4 py-3 border-b border-slate-300 font-black text-center bg-slate-200 text-slate-900">
                  TOTAL CONTRIBUTION
                </th>
              </tr>
              <tr>
                {/* MSC Columns */}
                <th className="px-2.5 py-1.5 border-b border-r border-slate-300 font-semibold text-center bg-slate-100 text-slate-700">REGULAR SS</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-300 font-semibold text-center bg-slate-100 text-slate-700">MPF</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-300 font-bold text-center bg-slate-200 text-slate-900">TOTAL MSC</th>

                {/* ER Columns */}
                <th className="px-2.5 py-1.5 border-b border-r border-slate-300 font-semibold text-center bg-blue-50 text-blue-900">REGULAR SS</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-300 font-semibold text-center bg-blue-50 text-blue-900">MPF</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-300 font-semibold text-center bg-blue-50 text-blue-900">EC</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-300 font-bold text-center bg-blue-100 text-blue-950">TOTAL ER</th>

                {/* EE Columns */}
                <th className="px-2.5 py-1.5 border-b border-r border-slate-300 font-semibold text-center bg-emerald-50 text-emerald-900">REGULAR SS</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-300 font-semibold text-center bg-emerald-50 text-emerald-900">MPF</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-300 font-bold text-center bg-emerald-100 text-emerald-950">TOTAL EE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {filteredBrackets.map((bracket, idx) => {
                const isCalculatedActive = activeBracket?.rangeLabel === bracket.rangeLabel;
                return (
                  <tr
                    key={`sss-bracket-${bracket.rangeStart}-${bracket.rangeEnd}-${idx}`}
                    className={`transition ${
                      isCalculatedActive
                        ? 'bg-amber-100/80 font-bold text-slate-900 border-l-4 border-l-amber-600'
                        : idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/60'
                    }`}
                  >
                    <td className={`px-3 py-2 border-r border-slate-200 text-center font-sans font-semibold sticky left-0 z-10 ${isCalculatedActive ? 'bg-amber-200 text-amber-950' : 'bg-white'}`}>
                      {bracket.rangeLabel}
                    </td>

                    {/* MSC */}
                    <td className="px-2.5 py-2 border-r border-slate-200 text-right text-slate-700">
                      {bracket.regularMsc.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-200 text-right text-slate-600">
                      {bracket.mpfMsc > 0 ? bracket.mpfMsc.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-200 text-right font-bold text-slate-900 bg-slate-50">
                      {bracket.totalMsc.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    {/* ER */}
                    <td className="px-2.5 py-2 border-r border-slate-200 text-right text-blue-950">
                      {bracket.regularEr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-200 text-right text-blue-950">
                      {bracket.mpfEr > 0 ? bracket.mpfEr.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-200 text-right text-blue-900">
                      {bracket.ecEr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-200 text-right font-bold text-blue-900 bg-blue-50/50">
                      {bracket.totalEr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    {/* EE */}
                    <td className="px-2.5 py-2 border-r border-slate-200 text-right text-emerald-950">
                      {bracket.regularEe.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-200 text-right text-emerald-950">
                      {bracket.mpfEe > 0 ? bracket.mpfEe.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-200 text-right font-bold text-emerald-900 bg-emerald-50/50">
                      {bracket.totalEe.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    {/* GRAND TOTAL */}
                    <td className="px-3 py-2 text-right font-black text-slate-900 bg-slate-100">
                      ₱{bracket.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

