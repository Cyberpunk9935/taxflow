import React, { useState, useMemo } from 'react';
import { Business } from '../types';
import { formatINR } from '../core/decimal';

interface ScenarioSimulatorPageProps {
  business: Business;
  actualGrossIncome: number;
  actualExpenses: number;
  financialYear: string;
}

export const ScenarioSimulatorPage: React.FC<ScenarioSimulatorPageProps> = ({
  business,
  actualGrossIncome,
  actualExpenses,
  financialYear,
}) => {
  // Scenario simulation state (initialized with current actuals or sensible defaults)
  const [projectedRevenue, setProjectedRevenue] = useState<number>(() => Math.max(actualGrossIncome, 6000000));
  const [operatingExpenses, setOperatingExpenses] = useState<number>(() => Math.max(actualExpenses, 2500000));

  // Capital asset additions for Section 32 depreciation
  const [computerHardware, setComputerHardware] = useState<number>(400000); // 40% depreciation
  const [plantMachinery, setPlantMachinery] = useState<number>(250000); // 15% depreciation
  const [officeFurniture, setOfficeFurniture] = useState<number>(100000); // 10% depreciation

  // Chapter VI-A Deductions (Permitted under Old Regime, disallowed under New Regime 115BAA/BAC)
  const [deduction80C, setDeduction80C] = useState<number>(150000); // Max 1.5L
  const [deduction80D, setDeduction80D] = useState<number>(50000); // Mediclaim
  const [deduction80G, setDeduction80G] = useState<number>(25000); // Donations
  const [deduction80JJAA, setDeduction80JJAA] = useState<number>(120000); // 30% of new employee wages

  const isCompany = business.type === 'Private Limited';
  const isLLP = business.type === 'LLP' || business.type === 'Partnership';

  // Section 32 Depreciation Calculation
  const totalDepreciation = useMemo(() => {
    const compDep = computerHardware * 0.40;
    const plantDep = plantMachinery * 0.15;
    const furnDep = officeFurniture * 0.10;
    return compDep + plantDep + furnDep;
  }, [computerHardware, plantMachinery, officeFurniture]);

  // Total Chapter VI-A Deductions
  const totalChapterVIA = useMemo(() => {
    return Math.min(150000, deduction80C) + deduction80D + deduction80G + deduction80JJAA;
  }, [deduction80C, deduction80D, deduction80G, deduction80JJAA]);

  // Gross Profit before deductions & tax
  const grossProfit = Math.max(0, projectedRevenue - operatingExpenses);

  // Computations for Old Regime vs New Regime
  const comparison = useMemo(() => {
    // 1. OLD REGIME COMPUTATION
    const oldTaxableProfit = Math.max(0, grossProfit - totalDepreciation - totalChapterVIA);
    let oldBaseTax = 0;
    let oldSurcharge = 0;

    if (isCompany) {
      // 25% for companies with turnover < 400 Cr
      oldBaseTax = oldTaxableProfit * 0.25;
      if (oldTaxableProfit > 10000000 && oldTaxableProfit <= 100000000) {
        oldSurcharge = oldBaseTax * 0.07;
      } else if (oldTaxableProfit > 100000000) {
        oldSurcharge = oldBaseTax * 0.12;
      }
    } else if (isLLP) {
      // 30% flat for LLPs & Partnerships
      oldBaseTax = oldTaxableProfit * 0.30;
      if (oldTaxableProfit > 10000000) {
        oldSurcharge = oldBaseTax * 0.12;
      }
    } else {
      // Proprietorship / Individual Old Slabs (0-2.5L Nil, 2.5-5L 5%, 5-10L 20%, >10L 30%)
      if (oldTaxableProfit > 1000000) {
        oldBaseTax = 112500 + (oldTaxableProfit - 1000000) * 0.30;
      } else if (oldTaxableProfit > 500000) {
        oldBaseTax = 12500 + (oldTaxableProfit - 500000) * 0.20;
      } else if (oldTaxableProfit > 250000) {
        oldBaseTax = (oldTaxableProfit - 250000) * 0.05;
      }
    }

    const oldCess = (oldBaseTax + oldSurcharge) * 0.04;
    const oldTotalTax = Math.round(oldBaseTax + oldSurcharge + oldCess);
    const oldEffectiveRate = grossProfit > 0 ? (oldTotalTax / grossProfit) * 100 : 0;

    // 2. NEW REGIME COMPUTATION
    // Note: Chapter VI-A deductions (except 80JJAA in some contexts) are disallowed. Normal depreciation allowed, additional disallowed.
    const newTaxableProfit = Math.max(0, grossProfit - totalDepreciation);
    let newBaseTax = 0;
    let newSurcharge = 0;

    if (isCompany) {
      // Section 115BAA: 22% flat rate + mandatory 10% surcharge + 4% cess = 25.168% effective
      newBaseTax = newTaxableProfit * 0.22;
      newSurcharge = newBaseTax * 0.10;
    } else if (isLLP) {
      // LLPs currently pay 30% base in either regime, but AMT rules differ
      newBaseTax = newTaxableProfit * 0.30;
      if (newTaxableProfit > 10000000) {
        newSurcharge = newBaseTax * 0.12;
      }
    } else {
      // Individual / Proprietorship New Regime (Section 115BAC) slabs:
      // 0-3L: Nil, 3-7L: 5%, 7-10L: 10%, 10-12L: 15%, 12-15L: 20%, >15L: 30%
      // With Standard deduction ₹75,000
      const netAfterStd = Math.max(0, newTaxableProfit - 75000);
      if (netAfterStd > 1500000) {
        newBaseTax = 140000 + (netAfterStd - 1500000) * 0.30;
      } else if (netAfterStd > 1200000) {
        newBaseTax = 95000 + (netAfterStd - 1200000) * 0.20;
      } else if (netAfterStd > 1000000) {
        newBaseTax = 65000 + (netAfterStd - 1000000) * 0.15;
      } else if (netAfterStd > 700000) {
        newBaseTax = 35000 + (netAfterStd - 700000) * 0.10;
      } else if (netAfterStd > 300000) {
        newBaseTax = (netAfterStd - 300000) * 0.05;
      }
      // Section 87A rebate if income <= 7L
      if (netAfterStd <= 700000) {
        newBaseTax = 0;
      }
    }

    const newCess = (newBaseTax + newSurcharge) * 0.04;
    const newTotalTax = Math.round(newBaseTax + newSurcharge + newCess);
    const newEffectiveRate = grossProfit > 0 ? (newTotalTax / grossProfit) * 100 : 0;

    // Difference
    const diff = oldTotalTax - newTotalTax;
    const recommended = diff > 0 ? 'NEW' : 'OLD';
    const savings = Math.abs(diff);

    // Break-even deduction calculation:
    // How much total deductions would make Old Regime equal or better than New Regime?
    let breakEvenDeduction = 0;
    if (isCompany) {
      // 26% (old) * (Profit - Deductions) = 25.168% * Profit
      // Profit - Deductions = (25.168 / 26) * Profit -> Deductions = Profit * (1 - 25.168/26) ~ 3.2%
      breakEvenDeduction = Math.round(grossProfit * 0.032);
    } else {
      // Individual / Proprietor estimation
      breakEvenDeduction = Math.max(375000, Math.round(grossProfit * 0.08));
    }

    return {
      oldTaxableProfit,
      oldTotalTax,
      oldEffectiveRate,
      newTaxableProfit,
      newTotalTax,
      newEffectiveRate,
      recommended,
      savings,
      breakEvenDeduction,
    };
  }, [grossProfit, totalDepreciation, totalChapterVIA, isCompany, isLLP]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white font-headline">What-If Tax Scenario Simulator</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Regime Optimizer & Sec 32
            </span>
          </div>
          <p className="text-xs text-[#a0b4c4] mt-0.5">
            Model projected annual turnover, capital asset depreciation, and evaluate Old vs New Regime break-even
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setProjectedRevenue(actualGrossIncome || 6000000);
              setOperatingExpenses(actualExpenses || 2500000);
              setComputerHardware(400000);
              setPlantMachinery(250000);
              setOfficeFurniture(100000);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#141c2e] hover:bg-[#1a2438] text-xs text-[#a0b4c4] hover:text-white border border-white/5 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            <span>Reset to Actuals</span>
          </button>
        </div>
      </div>

      {/* Recommended Regime Banner */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl ${
          comparison.recommended === 'NEW'
            ? 'bg-gradient-to-r from-sky-950/40 via-[#0e2c4d]/50 to-emerald-950/30 border-[#7dd3fc]/40'
            : 'bg-gradient-to-r from-purple-950/40 via-[#271542]/50 to-indigo-950/30 border-purple-500/40'
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              comparison.recommended === 'NEW'
                ? 'bg-sky-500/20 border-[#7dd3fc]/40 text-[#7dd3fc]'
                : 'bg-purple-500/20 border-purple-500/40 text-purple-300'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">
              {comparison.recommended === 'NEW' ? 'bolt' : 'savings'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider font-bold text-white/70">
                Optimization Verdict
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  comparison.recommended === 'NEW'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                }`}
              >
                RECOMMENDED: {comparison.recommended === 'NEW' ? 'NEW TAX REGIME (Sec 115BAA/BAC)' : 'OLD TAX REGIME'}
              </span>
            </div>
            <div className="text-base font-bold text-white mt-1">
              Estimated Tax Savings: <span className="text-emerald-400 font-mono">{formatINR(comparison.savings)}</span>
            </div>
            <p className="text-xs text-[#a0b4c4] mt-0.5">
              Break-Even Point: You need at least{' '}
              <strong className="text-white font-mono">{formatINR(comparison.breakEvenDeduction)}</strong> in total
              deductions & exemptions for the Old Regime to outperform the New Regime.
            </p>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
          <span className="text-[11px] text-[#a0b4c4]">Effective Tax Rate</span>
          <span className="text-xl font-bold font-mono text-white mt-0.5">
            {comparison.recommended === 'NEW'
              ? `${comparison.newEffectiveRate.toFixed(2)}%`
              : `${comparison.oldEffectiveRate.toFixed(2)}%`}
          </span>
        </div>
      </div>

      {/* Main Grid: Inputs on Left, Comparison on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Simulation Sliders (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Revenue & Operating Outflow Card */}
          <div className="glacier-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#7dd3fc]">trending_up</span>
                <h3 className="text-sm font-bold text-white font-headline">Operating Revenue & Expenses</h3>
              </div>
              <span className="text-xs text-[#a0b4c4] font-mono">Gross Profit: {formatINR(grossProfit)}</span>
            </div>

            {/* Projected Revenue */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#a0b4c4]">Projected Annual Revenue:</span>
                <span className="text-white font-mono font-bold">{formatINR(projectedRevenue)}</span>
              </div>
              <input
                type="range"
                min="1000000"
                max="25000000"
                step="250000"
                value={projectedRevenue}
                onChange={(e) => setProjectedRevenue(parseFloat(e.target.value))}
                className="w-full accent-[#7dd3fc] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#a0b4c4]/60 font-mono mt-1">
                <span>₹10 Lakhs</span>
                <span>₹1.25 Cr</span>
                <span>₹2.50 Cr</span>
              </div>
            </div>

            {/* Operating Expenses */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#a0b4c4]">Estimated Operating Expenses:</span>
                <span className="text-white font-mono font-bold">{formatINR(operatingExpenses)}</span>
              </div>
              <input
                type="range"
                min="500000"
                max="15000000"
                step="200000"
                value={operatingExpenses}
                onChange={(e) => setOperatingExpenses(parseFloat(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#a0b4c4]/60 font-mono mt-1">
                <span>₹5 Lakhs</span>
                <span>₹75 Lakhs</span>
                <span>₹1.50 Cr</span>
              </div>
            </div>
          </div>

          {/* Section 32 Capital Depreciation Investments */}
          <div className="glacier-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-sky-400">devices</span>
                <h3 className="text-sm font-bold text-white font-headline">Capital Investments (Section 32 WDV)</h3>
              </div>
              <span className="text-xs text-emerald-400 font-mono font-bold">
                Total Depreciation: {formatINR(totalDepreciation)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#a0b4c4] mb-1">Computers & Laptops (40%)</label>
                <input
                  type="number"
                  value={computerHardware}
                  onChange={(e) => setComputerHardware(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#7dd3fc]"
                />
                <span className="text-[10px] text-emerald-400/80 mt-1 block font-mono">
                  Dep: {formatINR(computerHardware * 0.4)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-[#a0b4c4] mb-1">Plant & Machinery (15%)</label>
                <input
                  type="number"
                  value={plantMachinery}
                  onChange={(e) => setPlantMachinery(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#7dd3fc]"
                />
                <span className="text-[10px] text-emerald-400/80 mt-1 block font-mono">
                  Dep: {formatINR(plantMachinery * 0.15)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-[#a0b4c4] mb-1">Office Furniture (10%)</label>
                <input
                  type="number"
                  value={officeFurniture}
                  onChange={(e) => setOfficeFurniture(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#7dd3fc]"
                />
                <span className="text-[10px] text-emerald-400/80 mt-1 block font-mono">
                  Dep: {formatINR(officeFurniture * 0.1)}
                </span>
              </div>
            </div>
          </div>

          {/* Chapter VI-A Deductions Card (For Old Regime) */}
          <div className="glacier-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-amber-400">price_check</span>
                <h3 className="text-sm font-bold text-white font-headline">Chapter VI-A Deductions (Old Regime Only)</h3>
              </div>
              <span className="text-xs text-[#a0b4c4] font-mono">Total: {formatINR(totalChapterVIA)}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-[#a0b4c4] mb-1">Sec 80C (Max 1.5L)</label>
                <input
                  type="number"
                  value={deduction80C}
                  onChange={(e) => setDeduction80C(Math.min(150000, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#7dd3fc]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#a0b4c4] mb-1">Sec 80D (Health)</label>
                <input
                  type="number"
                  value={deduction80D}
                  onChange={(e) => setDeduction80D(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#7dd3fc]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#a0b4c4] mb-1">Sec 80G (Charity)</label>
                <input
                  type="number"
                  value={deduction80G}
                  onChange={(e) => setDeduction80G(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#7dd3fc]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#a0b4c4] mb-1">Sec 80JJAA (Jobs)</label>
                <input
                  type="number"
                  value={deduction80JJAA}
                  onChange={(e) => setDeduction80JJAA(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#7dd3fc]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Comparative Side-by-Side Analysis (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glacier-card p-5 rounded-2xl border border-white/10 shadow-xl space-y-5">
            <h3 className="text-base font-bold text-white font-headline">Side-by-Side Regime Comparison</h3>

            {/* Comparison Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Old Regime Card */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  comparison.recommended === 'OLD'
                    ? 'bg-purple-950/30 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                    : 'bg-[#141c2e]/60 border-white/5 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Old Regime</span>
                  {comparison.recommended === 'OLD' && (
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded font-mono font-bold">
                      BEST
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#a0b4c4]">Tax Payable:</div>
                <div className="text-base font-black font-mono text-white mt-0.5">
                  {formatINR(comparison.oldTotalTax)}
                </div>
                <div className="text-[10px] text-[#a0b4c4] mt-2 space-y-0.5 border-t border-white/5 pt-2">
                  <div>Deductions: {formatINR(totalChapterVIA + totalDepreciation)}</div>
                  <div>Taxable: {formatINR(comparison.oldTaxableProfit)}</div>
                  <div>Eff. Rate: {comparison.oldEffectiveRate.toFixed(2)}%</div>
                </div>
              </div>

              {/* New Regime Card */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  comparison.recommended === 'NEW'
                    ? 'bg-sky-950/30 border-[#7dd3fc]/50 shadow-[0_0_15px_rgba(125,211,252,0.2)]'
                    : 'bg-[#141c2e]/60 border-white/5 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">New Regime</span>
                  {comparison.recommended === 'NEW' && (
                    <span className="text-[9px] bg-sky-500/20 text-[#7dd3fc] border border-sky-500/40 px-1.5 py-0.5 rounded font-mono font-bold">
                      BEST
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#a0b4c4]">Tax Payable:</div>
                <div className="text-base font-black font-mono text-emerald-400 mt-0.5">
                  {formatINR(comparison.newTotalTax)}
                </div>
                <div className="text-[10px] text-[#a0b4c4] mt-2 space-y-0.5 border-t border-white/5 pt-2">
                  <div>Depreciation: {formatINR(totalDepreciation)}</div>
                  <div>Taxable: {formatINR(comparison.newTaxableProfit)}</div>
                  <div>Eff. Rate: {comparison.newEffectiveRate.toFixed(2)}%</div>
                </div>
              </div>
            </div>

            {/* Visual Bar Comparison */}
            <div>
              <div className="flex justify-between text-xs text-[#a0b4c4] mb-1 font-mono">
                <span>Tax Outflow Ratio</span>
                <span>
                  Old: {formatINR(comparison.oldTotalTax)} vs New: {formatINR(comparison.newTotalTax)}
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-[#141c2e] overflow-hidden flex border border-white/5">
                <div
                  className="bg-purple-500 h-full transition-all duration-300"
                  style={{
                    width: `${
                      (comparison.oldTotalTax / ((comparison.oldTotalTax + comparison.newTotalTax) || 1)) * 100
                    }%`,
                  }}
                  title="Old Regime Outflow"
                ></div>
                <div
                  className="bg-[#7dd3fc] h-full transition-all duration-300"
                  style={{
                    width: `${
                      (comparison.newTotalTax / ((comparison.oldTotalTax + comparison.newTotalTax) || 1)) * 100
                    }%`,
                  }}
                  title="New Regime Outflow"
                ></div>
              </div>
            </div>

            {/* Key Advantages Summary */}
            <div className="space-y-2 pt-2 border-t border-white/5 text-xs">
              <div className="font-semibold text-white">Key Takeaways for {business.type}:</div>
              <ul className="space-y-1.5 text-[11px] text-[#a0b4c4] list-disc list-inside">
                <li>
                  {isCompany
                    ? 'Corporate Sec 115BAA fixes rate at 22% (+10% surcharge & cess = 25.17%), with zero MAT (Minimum Alternate Tax).'
                    : 'Proprietor Sec 115BAC offers lower slab tax rates with ₹75k standard deduction and exemption up to ₹7 Lakhs.'}
                </li>
                <li>
                  Total Section 32 capital depreciation savings this year:{' '}
                  <strong className="text-white font-mono">{formatINR(totalDepreciation * 0.25)}</strong> in direct tax relief.
                </li>
                <li>
                  {comparison.recommended === 'NEW'
                    ? `Switching to New Regime saves ${formatINR(comparison.savings)} because current Chapter VI-A deductions are below the break-even threshold.`
                    : `Old Regime is optimal because high deductions (₹${totalChapterVIA.toLocaleString('en-IN')}) reduce taxable profits more than the rate difference.`}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
