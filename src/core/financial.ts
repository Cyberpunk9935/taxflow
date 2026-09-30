import { IncomeRecord, ExpenseRecord, ExpenseCategory } from '../types';
import { MoneyDecimal } from './decimal';

export function total_income(
  records: IncomeRecord[],
  start?: string,
  end?: string
): number {
  let sum = new MoneyDecimal(0);
  for (const r of records) {
    if (start && r.date < start) continue;
    if (end && r.date > end) continue;
    sum = sum.add(r.amount);
  }
  return sum.toNumber();
}

export function total_expenses(
  records: ExpenseRecord[],
  start?: string,
  end?: string
): number {
  let sum = new MoneyDecimal(0);
  for (const r of records) {
    if (start && r.date < start) continue;
    if (end && r.date > end) continue;
    sum = sum.add(r.amount);
  }
  return sum.toNumber();
}

export function allowable_expenses(
  records: ExpenseRecord[],
  categories: ExpenseCategory[],
  start?: string,
  end?: string
): { allowable: number; disallowed: number } {
  const allowableMap = new Map<string, boolean>();
  for (const c of categories) {
    allowableMap.set(c.id, c.isAllowable);
  }

  let allowableSum = new MoneyDecimal(0);
  let disallowedSum = new MoneyDecimal(0);

  for (const r of records) {
    if (start && r.date < start) continue;
    if (end && r.date > end) continue;

    const isAllowable = allowableMap.get(r.categoryId) ?? true;
    if (isAllowable) {
      allowableSum = allowableSum.add(r.amount);
    } else {
      disallowedSum = disallowedSum.add(r.amount);
    }
  }

  return {
    allowable: allowableSum.toNumber(),
    disallowed: disallowedSum.toNumber(),
  };
}

export function net_income(
  grossIncome: number,
  allowableExpenses: number
): number {
  const inc = new MoneyDecimal(grossIncome);
  const exp = new MoneyDecimal(allowableExpenses);
  const diff = inc.sub(exp);
  // Profit can be negative (loss)
  return diff.toNumber();
}

export interface MonthData {
  monthKey: string; // "YYYY-MM"
  monthName: string; // "Apr", "May", etc.
  income: number;
  expenses: number;
  net: number;
}

export function monthly_breakdown(
  incomes: IncomeRecord[],
  expenses: ExpenseRecord[],
  financialYear: string = '2024-25'
): MonthData[] {
  // Indian FY runs from April to March
  const [startYearStr, endYearShort] = financialYear.split('-');
  const startYear = parseInt(startYearStr, 10);
  const endYear = startYear + 1;

  const monthConfigs = [
    { key: `${startYear}-04`, name: 'Apr', short: 'A' },
    { key: `${startYear}-05`, name: 'May', short: 'M' },
    { key: `${startYear}-06`, name: 'Jun', short: 'J' },
    { key: `${startYear}-07`, name: 'Jul', short: 'J' },
    { key: `${startYear}-08`, name: 'Aug', short: 'A' },
    { key: `${startYear}-09`, name: 'Sep', short: 'S' },
    { key: `${startYear}-10`, name: 'Oct', short: 'O' },
    { key: `${startYear}-11`, name: 'Nov', short: 'N' },
    { key: `${startYear}-12`, name: 'Dec', short: 'D' },
    { key: `${endYear}-01`, name: 'Jan', short: 'J' },
    { key: `${endYear}-02`, name: 'Feb', short: 'F' },
    { key: `${endYear}-03`, name: 'Mar', short: 'M' },
  ];

  return monthConfigs.map((cfg) => {
    let incSum = new MoneyDecimal(0);
    for (const inc of incomes) {
      if (inc.date.startsWith(cfg.key)) {
        incSum = incSum.add(inc.amount);
      }
    }

    let expSum = new MoneyDecimal(0);
    for (const exp of expenses) {
      if (exp.date.startsWith(cfg.key)) {
        expSum = expSum.add(exp.amount);
      }
    }

    const net = incSum.sub(expSum);
    return {
      monthKey: cfg.key,
      monthName: cfg.name,
      income: incSum.toNumber(),
      expenses: expSum.toNumber(),
      net: net.toNumber(),
    };
  });
}

export interface CategoryBreakdownItem {
  categoryId: string;
  name: string;
  amount: number;
  percentage: number;
  isAllowable: boolean;
  color: string;
}

export function category_breakdown(
  expenses: ExpenseRecord[],
  categories: ExpenseCategory[]
): CategoryBreakdownItem[] {
  const catTotals = new Map<string, MoneyDecimal>();
  let grandTotal = new MoneyDecimal(0);

  for (const c of categories) {
    catTotals.set(c.id, new MoneyDecimal(0));
  }

  for (const exp of expenses) {
    const current = catTotals.get(exp.categoryId) || new MoneyDecimal(0);
    catTotals.set(exp.categoryId, current.add(exp.amount));
    grandTotal = grandTotal.add(exp.amount);
  }

  const defaultColors: Record<string, string> = {
    'cat-payroll': '#7dd3fc',
    'cat-infra': '#c8a0f0',
    'cat-rent': '#88b4cc',
    'cat-vendor': '#38bdf8',
    'cat-marketing': '#818cf8',
    'cat-travel': '#f472b6',
  };

  const results: CategoryBreakdownItem[] = [];
  for (const c of categories) {
    const amountDec = catTotals.get(c.id) || new MoneyDecimal(0);
    const amount = amountDec.toNumber();
    const pct = grandTotal.isZero()
      ? 0
      : Math.round((amount / grandTotal.toNumber()) * 100);

    results.push({
      categoryId: c.id,
      name: c.name,
      amount,
      percentage: pct,
      isAllowable: c.isAllowable,
      color: c.color || defaultColors[c.id] || '#7dd3fc',
    });
  }

  // Sort descending by amount
  return results.sort((a, b) => b.amount - a.amount);
}
