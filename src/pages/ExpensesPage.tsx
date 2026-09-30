import React, { useState, useMemo } from 'react';
import { ExpenseRecord, ExpenseCategory, PaymentMethod } from '../types';
import { formatINR } from '../core/decimal';
import { validate_expense } from '../core/validators';

interface ExpensesPageProps {
  expenses: ExpenseRecord[];
  categories: ExpenseCategory[];
  onAddExpense: (record: Omit<ExpenseRecord, 'id' | 'createdAt'>) => void;
  onUpdateExpense: (record: ExpenseRecord) => void;
  onDeleteExpense: (id: string) => void;
  onAttachDocument: (expense: ExpenseRecord) => void;
  financialYear: string;
  onOpenAiScanner?: () => void;
  onOpenExportModal?: () => void;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({
  expenses,
  categories,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAttachDocument,
  financialYear,
  onOpenAiScanner,
  onOpenExportModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [allowableFilter, setAllowableFilter] = useState<'ALL' | 'ALLOWABLE' | 'DISALLOWED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;


  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ExpenseRecord | null>(null);
  const [modalErrors, setModalErrors] = useState<string[]>([]);

  // Form state
  const [formVendor, setFormVendor] = useState('');
  const [formInvoiceNo, setFormInvoiceNo] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState('2025-03-15');
  const [formMethod, setFormMethod] = useState<PaymentMethod>('Bank Transfer');

  // Delete modal
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Category map
  const catMap = useMemo(() => {
    const map = new Map<string, ExpenseCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Mini summary chips calculation
  const categoryTotals = useMemo(() => {
    const totals: { [id: string]: number } = {};
    expenses.forEach((e) => {
      totals[e.categoryId] = (totals[e.categoryId] || 0) + e.amount;
    });
    return totals;
  }, [expenses]);

  // Filtering
  const filtered = useMemo(() => {
    return expenses.filter((item) => {
      const cat = catMap.get(item.categoryId);
      const isAllowable = cat?.isAllowable ?? true;

      if (selectedCategoryFilter !== 'ALL' && item.categoryId !== selectedCategoryFilter) {
        return false;
      }
      if (allowableFilter === 'ALLOWABLE' && !isAllowable) return false;
      if (allowableFilter === 'DISALLOWED' && isAllowable) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          item.vendor.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.invoiceNo.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [expenses, selectedCategoryFilter, allowableFilter, searchTerm, catMap]);

  const currentTotal = useMemo(
    () => filtered.reduce((acc, curr) => acc + curr.amount, 0),
    [filtered]
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openAddModal = () => {
    setEditingRecord(null);
    setFormVendor('');
    setFormInvoiceNo(`EXP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setFormCategoryId(categories[0]?.id || '');
    setFormDescription('');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormMethod('Bank Transfer');
    setModalErrors([]);
    setIsModalOpen(true);
  };

  const openEditModal = (rec: ExpenseRecord) => {
    setEditingRecord(rec);
    setFormVendor(rec.vendor);
    setFormInvoiceNo(rec.invoiceNo);
    setFormCategoryId(rec.categoryId);
    setFormDescription(rec.description);
    setFormAmount(rec.amount.toString());
    setFormDate(rec.date);
    setFormMethod(rec.paymentMethod);
    setModalErrors([]);
    setIsModalOpen(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(formAmount);

    const payload = {
      id: editingRecord?.id,
      vendor: formVendor.trim(),
      invoiceNo: formInvoiceNo.trim(),
      categoryId: formCategoryId,
      description: formDescription.trim(),
      amount: numAmount,
      date: formDate,
      paymentMethod: formMethod,
      businessId: 'biz-nexify',
      reviewed: true,
      documentId: editingRecord?.documentId,
    };

    const valResult = validate_expense(payload, expenses, financialYear);
    if (!valResult.isValid) {
      setModalErrors(valResult.errors);
      return;
    }

    if (editingRecord) {
      onUpdateExpense({
        ...editingRecord,
        ...payload,
        id: editingRecord.id,
      });
    } else {
      onAddExpense(payload);
    }

    setIsModalOpen(false);
  };

  // Direct export current view as CSV or JSON respecting selected FY
  const exportCurrentView = (format: 'csv' | 'json') => {
    const filename = `Expenses_View_FY${financialYear}_${new Date().toISOString().substring(0, 10)}.${format}`;
    if (format === 'json') {
      const payload = {
        view: 'Operating Expenses Ledger',
        financialYear,
        totalRecords: filtered.length,
        totalOutflowINR: filtered.reduce((a, c) => a + c.amount, 0),
        exportedAt: new Date().toISOString(),

        records: filtered.map((e) => {
          const c = catMap.get(e.categoryId);
          return {
            ...e,
            categoryName: c?.name || 'General',
            section37Allowable: c?.isAllowable ?? true,
          };
        }),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } else {
      const headers = ['Bill No', 'Date', 'Vendor', 'Category', 'Section 37', 'Amount (INR)', 'Payment Method', 'Receipt Attached'];
      const rows = filtered.map((e) => {
        const c = catMap.get(e.categoryId);
        return [
          `"${e.invoiceNo}"`,
          e.date,
          `"${e.vendor.replace(/"/g, '""')}"`,
          `"${c?.name || 'General'}"`,
          c?.isAllowable ? 'Allowable Sec 37' : 'Disallowed Sec 37',
          e.amount,
          `"${e.paymentMethod}"`,
          e.documentId ? 'Yes' : 'Pending',
        ];
      });
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
          <h2 className="text-xl font-bold text-white font-headline">Operating Expenses Ledger</h2>
          <p className="text-xs text-[#a0b4c4] mt-0.5">
            Classified vendor disbursements with Section 37 deductibility audit tags
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Direct CSV / JSON Export buttons */}
          <div className="flex items-center bg-[#141c2e] border border-[#7dd3fc]/20 rounded-lg p-0.5">
            <button
              onClick={() => exportCurrentView('csv')}
              title={`Export current FY ${financialYear} expenses as CSV`}
              className="px-2.5 py-1.5 text-xs text-[#7dd3fc] hover:bg-[#0e4d6e]/40 rounded font-semibold flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">table_view</span>
              <span>CSV</span>
            </button>
            <button
              onClick={() => exportCurrentView('json')}
              title={`Export current FY ${financialYear} expenses as JSON`}
              className="px-2.5 py-1.5 text-xs text-[#7dd3fc] hover:bg-[#0e4d6e]/40 rounded font-semibold flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">code</span>
              <span>JSON</span>
            </button>
          </div>

          {/* AI OCR Scanner Button */}
          {onOpenAiScanner && (
            <button
              onClick={onOpenAiScanner}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-sky-900/40 to-[#0e4d6e] hover:from-sky-800/60 hover:to-[#0284c7] text-[#7dd3fc] font-bold text-xs tracking-wider rounded-lg border border-sky-400/40 shadow-[0_0_15px_rgba(125,211,252,0.15)] transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">document_scanner</span>
              <span>AI Receipt OCR</span>
            </button>
          )}

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0e4d6e] to-[#1a3a4e] text-[#7dd3fc] font-bold text-xs tracking-wider rounded-lg border border-[#7dd3fc]/40 hover:border-[#7dd3fc] shadow-[0_0_20px_rgba(125,211,252,0.15)] transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>Record Expense</span>
          </button>
        </div>
      </div>


      {/* Category-wise Mini Summary Chips (Prompt requirement) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategoryFilter('ALL')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
            selectedCategoryFilter === 'ALL'
              ? 'bg-[#0e4d6e] text-[#7dd3fc] border-[#7dd3fc]/40 shadow-sm'
              : 'bg-[#141c2e] text-[#a0b4c4] border-[#7dd3fc]/10 hover:text-white'
          }`}
        >
          <span>All Categories</span>
          <span className="font-mono text-[10px] bg-black/30 px-1 rounded">
            {formatINR(expenses.reduce((a, c) => a + c.amount, 0))}
          </span>
        </button>

        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategoryFilter(c.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
              selectedCategoryFilter === c.id
                ? 'bg-[#0e4d6e] text-[#7dd3fc] border-[#7dd3fc]/40 shadow-sm'
                : 'bg-[#141c2e] text-[#a0b4c4] border-[#7dd3fc]/10 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color || '#7dd3fc' }}></span>
            <span>{c.name}</span>
            <span className="font-mono text-[10px] bg-black/30 px-1 rounded">
              {formatINR(categoryTotals[c.id] || 0)}
            </span>
          </button>
        ))}
      </div>

      {/* Main Table Container */}
      <div className="glacier-card rounded-2xl p-6 border border-[#7dd3fc]/15 space-y-4">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by vendor, bill reference, or description..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 text-xs text-white rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-[#7dd3fc] placeholder:text-[#a0b4c4]/60"
            />
            <span className="material-symbols-outlined text-base text-[#a0b4c4] absolute left-2.5 top-2.5">
              search
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={allowableFilter}
              onChange={(e) => {
                setAllowableFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-[#141c2e] border border-[#7dd3fc]/20 text-xs text-[#e0e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#7dd3fc]"
            >
              <option value="ALL">All Tax Treatments</option>
              <option value="ALLOWABLE">Section 37 Allowable Only</option>
              <option value="DISALLOWED">Disallowed Penalties Only</option>
            </select>
          </div>
        </div>

        {/* Mobile Card List (< sm screens) */}
        <div className="block sm:hidden space-y-2.5">
          {paginated.length === 0 ? (
            <div className="py-8 text-center text-[#a0b4c4] text-xs">
              No expense transactions found matching criteria.
            </div>
          ) : (
            paginated.map((row) => {
              const cat = catMap.get(row.categoryId);
              const isAllowable = cat?.isAllowable ?? true;

              return (
                <div
                  key={row.id}
                  className={`p-3.5 rounded-xl border border-white/5 bg-[#141c2e]/60 space-y-2.5 ${
                    !row.documentId ? 'border-amber-500/20 bg-amber-500/[0.03]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#7dd3fc] font-bold">{row.invoiceNo}</span>
                    <span className="text-[10px] font-mono text-[#a0b4c4]">{row.date}</span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white text-xs truncate">{row.vendor}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat?.color || '#7dd3fc' }}
                        ></span>
                        <span className="text-[11px] text-[#a0b4c4] truncate">{cat?.name || 'General'}</span>
                        <span className="text-[10px] text-[#a0b4c4]/60">• {row.paymentMethod}</span>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-sm text-white shrink-0">
                      {formatINR(row.amount)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {isAllowable ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          Sec 37 Allowable
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-300 border border-red-500/20">
                          Disallowed
                        </span>
                      )}

                      {!row.documentId && (
                        <button
                          onClick={() => onAttachDocument(row)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-400/10 text-amber-300 border border-amber-400/30"
                        >
                          <span className="material-symbols-outlined text-[11px]">upload</span>
                          <span>Bill</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(row)}
                        className="px-2 py-1 rounded bg-[#0e4d6e]/40 border border-[#7dd3fc]/30 text-[#7dd3fc] text-[11px] font-semibold flex items-center gap-1 hover:bg-[#0e4d6e]/70"
                      >
                        <span className="material-symbols-outlined text-xs">edit</span>
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(row.id)}
                        className="p-1 text-[#a0b4c4] hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Expenses Ledger Desktop Table (Hidden on mobile < sm) */}
        <div className="hidden sm:block overflow-x-auto rounded-xl border border-[#7dd3fc]/10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#7dd3fc]/10 bg-[#141c2e]/70 text-[11px] font-semibold text-[#a0b4c4] uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Section 37</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-center">Receipt Doc</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#7dd3fc]/5 text-xs text-[#e0e8f0]">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#a0b4c4]">
                    No expense transactions found matching criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((row) => {
                  const cat = catMap.get(row.categoryId);
                  const isAllowable = cat?.isAllowable ?? true;

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-[#141c2e]/50 transition-colors ${
                        !row.documentId ? 'bg-amber-500/[0.02]' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-[#a0b4c4]">{row.date}</td>
                      <td className="py-3 px-4 font-mono text-[#7dd3fc] font-medium">
                        {row.invoiceNo}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">{row.vendor}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-[#a0b4c4]">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: cat?.color || '#7dd3fc' }}
                          ></span>
                          <span>{cat?.name || 'Operating'}</span>
                        </span>
                      </td>

                      {/* Tax Allowability Badge (Prompt requirement) */}
                      <td className="py-3 px-4 text-center">
                        {isAllowable ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            Allowable
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-300 border border-red-500/20">
                            Non-Allowable
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        {formatINR(row.amount)}
                      </td>

                      {/* Document Attachment Status */}
                      <td className="py-3 px-4 text-center">
                        {row.documentId ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                            <span className="material-symbols-outlined text-xs">attach_file</span>
                            <span>Attached</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => onAttachDocument(row)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-400/10 text-amber-300 border border-amber-400/30 hover:bg-amber-400/20 transition-all"
                            title="Attach Supporting Invoice Document"
                          >
                            <span className="material-symbols-outlined text-xs">upload_file</span>
                            <span>Attach Bill</span>
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(row)}
                            title="Edit Expense"
                            className="p-1 text-[#a0b4c4] hover:text-[#7dd3fc] transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(row.id)}
                            title="Delete Expense"
                            className="p-1 text-[#a0b4c4] hover:text-red-400 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-[#a0b4c4] pt-2">
          <span>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded bg-[#141c2e] border border-[#7dd3fc]/10 hover:text-[#7dd3fc] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 font-mono text-[#7dd3fc]">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded bg-[#141c2e] border border-[#7dd3fc]/10 hover:text-[#7dd3fc] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glacier-card-elevated rounded-2xl p-6 max-w-lg w-full border border-[#7dd3fc]/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#7dd3fc]/10 pb-3">
              <h3 className="text-base font-bold text-white font-headline">
                {editingRecord ? 'Edit Expense Entry' : 'Record Operating Disbursement'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#a0b4c4] hover:text-white"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {modalErrors.length > 0 && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 space-y-1">
                {modalErrors.map((err, i) => (
                  <p key={i} className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs">error</span>
                    <span>{err}</span>
                  </p>
                ))}
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#a0b4c4] mb-1">
                    Vendor / Payee
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AWS Cloud India Pvt Ltd"
                    value={formVendor}
                    onChange={(e) => setFormVendor(e.target.value)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-[#7dd3fc]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#a0b4c4] mb-1">
                    Bill / Invoice Reference
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="AWS-IND-991"
                    value={formInvoiceNo}
                    onChange={(e) => setFormInvoiceNo(e.target.value)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 text-xs font-mono text-white rounded-lg p-2.5 focus:outline-none focus:border-[#7dd3fc]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#a0b4c4] mb-1">
                    Expense Classification
                  </label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-[#7dd3fc]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.isAllowable ? '(Sec 37 Allowable)' : '(Disallowed)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#a0b4c4] mb-1">
                    Amount (INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="75000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 text-xs font-mono text-white rounded-lg p-2.5 focus:outline-none focus:border-[#7dd3fc]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#a0b4c4] mb-1">
                    Disbursement Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-[#7dd3fc]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#a0b4c4] mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-[#7dd3fc]"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Corporate Card">Corporate Credit Card</option>
                    <option value="UPI">Business UPI</option>
                    <option value="Cheque">Account Payee Cheque</option>
                    <option value="Cash">Petty Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a0b4c4] mb-1">
                  Business Purpose / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Cloud dedicated computing instances and production databases"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-[#7dd3fc]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#7dd3fc]/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#141c2e] text-xs text-[#a0b4c4] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#0e4d6e] to-[#1a3a4e] text-[#7dd3fc] font-bold text-xs tracking-wider rounded-lg border border-[#7dd3fc]/40 hover:border-[#7dd3fc]"
                >
                  {editingRecord ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glacier-card-elevated rounded-2xl p-6 max-w-sm w-full border border-red-500/30 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Expense Entry</h3>
              <p className="text-xs text-[#a0b4c4] mt-1">
                Removing this expense will adjust allowable tax deductions in the Tax Engine. Proceed?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 rounded-lg bg-[#141c2e] text-xs text-[#a0b4c4] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteExpense(deleteTargetId);
                  setDeleteTargetId(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold hover:bg-red-500/30"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
