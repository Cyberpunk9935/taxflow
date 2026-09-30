import React, { useState, useMemo } from 'react';
import { Business, BankTransaction, IncomeRecord, ExpenseRecord, CashDisallowanceItem } from '../types';
import { formatINR } from '../core/decimal';

interface BankReconciliationPageProps {
  business: Business;
  bankTransactions: BankTransaction[];
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  onAddIncome: (record: Omit<IncomeRecord, 'id' | 'createdAt'>) => void;
  onAddExpense: (record: Omit<ExpenseRecord, 'id' | 'createdAt'>) => void;
  onUpdateBankTransactions: (txs: BankTransaction[]) => void;
  financialYear: string;
}

export const BankReconciliationPage: React.FC<BankReconciliationPageProps> = ({
  business,
  bankTransactions,
  incomes,
  expenses,
  onAddIncome,
  onAddExpense,
  onUpdateBankTransactions,
  financialYear,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'RECONCILIATION' | 'CASH_DISALLOWANCE'>('RECONCILIATION');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MATCHED' | 'UNMATCHED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Section 40A(3) Cash Disallowance Audit Engine
  // Rule: Cash expenditure > ₹10,000 to a single vendor in a single day is 100% disallowed under Sec 40A(3)
  const cashDisallowances = useMemo<CashDisallowanceItem[]>(() => {
    const flagged: CashDisallowanceItem[] = [];

    // Filter expenses for current business
    const bizExpenses = expenses.filter((e) => e.businessId === business.id);

    bizExpenses.forEach((exp) => {
      if (exp.paymentMethod === 'Cash' && exp.amount > 10000) {
        flagged.push({
          recordId: exp.id,
          vendor: exp.vendor,
          invoiceNo: exp.invoiceNo,
          date: exp.date,
          amount: exp.amount,
          disallowedAmount: exp.amount,
          section: 'Section 40A(3)',
          reason: `Cash disbursement of ₹${exp.amount.toLocaleString(
            'en-IN'
          )} exceeds statutory ceiling of ₹10,000 per person/day. 100% deduction disallowed and added back to taxable profits.`,
          riskLevel: 'CRITICAL',
        });
      }
    });

    return flagged;
  }, [expenses, business.id]);

  const totalCashDisallowedAmount = cashDisallowances.reduce((acc, curr) => acc + curr.disallowedAmount, 0);
  const potentialTaxPenaltyImpact = Math.round(totalCashDisallowedAmount * 0.25); // Estimated corporate tax addition

  // Filtered bank transactions
  const filteredBankTx = useMemo(() => {
    return bankTransactions.filter((tx) => {
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          tx.description.toLowerCase().includes(q) ||
          tx.referenceNo.toLowerCase().includes(q) ||
          tx.amount.toString().includes(q)
        );
      }
      return true;
    });
  }, [bankTransactions, statusFilter, searchTerm]);

  // Aggregate metrics
  const matchedCount = bankTransactions.filter((t) => t.status === 'MATCHED').length;
  const unmatchedCredits = bankTransactions.filter((t) => t.status === 'UNMATCHED' && t.type === 'CREDIT');
  const unmatchedDebits = bankTransactions.filter((t) => t.status === 'UNMATCHED' && t.type === 'DEBIT');

  const showNotification = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 3500);
  };

  // Convert Unmatched Credit to Income
  const handleConvertCreditToIncome = (tx: BankTransaction) => {
    onAddIncome({
      businessId: business.id,
      customer: tx.description.replace(/^NEFT CR:\s*/i, '').slice(0, 30),
      invoiceNo: 'REC-' + tx.referenceNo.slice(-6),
      description: `Reconciled from Bank Credit (${tx.referenceNo}): ${tx.description}`,
      amount: tx.amount,
      date: tx.date,
      paymentStatus: 'RECONCILED',
      reviewed: true,
    });

    // Update status to matched
    const updated = bankTransactions.map((t) =>
      t.id === tx.id ? { ...t, status: 'MATCHED' as const, matchedRecordType: 'INCOME' as const } : t
    );
    onUpdateBankTransactions(updated);
    showNotification(`Bank credit of ${formatINR(tx.amount)} recorded as Income and reconciled!`);
  };

  // Convert Unmatched Debit to Expense
  const handleConvertDebitToExpense = (tx: BankTransaction) => {
    onAddExpense({
      businessId: business.id,
      vendor: tx.description.replace(/^IMPS DR:\s*|^RTGS DR:\s*/i, '').slice(0, 30),
      invoiceNo: 'EXP-' + tx.referenceNo.slice(-6),
      description: `Reconciled from Bank Debit (${tx.referenceNo}): ${tx.description}`,
      amount: tx.amount,
      date: tx.date,
      categoryId: 'cat-infra',
      paymentMethod: 'Bank Transfer',
      reviewed: true,
    });

    // Update status to matched
    const updated = bankTransactions.map((t) =>
      t.id === tx.id ? { ...t, status: 'MATCHED' as const, matchedRecordType: 'EXPENSE' as const } : t
    );
    onUpdateBankTransactions(updated);
    showNotification(`Bank debit of ${formatINR(tx.amount)} recorded as Expense and reconciled!`);
  };

  // Auto-Match Engine (matches by exact amount and type)
  const handleRunAutoMatch = () => {
    let matchCount = 0;
    const updated = bankTransactions.map((tx) => {
      if (tx.status === 'MATCHED') return tx;

      if (tx.type === 'CREDIT') {
        const found = incomes.find((inc) => inc.amount === tx.amount);
        if (found) {
          matchCount++;
          return {
            ...tx,
            status: 'MATCHED' as const,
            matchedRecordType: 'INCOME' as const,
            matchedRecordId: found.id,
          };
        }
      } else {
        const found = expenses.find((exp) => exp.amount === tx.amount);
        if (found) {
          matchCount++;
          return {
            ...tx,
            status: 'MATCHED' as const,
            matchedRecordType: 'EXPENSE' as const,
            matchedRecordId: found.id,
          };
        }
      }
      return tx;
    });

    onUpdateBankTransactions(updated);
    showNotification(`Auto-reconciliation complete: ${matchCount} transactions matched against books!`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white font-headline">Bank Reconciliation & Section 40A(3)</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-sky-500/10 text-[#7dd3fc] border border-sky-500/20">
              Audit Compliance Engine
            </span>
          </div>
          <p className="text-xs text-[#a0b4c4] mt-0.5">
            Automated bank ledger reconciliation and statutory cash disallowance scanner
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Sub-tab navigation pill */}
          <div className="flex flex-col xs:flex-row bg-[#0f1728] p-1 rounded-xl border border-white/10 w-full sm:w-auto">
            <button
              onClick={() => setActiveSubTab('RECONCILIATION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeSubTab === 'RECONCILIATION'
                  ? 'bg-[#0e4d6e] text-white shadow'
                  : 'text-[#a0b4c4] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">account_balance</span>
              <span>Bank Statement Recon</span>
            </button>

            <button
              onClick={() => setActiveSubTab('CASH_DISALLOWANCE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeSubTab === 'CASH_DISALLOWANCE'
                  ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300 shadow'
                  : 'text-[#a0b4c4] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-rose-400">gavel</span>
              <span>Sec 40A(3) Cash Disallowance</span>
              {cashDisallowances.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                  {cashDisallowances.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-3 animate-fadeIn">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          <span>{successBanner}</span>
        </div>
      )}

      {/* VIEW 1: BANK RECONCILIATION */}
      {activeSubTab === 'RECONCILIATION' && (
        <div className="space-y-5 animate-fadeIn">
          {/* 4 Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="glacier-card p-4 rounded-xl">
              <span className="text-[11px] text-[#a0b4c4] uppercase tracking-wider font-semibold">Total Bank Entries</span>
              <div className="text-xl font-bold font-mono text-white mt-1">{bankTransactions.length}</div>
              <span className="text-[10px] text-[#a0b4c4]/70 mt-1 block">HDFC / ICICI Feed</span>
            </div>

            <div className="glacier-card p-4 rounded-xl border-emerald-500/20">
              <span className="text-[11px] text-emerald-400 uppercase tracking-wider font-semibold">
                Reconciled & Matched
              </span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{matchedCount}</div>
              <span className="text-[10px] text-emerald-300/70 mt-1 block">
                {((matchedCount / (bankTransactions.length || 1)) * 100).toFixed(0)}% Ledger Alignment
              </span>
            </div>

            <div className="glacier-card p-4 rounded-xl border-amber-500/20">
              <span className="text-[11px] text-amber-400 uppercase tracking-wider font-semibold">
                Unmatched Credits (Income?)
              </span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">{unmatchedCredits.length}</div>
              <span className="text-[10px] text-amber-300/70 mt-1 block">
                {formatINR(unmatchedCredits.reduce((a, c) => a + c.amount, 0))} unrecorded inflow
              </span>
            </div>

            <div className="glacier-card p-4 rounded-xl border-rose-500/20">
              <span className="text-[11px] text-rose-400 uppercase tracking-wider font-semibold">
                Unmatched Debits (Expense?)
              </span>
              <div className="text-xl font-bold font-mono text-rose-400 mt-1">{unmatchedDebits.length}</div>
              <span className="text-[10px] text-rose-300/70 mt-1 block">
                {formatINR(unmatchedDebits.reduce((a, c) => a + c.amount, 0))} unrecorded outflow
              </span>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative w-full">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-xs text-[#a0b4c4]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search description, reference no, or amount..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#a0b4c4]/60 focus:outline-none focus:border-[#7dd3fc]"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-[#141c2e] border border-[#7dd3fc]/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7dd3fc] cursor-pointer shrink-0"
              >
                <option value="ALL">All Status</option>
                <option value="MATCHED">Matched Only</option>
                <option value="UNMATCHED">Unmatched Only</option>
              </select>
            </div>

            <button
              onClick={handleRunAutoMatch}
              className="px-4 py-2 bg-gradient-to-r from-[#0e4d6e] to-[#0284c7] hover:from-[#0369a1] hover:to-[#38bdf8] text-white font-bold text-xs rounded-xl border border-[#7dd3fc]/40 shadow flex items-center gap-2 active:scale-95 transition-all shrink-0"
            >
              <span className="material-symbols-outlined text-sm">sync</span>
              <span>Auto-Match with Books</span>
            </button>
          </div>

          {/* Bank Transactions Table */}
          <div className="glacier-card rounded-2xl overflow-hidden border border-[#7dd3fc]/20 shadow-xl">
            {/* Mobile Card List (< md screens) */}
            <div className="block md:hidden p-3 space-y-2.5">
              {filteredBankTx.length === 0 ? (
                <div className="py-8 text-center text-[#a0b4c4] text-xs">
                  No bank transactions found.
                </div>
              ) : (
                filteredBankTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-xl border border-white/5 bg-[#141c2e]/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            tx.type === 'CREDIT'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {tx.type}
                        </span>
                        <span className="text-[10px] text-[#a0b4c4] font-mono">{tx.paymentMode}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#a0b4c4]">{tx.date}</span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white text-xs truncate">{tx.description}</p>
                        <p className="text-[10px] font-mono text-[#a0b4c4] mt-0.5">Ref: {tx.referenceNo}</p>
                        {tx.matchedRecordType && (
                          <span className="text-[10px] text-[#7dd3fc] font-mono mt-0.5 inline-block">
                            ✓ Matched to {tx.matchedRecordType} voucher
                          </span>
                        )}
                      </div>
                      <div
                        className={`font-mono font-bold text-sm shrink-0 ${
                          tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {tx.type === 'CREDIT' ? '+' : '-'} {formatINR(tx.amount)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          tx.status === 'MATCHED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {tx.status}
                      </span>

                      <div>
                        {tx.status === 'UNMATCHED' ? (
                          tx.type === 'CREDIT' ? (
                            <button
                              onClick={() => handleConvertCreditToIncome(tx)}
                              className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1 hover:bg-emerald-500/25"
                            >
                              <span className="material-symbols-outlined text-xs">add</span>
                              <span>Record Income</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleConvertDebitToExpense(tx)}
                              className="px-2.5 py-1 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-semibold flex items-center gap-1 hover:bg-rose-500/25"
                            >
                              <span className="material-symbols-outlined text-xs">add</span>
                              <span>Record Expense</span>
                            </button>
                          )
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">done_all</span>
                            <span>Reconciled</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View (Hidden on mobile < md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b0f19]/60 text-[#a0b4c4] font-semibold uppercase tracking-wider border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Bank Narration / Description</th>
                    <th className="py-3 px-4">Ref Number</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Amount (INR)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Quick Reconciliation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {filteredBankTx.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 text-[#a0b4c4] font-sans">{tx.date}</td>

                      <td className="py-3 px-4 text-white font-sans max-w-xs">
                        <div className="truncate font-medium">{tx.description}</div>
                        {tx.matchedRecordType && (
                          <div className="text-[10px] text-[#7dd3fc] font-mono mt-0.5">
                            Matched to {tx.matchedRecordType} voucher
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-[#a0b4c4] font-mono text-[11px]">{tx.referenceNo}</td>

                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-[#a0b4c4]">
                          {tx.paymentMode}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            tx.type === 'CREDIT'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-white">
                        <span className={tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'}>
                          {tx.type === 'CREDIT' ? '+' : '-'} {formatINR(tx.amount)}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            tx.status === 'MATCHED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-sans">
                        {tx.status === 'UNMATCHED' ? (
                          <div className="flex items-center justify-end gap-2">
                            {tx.type === 'CREDIT' ? (
                              <button
                                onClick={() => handleConvertCreditToIncome(tx)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-xs">add</span>
                                <span>Record as Income</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConvertDebitToExpense(tx)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-xs">add</span>
                                <span>Record as Expense</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                            <span className="material-symbols-outlined text-xs">done_all</span>
                            <span>Reconciled</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SECTION 40A(3) CASH DISALLOWANCE CHECKER */}
      {activeSubTab === 'CASH_DISALLOWANCE' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Statutory Explanatory Banner */}
          <div className="glacier-card p-5 rounded-2xl border-l-4 border-l-rose-500 space-y-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-400 text-xl">warning</span>
              <h3 className="text-base font-bold text-white font-headline">
                Statutory Rule: Section 40A(3) Cash Payment Limit of ₹10,000
              </h3>
            </div>
            <p className="text-xs text-[#a0b4c4] leading-relaxed">
              Under Section 40A(3) of the Income Tax Act, 1961, where an assessee incurs any expenditure in respect of
              which payment is made in an amount <strong>exceeding ₹10,000 in cash</strong> to a person in a single day,{' '}
              <strong>no deduction shall be allowed</strong> in respect of such expenditure. The entire amount must be
              disallowed and added back to taxable profits during ITR audit filing.
            </p>
          </div>

          {/* Impact KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="glacier-card p-4 rounded-xl border-rose-500/30 bg-rose-950/20">
              <span className="text-[11px] text-rose-400 uppercase tracking-wider font-semibold">
                Violating Cash Payments
              </span>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-1">{cashDisallowances.length}</div>
              <span className="text-[10px] text-rose-300/70 mt-1 block">Exceeds ₹10,000 statutory limit</span>
            </div>

            <div className="glacier-card p-4 rounded-xl border-rose-500/30">
              <span className="text-[11px] text-rose-400 uppercase tracking-wider font-semibold">
                Total Disallowed Expenditure
              </span>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {formatINR(totalCashDisallowedAmount)}
              </div>
              <span className="text-[10px] text-[#a0b4c4] mt-1 block">To be added back in Tax Computation</span>
            </div>

            <div className="glacier-card p-4 rounded-xl border-amber-500/30">
              <span className="text-[11px] text-amber-400 uppercase tracking-wider font-semibold">
                Potential Tax Liability Addition
              </span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {formatINR(potentialTaxPenaltyImpact)}
              </div>
              <span className="text-[10px] text-amber-300/70 mt-1 block">Estimated @ 25% corporate tax rate</span>
            </div>
          </div>

          {/* Flagged Transactions Table */}
          {cashDisallowances.length === 0 ? (
            <div className="p-8 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-2">
              <span className="material-symbols-outlined text-4xl text-emerald-400">check_circle</span>
              <h4 className="text-base font-bold text-white">Zero Cash Disallowances Found!</h4>
              <p className="text-xs text-[#a0b4c4] max-w-md mx-auto">
                All cash payments in {business.name} for FY {financialYear} comply with the ₹10,000 threshold under Section
                40A(3).
              </p>
            </div>
          ) : (
            <div className="glacier-card rounded-2xl overflow-hidden border border-rose-500/30 shadow-xl">
              <div className="px-6 py-4 border-b border-rose-500/20 bg-rose-950/20 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-rose-200">
                    Audit Flagged Transactions (Section 40A(3) Violation)
                  </h4>
                  <p className="text-xs text-rose-300/70">
                    These cash outflows cannot be claimed as tax deductions under income tax audit
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-rose-400 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/30">
                  ACTION REQUIRED
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0b0f19]/60 text-[#a0b4c4] font-semibold uppercase tracking-wider border-b border-white/5">
                    <tr>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Vendor / Payee</th>
                      <th className="py-3.5 px-4">Voucher No</th>
                      <th className="py-3.5 px-4">Cash Amount Paid</th>
                      <th className="py-3.5 px-4">Disallowed Amount (100%)</th>
                      <th className="py-3.5 px-4">Statutory Disallowance Rationale</th>
                      <th className="py-3.5 px-4 text-right">Recommended Audit Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {cashDisallowances.map((item) => (
                      <tr key={item.recordId} className="hover:bg-rose-950/10 transition-colors">
                        <td className="py-3.5 px-4 text-[#a0b4c4] font-sans">{item.date}</td>
                        <td className="py-3.5 px-4 font-bold text-white font-sans">{item.vendor}</td>
                        <td className="py-3.5 px-4 text-[#7dd3fc] font-mono">{item.invoiceNo}</td>
                        <td className="py-3.5 px-4 text-rose-400 font-bold">{formatINR(item.amount)}</td>
                        <td className="py-3.5 px-4 text-rose-400 font-bold">{formatINR(item.disallowedAmount)}</td>
                        <td className="py-3.5 px-4 font-sans text-xs text-[#a0b4c4] max-w-sm">
                          {item.reason}
                        </td>
                        <td className="py-3.5 px-4 text-right font-sans">
                          <span className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg font-semibold inline-block">
                            Add Back to Profit
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
