/**
 * Unit Test Suite for TaxFlowSMB Core Engine.
 * Covers:
 * 1. Normal case financial calculations
 * 2. Zero income scenario
 * 3. Expenses greater than income (loss)
 * 4. Progressive slab calculation (multiple tax brackets)
 * 5. Expired rule filtering
 * 6. Overlapping tax rules detection
 * 7. Illegal filing transitions in state machine
 * 8. Decimal precision & ROUND_HALF_UP edge cases
 */

import { MoneyDecimal, roundHalfUp } from './decimal';
import { total_income, total_expenses, allowable_expenses, net_income } from './financial';
import { calculate_tax, select_rules, check_rule_overlaps } from './tax_engine';
import { can_transition, execute_transition, InvalidFilingTransitionError } from './filing';
import { validate_income, validate_expense } from './validators';
import { TaxRule, IncomeRecord, ExpenseRecord, ExpenseCategory } from '../types';

export interface TestResultItem {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  message: string;
  executionTimeMs: number;
}

export function run_all_core_tests(): {
  total: number;
  passed: number;
  failed: number;
  results: TestResultItem[];
} {
  const results: TestResultItem[] = [];

  function test(id: string, name: string, category: string, fn: () => void) {
    const t0 = performance.now();
    try {
      fn();
      results.push({
        id,
        name,
        category,
        passed: true,
        message: 'Assertion passed successfully.',
        executionTimeMs: Math.round((performance.now() - t0) * 100) / 100,
      });
    } catch (err: any) {
      results.push({
        id,
        name,
        category,
        passed: false,
        message: err?.message || String(err),
        executionTimeMs: Math.round((performance.now() - t0) * 100) / 100,
      });
    }
  }

  // 1. Decimal & Rounding tests
  test('test_rounding_half_up', 'Decimal Round Half Up Accuracy', 'Decimal Arithmetic', () => {
    // 0.125 should round to 0.13
    if (roundHalfUp(0.125) !== 0.13) {
      throw new Error(`Expected 0.125 to round to 0.13, got ${roundHalfUp(0.125)}`);
    }
    // 0.124 should round to 0.12
    if (roundHalfUp(0.124) !== 0.12) {
      throw new Error(`Expected 0.124 to round to 0.12, got ${roundHalfUp(0.124)}`);
    }
    // Floating point summation safety: 0.1 + 0.2
    const d1 = new MoneyDecimal(0.1);
    const d2 = new MoneyDecimal(0.2);
    const sum = d1.add(d2).toNumber();
    if (sum !== 0.3) {
      throw new Error(`Expected 0.1 + 0.2 = 0.30, got ${sum}`);
    }
  });

  // 2. Financial normal case
  test('test_financial_normal_case', 'Financial Totals & Allowable Expenses', 'Financial Engine', () => {
    const incomes: IncomeRecord[] = [
      { id: '1', businessId: 'b1', date: '2024-05-10', invoiceNo: 'INV-1', customer: 'Cust A', description: 'Web Dev', amount: 100000, paymentStatus: 'RECONCILED', reviewed: true, createdAt: '' },
      { id: '2', businessId: 'b1', date: '2024-06-15', invoiceNo: 'INV-2', customer: 'Cust B', description: 'Support', amount: 50000, paymentStatus: 'RECONCILED', reviewed: true, createdAt: '' },
    ];
    const categories: ExpenseCategory[] = [
      { id: 'cat-server', name: 'Server', description: 'Hosting', isAllowable: true },
      { id: 'cat-fine', name: 'Traffic Fine', description: 'Penalty', isAllowable: false },
    ];
    const expenses: ExpenseRecord[] = [
      { id: 'e1', businessId: 'b1', date: '2024-05-12', invoiceNo: 'EXP-1', vendor: 'AWS', description: 'Cloud', categoryId: 'cat-server', amount: 30000, paymentMethod: 'Bank Transfer', reviewed: true, createdAt: '' },
      { id: 'e2', businessId: 'b1', date: '2024-05-20', invoiceNo: 'EXP-2', vendor: 'Gov', description: 'Late Fine', categoryId: 'cat-fine', amount: 5000, paymentMethod: 'Bank Transfer', reviewed: true, createdAt: '' },
    ];

    const totInc = total_income(incomes);
    if (totInc !== 150000) throw new Error(`Expected income 150,000, got ${totInc}`);

    const totExp = total_expenses(expenses);
    if (totExp !== 35000) throw new Error(`Expected expenses 35,000, got ${totExp}`);

    const { allowable, disallowed } = allowable_expenses(expenses, categories);
    if (allowable !== 30000) throw new Error(`Expected allowable 30,000, got ${allowable}`);
    if (disallowed !== 5000) throw new Error(`Expected disallowed 5,000, got ${disallowed}`);

    const net = net_income(totInc, allowable);
    if (net !== 120000) throw new Error(`Expected net income 120,000, got ${net}`);
  });

  // 3. Zero Income Case
  test('test_zero_income_case', 'Tax Calculation with Zero Income', 'Tax Engine', () => {
    const rules: TaxRule[] = [
      { id: 'r1', financialYear: '2024-25', taxType: 'Corporate Income Tax', slabName: 'Base Slab', incomeMin: 0, incomeMax: null, rate: 25, fixedDeduction: 0, effectiveDate: '2024-04-01', expiryDate: '2025-03-31', isActive: true },
    ];
    const summary = calculate_tax({
      grossIncome: 0,
      totalExpenses: 20000,
      allowableExpenses: 20000,
      rules,
    });

    if (summary.taxableAmount !== 0) throw new Error(`Taxable amount should be 0, got ${summary.taxableAmount}`);
    if (summary.taxAmount !== 0) throw new Error(`Tax amount should be 0, got ${summary.taxAmount}`);
    if (summary.netIncome !== -20000) throw new Error(`Net income should be -20000, got ${summary.netIncome}`);
  });

  // 4. Expenses > Income (Loss scenario)
  test('test_loss_scenario', 'Expenses Exceeding Income (Loss)', 'Tax Engine', () => {
    const rules: TaxRule[] = [
      { id: 'r1', financialYear: '2024-25', taxType: 'Corporate Income Tax', slabName: 'Base Slab', incomeMin: 0, incomeMax: null, rate: 25, fixedDeduction: 0, effectiveDate: '2024-04-01', expiryDate: '2025-03-31', isActive: true },
    ];
    const summary = calculate_tax({
      grossIncome: 500000,
      totalExpenses: 800000,
      allowableExpenses: 800000,
      rules,
    });

    if (summary.netIncome !== -300000) throw new Error(`Expected net loss -300,000, got ${summary.netIncome}`);
    if (summary.taxableAmount !== 0) throw new Error(`Taxable amount must never be below 0, got ${summary.taxableAmount}`);
    if (summary.taxAmount !== 0) throw new Error(`Tax on loss must be 0, got ${summary.taxAmount}`);
  });

  // 5. Multiple Progressive Slabs
  test('test_multiple_progressive_slabs', 'Progressive Slab Slicing Calculation', 'Tax Engine', () => {
    // Slabs:
    // 0 to 300,000 @ 0%
    // 300,000 to 700,000 @ 10%
    // 700,000 to 1,000,000 @ 15%
    // 1,000,000+ @ 20%
    const rules: TaxRule[] = [
      { id: 's1', financialYear: '2024-25', taxType: 'Corporate Income Tax', slabName: 'Nil Slab', incomeMin: 0, incomeMax: 300000, rate: 0, fixedDeduction: 0, effectiveDate: '2024-04-01', expiryDate: '2025-03-31', isActive: true },
      { id: 's2', financialYear: '2024-25', taxType: 'Corporate Income Tax', slabName: 'Slab 1', incomeMin: 300000, incomeMax: 700000, rate: 10, fixedDeduction: 0, effectiveDate: '2024-04-01', expiryDate: '2025-03-31', isActive: true },
      { id: 's3', financialYear: '2024-25', taxType: 'Corporate Income Tax', slabName: 'Slab 2', incomeMin: 700000, incomeMax: 1000000, rate: 15, fixedDeduction: 0, effectiveDate: '2024-04-01', expiryDate: '2025-03-31', isActive: true },
      { id: 's4', financialYear: '2024-25', taxType: 'Corporate Income Tax', slabName: 'Slab 3', incomeMin: 1000000, incomeMax: null, rate: 20, fixedDeduction: 0, effectiveDate: '2024-04-01', expiryDate: '2025-03-31', isActive: true },
    ];

    // Income = 1,200,000
    // Tax breakdown:
    // 0 to 300,000: 300,000 * 0% = 0
    // 300,000 to 700,000: 400,000 * 10% = 40,000
    // 700,000 to 1,000,000: 300,000 * 15% = 45,000
    // 1,000,000 to 1,200,000: 200,000 * 20% = 40,000
    // Total expected tax = 0 + 40,000 + 45,000 + 40,000 = 125,000
    const summary = calculate_tax({
      grossIncome: 1500000,
      totalExpenses: 300000,
      allowableExpenses: 300000,
      rules,
    });

    if (summary.taxableAmount !== 1200000) {
      throw new Error(`Expected taxable 1,200,000, got ${summary.taxableAmount}`);
    }
    if (summary.taxAmount !== 1250000) {
      throw new Error(`Expected progressive slab tax 125,000, got ${summary.taxAmount}`);
    }
  });

  // 6. Expired Rule Filtering
  test('test_expired_rule_filtering', 'Expired Rules Excluded from Tax Execution', 'Tax Engine', () => {
    const rules: TaxRule[] = [
      { id: 'old', financialYear: '2024-25', taxType: 'Corporate Income Tax', slabName: 'Expired 2023 Rule', incomeMin: 0, incomeMax: null, rate: 30, fixedDeduction: 0, effectiveDate: '2023-04-01', expiryDate: '2024-03-31', isActive: true },
      { id: 'curr', financialYear: '2024-25', taxType: 'Corporate Income Tax', slabName: 'Current Rule', incomeMin: 0, incomeMax: null, rate: 25, fixedDeduction: 0, effectiveDate: '2024-04-01', expiryDate: '2025-03-31', isActive: true },
    ];
    const selected = select_rules(rules, '2024-25', '2024-08-15');
    if (selected.length !== 1 || selected[0].id !== 'curr') {
      throw new Error(`Expected only 'curr' rule to be selected, got ${JSON.stringify(selected)}`);
    }
  });

  // 7. Overlapping Rules Warning
  test('test_overlapping_rules_warning', 'Detection of Overlapping Slab Ranges', 'Tax Engine', () => {
    const rules: TaxRule[] = [
      { id: 'r1', financialYear: '2024-25', taxType: 'Corporate Income Tax', slabName: 'Bracket A', incomeMin: 0, incomeMax: 500000, rate: 5, fixedDeduction: 0, effectiveDate: '2024-04-01', expiryDate: '2025-03-31', isActive: true },
      { id: 'r2', financialYear: '2024-25', taxType: 'Corporate Income Tax', slabName: 'Bracket B', incomeMin: 400000, incomeMax: 1000000, rate: 15, fixedDeduction: 0, effectiveDate: '2024-04-01', expiryDate: '2025-03-31', isActive: true },
    ];
    const warnings = check_rule_overlaps(rules);
    if (warnings.length === 0 || !warnings[0].includes('Overlapping slabs detected')) {
      throw new Error(`Expected overlap warning, got: ${JSON.stringify(warnings)}`);
    }
  });

  // 8. Illegal Filing State Transition
  test('test_illegal_filing_transition', 'State Machine Role & Transition Enforcement', 'Filing Workflow', () => {
    // DRAFT -> FILED directly is illegal
    const check1 = can_transition('DRAFT', 'FILED', 'OWNER');
    if (check1.allowed) throw new Error('DRAFT to FILED directly should be disallowed');

    // UNDER_REVIEW -> READY_TO_FILE by random role (needs OWNER or ACCOUNTANT)
    const check2 = can_transition('UNDER_REVIEW', 'READY_TO_FILE', 'OWNER');
    if (!check2.allowed) throw new Error('OWNER should be allowed to certify READY_TO_FILE');

    // FILED is terminal
    const check3 = can_transition('FILED', 'DRAFT', 'ADMIN');
    if (check3.allowed) throw new Error('FILED must be terminal and locked against transitions');

    // Test exception throwing
    try {
      execute_transition('FILED', 'DRAFT', 'OWNER');
      throw new Error('Should have thrown InvalidFilingTransitionError');
    } catch (e) {
      if (!(e instanceof InvalidFilingTransitionError)) {
        throw new Error(`Expected InvalidFilingTransitionError, got ${e}`);
      }
    }
  });

  // 9. Validation of income & expenses
  test('test_ledger_validators', 'Ledger Input & Duplicate Detection', 'Validators', () => {
    const existing: IncomeRecord[] = [
      { id: '1', businessId: 'b1', date: '2024-05-10', invoiceNo: 'INV-101', customer: 'Acme', description: '', amount: 5000, paymentStatus: 'RECONCILED', reviewed: true, createdAt: '' },
    ];

    // Duplicate invoice validation
    const valDup = validate_income({ invoiceNo: 'INV-101', customer: 'New Cust', amount: 2000, date: '2024-06-01' }, existing);
    if (valDup.isValid) throw new Error('Should flag duplicate invoice number');

    // Negative amount validation
    const valNeg = validate_expense({ vendor: 'Stationery', categoryId: 'c1', invoiceNo: 'BILL-1', amount: -50, date: '2024-06-01' }, []);
    if (valNeg.isValid) throw new Error('Should flag negative amount');
  });

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results,
  };
}
