import React, { useState, useMemo } from 'react';
import { IncomeRecord, ExpenseRecord, ExpenseCategory, TaxRule, Business } from '../types';
import { formatINR } from '../core/decimal';
import { calculate_tax } from '../core/tax_engine';

interface ReportsPageProps {
  business: Business;
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  categories: ExpenseCategory[];
  taxRules: TaxRule[];
  financialYear: string;
  onOpenExportModal?: () => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  business,
  incomes,
  expenses,
  categories,
  taxRules,
  financialYear,
  onOpenExportModal,
}) => {

  const [activeTab, setActiveTab] = useState<'INCOME' | 'EXPENSE' | 'FINANCIAL' | 'TAX'>('FINANCIAL');

  const catMap = useMemo(() => {
    const map = new Map<string, ExpenseCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const totalIncome = useMemo(() => incomes.reduce((a, c) => a + c.amount, 0), [incomes]);
  const totalExpenses = useMemo(() => expenses.reduce((a, c) => a + c.amount, 0), [expenses]);
  const allowableExpenses = useMemo(
    () =>
      expenses.reduce((acc, curr) => {
        const cat = catMap.get(curr.categoryId);
        return (cat?.isAllowable ?? true) ? acc + curr.amount : acc;
      }, 0),
    [expenses, catMap]
  );

  const taxSummary = useMemo(() => {
    return calculate_tax({
      grossIncome: totalIncome,
      totalExpenses,
      allowableExpenses,
      rules: taxRules,
      period: `FY ${financialYear}`,
    });
  }, [totalIncome, totalExpenses, allowableExpenses, taxRules, financialYear]);

  // Export handlers
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `TaxFlow_${activeTab}_FY${financialYear}.csv`;

    if (activeTab === 'INCOME') {
      headers = ['Invoice No', 'Date', 'Customer', 'Description', 'Amount (INR)', 'Status'];
      rows = incomes.map((i) => [i.invoiceNo, i.date, `"${i.customer}"`, `"${i.description}"`, i.amount, i.paymentStatus]);
    } else if (activeTab === 'EXPENSE') {
      headers = ['Bill No', 'Date', 'Vendor', 'Category', 'Section 37', 'Amount (INR)', 'Method'];
      rows = expenses.map((e) => {
        const c = catMap.get(e.categoryId);
        return [e.invoiceNo, e.date, `"${e.vendor}"`, `"${c?.name}"`, c?.isAllowable ? 'Allowable' : 'Disallowed', e.amount, e.paymentMethod];
      });
    } else if (activeTab === 'FINANCIAL') {
      headers = ['Metric', 'Amount (INR)'];
      rows = [
        ['Total Gross Revenue', totalIncome],
        ['Total Operating Outflow', totalExpenses],
        ['Section 37 Allowable Deductions', allowableExpenses],
        ['Non-deductible Outflow', totalExpenses - allowableExpenses],
        ['Net Taxable Profit', Math.max(0, totalIncome - allowableExpenses)],
      ];
    } else {
      headers = ['Slab Bracket', 'Range', 'Rate', 'Slice Taxable (INR)', 'Tax Computed (INR)'];
      rows = taxSummary.slabBreakdowns.map((s) => [
        `"${s.slabName}"`,
        `"${s.min} - ${s.max || 'Above'}"`,
        `${s.rate}%`,
        s.sliceTaxable,
        s.taxComputed,
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-headline">Statutory Reporting Center</h2>
          <p className="text-xs text-[#a0b4c4] mt-0.5">
            Exportable tax registers, financial statements & Section 37 schedules for {business.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenExportModal && (
            <button
              onClick={onOpenExportModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#0e4d6e] to-[#0284c7] border border-[#7dd3fc]/40 text-xs text-white font-bold hover:border-[#7dd3fc] shadow-[0_0_15px_rgba(125,211,252,0.2)] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">file_download</span>
              <span>Download Report (JSON / CSV)</span>
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#141c2e] border border-[#7dd3fc]/20 text-xs text-[#7dd3fc] font-semibold hover:border-[#7dd3fc]/40"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>Quick CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#141c2e] border border-white/10 text-xs text-[#a0b4c4] font-semibold hover:border-white/30 hover:text-white"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            <span>Print Report</span>
          </button>
        </div>

      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#7dd3fc]/15 pb-2">
        {[
          { id: 'FINANCIAL', label: 'Financial Summary', icon: 'account_balance' },
          { id: 'INCOME', label: 'Income Register', icon: 'payments' },
          { id: 'EXPENSE', label: 'Expense Register', icon: 'receipt_long' },
          { id: 'TAX', label: 'Tax Assessment Schedule', icon: 'policy' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === t.id
                ? 'bg-[#0e4d6e] text-[#7dd3fc] border border-[#7dd3fc]/40 shadow-sm'
                : 'text-[#a0b4c4] hover:bg-[#141c2e] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Report Canvas */}
      <div className="glacier-card rounded-2xl p-6 border border-[#7dd3fc]/15 space-y-6">
        {/* Printable Letterhead */}
        <div className="border-b border-[#7dd3fc]/15 pb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-headline">{business.name}</h3>
            <p className="text-xs text-[#a0b4c4]">GSTIN: {business.taxRegistrationNo} | PAN: {business.panNumber}</p>
            <p className="text-[11px] text-[#a0b4c4]/80 mt-0.5">{business.address}</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold font-mono text-[#7dd3fc]">FY {financialYear}</span>
            <p className="text-[10px] text-[#a0b4c4] mt-0.5">Report Ref: TXF-REP-{Date.now().toString().slice(-6)}</p>
          </div>
        </div>

        {/* Tab Content: Financial Summary */}
        {activeTab === 'FINANCIAL' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#7dd3fc]">Statement of Operating Profit & Loss</h4>
            <div className="overflow-x-auto rounded-xl border border-[#7dd3fc]/10">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#141c2e] text-[#a0b4c4] border-b border-[#7dd3fc]/10">
                    <th className="py-2.5 px-4">Financial Ledger Head</th>
                    <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#7dd3fc]/5 text-[#e0e8f0]">
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Gross Business Inflow / Turnover</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">{formatINR(totalIncome)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Total Operating Expenditures</td>
                    <td className="py-2.5 px-4 text-right font-mono text-white">{formatINR(totalExpenses)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 pl-8 text-[#a0b4c4]">• Less: Disallowed Items (Fines/Penalties under Sec 37)</td>
                    <td className="py-2.5 px-4 text-right font-mono text-red-300">{formatINR(totalExpenses - allowableExpenses)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-[#7dd3fc]">Allowable Section 37 Business Deductions</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-[#7dd3fc]">{formatINR(allowableExpenses)}</td>
                  </tr>
                  <tr className="bg-[#141c2e]/60 font-bold border-t border-[#7dd3fc]/20 text-sm">
                    <td className="py-3 px-4 text-white">Net Business Taxable Profit</td>
                    <td className="py-3 px-4 text-right font-mono text-[#7dd3fc]">{formatINR(Math.max(0, totalIncome - allowableExpenses))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Income Register */}
        {activeTab === 'INCOME' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#7dd3fc]">Sales & Revenue Invoice Register ({incomes.length} records)</h4>
            <div className="overflow-x-auto rounded-xl border border-[#7dd3fc]/10">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#141c2e] text-[#a0b4c4] border-b border-[#7dd3fc]/10">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#7dd3fc]/5 text-[#e0e8f0]">
                  {incomes.map((inc) => (
                    <tr key={inc.id}>
                      <td className="py-2.5 px-4 font-mono text-[#a0b4c4]">{inc.date}</td>
                      <td className="py-2.5 px-4 font-mono text-[#7dd3fc]">{inc.invoiceNo}</td>
                      <td className="py-2.5 px-4 font-medium text-white">{inc.customer}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">{formatINR(inc.amount)}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {inc.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#141c2e]/60 font-bold border-t border-[#7dd3fc]/20">
                    <td colSpan={3} className="py-3 px-4 text-white">Total Gross Receipts</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400 text-sm">{formatINR(totalIncome)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Expense Register */}
        {activeTab === 'EXPENSE' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#7dd3fc]">Operating Disbursements Register ({expenses.length} records)</h4>
            <div className="overflow-x-auto rounded-xl border border-[#7dd3fc]/10">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#141c2e] text-[#a0b4c4] border-b border-[#7dd3fc]/10">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Bill Ref</th>
                    <th className="py-2.5 px-4">Vendor</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4 text-center">Section 37</th>
                    <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#7dd3fc]/5 text-[#e0e8f0]">
                  {expenses.map((exp) => {
                    const c = catMap.get(exp.categoryId);
                    return (
                      <tr key={exp.id}>
                        <td className="py-2.5 px-4 font-mono text-[#a0b4c4]">{exp.date}</td>
                        <td className="py-2.5 px-4 font-mono text-[#7dd3fc]">{exp.invoiceNo}</td>
                        <td className="py-2.5 px-4 font-medium text-white">{exp.vendor}</td>
                        <td className="py-2.5 px-4 text-[#a0b4c4]">{c?.name}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${c?.isAllowable ? 'text-emerald-300 bg-emerald-500/10' : 'text-red-300 bg-red-500/10'}`}>
                            {c?.isAllowable ? 'Allowable' : 'Disallowed'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-white">{formatINR(exp.amount)}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-[#141c2e]/60 font-bold border-t border-[#7dd3fc]/20">
                    <td colSpan={5} className="py-3 px-4 text-white">Total Operating Outflows</td>
                    <td className="py-3 px-4 text-right font-mono text-white text-sm">{formatINR(totalExpenses)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Tax Schedule */}
        {activeTab === 'TAX' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#7dd3fc]">Income Tax Assessment Schedule</h4>
            <div className="overflow-x-auto rounded-xl border border-[#7dd3fc]/10">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#141c2e] text-[#a0b4c4] border-b border-[#7dd3fc]/10">
                    <th className="py-2.5 px-4">Bracket</th>
                    <th className="py-2.5 px-4">Income Limits</th>
                    <th className="py-2.5 px-4 text-center">Rate</th>
                    <th className="py-2.5 px-4 text-right">Taxable Slice (₹)</th>
                    <th className="py-2.5 px-4 text-right">Calculated Tax (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#7dd3fc]/5 text-[#e0e8f0]">
                  {taxSummary.slabBreakdowns.map((s, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-4 font-semibold text-white">{s.slabName}</td>
                      <td className="py-2.5 px-4 font-mono text-[#a0b4c4]">{formatINR(s.min)} - {s.max ? formatINR(s.max) : 'Above'}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-[#7dd3fc]">{s.rate}%</td>
                      <td className="py-2.5 px-4 text-right font-mono text-white">{formatINR(s.sliceTaxable)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-[#c8a0f0]">{formatINR(s.taxComputed)}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#141c2e]/60 font-bold border-t border-[#7dd3fc]/20 text-sm">
                    <td colSpan={3} className="py-3 px-4 text-white">Total Assessed Tax</td>
                    <td className="py-3 px-4 text-right font-mono text-[#7dd3fc]">{formatINR(taxSummary.taxableAmount)}</td>
                    <td className="py-3 px-4 text-right font-mono text-[#c8a0f0]">{formatINR(taxSummary.taxAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-[#141c2e]/40 rounded-lg border border-[#7dd3fc]/10 text-[11px] text-[#a0b4c4]">
              <strong className="text-[#7dd3fc]">Disclaimer:</strong> Prepared by TaxFlowSMB automated calculations. Not an official tax return.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
