import { Business, IncomeRecord, ExpenseRecord, DocumentItem } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FilingReadinessResult {
  isReady: boolean;
  problems: {
    category: 'BUSINESS_INFO' | 'INCOME' | 'DOCUMENTS' | 'REVIEW';
    message: string;
    actionLink: string;
    severity: 'ERROR' | 'WARNING';
  }[];
}

/**
 * Check if a date string YYYY-MM-DD falls inside the Indian financial year (Apr 1 to Mar 31).
 */
export function is_date_in_fy(dateStr: string, financialYear: string): boolean {
  if (!dateStr || !financialYear) return false;
  const parts = financialYear.split('-');
  if (parts.length !== 2) return false;

  const startYear = parseInt(parts[0], 10);
  const endYear = startYear + 1;

  const fyStart = `${startYear}-04-01`;
  const fyEnd = `${endYear}-03-31`;

  return dateStr >= fyStart && dateStr <= fyEnd;
}

export function validate_income(
  record: Partial<IncomeRecord>,
  existingRecords: IncomeRecord[],
  financialYear: string = '2024-25'
): ValidationResult {
  const errors: string[] = [];

  if (!record.customer || record.customer.trim() === '') {
    errors.push('Customer name is required.');
  }

  if (!record.invoiceNo || record.invoiceNo.trim() === '') {
    errors.push('Invoice number is required.');
  } else {
    // Check duplicate invoice number
    const dup = existingRecords.find(
      (r) =>
        r.id !== record.id &&
        r.invoiceNo.toLowerCase().trim() === record.invoiceNo?.toLowerCase().trim()
    );
    if (dup) {
      errors.push(`Duplicate invoice number "${record.invoiceNo}" already exists in the ledger.`);
    }
  }

  if (record.amount === undefined || record.amount === null || isNaN(record.amount)) {
    errors.push('Amount is required and must be a valid number.');
  } else if (record.amount <= 0) {
    errors.push('Amount must be strictly greater than zero.');
  }

  if (!record.date) {
    errors.push('Transaction date is required.');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
    errors.push('Date must be in YYYY-MM-DD format.');
  } else if (!is_date_in_fy(record.date, financialYear)) {
    errors.push(
      `Transaction date (${record.date}) falls outside the selected Financial Year (${financialYear}).`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validate_expense(
  record: Partial<ExpenseRecord>,
  existingRecords: ExpenseRecord[],
  financialYear: string = '2024-25'
): ValidationResult {
  const errors: string[] = [];

  if (!record.vendor || record.vendor.trim() === '') {
    errors.push('Vendor name is required.');
  }

  if (!record.categoryId) {
    errors.push('Expense category classification is required.');
  }

  if (!record.invoiceNo || record.invoiceNo.trim() === '') {
    errors.push('Invoice/Bill reference number is required.');
  } else {
    // Check duplicate invoice for same vendor
    const dup = existingRecords.find(
      (r) =>
        r.id !== record.id &&
        r.vendor?.toLowerCase().trim() === record.vendor?.toLowerCase().trim() &&
        r.invoiceNo.toLowerCase().trim() === record.invoiceNo?.toLowerCase().trim()
    );
    if (dup) {
      errors.push(`Duplicate bill reference "${record.invoiceNo}" from vendor "${record.vendor}" detected.`);
    }
  }

  if (record.amount === undefined || record.amount === null || isNaN(record.amount)) {
    errors.push('Amount is required and must be a valid number.');
  } else if (record.amount <= 0) {
    errors.push('Amount must be strictly greater than zero.');
  }

  if (!record.date) {
    errors.push('Expense date is required.');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
    errors.push('Date must be in YYYY-MM-DD format.');
  } else if (!is_date_in_fy(record.date, financialYear)) {
    errors.push(
      `Expense date (${record.date}) falls outside the selected Financial Year (${financialYear}).`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validate_filing_ready(
  business: Business | null,
  incomes: IncomeRecord[],
  expenses: ExpenseRecord[],
  documents: DocumentItem[]
): FilingReadinessResult {
  const problems: FilingReadinessResult['problems'] = [];

  // 1. Missing business info
  if (!business) {
    problems.push({
      category: 'BUSINESS_INFO',
      message: 'Business profile has not been created.',
      actionLink: 'business',
      severity: 'ERROR',
    });
  } else {
    if (!business.taxRegistrationNo || business.taxRegistrationNo.trim() === '') {
      problems.push({
        category: 'BUSINESS_INFO',
        message: 'GSTIN / Tax Registration Number is missing from business profile.',
        actionLink: 'business',
        severity: 'ERROR',
      });
    }
    if (!business.panNumber || business.panNumber.trim() === '') {
      problems.push({
        category: 'BUSINESS_INFO',
        message: 'Permanent Account Number (PAN) is missing from business profile.',
        actionLink: 'business',
        severity: 'ERROR',
      });
    }
    if (!business.address || business.address.trim() === '') {
      problems.push({
        category: 'BUSINESS_INFO',
        message: 'Official business operating address is missing.',
        actionLink: 'business',
        severity: 'ERROR',
      });
    }
  }

  // 2. Income records check
  if (incomes.length === 0) {
    problems.push({
      category: 'INCOME',
      message: 'No income transactions recorded for this financial year.',
      actionLink: 'income',
      severity: 'ERROR',
    });
  }

  // 3. Expenses without documents
  const expensesWithoutDoc = expenses.filter((e) => !e.documentId);
  if (expensesWithoutDoc.length > 0) {
    problems.push({
      category: 'DOCUMENTS',
      message: `${expensesWithoutDoc.length} expense ${
        expensesWithoutDoc.length === 1 ? 'transaction lacks' : 'transactions lack'
      } a supporting invoice/receipt document in the vault.`,
      actionLink: 'documents',
      severity: 'WARNING',
    });
  }

  // 4. Unreviewed records
  const unreviewedIncomes = incomes.filter((i) => !i.reviewed);
  const unreviewedExpenses = expenses.filter((e) => !e.reviewed);
  const totalUnreviewed = unreviewedIncomes.length + unreviewedExpenses.length;

  if (totalUnreviewed > 0) {
    problems.push({
      category: 'REVIEW',
      message: `${totalUnreviewed} ledger entries have not yet been marked as reviewed by accountant or owner.`,
      actionLink: 'income',
      severity: 'WARNING',
    });
  }

  // Blocking errors
  const hasErrors = problems.some((p) => p.severity === 'ERROR');

  return {
    isReady: !hasErrors,
    problems,
  };
}
