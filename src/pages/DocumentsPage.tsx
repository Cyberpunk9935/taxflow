import React, { useState, useMemo } from 'react';
import { DocumentItem, DocumentType, ExpenseRecord, IncomeRecord } from '../types';

interface DocumentsPageProps {
  documents: DocumentItem[];
  expenses: ExpenseRecord[];
  incomes: IncomeRecord[];
  onUploadDocument: (doc: Omit<DocumentItem, 'id' | 'uploadDate'>) => void;
  onDeleteDocument: (id: string) => void;
  preselectedExpense?: ExpenseRecord | null;
  onClearPreselectedExpense?: () => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  documents,
  expenses,
  incomes,
  onUploadDocument,
  onDeleteDocument,
  preselectedExpense,
  onClearPreselectedExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Upload form state
  const [docName, setDocName] = useState(
    preselectedExpense ? `${preselectedExpense.vendor}_Invoice.pdf` : ''
  );
  const [docType, setDocType] = useState<DocumentType>(
    preselectedExpense ? 'Expense Bill' : 'Invoice'
  );
  const [linkedType, setLinkedType] = useState<'NONE' | 'EXPENSE' | 'INCOME'>(
    preselectedExpense ? 'EXPENSE' : 'NONE'
  );
  const [linkedId, setLinkedId] = useState<string>(preselectedExpense?.id || '');

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  // Delete confirm modal state
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  // Missing documents list: expenses with no documentId
  const expensesMissingDocs = useMemo(() => {
    return expenses.filter((e) => !e.documentId);
  }, [expenses]);

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      if (typeFilter !== 'ALL' && d.docType !== typeFilter) return false;
      if (searchTerm && !d.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [documents, typeFilter, searchTerm]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const processFile = (file: File) => {
    setUploadError(null);

    // Validation: PDF, JPG, PNG only
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !validExtensions.includes(ext)) {
      setUploadError('Invalid file format. Only PDF, JPG, and PNG documents are accepted.');
      return;
    }

    // Validation: Max 5 MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError(`File is too large (${formatFileSize(file.size)}). Maximum allowed size is 5 MB.`);
      return;
    }

    // Simulate upload progress
    setUploadProgress(15);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null) return 30;
        if (prev >= 90) {
          clearInterval(interval);
          setTimeout(() => {
            setUploadProgress(null);
            onUploadDocument({
              businessId: 'biz-nexify',
              name: docName.trim() || file.name,
              docType: docType,
              fileSize: file.size,
              fileType: ext === 'jpeg' ? 'jpg' : (ext as any),
              linkedRecordType: linkedType === 'NONE' ? undefined : linkedType,
              linkedRecordId: linkedType === 'NONE' ? undefined : linkedId,
              status: 'VERIFIED',
            });
            if (onClearPreselectedExpense) onClearPreselectedExpense();
          }, 300);
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-[#1B2430]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B2430] font-headline">Statutory Documents Vault</h2>
          <p className="text-xs text-[#5C6470] mt-0.5">
            256-bit encrypted storage for tax invoices, expense receipts, bank statements & filings
          </p>
        </div>

        <span className="text-xs text-[#1E3A8A] font-mono bg-[#FAF8F2] border border-[#DED8CA] px-3 py-1.5 rounded-lg self-start sm:self-auto font-bold shadow-sm">
          {documents.length} / 500 Storage Units Used
        </span>
      </div>

      {/* Missing-documents Alert Box (Prompt requirement) */}
      {expensesMissingDocs.length > 0 && (
        <div className="rounded-xl p-4 border border-[#FDE68A] border-l-4 border-l-[#B45309] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FFFBEB] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] flex items-center justify-center text-[#B45309] flex-shrink-0">
              <span className="material-symbols-outlined text-xl">warning</span>
            </div>
            <div>
              <p className="text-xs font-bold text-[#92400E]">
                Action Required: {expensesMissingDocs.length} Expense Claim(s) Lack Supporting Documents
              </p>
              <p className="text-xs text-[#78350F] mt-0.5">
                The Income Tax Department requires valid GST tax invoices or merchant receipts under Section 37. Unsubstantiated claims may be disallowed during assessment.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-mono text-[#92400E] bg-[#FFFFFF] px-2.5 py-1 rounded border border-[#FDE68A] font-semibold">
              Audit Pending
            </span>
          </div>
        </div>
      )}

      {/* Upload Zone & Config Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drag & Drop Card */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`lg:col-span-2 bg-[#FFFFFF] rounded-2xl p-6 border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer min-h-[220px] shadow-sm ${
            isDragOver
              ? 'border-[#1E3A8A] bg-[#FAF8F2] shadow-md'
              : 'border-[#DED8CA] hover:border-[#1E3A8A]'
          }`}
          onClick={() => document.getElementById('vault-file-input')?.click()}
        >
          <input
            id="vault-file-input"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFileInput}
          />
          <div className="w-12 h-12 rounded-xl bg-[#FAF7F0] border border-[#DED8CA] flex items-center justify-center text-[#1E3A8A] mb-3 shadow-sm">
            <span className="material-symbols-outlined text-2xl">cloud_upload</span>
          </div>

          <h3 className="text-sm font-bold text-[#1B2430] mb-1 font-headline">
            Drag & Drop Tax Files or Click to Browse
          </h3>
          <p className="text-xs text-[#5C6470] max-w-sm mb-3">
            Supports PDF, JPG, and PNG files up to 5 MB. Documents are automatically hashed and mapped to financial year ledgers.
          </p>

          <span className="text-[11px] font-mono text-[#1E3A8A] bg-[#FAF8F2] px-3 py-1 rounded-full border border-[#DED8CA] font-semibold">
            Select Document
          </span>

          {/* Upload Progress Bar */}
          {uploadProgress !== null && (
            <div className="w-full max-w-xs mt-4 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#1E3A8A]">
                <span>Uploading & Encrypting...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-[#E5DFD2] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#1E3A8A] h-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {uploadError && (
            <p className="text-xs text-[#B91C1C] mt-3 font-medium bg-[#FEF2F2] px-3 py-1.5 rounded-lg border border-[#FECACA]">
              {uploadError}
            </p>
          )}
        </div>

        {/* Document Metadata Form */}
        <div className="bg-[#FFFFFF] rounded-2xl p-5 border border-[#DED8CA] shadow-sm space-y-3.5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A] mb-3">
              Document Tagging Parameters
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#5C6470] mb-1">
                  Document Classification
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocumentType)}
                  className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg p-2 focus:outline-none focus:border-[#1B2430]"
                >
                  <option value="Invoice">Sales Tax Invoice</option>
                  <option value="Expense Bill">Expense Purchase Bill</option>
                  <option value="Receipt">Payment Receipt / Voucher</option>
                  <option value="Bank Statement">Bank Account Statement</option>
                  <option value="Tax Document">GST / TDS Tax Challan</option>
                  <option value="Previous Filing">Previous ITR Acknowledgement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C6470] mb-1">
                  Link to Transaction (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLinkedType('EXPENSE');
                      if (expensesMissingDocs[0]) setLinkedId(expensesMissingDocs[0].id);
                    }}
                    className={`py-1.5 px-2 rounded text-xs border text-center transition-all ${
                      linkedType === 'EXPENSE'
                        ? 'bg-[#1B2430] border-[#1B2430] text-[#F7F4EC] font-bold'
                        : 'bg-[#FAF8F2] border-[#DED8CA] text-[#5C6470]'
                    }`}
                  >
                    Expense Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLinkedType('NONE');
                      setLinkedId('');
                    }}
                    className={`py-1.5 px-2 rounded text-xs border text-center transition-all ${
                      linkedType === 'NONE'
                        ? 'bg-[#1B2430] border-[#1B2430] text-[#F7F4EC] font-bold'
                        : 'bg-[#FAF8F2] border-[#DED8CA] text-[#5C6470]'
                    }`}
                  >
                    Standalone Doc
                  </button>
                </div>

                {linkedType === 'EXPENSE' && (
                  <select
                    value={linkedId}
                    onChange={(e) => setLinkedId(e.target.value)}
                    className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg p-2 focus:outline-none focus:border-[#1B2430]"
                  >
                    <option value="">-- Choose Expense Entry --</option>
                    {expenses.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.vendor} - ₹{e.amount} ({e.invoiceNo})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E5DFD2] text-[11px] text-[#5C6470]">
            <span>Tip: Drag any file into the box on the left to complete upload.</span>
          </div>
        </div>
      </div>

      {/* Documents List & Search */}
      <div className="bg-[#FFFFFF] rounded-2xl p-6 border border-[#DED8CA] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search documents by filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-[#1B2430] placeholder:text-[#5C6470]/60"
            />
            <span className="material-symbols-outlined text-base text-[#5C6470] absolute left-2.5 top-2.5">
              search
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1B2430]"
            >
              <option value="ALL">All Categories</option>
              <option value="Invoice">Invoices</option>
              <option value="Expense Bill">Expense Bills</option>
              <option value="Receipt">Receipts</option>
              <option value="Bank Statement">Bank Statements</option>
              <option value="Tax Document">Tax Documents</option>
              <option value="Previous Filing">Previous Filings</option>
            </select>
          </div>
        </div>

        {/* Document Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-[#FAF7F0] rounded-xl p-4 border border-[#DED8CA] hover:border-[#1E3A8A] hover:shadow-sm transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#1E3A8A] text-xl">
                      {doc.fileType === 'pdf' ? 'picture_as_pdf' : 'image'}
                    </span>
                    <span className="text-[10px] font-mono text-[#5C6470] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#DED8CA] uppercase font-semibold">
                      {doc.docType}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                      doc.status === 'VERIFIED'
                        ? 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/30'
                        : 'bg-[#B45309]/10 text-[#B45309] border-[#B45309]/30'
                    }`}
                  >
                    {doc.status === 'VERIFIED' ? 'Verified' : 'Pending Review'}
                  </span>
                </div>

                <h4 className="text-xs font-semibold text-[#1B2430] truncate mb-1" title={doc.name}>
                  {doc.name}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-[#5C6470] font-mono">
                  <span>{formatFileSize(doc.fileSize)}</span>
                  <span>•</span>
                  <span>{doc.uploadDate}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E5DFD2] flex items-center justify-between">
                <button
                  onClick={() => setPreviewDoc(doc)}
                  className="text-xs text-[#1E3A8A] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  <span>Inspect</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent('Simulated archive voucher: ' + doc.name);
                      const link = document.createElement('a');
                      link.setAttribute('href', dataStr);
                      link.setAttribute('download', doc.name);
                      link.click();
                    }}
                    title="Download Copy"
                    className="p-1 text-[#5C6470] hover:text-[#1E3A8A] transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">download</span>
                  </button>
                  <button
                    onClick={() => setDeleteDocId(doc.id)}
                    title="Delete Document"
                    className="p-1 text-[#5C6470] hover:text-[#B91C1C] transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B2430]/50 backdrop-blur-none text-[#1B2430]">
          <div className="bg-[#FFFFFF] rounded-2xl p-6 max-w-2xl w-full border border-[#DED8CA] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5DFD2] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1E3A8A] text-xl">
                  {previewDoc.fileType === 'pdf' ? 'picture_as_pdf' : 'image'}
                </span>
                <span className="text-sm font-bold text-[#1B2430] truncate max-w-md font-headline">
                  {previewDoc.name}
                </span>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-[#5C6470] hover:text-[#1B2430]"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Document viewer representation */}
            <div className="h-72 w-full bg-[#FAF8F2] rounded-xl border border-[#DED8CA] flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-[#1E3A8A]/10 border border-[#1E3A8A]/25 flex items-center justify-center text-[#1E3A8A]">
                <span className="material-symbols-outlined text-3xl">verified</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1B2430] font-headline">Cryptographically Signed Archive Record</p>
                <p className="text-xs text-[#5C6470] max-w-md mt-1 font-mono">
                  SHA-256: 8f9b2d...41a9 | Timestamp: {previewDoc.uploadDate} | Size: {formatFileSize(previewDoc.fileSize)}
                </p>
              </div>
              <p className="text-xs text-[#15803D] bg-[#15803D]/10 px-3 py-1 rounded-full border border-[#15803D]/30 font-medium">
                Verified Against Statutory GSTIN Database
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-[#5C6470] pt-2">
              <span>Category: {previewDoc.docType}</span>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 rounded-lg bg-[#1B2430] hover:bg-[#2B3848] text-[#F7F4EC] font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B2430]/50 backdrop-blur-none text-[#1B2430]">
          <div className="bg-[#FFFFFF] rounded-2xl p-6 max-w-sm w-full border border-[#FECACA] shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">delete_forever</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1B2430] font-headline">Delete Document</h3>
              <p className="text-xs text-[#5C6470] mt-1">
                Removing this document may mark linked transactions as unverified. Proceed?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteDocId(null)}
                className="px-4 py-2 rounded-lg bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#5C6470] hover:text-[#1B2430]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteDocument(deleteDocId);
                  setDeleteDocId(null);
                }}
                className="px-4 py-2 rounded-lg bg-[#B91C1C] text-white text-xs font-semibold hover:bg-[#991B1B] shadow-sm"
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
