import React, { useState, useMemo } from 'react';
import { IncomeRecord, ExpenseRecord, ExpenseCategory, TaxRule, Business } from '../types';
import { calculate_tax } from '../core/tax_engine';

export type ExportViewType = 'CURRENT' | 'INCOME' | 'EXPENSES' | 'TAX_SUMMARY' | 'FULL_AUDIT_PACK';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  financialYear: string;
  business: Business;
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  categories: ExpenseCategory[];
  taxRules: TaxRule[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  currentTab,
  financialYear,
  business,
  incomes,
  expenses,
  categories,
  taxRules,
}) => {
  // Determine default target view based on active tab
  const defaultTarget = useMemo<ExportViewType>(() => {
    if (currentTab === 'income') return 'INCOME';
    if (currentTab === 'expenses') return 'EXPENSES';
    if (currentTab === 'tax-summary' || currentTab === 'reports') return 'TAX_SUMMARY';
    return 'FULL_AUDIT_PACK';
  }, [currentTab]);

  const [selectedView, setSelectedView] = useState<ExportViewType>(defaultTarget);
  const [selectedFY, setSelectedFY] = useState<string>(financialYear);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [copied, setCopied] = useState(false);

  // Sync default target when modal opens or tab changes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedView(defaultTarget);
      setSelectedFY(financialYear);
      setCopied(false);
    }
  }, [isOpen, defaultTarget, financialYear]);

  const catMap = useMemo(() => {
    const map = new Map<string, ExpenseCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // FY Filter helper
  const filterByFY = (dateStr: string, fy: string) => {
    if (fy === 'ALL') return true;
    const [startYearStr] = fy.split('-');
    const startYear = parseInt(startYearStr, 10);
    const start = `${startYear}-04-01`;
    const end = `${startYear + 1}-03-31`;
    return dateStr >= start && dateStr <= end;
  };

  const filteredIncomes = useMemo(() => {
    return incomes.filter((i) => i.businessId === business.id && filterByFY(i.date, selectedFY));
  }, [incomes, business.id, selectedFY]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => e.businessId === business.id && filterByFY(e.date, selectedFY));
  }, [expenses, business.id, selectedFY]);

  const totalIncome = useMemo(() => filteredIncomes.reduce((a, c) => a + c.amount, 0), [filteredIncomes]);
  const totalExpenses = useMemo(() => filteredExpenses.reduce((a, c) => a + c.amount, 0), [filteredExpenses]);
  const allowableExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => {
      const cat = catMap.get(curr.categoryId);
      return (cat?.isAllowable ?? true) ? acc + curr.amount : acc;
    }, 0);
  }, [filteredExpenses, catMap]);

  const taxSummary = useMemo(() => {
    return calculate_tax({
      grossIncome: totalIncome,
      totalExpenses,
      allowableExpenses,
      rules: taxRules.filter((r) => selectedFY === 'ALL' || r.financialYear === selectedFY),
      period: `FY ${selectedFY}`,
    });
  }, [totalIncome, totalExpenses, allowableExpenses, taxRules, selectedFY]);

  // Generate payload
  const generatedExport = useMemo(() => {
    const sanitizedBizName = business.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fyLabel = selectedFY.replace(/[^a-zA-Z0-9]/g, '_');

    if (selectedView === 'INCOME') {
      const filename = `${sanitizedBizName}_Income_FY${fyLabel}.${format}`;
      const jsonData = {
        business: {
          name: business.name,
          pan: business.panNumber,
          gstin: business.taxRegistrationNo,
          financialYear: selectedFY,
        },
        reportType: 'Income Register',
        generatedAt: new Date().toISOString(),
        summary: {
          totalRecords: filteredIncomes.length,
          totalAmountINR: totalIncome,
        },
        records: filteredIncomes.map((i) => ({
          invoiceNo: i.invoiceNo,
          date: i.date,
          customer: i.customer,
          description: i.description,
          amount: i.amount,
          paymentStatus: i.paymentStatus,
          reviewed: i.reviewed,
        })),
      };

      const csvHeaders = ['Invoice No', 'Date', 'Customer', 'Description', 'Amount (INR)', 'Payment Status', 'Reviewed'];
      const csvRows = filteredIncomes.map((i) => [
        `"${i.invoiceNo}"`,
        i.date,
        `"${i.customer.replace(/"/g, '""')}"`,
        `"${i.description.replace(/"/g, '""')}"`,
        i.amount,
        i.paymentStatus,
        i.reviewed ? 'Yes' : 'No',
      ]);
      const csvText = [csvHeaders.join(','), ...csvRows.map((r) => r.join(','))].join('\n');

      return {
        filename,
        content: format === 'json' ? JSON.stringify(jsonData, null, 2) : csvText,
        mimeType: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;',
      };
    }

    if (selectedView === 'EXPENSES') {
      const filename = `${sanitizedBizName}_Expenses_Sec37_FY${fyLabel}.${format}`;
      const jsonData = {
        business: {
          name: business.name,
          pan: business.panNumber,
          gstin: business.taxRegistrationNo,
          financialYear: selectedFY,
        },
        reportType: 'Expenses Register with Section 37 Classification',
        generatedAt: new Date().toISOString(),
        summary: {
          totalRecords: filteredExpenses.length,
          totalOutflowINR: totalExpenses,
          allowableDeductionINR: allowableExpenses,
          disallowedOutflowINR: totalExpenses - allowableExpenses,
        },
        records: filteredExpenses.map((e) => {
          const cat = catMap.get(e.categoryId);
          return {
            invoiceNo: e.invoiceNo,
            date: e.date,
            vendor: e.vendor,
            category: cat?.name || 'General',
            section37Status: cat?.isAllowable ? 'ALLOWABLE' : 'DISALLOWED',
            amount: e.amount,
            paymentMethod: e.paymentMethod,
            description: e.description,
            hasReceipt: Boolean(e.documentId),
          };
        }),
      };

      const csvHeaders = ['Invoice/Bill No', 'Date', 'Vendor', 'Category', 'Section 37 Verdict', 'Amount (INR)', 'Payment Method', 'Receipt Attached', 'Description'];
      const csvRows = filteredExpenses.map((e) => {
        const cat = catMap.get(e.categoryId);
        return [
          `"${e.invoiceNo}"`,
          e.date,
          `"${e.vendor.replace(/"/g, '""')}"`,
          `"${cat?.name || 'General'}"`,
          cat?.isAllowable ? 'Allowable Sec 37' : 'Disallowed Sec 37',
          e.amount,
          `"${e.paymentMethod}"`,
          e.documentId ? 'Yes' : 'Pending',
          `"${e.description.replace(/"/g, '""')}"`,
        ];
      });
      const csvText = [csvHeaders.join(','), ...csvRows.map((r) => r.join(','))].join('\n');

      return {
        filename,
        content: format === 'json' ? JSON.stringify(jsonData, null, 2) : csvText,
        mimeType: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;',
      };
    }

    if (selectedView === 'TAX_SUMMARY') {
      const filename = `${sanitizedBizName}_TaxComputation_FY${fyLabel}.${format}`;
      const jsonData = {
        business: {
          name: business.name,
          pan: business.panNumber,
          gstin: business.taxRegistrationNo,
          type: business.type,
          financialYear: selectedFY,
        },
        reportType: 'Income Tax Computation Statement',
        generatedAt: new Date().toISOString(),
        financials: {
          grossRevenueINR: taxSummary.totalIncome,
          totalExpensesINR: taxSummary.totalExpenses,
          section37AllowableExpensesINR: taxSummary.allowableExpenses,
          nonDeductibleExpensesINR: taxSummary.disallowedExpenses,
          netTaxableProfitINR: taxSummary.taxableAmount,
          finalTaxComputedINR: taxSummary.taxAmount,
          effectiveTaxRate: `${taxSummary.effectiveRate.toFixed(2)}%`,
        },
        progressiveSlabs: taxSummary.slabBreakdowns.map((s) => ({
          slabBracket: s.slabName,
          minThreshold: s.min,
          maxThreshold: s.max,
          taxRatePercent: s.rate,
          taxableSliceINR: s.sliceTaxable,
          taxComputedINR: s.taxComputed,
        })),
        statutoryWarnings: taxSummary.warnings,
      };

      const csvHeaders = ['Computation Metric', 'Amount (INR) / Value', 'Statutory Clause Reference'];
      const csvRows = [
        ['Entity Legal Name', `"${business.name}"`, 'Assessee'],
        ['Permanent Account Number (PAN)', `"${business.panNumber}"`, 'Sec 139A'],
        ['Financial Assessment Period', `"FY ${selectedFY}"`, 'AY ' + (parseInt(selectedFY.split('-')[0]) + 1) + '-' + (parseInt(selectedFY.split('-')[1]) + 1)],
        ['Gross Business Receipts / Turnover', taxSummary.totalIncome, 'Sec 28(i)'],
        ['Total Commercial Expenditure Incurred', taxSummary.totalExpenses, 'Book of Accounts'],
        ['Allowable Business Deductions', taxSummary.allowableExpenses, 'Sec 30 to 37(1)'],
        ['Inadmissible / Disallowed Expenditure', taxSummary.disallowedExpenses, 'Sec 37 Expl. 1 & Sec 40A(3)'],
        ['Net Taxable Business Profit', taxSummary.taxableAmount, 'Sec 28 Profits and Gains'],
        ['Total Computed Income Tax Liability', taxSummary.taxAmount, 'Finance Act Slabs & Sec 115BAA'],
        ['Effective Corporate Tax Rate', `"${taxSummary.effectiveRate.toFixed(2)}%"`, 'Weighted Ratio'],
        ...taxSummary.slabBreakdowns.map((s) => [
          `Slab: ${s.slabName} (${s.rate}%)`,
          s.taxComputed,
          `Slice Taxable: ₹${s.sliceTaxable.toLocaleString('en-IN')}`,
        ]),
      ];
      const csvText = [csvHeaders.join(','), ...csvRows.map((r) => r.join(','))].join('\n');

      return {
        filename,
        content: format === 'json' ? JSON.stringify(jsonData, null, 2) : csvText,
        mimeType: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;',
      };
    }

    // FULL_AUDIT_PACK
    const filename = `${sanitizedBizName}_FullAuditPack_FY${fyLabel}.${format}`;
    const fullJson = {
      auditMetadata: {
        entity: business.name,
        pan: business.panNumber,
        gstin: business.taxRegistrationNo,
        entityType: business.type,
        financialYear: selectedFY,
        exportedAt: new Date().toISOString(),
        auditorNote: 'Comprehensive audit pack exported from TaxFlowSMB digital platform.',
      },
      taxComputation: {
        grossRevenue: taxSummary.totalIncome,
        totalExpenses: taxSummary.totalExpenses,
        allowableSec37: taxSummary.allowableExpenses,
        disallowedExpenses: taxSummary.disallowedExpenses,
        netTaxableIncome: taxSummary.taxableAmount,
        taxPayable: taxSummary.taxAmount,
        effectiveRatePercent: taxSummary.effectiveRate,
        slabBreakdowns: taxSummary.slabBreakdowns,
      },
      incomeLedger: filteredIncomes,
      expensesLedger: filteredExpenses.map((e) => ({
        ...e,
        category: catMap.get(e.categoryId)?.name || 'General',
        isSection37Allowable: catMap.get(e.categoryId)?.isAllowable ?? true,
      })),
    };

    if (format === 'json') {
      return {
        filename,
        content: JSON.stringify(fullJson, null, 2),
        mimeType: 'application/json',
      };
    }

    // Consolidated CSV for Full Pack
    const sections: string[] = [];
    sections.push(`=== AUDIT PACK SUMMARY: ${business.name} (FY ${selectedFY}) ===`);
    sections.push(`PAN: ${business.panNumber} | GSTIN: ${business.taxRegistrationNo} | Type: ${business.type}`);
    sections.push(`Gross Inflow: ₹${taxSummary.totalIncome} | Net Taxable: ₹${taxSummary.taxableAmount} | Tax Due: ₹${taxSummary.taxAmount}\n`);

    sections.push('=== INCOME TRANSACTIONS ===');
    sections.push(['Invoice No', 'Date', 'Customer', 'Amount (INR)', 'Status'].join(','));
    filteredIncomes.forEach((i) => {
      sections.push([`"${i.invoiceNo}"`, i.date, `"${i.customer}"`, i.amount, i.paymentStatus].join(','));
    });

    sections.push('\n=== EXPENSES TRANSACTIONS WITH SECTION 37 STATUS ===');
    sections.push(['Bill No', 'Date', 'Vendor', 'Category', 'Sec 37 Status', 'Amount (INR)', 'Payment Mode'].join(','));
    filteredExpenses.forEach((e) => {
      const cat = catMap.get(e.categoryId);
      sections.push([
        `"${e.invoiceNo}"`,
        e.date,
        `"${e.vendor}"`,
        `"${cat?.name || 'General'}"`,
        cat?.isAllowable ? 'Allowable' : 'Disallowed',
        e.amount,
        `"${e.paymentMethod}"`,
      ].join(','));
    });

    return {
      filename,
      content: sections.join('\n'),
      mimeType: 'text/csv;charset=utf-8;',
    };
  }, [
    selectedView,
    selectedFY,
    format,
    business,
    filteredIncomes,
    filteredExpenses,
    totalIncome,
    totalExpenses,
    allowableExpenses,
    taxSummary,
    catMap,
  ]);

  const handleDownload = () => {
    const blob = new Blob([generatedExport.content], { type: generatedExport.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generatedExport.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedExport.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="glacier-card-elevated border border-[#7dd3fc]/30 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl relative flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#7dd3fc]/15">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0e4d6e]/50 border border-[#7dd3fc]/30 flex items-center justify-center text-[#7dd3fc] shrink-0">
              <span className="material-symbols-outlined text-lg sm:text-xl">file_download</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-headline">Export & Download Report</h3>
              <p className="text-[11px] sm:text-xs text-[#a0b4c4] truncate max-w-[200px] xs:max-w-xs sm:max-w-none">
                Export formatted datasets for <span className="text-[#7dd3fc] font-semibold">{business.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#a0b4c4] hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {/* View Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#a0b4c4] uppercase tracking-wider mb-2">
              Select Data View to Export
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'INCOME', label: 'Income View', icon: 'payments', desc: `${filteredIncomes.length} records` },
                { id: 'EXPENSES', label: 'Expenses (Sec 37)', icon: 'receipt_long', desc: `${filteredExpenses.length} records` },
                { id: 'TAX_SUMMARY', label: 'Tax Computation', icon: 'account_balance', desc: 'Slabs & Liability' },
                { id: 'FULL_AUDIT_PACK', label: 'Full Audit Pack', icon: 'inventory_2', desc: 'All Books & Reports' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedView(opt.id as ExportViewType)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedView === opt.id
                      ? 'bg-[#0e4d6e]/50 border-[#7dd3fc] text-white shadow-[0_0_15px_rgba(125,211,252,0.15)]'
                      : 'bg-[#141c2e]/60 border-white/5 text-[#a0b4c4] hover:border-white/20 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-base text-[#7dd3fc]">{opt.icon}</span>
                    <span className="text-xs font-bold truncate">{opt.label}</span>
                  </div>
                  <span className="text-[11px] text-[#a0b4c4]/80">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* FY Filter & Format Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#a0b4c4] uppercase tracking-wider mb-1.5">
                Financial Year Filter
              </label>
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7dd3fc]"
              >
                <option value="2024-25">FY 2024-25 (01 Apr 2024 - 31 Mar 2025)</option>
                <option value="2023-24">FY 2023-24 (01 Apr 2023 - 31 Mar 2024)</option>
                <option value="ALL">All Financial Years (Complete History)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a0b4c4] uppercase tracking-wider mb-1.5">
                File Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFormat('csv')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    format === 'csv'
                      ? 'bg-[#0e4d6e]/60 border-[#7dd3fc] text-[#7dd3fc]'
                      : 'bg-[#141c2e]/60 border-white/5 text-[#a0b4c4] hover:border-white/20'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">table_view</span>
                  <span>CSV Spreadsheet</span>
                </button>

                <button
                  onClick={() => setFormat('json')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    format === 'json'
                      ? 'bg-[#0e4d6e]/60 border-[#7dd3fc] text-[#7dd3fc]'
                      : 'bg-[#141c2e]/60 border-white/5 text-[#a0b4c4] hover:border-white/20'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">code</span>
                  <span>Formatted JSON</span>
                </button>
              </div>
            </div>
          </div>

          {/* Preview Snippet */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-[#a0b4c4] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs text-[#7dd3fc]">preview</span>
                Preview ({generatedExport.filename})
              </span>
              <button
                onClick={handleCopy}
                className="text-[11px] text-[#7dd3fc] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">{copied ? 'done' : 'content_copy'}</span>
                <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
              </button>
            </div>
            <pre className="bg-[#0b0f19] border border-white/5 rounded-xl p-3 text-[11px] text-[#c8eaff] font-mono overflow-x-auto max-h-36 leading-relaxed select-text">
              {generatedExport.content.slice(0, 800)}
              {generatedExport.content.length > 800 && '\n... [truncated preview]'}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 sm:pt-4 border-t border-[#7dd3fc]/15 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-[11px] text-[#a0b4c4] text-center sm:text-left">
            Target: <strong className="text-white">{business.name}</strong> • FY{' '}
            <strong className="text-[#7dd3fc]">{selectedFY}</strong>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs text-[#a0b4c4] hover:bg-white/5 transition-colors border border-white/5 sm:border-0"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-[#0e4d6e] to-[#0284c7] hover:from-[#0369a1] hover:to-[#38bdf8] text-white font-bold text-xs rounded-xl border border-[#7dd3fc]/40 shadow-[0_0_20px_rgba(125,211,252,0.25)] flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>Download {format.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
