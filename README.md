# TaxFlowSMB - Digital Tax Filing Support for Small Businesses

TaxFlowSMB is a tax record preparation and advisory support platform engineered for small businesses, accountants, and tax advisors. It automates financial ledger calculations, Section 37 deductibility classifications, progressive slab tax calculations, and multi-role filing review workflows.

---

## 🏛️ Architecture Overview

```
                                Users
              [ Business Owner | Accountant | Administrator ]
                                  │
                                  ▼
                            Presentation
         [ Glacier Glassmorphic Dashboard & 3D Interactive UI ]
                                  │
                                  ▼
                         Core Business Logic
  ┌───────────────────────┬────────────────────────┬──────────────────────┐
  │     financial.ts      │     tax_engine.ts      │    validators.ts     │
  │ • total_income()      │ • Dynamic TaxRules     │ • Ledger validators  │
  │ • total_expenses()    │ • Progressive slabs    │ • Duplicate invoices │
  │ • allowable_expenses()│ • Section 37 offsets   │ • Filing readiness   │
  │ • monthly_breakdown() │ • ROUND_HALF_UP math   │ • Missing doc alerts │
  └───────────────────────┴────────────────────────┴──────────────────────┘
                                  │
                                  ▼
                         Filing State Machine
                 DRAFT ──► UNDER_REVIEW ──► READY_TO_FILE ──► FILED
                   ▲              │
                   └──────────────┘ (re-review on record edits)
                                  │
                                  ▼
                            Storage & Audit
     [ Encrypted Vault • Indexed Ledgers • Tamper-evident Audit Logs ]
```

---

## ⚙️ Core Modules

1. **`src/core/decimal.ts`**
   - Precise arithmetic using `MoneyDecimal` and `ROUND_HALF_UP` to 2 decimal places. Avoids IEEE 754 floating point inaccuracies.
   - Indian currency notation formatting (e.g., `₹48,60,000`).

2. **`src/core/financial.ts`**
   - Calculates gross inflow, total expenses, Section 37 allowable deductions, and net business profit.
   - Generates monthly inflow/outflow trends (April–March Indian Fiscal Year) and expense category breakdowns.

3. **`src/core/tax_engine.ts`**
   - **Zero hard-coded rates**: Tax rules are loaded from dynamic `TaxRule` data entities.
   - Computes progressive slab slicing, deducts standard allowances before brackets, and prevents negative tax bases.
   - Flags overlapping slabs, rule gaps, and expired rules.

4. **`src/core/validators.ts`**
   - Validates transaction boundaries within the active financial year, ensures non-zero positive amounts, and detects duplicate invoices.
   - `validate_filing_ready()` checks required business particulars, ledger entries, and missing document vouchers.

5. **`src/core/filing.ts`**
   - Enforces the 4-stage filing lifecycle with strict role checks (`OWNER`, `ACCOUNTANT`, `ADMIN`).
   - Throws `InvalidFilingTransitionError` on illegal jumps (e.g. attempting to jump from `DRAFT` directly to `FILED`).

6. **`src/core/tests.ts`**
   - Comprehensive test suite covering normal cases, zero income, loss scenarios, multiple progressive slabs, expired rule exclusion, overlapping rules detection, illegal state transitions, and decimal rounding.

---

## 🧪 Quick Test Guide

- Click **"Run Tax Unit Tests"** in the sidebar to execute the real-time test suite with assertion timing.
- Switch simulated user personas in the top right pill to test role permissions:
  - **Rajesh Sharma (Owner)**: Can draft records and submit for review.
  - **Priya Mehta (Accountant)**: Can audit records, add review notes, and certify "Ready to File".
  - **Aakash Verma (Admin)**: Can modify tax rules, toggle Section 37 deductibility, and inspect audit logs.
