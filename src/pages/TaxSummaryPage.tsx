import React, { useMemo } from 'react';
import { calculate_tax } from '../core/tax_engine';
import { formatINR } from '../core/decimal';
import {
  IncomeRecord,
  ExpenseRecord,
  ExpenseCategory,
  TaxRule,
  DocumentItem,
  TaxFiling,
} from '../types';

interface TaxSummaryPageProps {
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  categories: ExpenseCategory[];
  taxRules: TaxRule[];
  documents: DocumentItem[];
  filing: TaxFiling;
  financialYear: string;
  onChangeFY: (fy: string) => void;
  onSendToFiling: () => void;
  onOpenExportModal?: () => void;
}

export const TaxSummaryPage: React.FC<TaxSummaryPageProps> = ({
  incomes,
  expenses,
  categories,
  taxRules,
  documents,
  filing,
  financialYear,
  onChangeFY,
  onSendToFiling,
  onOpenExportModal,
}) => {

  const catMap = useMemo(() => {
    const map = new Map<string, ExpenseCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Aggregate financials
  const grossIncome = useMemo(
    () => incomes.reduce((acc, curr) => acc + curr.amount, 0),
    [incomes]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((acc, curr) => acc + curr.amount, 0),
    [expenses]
  );

  const allowableExpenses = useMemo(() => {
    return expenses.reduce((acc, curr) => {
      const cat = catMap.get(curr.categoryId);
      return (cat?.isAllowable ?? true) ? acc + curr.amount : acc;
    }, 0);
  }, [expenses, catMap]);

  // Run dynamic Tax Engine
  const summary = useMemo(() => {
    return calculate_tax({
      grossIncome,
      totalExpenses,
      allowableExpenses,
      rules: taxRules,
      period: `FY ${financialYear}`,
    });
  }, [grossIncome, totalExpenses, allowableExpenses, taxRules, financialYear]);

  // Missing doc warnings
  const unlinkedCount = expenses.filter((e) => !e.documentId).length;

  const exportCurrentTaxSummary = (format: 'csv' | 'json') => {
    const filename = `Tax_Summary_FY${financialYear}_${new Date().toISOString().substring(0, 10)}.${format}`;
    if (format === 'json') {
      const payload = {
        report: 'Income Tax Computation Statement',
        financialYear,
        generatedAt: new Date().toISOString(),
        financialSummary: {
          grossRevenueINR: summary.totalIncome,
          totalExpensesINR: summary.totalExpenses,
          allowableDeductionsINR: summary.allowableExpenses,
          disallowedOutflowINR: summary.disallowedExpenses,
          netTaxableProfitINR: summary.taxableAmount,
          computedTaxLiabilityINR: summary.taxAmount,
          effectiveRatePercent: summary.effectiveRate,
        },
        progressiveSlabs: summary.slabBreakdowns,
        statutoryWarnings: summary.warnings,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } else {
      const headers = ['Metric', 'Amount (INR) / Rate', 'Notes'];
      const rows = [
        ['Assessment Financial Year', `FY ${financialYear}`, 'Period'],
        ['Gross Business Receipts', summary.totalIncome, 'Sec 28'],
        ['Total Operating Outflow', summary.totalExpenses, 'Book Expenses'],
        ['Section 37 Allowable Deductions', summary.allowableExpenses, 'Deductible'],
        ['Disallowed Outflow', summary.disallowedExpenses, 'Non-deductible'],
        ['Net Taxable Profits', summary.taxableAmount, 'Tax Base'],
        ['Computed Tax Liability', summary.taxAmount, 'Final Tax'],
        ['Effective Tax Rate', `${summary.effectiveRate.toFixed(2)}%`, 'Rate'],
        ...summary.slabBreakdowns.map((s) => [
          `Slab: ${s.slabName} (${s.rate}%)`,
          s.taxComputed,
          `Slice: ${s.sliceTaxable}`,
        ]),
      ];
      const csvText = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-headline">Tax Assessment Summary</h2>
          <p className="text-xs text-[#a0b4c4] mt-0.5">
            Rules-driven dynamic tax engine with progressive slab slicing & Section 37 deductions
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Direct CSV / JSON Export buttons */}
          <div className="flex items-center bg-[#141c2e] border border-[#7dd3fc]/20 rounded-lg p-0.5">
            <button
              onClick={() => exportCurrentTaxSummary('csv')}
              title={`Export FY ${financialYear} tax computation as CSV`}
              className="px-2.5 py-1.5 text-xs text-[#7dd3fc] hover:bg-[#0e4d6e]/40 rounded font-semibold flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">table_view</span>
              <span>CSV</span>
            </button>
            <button
              onClick={() => exportCurrentTaxSummary('json')}
              title={`Export FY ${financialYear} tax computation as JSON`}
              className="px-2.5 py-1.5 text-xs text-[#7dd3fc] hover:bg-[#0e4d6e]/40 rounded font-semibold flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">code</span>
              <span>JSON</span>
            </button>
          </div>

          <div className="flex items-center gap-2 bg-[#141c2e] border border-[#7dd3fc]/20 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-[#a0b4c4]">Financial Year:</span>
            <select
              value={financialYear}
              onChange={(e) => onChangeFY(e.target.value)}
              className="bg-transparent font-mono font-bold text-[#7dd3fc] focus:outline-none cursor-pointer"
            >
              <option value="2024-25" className="bg-[#141c2e] text-white">FY 2024-25</option>
              <option value="2023-24" className="bg-[#141c2e] text-white">FY 2023-24</option>
            </select>
          </div>

          <button
            onClick={onSendToFiling}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-[#0e4d6e] to-[#1a3a4e] text-[#7dd3fc] font-bold text-xs tracking-wider rounded-lg border border-[#7dd3fc]/40 hover:border-[#7dd3fc] shadow-[0_0_20px_rgba(125,211,252,0.15)] transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">send</span>
            <span>Send to Filing<span className="hidden sm:inline"> Preparation</span></span>
          </button>
        </div>
      </div>


      {/* Mandatory Statutory Disclaimer (Prompt requirement) */}
      <div className="glacier-card rounded-xl p-4 border-l-4 border-l-[#7dd3fc] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#7dd3fc] text-xl">gavel</span>
          <p className="text-xs text-[#a0b4c4] leading-relaxed">
            <strong className="text-[#7dd3fc]">Statutory Compliance Disclaimer:</strong> This is an advisory preparation summary generated from your financial ledger. It does not constitute final certified tax advice or legal representation. Confirm all disclosures with your Chartered Accountant prior to uploading to official portals.
          </p>
        </div>
      </div>

      {/* 7 Summary KPI Cards Grid (Prompt requirement) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="glacier-card rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-[#a0b4c4]">Total Inflow</span>
          <p className="text-base font-bold text-white font-mono mt-1">
            {formatINR(summary.totalIncome)}
          </p>
        </div>

        <div className="glacier-card rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-[#a0b4c4]">Total Expenses</span>
          <p className="text-base font-bold text-white font-mono mt-1">
            {formatINR(summary.totalExpenses)}
          </p>
        </div>

        <div className="glacier-card rounded-xl p-3.5 flex flex-col justify-between border-emerald-500/20">
          <span className="text-[11px] text-emerald-400">Allowable (Sec 37)</span>
          <p className="text-base font-bold text-emerald-400 font-mono mt-1">
            {formatINR(summary.allowableExpenses)}
          </p>
        </div>

        <div className="glacier-card rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-[#a0b4c4]">Net Business Profit</span>
          <p className="text-base font-bold text-white font-mono mt-1">
            {formatINR(summary.netIncome)}
          </p>
        </div>

        <div className="glacier-card rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-[#a0b4c4]">Deductions</span>
          <p className="text-base font-bold text-[#a0b4c4] font-mono mt-1">
            {formatINR(summary.deductions)}
          </p>
        </div>

        <div className="glacier-card rounded-xl p-3.5 flex flex-col justify-between border-[#7dd3fc]/30">
          <span className="text-[11px] text-[#7dd3fc] font-semibold">Taxable Amount</span>
          <p className="text-base font-bold text-[#7dd3fc] font-mono mt-1">
            {formatINR(summary.taxableAmount)}
          </p>
        </div>

        <div className="glacier-card rounded-xl p-3.5 flex flex-col justify-between border-[#c8a0f0]/40 shadow-[0_0_15px_rgba(200,160,240,0.1)]">
          <span className="text-[11px] text-[#c8a0f0] font-semibold">Tax Calculated</span>
          <p className="text-base font-bold text-[#c8a0f0] font-mono mt-1">
            {formatINR(summary.taxAmount)}
          </p>
        </div>
      </div>

      {/* Progressive Slab Slicing Table (Prompt requirement) */}
      <div className="glacier-card rounded-2xl p-6 border border-[#7dd3fc]/15 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white font-headline">
              Progressive Tax Slab Breakdown
            </h3>
            <p className="text-xs text-[#a0b4c4]">
              Each slice of net taxable income assessed under active rules for {summary.period}
            </p>
          </div>
          <span className="text-xs font-mono text-[#7dd3fc] bg-[#0e4d6e]/40 px-2.5 py-1 rounded border border-[#7dd3fc]/20">
            Effective Rate: {summary.effectiveRate}%
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#7dd3fc]/10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#7dd3fc]/10 bg-[#141c2e]/70 text-[11px] font-semibold text-[#a0b4c4] uppercase tracking-wider">
                <th className="py-3 px-4">Slab Bracket</th>
                <th className="py-3 px-4">Income Range (₹)</th>
                <th className="py-3 px-4 text-center">Tax Rate (%)</th>
                <th className="py-3 px-4 text-right">Taxable Slice (₹)</th>
                <th className="py-3 px-4 text-right">Computed Tax (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#7dd3fc]/5 text-xs text-[#e0e8f0]">
              {summary.slabBreakdowns.map((slab, i) => (
                <tr key={i} className="hover:bg-[#141c2e]/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">{slab.slabName}</td>
                  <td className="py-3 px-4 font-mono text-[#a0b4c4]">
                    {formatINR(slab.min)} - {slab.max !== null ? formatINR(slab.max) : 'Above'}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-[#7dd3fc]">
                    {slab.rate}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-white">
                    {formatINR(slab.sliceTaxable)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#c8a0f0]">
                    {formatINR(slab.taxComputed)}
                  </td>
                </tr>
              ))}
              <tr className="bg-[#141c2e]/80 font-bold border-t border-[#7dd3fc]/20 text-xs">
                <td colSpan={3} className="py-3 px-4 text-white">
                  Total Assessed Liability
                </td>
                <td className="py-3 px-4 text-right font-mono text-[#7dd3fc]">
                  {formatINR(summary.taxableAmount)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-[#c8a0f0] text-sm">
                  {formatINR(summary.taxAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Rules Applied & Warnings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Rules Applied */}
        <div className="glacier-card rounded-2xl p-5 border border-[#7dd3fc]/15 space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#7dd3fc] text-lg">policy</span>
            <h3 className="text-sm font-bold text-white">Statutory Rules Applied (Data-Driven)</h3>
          </div>

          <div className="space-y-2">
            {summary.rulesApplied.map((rule) => (
              <div
                key={rule.id}
                className="p-3 rounded-xl bg-[#141c2e]/60 border border-[#7dd3fc]/10 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{rule.slabName}</span>
                  <span className="font-mono text-[#7dd3fc] font-bold">{rule.rate}%</span>
                </div>
                <p className="text-[11px] text-[#a0b4c4]">
                  Range: {formatINR(rule.incomeMin)} to{' '}
                  {rule.incomeMax !== null ? formatINR(rule.incomeMax) : 'Infinity'}
                </p>
                <p className="text-[10px] text-[#a0b4c4]/70 font-mono">
                  Valid: {rule.effectiveDate} to {rule.expiryDate}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Warnings & Audit Observations */}
        <div className="glacier-card rounded-2xl p-5 border border-[#7dd3fc]/15 space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-lg">flag</span>
            <h3 className="text-sm font-bold text-white">Engine Audit Observations</h3>
          </div>

          <div className="space-y-2">
            {summary.warnings.length === 0 && unlinkedCount === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>All calculations strictly verified. No rule gaps or anomalies detected.</span>
              </div>
            ) : (
              <>
                {unlinkedCount > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
                    <span className="material-symbols-outlined text-sm text-amber-400 mt-0.5">warning</span>
                    <span>
                      {unlinkedCount} expense entry lacks a supporting voucher/receipt in the vault. Attach documents before final sign-off.
                    </span>
                  </div>
                )}
                {summary.warnings.map((warn, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2"
                  >
                    <span className="material-symbols-outlined text-sm text-amber-400 mt-0.5">info</span>
                    <span>{warn}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
