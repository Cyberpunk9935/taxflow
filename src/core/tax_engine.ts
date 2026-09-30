import { TaxRule, TaxSummary, TaxSlabBreakdown } from '../types';
import { MoneyDecimal } from './decimal';

/**
 * Filter rules that match the financial year, are marked active, and are currently valid on `onDate` (YYYY-MM-DD).
 */
export function select_rules(
  rules: TaxRule[],
  financialYear: string,
  onDate: string = new Date().toISOString().split('T')[0]
): TaxRule[] {
  return rules
    .filter((r) => {
      if (!r.isActive) return false;
      if (r.financialYear !== financialYear) return false;
      if (r.effectiveDate && onDate < r.effectiveDate) return false;
      if (r.expiryDate && onDate > r.expiryDate) return false;
      return true;
    })
    .sort((a, b) => a.incomeMin - b.incomeMin);
}

/**
 * Check if a set of slab rules has gaps or overlapping ranges.
 */
export function check_rule_overlaps(rules: TaxRule[]): string[] {
  const warnings: string[] = [];
  const sorted = [...rules].sort((a, b) => a.incomeMin - b.incomeMin);

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (current.incomeMax === null) {
      warnings.push(
        `Rule "${current.slabName}" has no upper bound but is followed by "${next.slabName}".`
      );
    } else if (current.incomeMax > next.incomeMin) {
      warnings.push(
        `Overlapping slabs detected: "${current.slabName}" ends at ₹${current.incomeMax} while "${next.slabName}" begins at ₹${next.incomeMin}.`
      );
    } else if (current.incomeMax < next.incomeMin) {
      warnings.push(
        `Gap in tax slabs between ₹${current.incomeMax} and ₹${next.incomeMin}. Income in this gap will not be taxed.`
      );
    }
  }

  return warnings;
}

export interface TaxCalculationParams {
  grossIncome: number;
  totalExpenses: number;
  allowableExpenses: number;
  rules: TaxRule[];
  period?: string;
  onDate?: string;
}

/**
 * Calculate tax based on configurable dynamic rules (progressive slab-based calculation).
 * Rules are never hard-coded.
 */
export function calculate_tax({
  grossIncome,
  totalExpenses,
  allowableExpenses,
  rules,
  period = 'FY 2024-25',
  onDate = new Date().toISOString().split('T')[0],
}: TaxCalculationParams): TaxSummary {
  const warnings: string[] = [];
  const activeRules = select_rules(rules, period.replace('FY ', ''), onDate);

  if (activeRules.length === 0) {
    warnings.push(`No active tax rules found for ${period} on date ${onDate}.`);
  }

  const overlapWarnings = check_rule_overlaps(activeRules);
  warnings.push(...overlapWarnings);

  const inc = new MoneyDecimal(grossIncome);
  const allowableExp = new MoneyDecimal(allowableExpenses);
  const totalExp = new MoneyDecimal(totalExpenses);

  const disallowed = totalExp.sub(allowableExp).toNumber();
  const net = inc.sub(allowableExp);
  const netIncomeVal = net.toNumber();

  // Aggregate fixed deductions configured on rules
  let totalDeductions = new MoneyDecimal(0);
  for (const r of activeRules) {
    if (r.fixedDeduction && r.fixedDeduction > 0) {
      totalDeductions = totalDeductions.add(r.fixedDeduction);
    }
  }

  // Taxable income = max(0, Net Income - Deductions)
  let taxable = net.sub(totalDeductions);
  if (taxable.isNegative()) {
    taxable = new MoneyDecimal(0);
  }
  const taxableAmount = taxable.toNumber();

  if (netIncomeVal <= 0) {
    warnings.push(
      'Net business income is zero or negative (loss); taxable income assessed at ₹0.00.'
    );
  }

  // Progressive slab calculation
  let totalTax = new MoneyDecimal(0);
  const slabBreakdowns: TaxSlabBreakdown[] = [];

  for (const rule of activeRules) {
    const min = rule.incomeMin;
    const max = rule.incomeMax;

    if (taxableAmount <= min) {
      // Income did not reach this bracket
      slabBreakdowns.push({
        slabName: rule.slabName,
        min,
        max,
        rate: rule.rate,
        sliceTaxable: 0,
        taxComputed: 0,
      });
      continue;
    }

    // Determine the slice of income falling inside this slab
    const upperLimit = max !== null ? Math.min(taxableAmount, max) : taxableAmount;
    const slice = new MoneyDecimal(upperLimit - min);
    const sliceVal = slice.toNumber();

    // Tax for this slice = slice * (rate / 100)
    const slabTax = slice.mul(rule.rate / 100);
    totalTax = totalTax.add(slabTax);

    slabBreakdowns.push({
      slabName: rule.slabName,
      min,
      max,
      rate: rule.rate,
      sliceTaxable: sliceVal,
      taxComputed: slabTax.toNumber(),
    });
  }

  const taxAmount = totalTax.toNumber();
  const effectiveRate =
    taxableAmount > 0
      ? Number(((taxAmount / taxableAmount) * 100).toFixed(2))
      : 0;

  return {
    period,
    totalIncome: inc.toNumber(),
    totalExpenses: totalExp.toNumber(),
    allowableExpenses: allowableExp.toNumber(),
    disallowedExpenses: disallowed,
    netIncome: netIncomeVal,
    deductions: totalDeductions.toNumber(),
    taxableAmount,
    taxAmount,
    effectiveRate,
    rulesApplied: activeRules,
    slabBreakdowns,
    warnings,
  };
}
