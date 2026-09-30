import React, { useState, useMemo } from 'react';
import { User, ExpenseCategory, TaxRule, AuditLogEntry, UserRole } from '../types';
import { formatINR } from '../core/decimal';
import { calculate_tax, check_rule_overlaps } from '../core/tax_engine';

interface AdminPageProps {
  users: User[];
  onUpdateUser: (u: User) => void;
  categories: ExpenseCategory[];
  onAddCategory: (c: Omit<ExpenseCategory, 'id'>) => void;
  onUpdateCategory: (c: ExpenseCategory) => void;
  onDeleteCategory: (id: string) => void;
  taxRules: TaxRule[];
  onAddTaxRule: (r: Omit<TaxRule, 'id'>) => void;
  onUpdateTaxRule: (r: TaxRule) => void;
  onToggleRuleActive: (id: string) => void;
  auditLogs: AuditLogEntry[];
}

export const AdminPage: React.FC<AdminPageProps> = ({
  users,
  onUpdateUser,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  taxRules,
  onAddTaxRule,
  onUpdateTaxRule,
  onToggleRuleActive,
  auditLogs,
}) => {
  const [subTab, setSubTab] = useState<'USERS' | 'CATEGORIES' | 'TAX_RULES' | 'AUDIT'>('TAX_RULES');

  // 1. Tax Rules Test Simulator State
  const [testIncome, setTestIncome] = useState<string>('2720000');
  const [testFY, setTestFY] = useState<string>('2024-25');

  // Rule overlap check
  const ruleWarnings = useMemo(() => {
    return check_rule_overlaps(taxRules.filter((r) => r.financialYear === testFY && r.isActive));
  }, [taxRules, testFY]);

  // Tax Simulator calculation
  const simulatedTax = useMemo(() => {
    const inc = parseFloat(testIncome) || 0;
    return calculate_tax({
      grossIncome: inc,
      totalExpenses: 0,
      allowableExpenses: 0,
      rules: taxRules,
      period: `FY ${testFY}`,
    });
  }, [testIncome, testFY, taxRules]);

  // Tax Rule Add/Edit Modal
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TaxRule | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleFY, setRuleFY] = useState('2024-25');
  const [ruleMin, setRuleMin] = useState('0');
  const [ruleMax, setRuleMax] = useState('');
  const [ruleRate, setRuleRate] = useState('25');
  const [ruleErrors, setRuleErrors] = useState<string[]>([]);

  // Category Add/Edit Modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<ExpenseCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catAllowable, setCatAllowable] = useState(true);

  // User Edit Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Audit Logs drawer inspection
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogEntry | null>(null);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((l) => {
      if (auditActionFilter !== 'ALL' && l.action !== auditActionFilter) return false;
      if (auditSearch) {
        const q = auditSearch.toLowerCase();
        return (
          l.userName.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          l.entity.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [auditLogs, auditActionFilter, auditSearch]);

  const handleRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];
    const minVal = parseFloat(ruleMin);
    const maxVal = ruleMax ? parseFloat(ruleMax) : null;
    const rateVal = parseFloat(ruleRate);

    if (isNaN(minVal) || minVal < 0) errs.push('Income minimum must be non-negative.');
    if (maxVal !== null && (isNaN(maxVal) || maxVal <= minVal)) {
      errs.push('Income maximum must be greater than income minimum.');
    }
    if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) {
      errs.push('Rate must be between 0% and 100%.');
    }

    if (errs.length > 0) {
      setRuleErrors(errs);
      return;
    }

    if (editingRule) {
      onUpdateTaxRule({
        ...editingRule,
        slabName: ruleName.trim(),
        financialYear: ruleFY,
        incomeMin: minVal,
        incomeMax: maxVal,
        rate: rateVal,
      });
    } else {
      onAddTaxRule({
        slabName: ruleName.trim(),
        financialYear: ruleFY,
        taxType: 'Corporate Income Tax',
        incomeMin: minVal,
        incomeMax: maxVal,
        rate: rateVal,
        fixedDeduction: 0,
        effectiveDate: `${ruleFY.split('-')[0]}-04-01`,
        expiryDate: `${parseInt(ruleFY.split('-')[0]) + 1}-03-31`,
        isActive: true,
      });
    }
    setIsRuleModalOpen(false);
  };

  const handleCatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCat) {
      onUpdateCategory({
        ...editingCat,
        name: catName.trim(),
        description: catDesc.trim(),
        isAllowable: catAllowable,
      });
    } else {
      onAddCategory({
        name: catName.trim(),
        description: catDesc.trim(),
        isAllowable: catAllowable,
        color: '#7dd3fc',
      });
    }
    setIsCatModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-[#1B2430]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B2430] font-headline">System Administration Center</h2>
          <p className="text-xs text-[#596579] mt-0.5">
            Configure dynamic rules, Section 37 deductibility policies, role governance & audit ledgers
          </p>
        </div>

        <span className="text-xs font-mono font-bold text-purple-900 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg self-start sm:self-auto shadow-2xs">
          Role: System Administrator
        </span>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-[#DED8CA] pb-2 overflow-x-auto">
        {[
          { id: 'TAX_RULES', label: 'Tax Rules & Engine Slabs', icon: 'gavel' },
          { id: 'CATEGORIES', label: 'Section 37 Categories', icon: 'category' },
          { id: 'USERS', label: 'Users & Roles (RBAC)', icon: 'group' },
          { id: 'AUDIT', label: 'Audit Trail Logs', icon: 'history' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              subTab === t.id
                ? 'bg-[#1B2430] text-[#F7F4EC] shadow-xs'
                : 'text-[#596579] hover:bg-[#FAF8F2] hover:text-[#1B2430]'
            }`}
          >
            <span className="material-symbols-outlined text-base">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* 1. Tax Rules & Engine Slabs */}
      {subTab === 'TAX_RULES' && (
        <div className="space-y-6">
          {/* Statutory Data-Driven Notice */}
          <div className="bg-[#FFFFFF] rounded-xl p-4 border border-[#DED8CA] border-l-4 border-l-[#1E3A8A] flex items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#1E3A8A] text-xl">tune</span>
              <div>
                <p className="text-xs font-bold text-[#1B2430]">Dynamic Rules Architecture</p>
                <p className="text-xs text-[#596579]">
                  Tax rates, slabs, deductions, and thresholds are NEVER hardcoded in code. They are stored as mutable policy objects so adjustments reflect immediately across all recalculations.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingRule(null);
                setRuleName('');
                setRuleFY('2024-25');
                setRuleMin('0');
                setRuleMax('');
                setRuleRate('25');
                setRuleErrors([]);
                setIsRuleModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B2430] hover:bg-[#283548] text-[#F7F4EC] text-xs font-semibold border border-[#1B2430] shadow-xs flex-shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>New Rule</span>
            </button>
          </div>

          {/* Overlap / Gap Warnings */}
          {ruleWarnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-1">
              <p className="font-semibold text-amber-900">Rule Validation Alert:</p>
              {ruleWarnings.map((w, i) => (
                <p key={i} className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs text-amber-700">warning</span>
                  <span>{w}</span>
                </p>
              ))}
            </div>
          )}

          {/* Tax Rules Table */}
          <div className="bg-[#FFFFFF] rounded-2xl p-6 border border-[#DED8CA] shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A]">
              Active Statutory Slabs Registry
            </h3>

            <div className="overflow-x-auto rounded-xl border border-[#DED8CA]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#DED8CA] bg-[#F3EFE6] text-[#4B5563] uppercase text-[11px] font-semibold">
                    <th className="py-3 px-4">Financial Year</th>
                    <th className="py-3 px-4">Slab Name</th>
                    <th className="py-3 px-4">Income Limits (₹)</th>
                    <th className="py-3 px-4 text-center">Rate (%)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE3] text-[#1B2430]">
                  {taxRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-[#FAF8F2] transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-[#1E3A8A]">FY {rule.financialYear}</td>
                      <td className="py-3 px-4 font-semibold text-[#1B2430]">{rule.slabName}</td>
                      <td className="py-3 px-4 font-mono text-[#596579]">
                        {formatINR(rule.incomeMin)} - {rule.incomeMax !== null ? formatINR(rule.incomeMax) : 'Infinity'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-[#1E3A8A]">
                        {rule.rate}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onToggleRuleActive(rule.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                            rule.isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-red-50 text-red-800 border-red-200'
                          }`}
                        >
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setRuleName(rule.slabName);
                            setRuleFY(rule.financialYear);
                            setRuleMin(rule.incomeMin.toString());
                            setRuleMax(rule.incomeMax !== null ? rule.incomeMax.toString() : '');
                            setRuleRate(rule.rate.toString());
                            setRuleErrors([]);
                            setIsRuleModalOpen(true);
                          }}
                          className="p-1 text-[#596579] hover:text-[#1B2430] cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Live Tax Engine Simulator */}
          <div className="bg-[#FFFFFF] rounded-2xl p-6 border border-[#DED8CA] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1B2430] font-headline">Interactive Tax Rule Simulator</h3>
                <p className="text-xs text-[#596579]">
                  Test tax engine outputs immediately on any sample net income with active rules
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 font-medium">
                Live Calculation Engine
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#596579] mb-1">
                  Sample Net Taxable Income (INR)
                </label>
                <input
                  type="number"
                  value={testIncome}
                  onChange={(e) => setTestIncome(e.target.value)}
                  className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs font-mono text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#596579] mb-1">
                  Simulate for Financial Year
                </label>
                <select
                  value={testFY}
                  onChange={(e) => setTestFY(e.target.value)}
                  className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
                >
                  <option value="2024-25">FY 2024-25</option>
                  <option value="2023-24">FY 2023-24</option>
                </select>
              </div>

              <div className="p-3 bg-[#FAF8F2] rounded-xl border border-[#DED8CA] flex flex-col justify-between">
                <span className="text-[11px] text-[#596579]">Simulated Tax Result:</span>
                <p className="text-lg font-bold font-mono text-[#1E3A8A]">
                  {formatINR(simulatedTax.taxAmount)}
                </p>
                <span className="text-[10px] text-[#596579] font-mono">
                  Effective Rate: {simulatedTax.effectiveRate}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Section 37 Categories */}
      {subTab === 'CATEGORIES' && (
        <div className="bg-[#FFFFFF] rounded-2xl p-6 border border-[#DED8CA] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#1B2430] font-headline">Section 37 Expense Categories</h3>
              <p className="text-xs text-[#596579]">
                Toggle whether an expenditure category is legally deductible for income tax calculation
              </p>
            </div>
            <button
              onClick={() => {
                setEditingCat(null);
                setCatName('');
                setCatDesc('');
                setCatAllowable(true);
                setIsCatModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B2430] hover:bg-[#283548] text-[#F7F4EC] text-xs font-semibold border border-[#1B2430] cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>New Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-[#FAF8F2] border border-[#DED8CA] flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color || '#1E3A8A' }}></span>
                    <span className="text-xs font-bold text-[#1B2430]">{c.name}</span>
                  </div>
                  <p className="text-xs text-[#596579] mt-1 leading-relaxed">{c.description}</p>
                  <div className="mt-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                        c.isAllowable
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}
                    >
                      {c.isAllowable ? 'Deductible (Allowable Sec 37)' : 'Disallowed (Non-deductible)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingCat(c);
                      setCatName(c.name);
                      setCatDesc(c.description);
                      setCatAllowable(c.isAllowable);
                      setIsCatModalOpen(true);
                    }}
                    className="p-1 text-[#596579] hover:text-[#1B2430] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button
                    onClick={() => onDeleteCategory(c.id)}
                    className="p-1 text-[#596579] hover:text-red-700 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Users & Roles (RBAC) */}
      {subTab === 'USERS' && (
        <div className="bg-[#FFFFFF] rounded-2xl p-6 border border-[#DED8CA] shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-[#1B2430] font-headline">User Directory & Role Based Access Control</h3>
          <div className="overflow-x-auto rounded-xl border border-[#DED8CA]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F3EFE6] text-[#4B5563] border-b border-[#DED8CA] font-semibold text-[11px]">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE3] text-[#1B2430]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FAF8F2]">
                    <td className="py-3 px-4 font-semibold text-[#1B2430] flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#E5DFD2] text-[#1B2430] font-bold text-[10px] flex items-center justify-center border border-[#C8BFAD]">
                        {u.avatarUrl || u.name.substring(0, 2)}
                      </div>
                      <span>{u.name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#596579]">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[#1E3A8A] font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${u.isActive ? 'text-emerald-800 bg-emerald-50 border border-emerald-200' : 'text-red-800 bg-red-50 border border-red-200'}`}>
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="text-xs text-[#1E3A8A] hover:underline font-medium cursor-pointer"
                      >
                        Modify Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Audit Trail Logs */}
      {subTab === 'AUDIT' && (
        <div className="bg-[#FFFFFF] rounded-2xl p-6 border border-[#DED8CA] shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#1B2430] font-headline">Immutable Audit Records</h3>
              <p className="text-xs text-[#596579]">Automated tamper-evident logging of all actions</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search audit trail..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#1B2430]"
              />
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#1B2430]"
              >
                <option value="ALL">All Actions</option>
                <option value="LOGIN">LOGIN</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="STATUS_CHANGE">STATUS_CHANGE</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#DED8CA]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F3EFE6] text-[#4B5563] border-b border-[#DED8CA] text-[11px] font-semibold">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Operator</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Target Entity</th>
                  <th className="py-2.5 px-4">Details</th>
                  <th className="py-2.5 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE3] text-[#1B2430]">
                {filteredAuditLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedAuditLog(log)}
                    className="hover:bg-[#FAF8F2] transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-mono text-[#596579]">{log.timestamp}</td>
                    <td className="py-2.5 px-4 font-medium text-[#1B2430]">{log.userName}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono text-[10px] bg-[#FAF8F2] text-[#1E3A8A] border border-[#DED8CA] px-1.5 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[#596579] font-mono">{log.entity}</td>
                    <td className="py-2.5 px-4 text-[#1B2430] truncate max-w-xs">{log.details}</td>
                    <td className="py-2.5 px-4 text-[#596579] font-mono">{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tax Rule Add/Edit Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B2430]/50 backdrop-blur-none text-[#1B2430]">
          <div className="bg-[#FFFFFF] rounded-2xl p-6 max-w-md w-full border border-[#DED8CA] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#1B2430] font-headline">
              {editingRule ? 'Edit Tax Rule Policy' : 'Create Tax Rule'}
            </h3>

            {ruleErrors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-800 rounded-lg space-y-1">
                {ruleErrors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}

            <form onSubmit={handleRuleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#596579] mb-1">Slab Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Corporate Tax Bracket"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#596579] mb-1">Financial Year</label>
                  <select
                    value={ruleFY}
                    onChange={(e) => setRuleFY(e.target.value)}
                    className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
                  >
                    <option value="2024-25">2024-25</option>
                    <option value="2023-24">2023-24</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#596579] mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={ruleRate}
                    onChange={(e) => setRuleRate(e.target.value)}
                    className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs font-mono text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#596579] mb-1">Income Min (₹)</label>
                  <input
                    type="number"
                    required
                    value={ruleMin}
                    onChange={(e) => setRuleMin(e.target.value)}
                    className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs font-mono text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#596579] mb-1">Income Max (₹, blank = ∞)</label>
                  <input
                    type="number"
                    placeholder="Leave empty for ∞"
                    value={ruleMax}
                    onChange={(e) => setRuleMax(e.target.value)}
                    className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs font-mono text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#DED8CA]">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#596579] hover:text-[#1B2430] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1B2430] hover:bg-[#283548] text-[#F7F4EC] font-bold text-xs rounded-lg border border-[#1B2430] shadow-xs cursor-pointer"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B2430]/50 backdrop-blur-none text-[#1B2430]">
          <div className="bg-[#FFFFFF] rounded-2xl p-6 max-w-md w-full border border-[#DED8CA] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#1B2430] font-headline">
              {editingCat ? 'Edit Expense Category' : 'New Expense Category'}
            </h3>
            <form onSubmit={handleCatSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#596579] mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#596579] mb-1">Description / Legal Basis</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cat-allow"
                  checked={catAllowable}
                  onChange={(e) => setCatAllowable(e.target.checked)}
                  className="rounded border-[#DED8CA] text-[#1B2430]"
                />
                <label htmlFor="cat-allow" className="text-xs text-[#1B2430] font-medium">
                  Allowable under Section 37 (Deductible for business tax)
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-[#DED8CA]">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#596579] hover:text-[#1B2430] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1B2430] hover:bg-[#283548] text-[#F7F4EC] font-bold text-xs rounded-lg border border-[#1B2430] shadow-xs cursor-pointer"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B2430]/50 backdrop-blur-none text-[#1B2430]">
          <div className="bg-[#FFFFFF] rounded-2xl p-6 max-w-sm w-full border border-[#DED8CA] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#1B2430] font-headline">Modify User Access</h3>
            <p className="text-xs text-[#596579]">
              Editing credentials & role permissions for <strong>{editingUser.name}</strong>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#596579] mb-1">Assign Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, role: e.target.value as UserRole })
                  }
                  className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
                >
                  <option value="OWNER">Business Owner</option>
                  <option value="ACCOUNTANT">Accountant / Chartered Accountant</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="user-active"
                  checked={editingUser.isActive}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, isActive: e.target.checked })
                  }
                  className="rounded border-[#DED8CA] text-[#1B2430]"
                />
                <label htmlFor="user-active" className="text-xs text-[#1B2430]">
                  Active Access Authorized
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#DED8CA]">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-3.5 py-1.5 rounded-lg bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#596579] hover:text-[#1B2430] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onUpdateUser(editingUser);
                  setEditingUser(null);
                }}
                className="px-4 py-1.5 bg-[#1B2430] hover:bg-[#283548] text-[#F7F4EC] font-bold text-xs rounded-lg border border-[#1B2430] shadow-xs cursor-pointer"
              >
                Save User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Detail Drawer */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B2430]/50 backdrop-blur-none text-[#1B2430]">
          <div className="bg-[#FFFFFF] rounded-2xl p-6 max-w-lg w-full border border-[#DED8CA] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DED8CA] pb-3">
              <span className="text-xs font-mono font-bold text-[#1E3A8A]">
                Audit Record #{selectedAuditLog.id}
              </span>
              <button onClick={() => setSelectedAuditLog(null)} className="text-[#596579] hover:text-[#1B2430] cursor-pointer">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p><strong>Actor:</strong> {selectedAuditLog.userName} ({selectedAuditLog.userId})</p>
              <p><strong>Timestamp:</strong> {selectedAuditLog.timestamp}</p>
              <p><strong>IP Address:</strong> {selectedAuditLog.ip}</p>
              <p><strong>Entity Type:</strong> {selectedAuditLog.entity} (ID: {selectedAuditLog.entityId})</p>
              <p><strong>Action:</strong> {selectedAuditLog.action}</p>
              <p className="bg-[#FAF8F2] p-3 rounded-lg border border-[#DED8CA] text-[#1B2430]">
                {selectedAuditLog.details}
              </p>
              {selectedAuditLog.oldValue && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-2 bg-red-50 rounded border border-red-200 text-red-800">
                    <span className="text-[10px] text-red-700 font-bold block">Previous Value:</span>
                    <span>{selectedAuditLog.oldValue}</span>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-800">
                    <span className="text-[10px] text-emerald-700 font-bold block">Updated Value:</span>
                    <span>{selectedAuditLog.newValue}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="text-right pt-2 border-t border-[#DED8CA]">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-4 py-1.5 rounded-lg bg-[#1B2430] hover:bg-[#283548] text-[#F7F4EC] text-xs font-semibold border border-[#1B2430] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
