// Types for TaxFlowSMB System

export type UserRole = 'OWNER' | 'ACCOUNTANT' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  joinedDate: string;
  assignedBusinessIds?: string[];
  avatarUrl?: string;
  authProvider?: 'email' | 'google';
  profilePictureUrl?: string;
  /**
   * PBKDF2-SHA256 digest of the password, base64. Never the password itself.
   * Absent on demo/seeded and Google accounts, which cannot be signed into
   * with the email form.
   */
  passwordHash?: string;
  /** Per-account random salt, base64. */
  passwordSalt?: string;
  /** Iteration count the digest was produced with. */
  passwordIterations?: number;
}

export type BusinessType = 'Private Limited' | 'LLP' | 'Sole Proprietorship' | 'Partnership';

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  type: BusinessType;
  ownerName: string;
  address: string;
  phone: string;
  email: string;
  taxRegistrationNo: string; // GSTIN / Tax ID
  panNumber: string;
  financialYear: string; // e.g. "2024-25"
  assignedAccountantId?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'RECONCILED' | 'PENDING' | 'OVERDUE';

export interface IncomeRecord {
  id: string;
  businessId: string;
  date: string; // YYYY-MM-DD
  invoiceNo: string;
  customer: string;
  description: string;
  amount: number;
  paymentStatus: PaymentStatus;
  documentId?: string;
  reviewed: boolean;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  isAllowable: boolean; // Section 37 deductible for income tax
  color?: string;
}

export type PaymentMethod = 'Bank Transfer' | 'Corporate Card' | 'UPI' | 'Cheque' | 'Cash';

export interface ExpenseRecord {
  id: string;
  businessId: string;
  date: string; // YYYY-MM-DD
  invoiceNo: string;
  vendor: string;
  description: string;
  categoryId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  documentId?: string; // linked receipt/invoice document
  reviewed: boolean;
  createdAt: string;
}

export type DocumentType = 'Invoice' | 'Receipt' | 'Expense Bill' | 'Bank Statement' | 'Tax Document' | 'Previous Filing';

export interface DocumentItem {
  id: string;
  businessId: string;
  name: string;
  docType: DocumentType;
  fileSize: number; // in bytes
  fileType: 'pdf' | 'jpg' | 'png';
  uploadDate: string;
  linkedRecordType?: 'INCOME' | 'EXPENSE';
  linkedRecordId?: string;
  status: 'VERIFIED' | 'PENDING_REVIEW';
  storagePath?: string;
}

export interface TaxRule {
  id: string;
  financialYear: string;
  taxType: 'Corporate Income Tax' | 'Partnership Tax' | 'Presumptive 44AD';
  slabName: string;
  incomeMin: number;
  incomeMax: number | null; // null for infinity / above threshold
  rate: number; // percentage, e.g. 25
  fixedDeduction: number;
  effectiveDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  isActive: boolean;
}

export type FilingStatus = 'DRAFT' | 'UNDER_REVIEW' | 'READY_TO_FILE' | 'FILED';

export interface StatusHistoryEntry {
  status: FilingStatus;
  changedBy: string; // User name
  role: UserRole;
  timestamp: string;
  notes?: string;
}

export interface TaxFiling {
  id: string;
  businessId: string;
  financialYear: string;
  status: FilingStatus;
  taxableAmount: number;
  taxAmount: number;
  reviewedBy?: string;
  reviewNotes?: string;
  history: StatusHistoryEntry[];
  updatedAt: string;
}

export type NotificationType = 'DEADLINE' | 'MISSING_DOC' | 'UNVERIFIED_TX' | 'INCOMPLETE_PROFILE' | 'STATUS_CHANGE';

export interface NotificationItem {
  id: string;
  userId: string;
  businessId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  linkPage: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE' | 'UPLOAD' | 'STATUS_CHANGE';
  entity: 'User' | 'Business' | 'Income' | 'Expense' | 'Document' | 'TaxRule' | 'TaxFiling';
  entityId: string;
  details: string;
  ip: string;
  timestamp: string;
  oldValue?: string;
  newValue?: string;
}

export interface TaxSlabBreakdown {
  slabName: string;
  min: number;
  max: number | null;
  rate: number;
  sliceTaxable: number;
  taxComputed: number;
}

export interface TaxSummary {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  allowableExpenses: number;
  disallowedExpenses: number;
  netIncome: number;
  deductions: number;
  taxableAmount: number;
  taxAmount: number;
  effectiveRate: number;
  rulesApplied: TaxRule[];
  slabBreakdowns: TaxSlabBreakdown[];
  warnings: string[];
}

// Bank Statement & Reconciliation Types
export interface BankTransaction {
  id: string;
  businessId: string;
  date: string;
  description: string;
  referenceNo: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  paymentMode: 'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'CHQ' | 'CASH';
  status: 'MATCHED' | 'UNMATCHED';
  matchedRecordType?: 'INCOME' | 'EXPENSE';
  matchedRecordId?: string;
}

export interface CashDisallowanceItem {
  recordId: string;
  vendor: string;
  invoiceNo: string;
  date: string;
  amount: number;
  disallowedAmount: number;
  section: string; // 'Section 40A(3)'
  reason: string;
  riskLevel: 'CRITICAL' | 'WARNING';
}

// Advance Tax & Challan 280 Types
export interface AdvanceTaxInstallment {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  dueDate: string;
  statutoryPercent: number;
  cumulativeTaxDue: number;
  quarterlyTaxDue: number;
  amountPaid: number;
  shortfall: number;
  interest234C: number;
  status: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'UPCOMING';
}

export interface Challan280Data {
  panNumber: string;
  taxpayerName: string;
  assessmentYear: string;
  financialYear: string;
  majorHead: '0020' | '0021'; // 0020 = Companies, 0021 = Non-companies
  minorHead: '100' | '300'; // 100 = Advance Tax, 300 = Self Assessment
  bankName: string;
  bsrCode: string;
  challanNo: string;
  tenderDate: string;
  basicTax: number;
  surcharge: number;
  cess: number;
  interest234B: number;
  interest234C: number;
  penaltyFee: number;
  totalAmount: number;
}

// Receipt OCR & Section 37 Types
export interface ReceiptScanResult {
  vendor: string;
  invoiceNo: string;
  date: string;
  amount: number;
  gstin?: string;
  taxAmount?: number;
  categorySuggestion: string;
  categoryId: string;
  isSection37Allowable: boolean;
  deductiblePercent: number;
  section37Explanation: string;
  statutoryClause: string;
  confidenceScore: number;
}

// What-If Scenario Simulator Types
export interface ScenarioInputs {
  projectedAnnualRevenue: number;
  projectedOperatingExpenses: number;
  capitalPurchasesComputers: number; // 40% depreciation
  capitalPurchasesMachinery: number; // 15% depreciation
  chapterVIA80C: number; // Max 1.5L
  chapterVIA80D: number; // Health Insurance (25k - 50k)
  chapterVIA80G: number; // Donations
  section80JJAA: number; // 30% of new employee emoluments
  salaryOrDirectorRemuneration: number;
}

export interface RegimeComparison {
  regimeName: 'Old Tax Regime' | 'New Tax Regime (Sec 115BAA/115BAC)';
  grossIncome: number;
  totalDeductionsAndDepreciation: number;
  netTaxableIncome: number;
  baseTax: number;
  surcharge: number;
  cess: number;
  totalTaxLiability: number;
  effectiveRate: number;
  advantages: string[];
}

