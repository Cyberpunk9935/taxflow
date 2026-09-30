import React, { useState } from 'react';
import { ExpenseRecord, ExpenseCategory, ReceiptScanResult, PaymentMethod } from '../types';
import { SAMPLE_RECEIPTS, SampleReceiptPreset, analyzeReceiptWithAI } from '../services/ai_ocr';
import { formatINR } from '../core/decimal';

interface AiReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
  onAddExpense: (record: Omit<ExpenseRecord, 'id' | 'createdAt'>) => void;
  businessId: string;
}

export const AiReceiptScannerModal: React.FC<AiReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAddExpense,
  businessId,
}) => {
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    type: string;
    size: number;
    previewUrl?: string;
  } | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Editable fields once extracted
  const [vendor, setVendor] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [isSaved, setIsSaved] = useState(false);

  const resetForm = () => {
    setSelectedFile(null);
    setIsScanning(false);
    setScanResult(null);
    setActivePresetId(null);
    setVendor('');
    setInvoiceNo('');
    setDate('');
    setAmount('');
    setCategoryId('');
    setIsSaved(false);
  };

  const applyExtractedResult = (res: ReceiptScanResult) => {
    setScanResult(res);
    setVendor(res.vendor);
    setInvoiceNo(res.invoiceNo);
    setDate(res.date);
    setAmount(res.amount.toString());

    // Match category
    const matched = categories.find((c) => c.id === res.categoryId) || categories[0];
    setCategoryId(matched?.id || categories[0]?.id || 'cat-infra');
  };

  // Handle Preset selection
  const handleSelectPreset = async (preset: SampleReceiptPreset) => {
    setActivePresetId(preset.id);
    setSelectedFile({
      name: `${preset.title.replace(/\s+/g, '_')}.pdf`,
      type: 'application/pdf',
      size: 342000,
    });
    setIsScanning(true);

    // Simulate realistic AI OCR scanning delay
    setTimeout(() => {
      applyExtractedResult(preset.previewData);
      setIsScanning(false);
    }, 800);
  };

  // Handle file drop / upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActivePresetId(null);
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    setSelectedFile({
      name: file.name,
      type: file.type || 'image/jpeg',
      size: file.size,
      previewUrl,
    });

    setIsScanning(true);

    // Read base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const result = await analyzeReceiptWithAI({
          name: file.name,
          type: file.type || 'image/jpeg',
          base64Data,
        });
        applyExtractedResult(result);
      } catch (err) {
        console.error('Scan error:', err);
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveToExpenses = () => {
    if (!vendor || !amount || !date) return;

    onAddExpense({
      businessId,
      vendor,
      invoiceNo: invoiceNo || 'INV-' + Math.floor(1000 + Math.random() * 9000),
      date,
      amount: parseFloat(amount) || 0,
      categoryId: categoryId || categories[0].id,
      paymentMethod,
      description: scanResult?.section37Explanation
        ? `[AI Classified - ${scanResult.statutoryClause}] ${vendor} Invoice`
        : `Verified Expense Bill - ${vendor}`,
      reviewed: true,
    });

    setIsSaved(true);
    setTimeout(() => {
      resetForm();
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glacier-card-elevated border border-[#7dd3fc]/30 rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl relative flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#7dd3fc]/15">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#0e4d6e] to-[#7dd3fc]/30 border border-[#7dd3fc]/40 flex items-center justify-center text-[#7dd3fc] shadow-[0_0_15px_rgba(125,211,252,0.3)] shrink-0">
              <span className="material-symbols-outlined text-xl sm:text-2xl">document_scanner</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white font-headline">AI Receipt OCR & Sec 37</h3>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono bg-sky-500/20 text-[#7dd3fc] border border-sky-500/30">
                  Gemini Flash
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#a0b4c4] truncate max-w-[200px] xs:max-w-xs sm:max-w-none">
                Instant extraction, GSTIN verification, and Section 37 audit
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-[#a0b4c4] hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="py-4 space-y-5 overflow-y-auto flex-1 pr-1">
          {/* Sample Invoices Quick Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#a0b4c4] uppercase tracking-wider">
                Quick Test Samples (Click to Instant Scan)
              </span>
              <span className="text-[11px] text-[#7dd3fc]">Or drag & drop your own receipt below</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SAMPLE_RECEIPTS.map((preset) => {
                const isSelected = activePresetId === preset.id;
                const verdictColor =
                  preset.expectedVerdict === 'ALLOWABLE'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : preset.expectedVerdict === 'DISALLOWED'
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/30';

                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-[#0e4d6e]/50 border-[#7dd3fc] shadow-[0_0_15px_rgba(125,211,252,0.2)]'
                        : 'bg-[#141c2e]/60 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="material-symbols-outlined text-sm text-[#7dd3fc]">receipt</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${verdictColor}`}>
                        {preset.expectedVerdict}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white truncate">{preset.title}</div>
                    <div className="text-[10px] text-[#a0b4c4] line-clamp-1">{preset.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* File Upload Zone */}
          <div className="relative border-2 border-dashed border-[#7dd3fc]/20 hover:border-[#7dd3fc]/50 rounded-2xl p-5 text-center transition-colors bg-[#0b0f19]/40 group">
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
              <div className="w-12 h-12 rounded-2xl bg-[#0e4d6e]/30 border border-[#7dd3fc]/30 flex items-center justify-center text-[#7dd3fc] group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-2xl">cloud_upload</span>
              </div>
              <div className="text-xs text-white font-medium">
                {selectedFile ? (
                  <span className="text-[#7dd3fc] font-bold">{selectedFile.name}</span>
                ) : (
                  <span>Click to browse or drop Invoice / Bill (PNG, JPG, PDF)</span>
                )}
              </div>
              <div className="text-[10px] text-[#a0b4c4]">
                Supports GST tax invoices, thermal POS slips, restaurant bills, and hardware vouchers
              </div>
            </div>
          </div>

          {/* Scanning Animation */}
          {isScanning && (
            <div className="p-6 rounded-2xl bg-[#0e4d6e]/20 border border-[#7dd3fc]/30 flex flex-col items-center justify-center text-center gap-3 animate-pulse">
              <div className="w-10 h-10 border-4 border-[#7dd3fc]/30 border-t-[#7dd3fc] rounded-full animate-spin"></div>
              <div>
                <h4 className="text-sm font-bold text-white">Analyzing Document with Gemini Vision OCR...</h4>
                <p className="text-xs text-[#a0b4c4] mt-0.5">
                  Parsing vendor metadata, tax invoice details, and Section 37 deductibility clauses
                </p>
              </div>
            </div>
          )}

          {/* Scan Results & Section 37 Classification Card */}
          {scanResult && !isScanning && (
            <div className="space-y-4 animate-fadeIn">
              {/* Statutory Verdict Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
                  scanResult.isSection37Allowable
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-2xl mt-0.5">
                    {scanResult.isSection37Allowable ? 'verified' : 'warning'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {scanResult.isSection37Allowable
                          ? 'Section 37 Allowable Deduction (100% Tax Deductible)'
                          : 'Section 37 Disallowed (Non-Deductible Outflow)'}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/40 border border-white/10">
                        {scanResult.confidenceScore}% Confidence
                      </span>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">{scanResult.section37Explanation}</p>
                    <div className="text-[11px] font-mono font-semibold mt-2 text-white/90">
                      Statutory Basis: {scanResult.statutoryClause}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs text-white/70">Deductible %</div>
                  <div className="text-xl font-black font-mono mt-0.5">
                    {scanResult.deductiblePercent}%
                  </div>
                </div>
              </div>

              {/* Extracted Fields Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#0e1726]/60 p-4 rounded-xl border border-white/5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#a0b4c4] uppercase mb-1">
                    Vendor / Merchant Name
                  </label>
                  <input
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#7dd3fc]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a0b4c4] uppercase mb-1">
                    Invoice / Bill Number
                  </label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#7dd3fc]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a0b4c4] uppercase mb-1">
                    Expense Date (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#7dd3fc]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a0b4c4] uppercase mb-1">
                    Total Amount (INR)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#7dd3fc]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a0b4c4] uppercase mb-1">
                    Category Allocation
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#7dd3fc]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.isAllowable ? 'Sec 37 Allowable' : 'Disallowed'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a0b4c4] uppercase mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#7dd3fc]"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Corporate Card">Corporate Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash (Subject to Sec 40A(3) ₹10k limit)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 sm:pt-4 border-t border-[#7dd3fc]/15 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-[11px] text-[#a0b4c4] text-center sm:text-left">
            {scanResult ? (
              <span>
                Total Outflow: <strong className="text-white font-mono">{formatINR(parseFloat(amount) || 0)}</strong>
              </span>
            ) : (
              <span>Upload receipt image or select a sample preset to begin audit</span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs text-[#a0b4c4] hover:bg-white/5 transition-colors border border-white/5 sm:border-0"
            >
              Cancel
            </button>
            <button
              disabled={!scanResult || !vendor || !amount || isSaved}
              onClick={handleSaveToExpenses}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer ${
                isSaved
                  ? 'bg-emerald-600 text-white'
                  : !scanResult || !vendor || !amount
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                  : 'bg-gradient-to-r from-[#0e4d6e] to-[#0284c7] hover:from-[#0369a1] hover:to-[#38bdf8] text-white border border-[#7dd3fc]/40'
              }`}
            >
              <span className="material-symbols-outlined text-base">{isSaved ? 'check' : 'add_task'}</span>
              <span>{isSaved ? 'Saved to Expenses!' : 'Confirm & Save'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
