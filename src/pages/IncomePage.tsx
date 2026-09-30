import React, { useState, useMemo } from 'react';
import { IncomeRecord, PaymentStatus } from '../types';
import { formatINR } from '../core/decimal';
import { validate_income } from '../core/validators';

interface IncomePageProps {
  incomes: IncomeRecord[];
  onAddIncome: (record: Omit<IncomeRecord, 'id' | 'createdAt'>) => void;
  onUpdateIncome: (record: IncomeRecord) => void;
  onDeleteIncome: (id: string) => void;
  financialYear: string;
  onOpenExportModal?: () => void;
}

export const IncomePage: React.FC<IncomePageProps> = ({
  incomes,
  onAddIncome,
  onUpdateIncome,
  onDeleteIncome,
  financialYear,
  onOpenExportModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Direct export current view as CSV or JSON respecting selected FY
  const exportCurrentView = (format: 'csv' | 'json') => {
    const filename = `Income_View_FY${financialYear}_${new Date().toISOString().substring(0, 10)}.${format}`;
    if (format === 'json') {
      const payload = {
        view: 'Income Ledger',
        financialYear,
        totalRecords: filtered.length,
        totalAmountINR: currentTotal,
        exportedAt: new Date().toISOString(),
        records: filtered,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } else {
      const headers = ['Invoice No', 'Date', 'Customer', 'Description', 'Amount (INR)', 'Payment Status', 'Reviewed'];
      const rows = filtered.map((i) => [
        `"${i.invoiceNo}"`,
        i.date,
        `"${i.customer.replace(/"/g, '""')}"`,
        `"${i.description.replace(/"/g, '""')}"`,
        i.amount,
        i.paymentStatus,
        i.reviewed ? 'Yes' : 'No',
      ]);
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


  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<IncomeRecord | null>(null);
  const [modalErrors, setModalErrors] = useState<string[]>([]);

  // Form fields
  const [formCustomer, setFormCustomer] = useState('');
  const [formInvoiceNo, setFormInvoiceNo] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState('2025-03-15');
  const [formStatus, setFormStatus] = useState<PaymentStatus>('RECONCILED');

  // Delete confirm modal
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Filtered income records
  const filtered = useMemo(() => {
    return incomes.filter((item) => {
      if (statusFilter !== 'ALL' && item.paymentStatus !== statusFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          item.customer.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.invoiceNo.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [incomes, statusFilter, searchTerm]);

  // Total for current filtered view
  const currentTotal = useMemo(() => {
    return filtered.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filtered]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openAddModal = () => {
    setEditingRecord(null);
    setFormCustomer('');
    setFormInvoiceNo(`NEX-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setFormDescription('');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormStatus('RECONCILED');
    setModalErrors([]);
    setIsModalOpen(true);
  };

  const openEditModal = (rec: IncomeRecord) => {
    setEditingRecord(rec);
    setFormCustomer(rec.customer);
    setFormInvoiceNo(rec.invoiceNo);
    setFormDescription(rec.description);
    setFormAmount(rec.amount.toString());
    setFormDate(rec.date);
    setFormStatus(rec.paymentStatus);
    setModalErrors([]);
    setIsModalOpen(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(formAmount);

    const payload = {
      id: editingRecord?.id,
      customer: formCustomer.trim(),
      invoiceNo: formInvoiceNo.trim(),
      description: formDescription.trim(),
      amount: numAmount,
      date: formDate,
      paymentStatus: formStatus,
      businessId: 'biz-nexify',
      reviewed: true,
    };

    const valResult = validate_income(payload, incomes, financialYear);
    if (!valResult.isValid) {
      setModalErrors(valResult.errors);
      return;
    }

    if (editingRecord) {
      onUpdateIncome({
        ...editingRecord,
        ...payload,
        id: editingRecord.id,
      });
    } else {
      onAddIncome(payload);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-headline">Income Receipts Ledger</h2>
          <p className="text-xs text-[#a0b4c4] mt-0.5">
            Commercial invoicing records, enterprise retainers, and recognized business receipts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Direct CSV / JSON Export buttons */}
          <div className="flex items-center bg-[#141c2e] border border-[#7dd3fc]/20 rounded-lg p-0.5">
            <button
              onClick={() => exportCurrentView('csv')}
              title={`Export current FY ${financialYear} income as CSV`}
              className="px-2.5 py-1.5 text-xs text-[#7dd3fc] hover:bg-[#0e4d6e]/40 rounded font-semibold flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">table_view</span>
              <span>CSV</span>
            </button>
            <button
              onClick={() => exportCurrentView('json')}
              title={`Export current FY ${financialYear} income as JSON`}
              className="px-2.5 py-1.5 text-xs text-[#7dd3fc] hover:bg-[#0e4d6e]/40 rounded font-semibold flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">code</span>
              <span>JSON</span>
            </button>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-gradient-to-r from-[#0e4d6e] to-[#1a3a4e] text-[#7dd3fc] font-bold text-xs tracking-wider rounded-lg border border-[#7dd3fc]/40 hover:border-[#7dd3fc] shadow-[0_0_20px_rgba(125,211,252,0.15)] transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>Record Income</span>
          </button>
        </div>

      </div>

      {/* Summary Strip (Prompt requirement) */}
      <div className="glacier-card rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-[#7dd3fc]/15">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <span className="material-symbols-outlined text-xl">payments</span>
          </div>
          <div>
            <span className="text-xs text-[#a0b4c4]">Total Filtered Revenue</span>
            <p className="text-2xl font-bold font-headline text-emerald-400">
              {formatINR(currentTotal)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#a0b4c4]">
          <div>
            <span>Active FY: </span>
            <span className="text-[#7dd3fc] font-mono font-bold">FY {financialYear}</span>
          </div>
          <div>
            <span>Entries Count: </span>
            <span className="text-white font-mono font-bold">{filtered.length}</span>
          </div>
        </div>
      </div>

      {/* Controls & Table Container */}
      <div className="glacier-card rounded-2xl p-6 border border-[#7dd3fc]/15 space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by customer, invoice #, or description..."
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
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#141c2e] border border-[#7dd3fc]/20 text-xs text-[#e0e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#7dd3fc]"
            >
              <option value="ALL">All Statuses</option>
              <option value="RECONCILED">Reconciled</option>
              <option value="PENDING">Pending</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        </div>

        {/* Mobile Card List (< sm screens) */}
        <div className="block sm:hidden space-y-2.5">
          {paginated.length === 0 ? (
            <div className="py-8 text-center text-[#a0b4c4] text-xs">
              No income entries found matching criteria.
            </div>
          ) : (
            paginated.map((row) => (
              <div
                key={row.id}
                className="p-3.5 rounded-xl border border-white/5 bg-[#141c2e]/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#7dd3fc] font-bold">{row.invoiceNo}</span>
                  <span className="text-[10px] font-mono text-[#a0b4c4]">{row.date}</span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white text-xs truncate">{row.customer}</p>
                    <p className="text-[11px] text-[#a0b4c4] truncate mt-0.5">{row.description}</p>
                  </div>
                  <div className="font-mono font-bold text-sm text-emerald-400 shrink-0">
                    {formatINR(row.amount)}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                      row.paymentStatus === 'RECONCILED'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                        : row.paymentStatus === 'PENDING'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        : 'bg-red-500/10 text-red-300 border-red-500/20'
                    }`}
                  >
                    {row.paymentStatus}
                  </span>

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
            ))
          )}
        </div>

        {/* Desktop Table View (Hidden on mobile < sm) */}
        <div className="hidden sm:block overflow-x-auto rounded-xl border border-[#7dd3fc]/10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#7dd3fc]/10 bg-[#141c2e]/70 text-[11px] font-semibold text-[#a0b4c4] uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#7dd3fc]/5 text-xs text-[#e0e8f0]">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#a0b4c4]">
                    No income entries found matching criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((row) => (
                  <tr key={row.id} className="hover:bg-[#141c2e]/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[#a0b4c4]">{row.date}</td>
                    <td className="py-3 px-4 font-mono text-[#7dd3fc] font-medium">
                      {row.invoiceNo}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">{row.customer}</td>
                    <td className="py-3 px-4 text-[#a0b4c4] max-w-xs truncate">
                      {row.description}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatINR(row.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                          row.paymentStatus === 'RECONCILED'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            : row.paymentStatus === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            : 'bg-red-500/10 text-red-300 border-red-500/20'
                        }`}
                      >
                        {row.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(row)}
                          title="Edit Record"
                          className="p-1 text-[#a0b4c4] hover:text-[#7dd3fc] transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(row.id)}
                          title="Delete Record"
                          className="p-1 text-[#a0b4c4] hover:text-red-400 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glacier-card-elevated rounded-2xl p-6 max-w-lg w-full border border-[#7dd3fc]/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#7dd3fc]/10 pb-3">
              <h3 className="text-base font-bold text-white font-headline">
                {editingRecord ? 'Edit Income Transaction' : 'Record New Income Receipt'}
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
              <div>
                <label className="block text-xs font-semibold text-[#a0b4c4] mb-1">
                  Customer / Client Entity
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nexus Tech Corp"
                  value={formCustomer}
                  onChange={(e) => setFormCustomer(e.target.value)}
                  className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-[#7dd3fc]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#a0b4c4] mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="INV-2024-001"
                    value={formInvoiceNo}
                    onChange={(e) => setFormInvoiceNo(e.target.value)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 text-xs font-mono text-white rounded-lg p-2.5 focus:outline-none focus:border-[#7dd3fc]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#a0b4c4] mb-1">
                    Amount (INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="250000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 text-xs font-mono text-white rounded-lg p-2.5 focus:outline-none focus:border-[#7dd3fc]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#a0b4c4] mb-1">
                    Receipt Date
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
                    Payment Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as PaymentStatus)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-[#7dd3fc]"
                  >
                    <option value="RECONCILED">Reconciled</option>
                    <option value="PENDING">Pending</option>
                    <option value="OVERDUE">Overdue</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a0b4c4] mb-1">
                  Line Description / Services Rendered
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Q4 Cloud engineering advisory retainer milestone"
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

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glacier-card-elevated rounded-2xl p-6 max-w-sm w-full border border-red-500/30 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Confirm Removal</h3>
              <p className="text-xs text-[#a0b4c4] mt-1">
                Are you sure you want to remove this income entry from the FY ledger? An audit log will be created.
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
                  onDeleteIncome(deleteTargetId);
                  setDeleteTargetId(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold hover:bg-red-500/30"
              >
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
