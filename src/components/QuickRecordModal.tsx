import React, { useState } from 'react';
import { ExpenseCategory, IncomeRecord, ExpenseRecord, PaymentStatus, PaymentMethod } from '../types';

interface QuickRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
  onAddIncome: (r: Omit<IncomeRecord, 'id' | 'createdAt'>) => void;
  onAddExpense: (r: Omit<ExpenseRecord, 'id' | 'createdAt'>) => void;
  financialYear: string;
}

export const QuickRecordModal: React.FC<QuickRecordModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAddIncome,
  onAddExpense,
  financialYear,
}) => {
  const [txType, setTxType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [party, setParty] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(amount);
    if (!party.trim()) {
      setError('Please provide the client or vendor name.');
      return;
    }
    if (!invoiceNo.trim()) {
      setError('Please provide an invoice or bill reference number.');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be a valid positive number.');
      return;
    }

    if (txType === 'INCOME') {
      onAddIncome({
        businessId: 'biz-nexify',
        customer: party.trim(),
        invoiceNo: invoiceNo.trim(),
        amount: numAmount,
        date,
        description: description.trim() || 'Commercial services invoice',
        paymentStatus: 'RECONCILED',
        reviewed: true,
      });
    } else {
      onAddExpense({
        businessId: 'biz-nexify',
        vendor: party.trim(),
        invoiceNo: invoiceNo.trim(),
        amount: numAmount,
        date,
        categoryId,
        description: description.trim() || 'Operational business expenditure',
        paymentMethod: 'Bank Transfer',
        reviewed: true,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B2430]/50 backdrop-blur-none text-[#1B2430]">
      <div className="bg-[#FFFFFF] rounded-2xl p-6 max-w-md w-full border border-[#DED8CA] shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#DED8CA] pb-3">
          <h3 className="text-lg font-bold text-[#1B2430] font-headline">Record Ledger Transaction</h3>
          <button onClick={onClose} className="text-[#596579] hover:text-[#1B2430] p-1">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Transaction Type Selector */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTxType('INCOME')}
            className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              txType === 'INCOME'
                ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs'
                : 'bg-[#FAF8F2] border-[#DED8CA] text-[#596579] hover:text-[#1B2430]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">arrow_downward</span>
            <span>Income Receipt</span>
          </button>
          <button
            type="button"
            onClick={() => setTxType('EXPENSE')}
            className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              txType === 'EXPENSE'
                ? 'bg-stone-100 border-[#1B2430] text-[#1B2430] shadow-xs'
                : 'bg-[#FAF8F2] border-[#DED8CA] text-[#596579] hover:text-[#1B2430]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">arrow_upward</span>
            <span>Operating Expense</span>
          </button>
        </div>

        {error && (
          <p className="p-2.5 bg-red-50 border border-red-200 text-xs text-[#991B1B] rounded-lg">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#596579] mb-1">
              {txType === 'INCOME' ? 'Customer / Client' : 'Vendor / Service Provider'}
            </label>
            <input
              type="text"
              required
              placeholder={txType === 'INCOME' ? 'e.g. Nexus Tech Corp' : 'e.g. AWS Cloud India'}
              value={party}
              onChange={(e) => setParty(e.target.value)}
              className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430] placeholder:text-[#8C7A6B]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#596579] mb-1">
                Invoice / Reference #
              </label>
              <input
                type="text"
                required
                placeholder="TX-2025-01"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs font-mono text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430] placeholder:text-[#8C7A6B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#596579] mb-1">
                Amount (INR)
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs font-mono text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430] placeholder:text-[#8C7A6B]"
              />
            </div>
          </div>

          {txType === 'EXPENSE' && (
            <div>
              <label className="block text-xs font-semibold text-[#596579] mb-1">
                Section 37 Classification
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.isAllowable ? '(Allowable)' : '(Disallowed)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#596579] mb-1">
              Transaction Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#596579] mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Q4 Consulting milestones"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430] placeholder:text-[#8C7A6B]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#DED8CA]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#596579] hover:text-[#1B2430] hover:bg-[#EFECE3] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#1B2430] hover:bg-[#283548] text-[#F7F4EC] font-bold text-xs rounded-lg border border-[#1B2430] cursor-pointer shadow-xs"
            >
              Post Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
