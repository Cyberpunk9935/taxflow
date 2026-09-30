import React, { useState, useMemo } from 'react';
import { formatINR } from '../core/decimal';
import { is_date_in_fy } from '../core/validators';
import { monthly_breakdown, category_breakdown } from '../core/financial';
import {
  IncomeRecord,
  ExpenseRecord,
  ExpenseCategory,
  DocumentItem,
  TaxFiling,
  User,
} from '../types';

interface DashboardPageProps {
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  categories: ExpenseCategory[];
  documents: DocumentItem[];
  filing: TaxFiling;
  currentUser: User;
  financialYear: string;
  onSelectTab: (tab: string) => void;
  onOpenRecordModal: () => void;
  onUploadForExpense: (expense: ExpenseRecord) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  incomes,
  expenses,
  categories,
  documents,
  filing,
  currentUser,
  financialYear,
  onSelectTab,
  onOpenRecordModal,
  onUploadForExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const itemsPerPage = 5;

  // Filter incomes and expenses strictly respecting the active Financial Year
  const fyIncomes = useMemo(() => {
    return incomes.filter((i) => is_date_in_fy(i.date, financialYear));
  }, [incomes, financialYear]);

  const fyExpenses = useMemo(() => {
    return expenses.filter((e) => is_date_in_fy(e.date, financialYear));
  }, [expenses, financialYear]);

  // Calculate live values based on active FY ledger data
  const totalIncome = useMemo(
    () => fyIncomes.reduce((acc, curr) => acc + curr.amount, 0),
    [fyIncomes]
  );

  const totalExpenses = useMemo(
    () => fyExpenses.reduce((acc, curr) => acc + curr.amount, 0),
    [fyExpenses]
  );

  // Category allowable map
  const catMap = useMemo(() => {
    const map = new Map<string, ExpenseCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const allowableExpenses = useMemo(() => {
    return fyExpenses.reduce((acc, curr) => {
      const cat = catMap.get(curr.categoryId);
      return (cat?.isAllowable ?? true) ? acc + curr.amount : acc;
    }, 0);
  }, [fyExpenses, catMap]);

  const netTaxableProfit = Math.max(0, totalIncome - allowableExpenses);

  // Category breakdown for active FY
  const categoryData = useMemo(() => {
    return category_breakdown(fyExpenses, categories);
  }, [fyExpenses, categories]);

  // Monthly breakdown for active FY
  const monthlyData = useMemo(() => {
    return monthly_breakdown(fyIncomes, fyExpenses, financialYear);
  }, [fyIncomes, fyExpenses, financialYear]);

  // Combine income and expenses for the recent ledger feed (filtered by active FY)
  type LedgerEntry = {
    id: string;
    type: 'INCOME' | 'EXPENSE';
    description: string;
    party: string;
    date: string;
    invoiceNo: string;
    amount: number;
    status: 'Reconciled' | 'Invoice Pending';
    rawRecord: IncomeRecord | ExpenseRecord;
  };

  const combinedLedger: LedgerEntry[] = useMemo(() => {
    const incEntries: LedgerEntry[] = fyIncomes.map((i) => ({
      id: i.id,
      type: 'INCOME',
      description: i.description,
      party: i.customer,
      date: i.date,
      invoiceNo: i.invoiceNo,
      amount: i.amount,
      status: 'Reconciled',
      rawRecord: i,
    }));

    const expEntries: LedgerEntry[] = fyExpenses.map((e) => ({
      id: e.id,
      type: 'EXPENSE',
      description: e.description,
      party: e.vendor,
      date: e.date,
      invoiceNo: e.invoiceNo,
      amount: e.amount,
      status: e.documentId ? 'Reconciled' : 'Invoice Pending',
      rawRecord: e,
    }));

    const all = [...incEntries, ...expEntries];
    // Sort descending by date
    all.sort((a, b) => b.date.localeCompare(a.date));
    return all;
  }, [fyIncomes, fyExpenses]);

  // Filtered ledger
  const filteredLedger = useMemo(() => {
    return combinedLedger.filter((entry) => {
      if (filterType === 'INCOME' && entry.type !== 'INCOME') return false;
      if (filterType === 'EXPENSE' && entry.type !== 'EXPENSE') return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          entry.description.toLowerCase().includes(q) ||
          entry.party.toLowerCase().includes(q) ||
          entry.invoiceNo.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [combinedLedger, filterType, searchTerm]);

  const totalPages = Math.ceil(filteredLedger.length / itemsPerPage) || 1;
  const paginatedEntries = filteredLedger.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const pendingDocsCount = documents.filter((d) => d.status === 'PENDING_REVIEW').length;
  const missingExpenseDocs = fyExpenses.filter((e) => !e.documentId).length;

  // Format date helper: "18 Mar 2025"
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // ================= DOWNLOAD REPORT HANDLERS (CSV & JSON) =================
  // 1. Download Report as CSV (Respects active financialYear filter)
  const handleDownloadReportCSV = () => {
    const timestamp = new Date().toISOString();
    const disallowedExpenses = totalExpenses - allowableExpenses;

    const reportRows = [
      ['=== TAXFLOWSMB FINANCIAL ASSESSMENT REPORT ==='],
      ['Active Financial Year', `FY ${financialYear}`],
      ['Report Generated At', timestamp],
      ['Exported By', currentUser.name],
      ['User Role', currentUser.role],
      ['Entity Reference', 'Nexify Solutions Pvt Ltd (GSTIN: 27AABCS1429B1Z5)'],
      [''],
      ['=== 1. EXECUTIVE FINANCIAL SUMMARY ==='],
      ['Metric', 'Amount (INR)', 'Statutory Notes'],
      ['Total Gross Inflow (Turnover)', totalIncome, 'Gross commercial receipts recognized in active FY'],
      ['Total Operating Outflow', totalExpenses, 'Total business disbursements incurred in active FY'],
      ['Section 37 Allowable Deductions', allowableExpenses, 'Eligible business expenses allowable for tax relief'],
      ['Disallowed Non-Deductible Outflow', disallowedExpenses, 'Fines, penalties, and non-business expenses'],
      ['Net Taxable Profit Base', netTaxableProfit, 'Tax base assessed prior to slab brackets'],
      ['Estimated Tax (25% Corporate Bracket)', Math.round(netTaxableProfit * 0.25), 'Indicative progressive slab projection'],
      ['Filing Preparation Status', filing.status, 'Current step in certification workflow'],
      ['Vault Supporting Documents', documents.length, 'Cryptographically stored compliance records'],
      [''],
      ['=== 2. SECTION 37 EXPENSE CATEGORIES BREAKDOWN ==='],
      ['Category Name', 'Statutory Classification', 'Total Outflow (INR)', 'Share (%)'],
      ...categoryData.map((c) => [
        `"${c.name}"`,
        c.isAllowable ? 'Allowable Section 37' : 'Disallowed Statutory Penalty',
        c.amount,
        `${c.percentage}%`,
      ]),
      [''],
      ['=== 3. MONTHLY INFLOW & OUTFLOW TREND (APR - MAR) ==='],
      ['Month', 'Gross Inflow (INR)', 'Operating Burn (INR)', 'Net Margin (INR)'],
      ...monthlyData.map((m) => [
        m.monthName,
        m.income,
        m.expenses,
        m.net,
      ]),
      [''],
      ['=== 4. ACTIVE FINANCIAL YEAR TRANSACTION LEDGER ==='],
      ['Type', 'Date', 'Invoice / Bill Reference', 'Party (Vendor/Customer)', 'Description', 'Amount (INR)', 'Section 37 Flag', 'Audit Status'],
      ...combinedLedger.map((row) => [
        row.type,
        row.date,
        `"${row.invoiceNo}"`,
        `"${row.party.replace(/"/g, '""')}"`,
        `"${row.description.replace(/"/g, '""')}"`,
        row.amount,
        row.type === 'EXPENSE'
          ? (catMap.get((row.rawRecord as ExpenseRecord).categoryId)?.isAllowable ? 'Allowable' : 'Disallowed')
          : 'Income',
        row.status,
      ]),
      [''],
      ['Statutory Notice', 'TaxFlowSMB is a tax record preparation & advisory support system. It does not file taxes directly with the government.'],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      reportRows.map((r) => r.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TaxFlowSMB_Report_FY${financialYear.replace('-', '_')}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowDownloadMenu(false);

    setDownloadNotice(`Downloaded visualised financial report for FY ${financialYear} (CSV)`);
    setTimeout(() => setDownloadNotice(null), 4000);
  };

  // 2. Download Report as JSON (Respects active financialYear filter)
  const handleDownloadReportJSON = () => {
    const disallowedExpenses = totalExpenses - allowableExpenses;

    const reportJSON = {
      reportTitle: 'TaxFlowSMB Visualised Financial Assessment Report',
      financialYear: financialYear,
      generatedAt: new Date().toISOString(),
      statutoryDisclaimer:
        'TaxFlowSMB is a tax record preparation & advisory support system. It does not file taxes directly with the government.',
      operator: {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      },
      entity: {
        name: 'Nexify Solutions Pvt Ltd',
        taxRegistrationNo: '27AABCS1429B1Z5',
        panNumber: 'AABCS1429B',
      },
      visualisedKPIs: {
        totalIncome,
        totalExpenses,
        allowableExpenses,
        disallowedExpenses,
        netTaxableProfit,
        estimatedTaxAt25Percent: Math.round(netTaxableProfit * 0.25),
        filingStatus: filing.status,
        documentsStored: documents.length,
      },
      expenseCategoriesBreakdown: categoryData.map((c) => ({
        categoryId: c.categoryId,
        categoryName: c.name,
        totalAmount: c.amount,
        percentage: c.percentage,
        isSection37Allowable: c.isAllowable,
      })),
      monthlyTrends: monthlyData.map((m) => ({
        monthKey: m.monthKey,
        monthName: m.monthName,
        grossInflow: m.income,
        operatingBurn: m.expenses,
        netSurplus: m.net,
      })),
      activeLedgerRecords: combinedLedger.map((row) => ({
        id: row.id,
        type: row.type,
        invoiceNo: row.invoiceNo,
        date: row.date,
        party: row.party,
        description: row.description,
        amount: row.amount,
        reconciledStatus: row.status,
        isSection37Allowable:
          row.type === 'EXPENSE'
            ? catMap.get((row.rawRecord as ExpenseRecord).categoryId)?.isAllowable ?? true
            : true,
      })),
    };

    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(reportJSON, null, 2));

    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `TaxFlowSMB_Report_FY${financialYear.replace('-', '_')}_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowDownloadMenu(false);

    setDownloadNotice(`✓ Successfully downloaded visualised financial report for FY ${financialYear} (JSON)`);
    setTimeout(() => setDownloadNotice(null), 4000);
  };

  const handleExportCSV = handleDownloadReportCSV;

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto">
      {/* Download Feedback Notification */}
      {downloadNotice && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs shadow-lg shadow-emerald-500/10 transition-all">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-base text-emerald-400">check_circle</span>
            <span className="font-medium">{downloadNotice}</span>
          </div>
          <button
            onClick={() => setDownloadNotice(null)}
            className="text-emerald-400 hover:text-emerald-200 p-1"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* 1. Dashboard Header & Action Bar with prominent Download Report Button */}
      <div className="glacier-card rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-[#7dd3fc]/20 shadow-[0_4px_24px_rgba(15,21,36,0.5)]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg font-bold text-[#e0e8f0] tracking-tight font-headline">
              Financial Overview & Tax Assessment
            </h1>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#0e4d6e]/50 text-[#7dd3fc] border border-[#7dd3fc]/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7dd3fc] animate-pulse"></span>
              Active Filter: FY {financialYear}
            </span>
          </div>
          <p className="text-xs text-[#a0b4c4] mt-1">
            Visualised income, allowable deductions, burn rate, and projected progressive slab tax for fiscal year {financialYear}.
          </p>
        </div>

        {/* Prominent Download Report Controls */}
        <div className="relative flex items-center gap-2 self-stretch md:self-auto flex-shrink-0">
          <div className="relative w-full sm:w-auto">
            <button
              id="download-report-btn"
              onClick={() => setShowDownloadMenu((prev) => !prev)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-[#0e4d6e] to-[#164e63] hover:from-[#0284c7] hover:to-[#0891b2] text-[#e0f2fe] font-semibold text-xs px-4 py-2.5 rounded-lg border border-[#7dd3fc]/40 shadow-[0_0_15px_rgba(125,211,252,0.15)] transition-all active:scale-[0.98] cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-[#7dd3fc]">download</span>
              <span>Download Report</span>
              <span className="text-[10px] font-mono bg-[#141c2e]/60 px-1.5 py-0.5 rounded text-[#7dd3fc] border border-[#7dd3fc]/20">
                FY {financialYear}
              </span>
              <span className="material-symbols-outlined text-sm">
                {showDownloadMenu ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {/* Dropdown Menu for Format Selection (CSV / JSON) */}
            {showDownloadMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowDownloadMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#0f1524] border border-[#7dd3fc]/30 shadow-2xl p-2 z-40 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-[#7dd3fc]/15 mb-1.5">
                    <p className="text-xs font-semibold text-[#e0e8f0]">Download Financial Report</p>
                    <p className="text-[10px] text-[#a0b4c4] mt-0.5 font-mono">
                      Respects active filter: FY {financialYear}
                    </p>
                  </div>

                  {/* Option 1: CSV */}
                  <button
                    onClick={handleDownloadReportCSV}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-[#141c2e] transition-colors flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform flex-shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-base">table_view</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#e0e8f0] group-hover:text-[#7dd3fc]">
                          CSV Spreadsheet
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                          .csv
                        </span>
                      </div>
                      <p className="text-[11px] text-[#a0b4c4] leading-relaxed mt-0.5">
                        Visualised KPIs, Section 37 breakdown, monthly trajectory, and active FY transaction ledger.
                      </p>
                    </div>
                  </button>

                  {/* Option 2: JSON */}
                  <button
                    onClick={handleDownloadReportJSON}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-[#141c2e] transition-colors flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#7dd3fc]/10 border border-[#7dd3fc]/30 flex items-center justify-center text-[#7dd3fc] group-hover:scale-105 transition-transform flex-shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-base">data_object</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#e0e8f0] group-hover:text-[#7dd3fc]">
                          JSON Raw Dataset
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#7dd3fc]/20 text-[#7dd3fc]">
                          .json
                        </span>
                      </div>
                      <p className="text-[11px] text-[#a0b4c4] leading-relaxed mt-0.5">
                        Structured machine-readable visualised metrics, charts, and raw records for FY {financialYear}.
                      </p>
                    </div>
                  </button>

                  <div className="mt-1 pt-2 border-t border-[#7dd3fc]/10 px-2 flex justify-between items-center text-[10px] text-[#a0b4c4]">
                    <span>Includes S.37 Tax Classification</span>
                    <span className="font-mono text-[#7dd3fc]">FY {financialYear}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Direct Buttons on larger screens */}
          <div className="hidden lg:flex items-center gap-1 bg-[#141c2e] p-1 rounded-lg border border-[#7dd3fc]/20">
            <button
              onClick={handleDownloadReportCSV}
              title={`Quick download CSV report for FY ${financialYear}`}
              className="text-[11px] font-medium text-[#a0b4c4] hover:text-[#e0e8f0] hover:bg-[#1e293b] px-2 py-1.5 rounded transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs text-emerald-400">table_chart</span>
              <span>CSV</span>
            </button>
            <div className="w-[1px] h-3 bg-[#7dd3fc]/20"></div>
            <button
              onClick={handleDownloadReportJSON}
              title={`Quick download JSON dataset for FY ${financialYear}`}
              className="text-[11px] font-medium text-[#a0b4c4] hover:text-[#e0e8f0] hover:bg-[#1e293b] px-2 py-1.5 rounded transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs text-[#7dd3fc]">code</span>
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Statutory Compliance Banner */}
      <div className="glacier-card rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between border-l-4 border-l-[#7dd3fc] gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-lg bg-[#7dd3fc]/10 flex items-center justify-center text-[#7dd3fc] flex-shrink-0">
            <span className="material-symbols-outlined text-lg">info</span>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-[#7dd3fc]">Statutory Notice</p>
            <p className="text-xs text-[#a0b4c4] mt-0.5">
              TaxFlowSMB is a tax record preparation & advisory support system. It does not file taxes directly with the government.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-[#a0b4c4] font-mono bg-[#141c2e] px-2.5 py-1 rounded border border-[#7dd3fc]/15">
            Regulated Advisory Aux.
          </span>
        </div>
      </div>

      {/* 2. 6 KPI Stat Summary Cards Bento Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-4">
        {/* KPI 1: Total Income */}
        <div
          onClick={() => onSelectTab('income')}
          className="glacier-card rounded-xl p-3 sm:p-4 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between text-[#a0b4c4]">
            <span className="text-[11px] sm:text-xs font-medium truncate">Total Income</span>
            <span className="material-symbols-outlined text-[#7dd3fc] text-base sm:text-lg">trending_up</span>
          </div>
          <div className="mt-2 sm:mt-3">
            <p className="text-base sm:text-xl font-bold tracking-tight text-[#e0e8f0] font-headline truncate">
              {formatINR(totalIncome)}
            </p>
            <div className="flex items-center gap-1 mt-1 text-[10px] sm:text-[11px] text-emerald-400 font-medium">
              <span className="material-symbols-outlined text-xs">arrow_upward</span>
              <span>+14.2% YoY</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Expenses */}
        <div
          onClick={() => onSelectTab('expenses')}
          className="glacier-card rounded-xl p-3 sm:p-4 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between text-[#a0b4c4]">
            <span className="text-[11px] sm:text-xs font-medium truncate">Total Expenses</span>
            <span className="material-symbols-outlined text-[#7dd3fc] text-base sm:text-lg">shopping_cart</span>
          </div>
          <div className="mt-2 sm:mt-3">
            <p className="text-base sm:text-xl font-bold tracking-tight text-[#e0e8f0] font-headline truncate">
              {formatINR(totalExpenses)}
            </p>
            <div className="flex items-center gap-1 mt-1 text-[10px] sm:text-[11px] text-[#a0b4c4]">
              <span className="truncate">
                Allowable: <span className="text-[#7dd3fc] font-mono font-medium">{formatINR(allowableExpenses)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Net Taxable Profit */}
        <div
          onClick={() => onSelectTab('tax-summary')}
          className="glacier-card rounded-xl p-3 sm:p-4 flex flex-col justify-between border-[#7dd3fc]/30 shadow-[0_0_20px_rgba(125,211,252,0.06)] cursor-pointer transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between text-[#a0b4c4]">
            <span className="text-[11px] sm:text-xs font-medium text-[#7dd3fc] truncate">Net Taxable Profit</span>
            <span className="material-symbols-outlined text-[#7dd3fc] text-base sm:text-lg">account_balance_wallet</span>
          </div>
          <div className="mt-2 sm:mt-3">
            <p className="text-base sm:text-xl font-bold tracking-tight text-[#7dd3fc] font-headline truncate">
              {formatINR(netTaxableProfit)}
            </p>
            <div className="flex items-center gap-1 mt-1 text-[10px] sm:text-[11px] text-[#c8a0f0] font-medium">
              <span>Slab: 25% bracket</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Documents Vault */}
        <div
          onClick={() => onSelectTab('documents')}
          className="glacier-card rounded-xl p-3 sm:p-4 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between text-[#a0b4c4]">
            <span className="text-[11px] sm:text-xs font-medium truncate">Documents</span>
            <span className="material-symbols-outlined text-[#7dd3fc] text-base sm:text-lg">inventory_2</span>
          </div>
          <div className="mt-2 sm:mt-3">
            <p className="text-base sm:text-xl font-bold tracking-tight text-[#e0e8f0] font-headline truncate">
              {documents.length} Stored
            </p>
            <div className="flex items-center gap-1 mt-1 text-[10px] sm:text-[11px] text-amber-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
              <span className="truncate">{pendingDocsCount || 1} Pending</span>
            </div>
          </div>
        </div>

        {/* KPI 5: Action Items */}
        <div
          onClick={() => onSelectTab('filing')}
          className="glacier-card rounded-xl p-3 sm:p-4 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between text-[#a0b4c4]">
            <span className="text-[11px] sm:text-xs font-medium truncate">Action Items</span>
            <span className="material-symbols-outlined text-[#c8a0f0] text-base sm:text-lg">checklist</span>
          </div>
          <div className="mt-2 sm:mt-3">
            <p className="text-base sm:text-xl font-bold tracking-tight text-[#e0e8f0] font-headline truncate">
              {missingExpenseDocs > 0 ? `${missingExpenseDocs + 1} Pending` : '2 Pending'}
            </p>
            <div className="flex items-center gap-1 mt-1 text-[10px] sm:text-[11px] text-[#a0b4c4]">
              <span className="truncate">GST recon & TDS</span>
            </div>
          </div>
        </div>

        {/* KPI 6: Filing Status */}
        <div
          onClick={() => onSelectTab('filing')}
          className="glacier-card rounded-xl p-3 sm:p-4 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between text-[#a0b4c4]">
            <span className="text-[11px] sm:text-xs font-medium truncate">Filing Status</span>
            <span className="material-symbols-outlined text-[#7dd3fc] text-base sm:text-lg">verified</span>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="flex items-center gap-1">
              <span className="text-xs sm:text-sm font-bold text-[#7dd3fc] font-headline truncate">
                {filing.status === 'UNDER_REVIEW'
                  ? 'Under Review'
                  : filing.status === 'DRAFT'
                  ? 'Draft'
                  : filing.status === 'READY_TO_FILE'
                  ? 'Ready to File'
                  : 'Filed'}
              </span>
            </div>
            <div className="w-full bg-[#1a2438] rounded-full h-1.5 mt-2">
              <div
                className="bg-[#7dd3fc] h-1.5 rounded-full transition-all duration-500"
                style={{
                  width:
                    filing.status === 'DRAFT'
                      ? '25%'
                      : filing.status === 'UNDER_REVIEW'
                      ? '50%'
                      : filing.status === 'READY_TO_FILE'
                      ? '75%'
                      : '100%',
                }}
              ></div>
            </div>
            <p className="text-[10px] text-[#a0b4c4] mt-1 text-right">
              {filing.status === 'DRAFT'
                ? 'Step 1 of 4'
                : filing.status === 'UNDER_REVIEW'
                ? 'Step 2 of 4'
                : filing.status === 'READY_TO_FILE'
                ? 'Step 3 of 4'
                : 'Step 4 of 4'}
            </p>
          </div>
        </div>
      </section>

      {/* 3. 5 Chart Visualizer Panels Grid matching Image 1 */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel 1: Monthly Inflow Trend (Gross business receipts Apr - Mar) */}
        <div className="lg:col-span-4 glacier-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-[#e0e8f0]">Monthly Inflow Trend</h3>
              <p className="text-[11px] text-[#a0b4c4]">Gross business receipts (Apr - Mar)</p>
            </div>
            <span className="text-xs font-mono text-[#7dd3fc] font-medium">FY {financialYear}</span>
          </div>

          {/* Frosted Bar Chart Canvas matching Image 1 */}
          <div className="h-44 w-full flex items-end justify-between gap-1.5 pt-4 px-1">
            {[
              { m: 'A', h: 48, val: '₹2.70L' },
              { m: 'M', h: 62, val: '₹3.20L' },
              { m: 'J', h: 55, val: '₹3.10L' },
              { m: 'J', h: 70, val: '₹3.95L' },
              { m: 'A', h: 78, val: '₹4.30L' },
              { m: 'S', h: 64, val: '₹3.50L' },
              { m: 'O', h: 85, val: '₹4.10L' },
              { m: 'N', h: 92, val: '₹4.90L' },
              { m: 'D', h: 80, val: '₹4.60L' },
              { m: 'J', h: 74, val: '₹3.80L' },
              { m: 'F', h: 96, val: '₹5.50L' },
              { m: 'M', h: 88, val: '₹4.20L', isCurrent: true },
            ].map((bar, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer">
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 bg-[#141c2e] text-[#7dd3fc] text-[9px] px-1.5 py-0.5 rounded border border-[#7dd3fc]/30 pointer-events-none z-10 font-mono whitespace-nowrap">
                  {bar.val}
                </div>
                <div
                  className={`w-full transition-all rounded-t ${
                    bar.isCurrent
                      ? 'bg-[#7dd3fc] group-hover:bg-[#c8eaff] shadow-[0_0_10px_rgba(125,211,252,0.4)]'
                      : 'bg-[#7dd3fc]/30 group-hover:bg-[#7dd3fc]/60'
                  }`}
                  style={{ height: `${bar.h}%` }}
                ></div>
                <span
                  className={`text-[9px] font-mono ${
                    bar.isCurrent ? 'text-[#7dd3fc] font-bold' : 'text-[#a0b4c4]'
                  }`}
                >
                  {bar.m}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#7dd3fc]/10 flex justify-between items-center text-[11px] text-[#a0b4c4]">
            <span>Average monthly: ₹4,05,000</span>
            <span className="text-emerald-400 font-mono">+8.4% vs target</span>
          </div>
        </div>

        {/* Panel 2: Monthly Outflow Trend (Burn Rate) */}
        <div className="lg:col-span-4 glacier-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-[#e0e8f0]">Monthly Outflow Trend</h3>
              <p className="text-[11px] text-[#a0b4c4]">Operating burn & recurring outflows</p>
            </div>
            <span className="text-xs font-mono text-[#88b4cc] font-medium">Burn Rate</span>
          </div>

          <div className="h-44 w-full flex items-end justify-between gap-1.5 pt-4 px-1">
            {[
              { m: 'A', h: 40, val: '₹1.40L' },
              { m: 'M', h: 45, val: '₹1.55L' },
              { m: 'J', h: 52, val: '₹1.72L' },
              { m: 'J', h: 48, val: '₹1.60L' },
              { m: 'A', h: 60, val: '₹1.95L' },
              { m: 'S', h: 58, val: '₹1.88L' },
              { m: 'O', h: 65, val: '₹2.10L' },
              { m: 'N', h: 62, val: '₹2.05L' },
              { m: 'D', h: 72, val: '₹2.30L' },
              { m: 'J', h: 50, val: '₹1.65L' },
              { m: 'F', h: 58, val: '₹1.90L' },
              { m: 'M', h: 54, val: '₹1.80L', isCurrent: true },
            ].map((bar, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 bg-[#141c2e] text-[#88b4cc] text-[9px] px-1.5 py-0.5 rounded border border-[#88b4cc]/30 pointer-events-none z-10 font-mono whitespace-nowrap">
                  {bar.val}
                </div>
                <div
                  className={`w-full transition-all rounded-t ${
                    bar.isCurrent
                      ? 'bg-[#88b4cc] hover:bg-[#c0d8e8] shadow-[0_0_10px_rgba(136,180,204,0.3)]'
                      : 'bg-[#88b4cc]/35 hover:bg-[#88b4cc]/60'
                  }`}
                  style={{ height: `${bar.h}%` }}
                ></div>
                <span
                  className={`text-[9px] font-mono ${
                    bar.isCurrent ? 'text-[#88b4cc] font-bold' : 'text-[#a0b4c4]'
                  }`}
                >
                  {bar.m}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#7dd3fc]/10 flex justify-between items-center text-[11px] text-[#a0b4c4]">
            <span>Controlled OPEX: 44.0%</span>
            <span className="text-[#7dd3fc] font-mono">Safe margin</span>
          </div>
        </div>

        {/* Panel 3: Income vs Expenses (Quarterly balance) */}
        <div className="lg:col-span-4 glacier-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-[#e0e8f0]">Income vs Expenses</h3>
              <p className="text-[11px] text-[#a0b4c4]">Quarterly comparative balance</p>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-[#7dd3fc]"></span> Inflow
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-[#c8a0f0]"></span> Outflow
              </span>
            </div>
          </div>

          <div className="h-44 w-full flex items-end justify-around pt-4 px-2">
            {[
              { q: 'Q1', incH: 65, expH: 38, inc: '₹9.0L', exp: '₹4.7L' },
              { q: 'Q2', incH: 78, expH: 48, inc: '₹11.7L', exp: '₹5.4L' },
              { q: 'Q3', incH: 90, expH: 52, inc: '₹13.6L', exp: '₹6.4L' },
              { q: 'Q4 (Est)', incH: 95, expH: 56, inc: '₹14.3L', exp: '₹4.9L', active: true },
            ].map((qData, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 w-14 group cursor-pointer">
                <div className="flex items-end gap-1 h-32 w-full justify-center">
                  <div
                    title={`Inflow: ${qData.inc}`}
                    className={`w-4 rounded-t transition-all ${
                      qData.active
                        ? 'bg-[#7dd3fc] shadow-[0_0_10px_rgba(125,211,252,0.3)]'
                        : 'bg-[#7dd3fc]/70 hover:bg-[#7dd3fc]'
                    }`}
                    style={{ height: `${qData.incH}%` }}
                  ></div>
                  <div
                    title={`Outflow: ${qData.exp}`}
                    className={`w-4 rounded-t transition-all ${
                      qData.active
                        ? 'bg-[#c8a0f0] shadow-[0_0_10px_rgba(200,160,240,0.3)]'
                        : 'bg-[#c8a0f0]/60 hover:bg-[#c8a0f0]'
                    }`}
                    style={{ height: `${qData.expH}%` }}
                  ></div>
                </div>
                <span
                  className={`text-[10px] font-mono ${
                    qData.active ? 'text-[#7dd3fc] font-bold' : 'text-[#a0b4c4]'
                  }`}
                >
                  {qData.q}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#7dd3fc]/10 flex justify-between items-center text-[11px] text-[#a0b4c4]">
            <span>Retained surplus: 56.0%</span>
            <span className="text-[#c8a0f0] font-mono">₹27.2L Spread</span>
          </div>
        </div>

        {/* Panel 4: Expense Categories Breakdown (Doughnut Chart + Legend) */}
        <div className="lg:col-span-6 glacier-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-[#e0e8f0]">Expense Categories Breakdown</h3>
              <p className="text-[11px] text-[#a0b4c4]">Classification for Section 37 deductible claims</p>
            </div>
            <button
              onClick={() => onSelectTab('expenses')}
              className="text-xs text-[#7dd3fc] hover:underline flex items-center gap-1"
            >
              <span>View Audit</span>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 my-2">
            {/* Simulated Conic Doughnut graphic matching Image 1 */}
            <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
              <div
                className="w-full h-full rounded-full border border-[#7dd3fc]/20"
                style={{
                  background:
                    'conic-gradient(#7dd3fc 0% 38%, #c8a0f0 38% 58%, #88b4cc 58% 73%, #38bdf8 73% 85%, #818cf8 85% 94%, #f472b6 94% 100%)',
                }}
              ></div>
              <div className="absolute w-24 h-24 rounded-full bg-[#0f1524] flex flex-col items-center justify-center border border-[#7dd3fc]/15 shadow-inner">
                <span className="text-[10px] text-[#a0b4c4] font-medium">TOTAL EXPEND</span>
                <span className="text-xs font-bold text-[#7dd3fc] font-mono">₹21.40L</span>
              </div>
            </div>

            {/* Categories Legend Table matching Image 1 */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 w-full text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#141c2e]/60 border border-[#7dd3fc]/5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7dd3fc]"></span>
                  <span className="text-[#e0e8f0]">Payroll</span>
                </div>
                <span className="font-mono text-[#a0b4c4]">38% (₹8.13L)</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#141c2e]/60 border border-[#7dd3fc]/5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#c8a0f0]"></span>
                  <span className="text-[#e0e8f0]">Cloud Infra</span>
                </div>
                <span className="font-mono text-[#a0b4c4]">20% (₹4.28L)</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#141c2e]/60 border border-[#7dd3fc]/5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#88b4cc]"></span>
                  <span className="text-[#e0e8f0]">Office & Lease</span>
                </div>
                <span className="font-mono text-[#a0b4c4]">15% (₹3.21L)</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#141c2e]/60 border border-[#7dd3fc]/5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]"></span>
                  <span className="text-[#e0e8f0]">Vendors</span>
                </div>
                <span className="font-mono text-[#a0b4c4]">12% (₹2.57L)</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#141c2e]/60 border border-[#7dd3fc]/5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#818cf8]"></span>
                  <span className="text-[#e0e8f0]">Marketing</span>
                </div>
                <span className="font-mono text-[#a0b4c4]">9% (₹1.92L)</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#141c2e]/60 border border-[#7dd3fc]/5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f472b6]"></span>
                  <span className="text-[#e0e8f0]">Travel</span>
                </div>
                <span className="font-mono text-[#a0b4c4]">6% (₹1.29L)</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-[#a0b4c4] pt-2 border-t border-[#7dd3fc]/10">
            All items tagged with valid GSTIN invoices automatically cross-verified.
          </p>
        </div>

        {/* Panel 5: Net Profit Trajectory (Area Chart with glow nodes) */}
        <div className="lg:col-span-6 glacier-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-[#e0e8f0]">Net Profit Trajectory</h3>
              <p className="text-[11px] text-[#a0b4c4]">Cumulative operating margin progression</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#7dd3fc] bg-[#7dd3fc]/10 px-2.5 py-1 rounded-full border border-[#7dd3fc]/20">
              <span className="material-symbols-outlined text-sm">auto_graph</span>
              <span>+18.9% Growth</span>
            </div>
          </div>

          {/* SVG Gradient Area Chart matching Image 1 */}
          <div className="relative h-44 w-full flex items-center justify-center pt-2">
            <svg
              className="w-full h-full"
              fill="none"
              viewBox="0 0 450 140"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="profitGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.35"></stop>
                  <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.0"></stop>
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line stroke="rgba(125,211,252,0.08)" strokeDasharray="3 3" x1="0" x2="450" y1="35" y2="35"></line>
              <line stroke="rgba(125,211,252,0.08)" strokeDasharray="3 3" x1="0" x2="450" y1="75" y2="75"></line>
              <line stroke="rgba(125,211,252,0.08)" strokeDasharray="3 3" x1="0" x2="450" y1="115" y2="115"></line>
              {/* Shaded Area */}
              <path
                d="M 0 110 Q 50 100, 90 92 T 180 80 T 270 55 T 360 40 T 450 18 L 450 140 L 0 140 Z"
                fill="url(#profitGrad)"
              ></path>
              {/* Gradient Stroke Line */}
              <path
                d="M 0 110 Q 50 100, 90 92 T 180 80 T 270 55 T 360 40 T 450 18"
                stroke="#7dd3fc"
                strokeLinecap="round"
                strokeWidth="2.5"
              ></path>
              {/* Key Data Nodes */}
              <circle className="animate-pulse" cx="90" cy="92" fill="#7dd3fc" r="3.5"></circle>
              <circle cx="180" cy="80" fill="#7dd3fc" r="3.5"></circle>
              <circle cx="270" cy="55" fill="#7dd3fc" r="3.5"></circle>
              <circle cx="360" cy="40" fill="#7dd3fc" r="3.5"></circle>
              <circle cx="450" cy="18" fill="#c8a0f0" r="4.5" stroke="#0a0e1a" strokeWidth="2"></circle>
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#a0b4c4] font-mono pt-2 border-t border-[#7dd3fc]/10">
            <span>Q1: ₹4.8L</span>
            <span>Q2: ₹11.2L</span>
            <span>Q3: ₹18.9L</span>
            <span className="text-[#7dd3fc] font-bold">Q4 Projected: ₹27.2L</span>
          </div>
        </div>
      </section>

      {/* 4. Recent Financial Records Table matching Image 1 */}
      <section className="glacier-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-[#e0e8f0] tracking-tight font-headline">
              Recent Financial Records
            </h2>
            <p className="text-xs text-[#a0b4c4] mt-0.5">
              Live synched ledgers with categorized tax deductible flags
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-44 bg-[#141c2e]/70 border border-[#7dd3fc]/20 text-xs text-[#e0e8f0] rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#7dd3fc] placeholder:text-[#a0b4c4]/60"
              />
              <span className="material-symbols-outlined text-sm text-[#a0b4c4] absolute left-2.5 top-2">
                search
              </span>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-center bg-[#1a2438] rounded-lg p-0.5 border border-[#7dd3fc]/20 text-xs">
              <button
                onClick={() => {
                  setFilterType('ALL');
                  setCurrentPage(1);
                }}
                className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  filterType === 'ALL' ? 'bg-[#0e4d6e] text-[#7dd3fc]' : 'text-[#a0b4c4] hover:text-[#e0e8f0]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => {
                  setFilterType('INCOME');
                  setCurrentPage(1);
                }}
                className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  filterType === 'INCOME' ? 'bg-[#0e4d6e] text-[#7dd3fc]' : 'text-[#a0b4c4] hover:text-[#e0e8f0]'
                }`}
              >
                Income
              </button>
              <button
                onClick={() => {
                  setFilterType('EXPENSE');
                  setCurrentPage(1);
                }}
                className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  filterType === 'EXPENSE' ? 'bg-[#0e4d6e] text-[#7dd3fc]' : 'text-[#a0b4c4] hover:text-[#e0e8f0]'
                }`}
              >
                Expenses
              </button>
            </div>

            {/* Download Report Table Actions */}
            <div className="flex items-center gap-1.5 justify-end">
              <button
                onClick={handleDownloadReportCSV}
                title={`Download visualised financial report as CSV for FY ${financialYear}`}
                className="flex items-center gap-1.5 text-xs text-[#7dd3fc] bg-[#7dd3fc]/10 border border-[#7dd3fc]/30 px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-[#7dd3fc]/20 transition-all active:scale-95 cursor-pointer font-medium"
              >
                <span className="material-symbols-outlined text-sm">table_view</span>
                <span className="hidden xs:inline">Report (CSV)</span>
                <span className="xs:hidden">CSV</span>
              </button>
              <button
                onClick={handleDownloadReportJSON}
                title={`Download visualised financial report as JSON for FY ${financialYear}`}
                className="flex items-center gap-1.5 text-xs text-[#c8a0f0] bg-[#c8a0f0]/10 border border-[#c8a0f0]/30 px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-[#c8a0f0]/20 transition-all active:scale-95 cursor-pointer font-medium"
              >
                <span className="material-symbols-outlined text-sm">data_object</span>
                <span>JSON</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Card View (Visible on small screens < sm) */}
        <div className="block sm:hidden space-y-2.5 mb-4">
          {paginatedEntries.length === 0 ? (
            <div className="py-8 text-center text-[#a0b4c4] text-xs">
              No transactions match your search query or filter.
            </div>
          ) : (
            paginatedEntries.map((row) => (
              <div
                key={row.id}
                className={`p-3 rounded-xl border border-white/5 bg-[#141c2e]/60 space-y-2 ${
                  row.status === 'Invoice Pending' ? 'border-amber-500/20 bg-amber-500/[0.03]' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  {row.type === 'INCOME' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      <span className="material-symbols-outlined text-[10px]">arrow_downward</span>
                      Income
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0e4d6e]/40 text-[#7dd3fc] border border-[#7dd3fc]/30">
                      <span className="material-symbols-outlined text-[10px]">arrow_upward</span>
                      Expense
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-[#a0b4c4]">{formatDate(row.date)}</span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white text-xs truncate">{row.description}</p>
                    <p className="text-[11px] text-[#a0b4c4] truncate mt-0.5">
                      {row.party} • <span className="font-mono text-[#7dd3fc]">{row.invoiceNo}</span>
                    </p>
                  </div>
                  <div
                    className={`font-mono font-bold text-sm shrink-0 ${
                      row.type === 'INCOME' ? 'text-emerald-400' : 'text-[#e0e8f0]'
                    }`}
                  >
                    {formatINR(row.amount)}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-[11px]">
                  <div>
                    {row.status === 'Reconciled' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20 font-medium">
                        Reconciled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-400/10 text-amber-300 border border-amber-400/30 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        Invoice Pending
                      </span>
                    )}
                  </div>
                  <div>
                    {row.status === 'Invoice Pending' && row.type === 'EXPENSE' ? (
                      <button
                        onClick={() => onUploadForExpense(row.rawRecord as ExpenseRecord)}
                        className="px-2.5 py-1 rounded bg-[#7dd3fc]/15 text-[#7dd3fc] border border-[#7dd3fc]/30 text-[10px] font-semibold hover:bg-[#7dd3fc]/25"
                      >
                        Upload Bill
                      </button>
                    ) : (
                      <button
                        onClick={() => onSelectTab(row.type === 'INCOME' ? 'income' : 'expenses')}
                        className="text-[#7dd3fc] text-[11px] font-medium hover:underline flex items-center gap-0.5"
                      >
                        <span>Details</span>
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (Hidden on mobile < sm) */}
        <div className="hidden sm:block overflow-x-auto rounded-xl border border-[#7dd3fc]/10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#7dd3fc]/10 bg-[#141c2e]/50 text-[11px] font-semibold text-[#a0b4c4] uppercase tracking-wider">
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Vendor / Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#7dd3fc]/5 text-xs font-normal text-[#e0e8f0]">
              {paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#a0b4c4]">
                    No transactions match your search query or filter.
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-[#141c2e]/40 transition-colors ${
                      row.status === 'Invoice Pending' ? 'bg-amber-500/[0.02]' : ''
                    }`}
                  >
                    {/* Type Badge */}
                    <td className="py-3 px-4">
                      {row.type === 'INCOME' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          <span className="material-symbols-outlined text-[10px]">arrow_downward</span>
                          Income
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#0e4d6e]/40 text-[#7dd3fc] border border-[#7dd3fc]/30">
                          <span className="material-symbols-outlined text-[10px]">arrow_upward</span>
                          Expense
                        </span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 font-medium text-[#e0e8f0]">
                      {row.description}
                    </td>

                    {/* Vendor / Customer */}
                    <td className="py-3 px-4 text-[#a0b4c4]">
                      {row.party}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-[#a0b4c4] font-mono">
                      {formatDate(row.date)}
                    </td>

                    {/* Amount */}
                    <td
                      className={`py-3 px-4 text-right font-mono font-semibold ${
                        row.type === 'INCOME' ? 'text-emerald-400' : 'text-[#e0e8f0]'
                      }`}
                    >
                      {formatINR(row.amount)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      {row.status === 'Reconciled' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20 font-medium">
                          Reconciled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-400/10 text-amber-300 border border-amber-400/30 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                          Invoice Pending
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      {row.status === 'Invoice Pending' && row.type === 'EXPENSE' ? (
                        <button
                          onClick={() => onUploadForExpense(row.rawRecord as ExpenseRecord)}
                          className="p-1 text-[#7dd3fc] hover:underline text-[11px] font-medium"
                        >
                          Upload
                        </button>
                      ) : (
                        <button
                          onClick={() => onSelectTab(row.type === 'INCOME' ? 'income' : 'expenses')}
                          className="p-1 text-[#a0b4c4] hover:text-[#7dd3fc] transition-colors"
                          title="View Ledger Details"
                        >
                          <span className="material-symbols-outlined text-sm">more_vert</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer matching Image 1 */}
        <div className="flex items-center justify-between pt-4 mt-1 text-xs text-[#a0b4c4]">
          <span>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredLedger.length)} of 148 entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded bg-[#141c2e] border border-[#7dd3fc]/10 hover:text-[#7dd3fc] transition-colors disabled:opacity-40"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                onClick={() => setCurrentPage(pg)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  currentPage === pg
                    ? 'bg-[#0e4d6e] text-[#c8eaff] font-semibold border border-[#7dd3fc]/30'
                    : 'bg-[#141c2e] border border-[#7dd3fc]/10 hover:text-[#7dd3fc]'
                }`}
              >
                {pg}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded bg-[#141c2e] border border-[#7dd3fc]/10 hover:text-[#7dd3fc] transition-colors disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* Footer Micro-Note matching Image 1 */}
      <footer className="pt-4 pb-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#a0b4c4]/80 border-t border-[#7dd3fc]/10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-[#7dd3fc]">lock</span>
          <span>End-to-End 256-bit Encrypted Ledger Archive • TaxFlowSMB Advisory Platform</span>
        </div>
        <div className="mt-2 sm:mt-0 flex gap-4">
          <button onClick={() => onSelectTab('reports')} className="hover:text-[#7dd3fc] transition-colors">
            Security Protocol
          </button>
          <button onClick={() => onSelectTab('tax-summary')} className="hover:text-[#7dd3fc] transition-colors">
            Privacy Notice
          </button>
          <button onClick={() => onSelectTab('tax-summary')} className="hover:text-[#7dd3fc] transition-colors">
            Terms of Advisory
          </button>
        </div>
      </footer>
    </div>
  );
};
