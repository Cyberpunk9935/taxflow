import { Business, IncomeRecord, ExpenseRecord, DocumentItem } from '../types';

export interface TaxDeadline {
  id: string;
  title: string;
  category: 'INCOME_TAX' | 'GST' | 'ADVANCE_TAX' | 'TDS';
  dueDate: string; // YYYY-MM-DD
  description: string;
  isUrgent?: boolean;
}

export function upcoming_deadlines(
  today: string = new Date().toISOString().split('T')[0],
  deadlinesList: TaxDeadline[],
  days: number = 30
): (TaxDeadline & { daysRemaining: number })[] {
  const todayMs = new Date(today).getTime();

  return deadlinesList
    .map((d) => {
      const dueMs = new Date(d.dueDate).getTime();
      const diffTime = dueMs - todayMs;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...d,
        daysRemaining: diffDays,
      };
    })
    .filter((d) => d.daysRemaining >= 0 && d.daysRemaining <= days)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export interface PendingTask {
  id: string;
  title: string;
  category: 'DOCUMENT' | 'VERIFICATION' | 'PROFILE' | 'RECONCILIATION';
  description: string;
  actionText: string;
  actionPage: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export function pending_tasks(
  business: Business | null,
  incomes: IncomeRecord[],
  expenses: ExpenseRecord[],
  documents: DocumentItem[]
): PendingTask[] {
  const tasks: PendingTask[] = [];

  // Incomplete profile check
  if (!business || !business.taxRegistrationNo || !business.panNumber) {
    tasks.push({
      id: 'task-profile-tax-id',
      title: 'Complete Statutory Business Profile',
      category: 'PROFILE',
      description: 'Add your GSTIN and Business PAN to ensure valid filing advisory calculations.',
      actionText: 'Update Profile',
      actionPage: 'business',
      priority: 'HIGH',
    });
  }

  // Missing documents for expenses
  const unlinkedExpenses = expenses.filter((e) => !e.documentId);
  if (unlinkedExpenses.length > 0) {
    tasks.push({
      id: 'task-missing-docs',
      title: `${unlinkedExpenses.length} Expenses Lack Supporting Invoices`,
      category: 'DOCUMENT',
      description: `Attach vendor tax invoices or purchase bills to qualify for Section 37 expense claims.`,
      actionText: 'Upload Invoices',
      actionPage: 'documents',
      priority: 'HIGH',
    });
  }

  // Unreviewed ledger transactions
  const unreviewedCount =
    incomes.filter((i) => !i.reviewed).length +
    expenses.filter((e) => !e.reviewed).length;

  if (unreviewedCount > 0) {
    tasks.push({
      id: 'task-unreviewed-tx',
      title: `${unreviewedCount} Transactions Awaiting Reconciliation`,
      category: 'VERIFICATION',
      description: 'Accountant review required for bank statement and TDS 26AS matching.',
      actionText: 'Review Ledgers',
      actionPage: 'income',
      priority: 'MEDIUM',
    });
  }

  // Pending document audits in vault
  const pendingDocs = documents.filter((d) => d.status === 'PENDING_REVIEW');
  if (pendingDocs.length > 0) {
    tasks.push({
      id: 'task-doc-audit',
      title: `${pendingDocs.length} Vault Document Pending Verification`,
      category: 'RECONCILIATION',
      description: 'Verify OCR data match against expense entry details.',
      actionText: 'Inspect Vault',
      actionPage: 'documents',
      priority: 'MEDIUM',
    });
  }

  return tasks;
}
