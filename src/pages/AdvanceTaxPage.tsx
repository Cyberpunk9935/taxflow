import React, { useState, useMemo } from 'react';
import { Business, AdvanceTaxInstallment, Challan280Data } from '../types';
import { formatINR } from '../core/decimal';

interface AdvanceTaxPageProps {
  business: Business;
  taxableIncome: number;
  computedTaxLiability: number;
  financialYear: string;
}

export const AdvanceTaxPage: React.FC<AdvanceTaxPageProps> = ({
  business,
  taxableIncome,
  computedTaxLiability,
  financialYear,
}) => {
  // Allow user to toggle between using actual computed liability from books or custom estimated tax
  const [useActualComputed, setUseActualComputed] = useState(true);
  const [customEstimatedTax, setCustomEstimatedTax] = useState<number>(computedTaxLiability || 250000);

  const estimatedTax = useActualComputed ? computedTaxLiability : customEstimatedTax;

  // Payments made in each quarter (editable)
  const [q1Paid, setQ1Paid] = useState<number>(() => Math.round(estimatedTax * 0.15));
  const [q2Paid, setQ2Paid] = useState<number>(() => Math.round(estimatedTax * 0.30));
  const [q3Paid, setQ3Paid] = useState<number>(() => Math.round(estimatedTax * 0.20));
  const [q4Paid, setQ4Paid] = useState<number>(() => 0); // Q4 pending

  // Challan Generator modal / preview state
  const [selectedChallanQuarter, setSelectedChallanQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q4');
  const [showChallanModal, setShowChallanModal] = useState(false);
  const [bankName, setBankName] = useState('HDFC Bank Ltd');
  const [bsrCode, setBsrCode] = useState('0210452');
  const [challanCopied, setChallanCopied] = useState(false);

  // Derive Assessment Year from FY (e.g., FY 2024-25 -> AY 2025-26)
  const assessmentYear = useMemo(() => {
    const [startYearStr, endYearStr] = financialYear.split('-');
    const startYear = parseInt(startYearStr, 10);
    return `${startYear + 1}-${(parseInt(endYearStr, 10) + 1).toString().padStart(2, '0')}`;
  }, [financialYear]);

  // Mandatory check: Sec 208 specifies advance tax is payable if tax liability >= 10,000
  const isAdvanceTaxApplicable = estimatedTax >= 10000;

  // Calculate 4 Installments & Section 234C Interest
  const installments = useMemo<AdvanceTaxInstallment[]>(() => {
    const q1Due = Math.round(estimatedTax * 0.15);
    const q2Due = Math.round(estimatedTax * 0.45);
    const q3Due = Math.round(estimatedTax * 0.75);
    const q4Due = Math.round(estimatedTax * 1.0);

    const q1CumPaid = q1Paid;
    const q2CumPaid = q1Paid + q2Paid;
    const q3CumPaid = q1Paid + q2Paid + q3Paid;
    const q4CumPaid = q1Paid + q2Paid + q3Paid + q4Paid;

    // Section 234C Deferment Interest rules:
    // Q1: Shortfall if cumulative paid < 12% (safe harbor threshold). 1% per month for 3 months.
    const q1Shortfall = Math.max(0, q1Due - q1CumPaid);
    const q1Interest = q1CumPaid < estimatedTax * 0.12 ? Math.round(q1Shortfall * 0.01 * 3) : 0;

    // Q2: Shortfall if cumulative paid < 36% (safe harbor threshold). 1% per month for 3 months.
    const q2Shortfall = Math.max(0, q2Due - q2CumPaid);
    const q2Interest = q2CumPaid < estimatedTax * 0.36 ? Math.round(q2Shortfall * 0.01 * 3) : 0;

    // Q3: Shortfall if cumulative paid < 75%. 1% per month for 3 months.
    const q3Shortfall = Math.max(0, q3Due - q3CumPaid);
    const q3Interest = q3CumPaid < q3Due ? Math.round(q3Shortfall * 0.01 * 3) : 0;

    // Q4: Shortfall if cumulative paid < 100%. 1% per month for 1 month.
    const q4Shortfall = Math.max(0, q4Due - q4CumPaid);
    const q4Interest = q4CumPaid < q4Due ? Math.round(q4Shortfall * 0.01 * 1) : 0;

    return [
      {
        quarter: 'Q1',
        dueDate: '15 June',
        statutoryPercent: 15,
        cumulativeTaxDue: q1Due,
        quarterlyTaxDue: q1Due,
        amountPaid: q1Paid,
        shortfall: q1Shortfall,
        interest234C: q1Interest,
        status: q1CumPaid >= q1Due ? 'PAID' : q1CumPaid > 0 ? 'PARTIAL' : 'OVERDUE',
      },
      {
        quarter: 'Q2',
        dueDate: '15 September',
        statutoryPercent: 45,
        cumulativeTaxDue: q2Due,
        quarterlyTaxDue: q2Due - q1Due,
        amountPaid: q2Paid,
        shortfall: q2Shortfall,
        interest234C: q2Interest,
        status: q2CumPaid >= q2Due ? 'PAID' : q2CumPaid > 0 ? 'PARTIAL' : 'OVERDUE',
      },
      {
        quarter: 'Q3',
        dueDate: '15 December',
        statutoryPercent: 75,
        cumulativeTaxDue: q3Due,
        quarterlyTaxDue: q3Due - q2Due,
        amountPaid: q3Paid,
        shortfall: q3Shortfall,
        interest234C: q3Interest,
        status: q3CumPaid >= q3Due ? 'PAID' : q3CumPaid > 0 ? 'PARTIAL' : 'OVERDUE',
      },
      {
        quarter: 'Q4',
        dueDate: '15 March',
        statutoryPercent: 100,
        cumulativeTaxDue: q4Due,
        quarterlyTaxDue: q4Due - q3Due,
        amountPaid: q4Paid,
        shortfall: q4Shortfall,
        interest234C: q4Interest,
        status: q4CumPaid >= q4Due ? 'PAID' : q4CumPaid > 0 ? 'PARTIAL' : 'UPCOMING',
      },
    ];
  }, [estimatedTax, q1Paid, q2Paid, q3Paid, q4Paid]);

  const totalPaid = q1Paid + q2Paid + q3Paid + q4Paid;
  const total234CInterest = installments.reduce((acc, curr) => acc + curr.interest234C, 0);

  // Section 234B Shortfall Interest (Applies if total advance tax paid before 31st March is < 90% of assessed tax)
  const is234BApplicable = totalPaid < estimatedTax * 0.9;
  const shortfall234B = is234BApplicable ? Math.max(0, estimatedTax - totalPaid) : 0;
  // Estimated for 3 months from April 1 of AY
  const estimated234BInterest = is234BApplicable ? Math.round(shortfall234B * 0.01 * 3) : 0;

  const totalTaxPayableNow = Math.max(0, estimatedTax - totalPaid) + total234CInterest + estimated234BInterest;

  // Selected Challan Data
  const challanData = useMemo<Challan280Data>(() => {
    const isCompany = business.type === 'Private Limited';
    const qInstallment = installments.find((i) => i.quarter === selectedChallanQuarter);
    const taxToPay = qInstallment ? qInstallment.shortfall || qInstallment.quarterlyTaxDue : 50000;

    // Surcharge and Cess breakdowns
    const cess = Math.round(taxToPay * 0.04);
    const basicTax = taxToPay - cess;

    return {
      panNumber: business.panNumber,
      taxpayerName: business.name,
      assessmentYear,
      financialYear,
      majorHead: isCompany ? '0020' : '0021',
      minorHead: '100', // 100 = Advance Tax
      bankName,
      bsrCode,
      challanNo: 'CHL-' + Math.floor(100000 + Math.random() * 900000),
      tenderDate: new Date().toISOString().substring(0, 10),
      basicTax,
      surcharge: 0,
      cess,
      interest234B: selectedChallanQuarter === 'Q4' ? estimated234BInterest : 0,
      interest234C: qInstallment ? qInstallment.interest234C : 0,
      penaltyFee: 0,
      totalAmount: taxToPay + (qInstallment?.interest234C || 0) + (selectedChallanQuarter === 'Q4' ? estimated234BInterest : 0),
    };
  }, [
    business,
    assessmentYear,
    financialYear,
    selectedChallanQuarter,
    installments,
    bankName,
    bsrCode,
    estimated234BInterest,
  ]);

  const handlePrintChallan = () => {
    window.print();
  };

  const handleCopyChallan = () => {
    const text = `INCOME TAX ADVANCE CHALLAN ITNS 280
PAN: ${challanData.panNumber}
Taxpayer: ${challanData.taxpayerName}
Assessment Year: ${challanData.assessmentYear} (FY ${challanData.financialYear})
Major Head: ${challanData.majorHead === '0020' ? '0020 (Company)' : '0021 (Non-Company)'}
Minor Head: 100 (Advance Tax)
Quarter: ${selectedChallanQuarter}
Basic Income Tax: ₹${challanData.basicTax.toLocaleString('en-IN')}
Health & Ed Cess (4%): ₹${challanData.cess.toLocaleString('en-IN')}
Sec 234C Interest: ₹${challanData.interest234C.toLocaleString('en-IN')}
Sec 234B Interest: ₹${challanData.interest234B.toLocaleString('en-IN')}
Total Amount Payable: ₹${challanData.totalAmount.toLocaleString('en-IN')}
Bank / BSR: ${challanData.bankName} (${challanData.bsrCode})`;

    navigator.clipboard.writeText(text);
    setChallanCopied(true);
    setTimeout(() => setChallanCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white font-headline">Advance Tax & Section 234B/C Calculator</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-sky-500/10 text-[#7dd3fc] border border-sky-500/20">
              Sec 208 • Sec 234B • Sec 234C
            </span>
          </div>
          <p className="text-xs text-[#a0b4c4] mt-0.5">
            Quarterly statutory schedule, deferment penalty calculation, and ITNS 280 challan generation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowChallanModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0e4d6e] to-[#0284c7] hover:from-[#0369a1] hover:to-[#38bdf8] text-white font-bold text-xs rounded-xl border border-[#7dd3fc]/40 shadow-[0_0_20px_rgba(125,211,252,0.2)] transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-base">receipt</span>
            <span>Generate Challan ITNS 280</span>
          </button>
        </div>
      </div>

      {/* Statutory Applicability Alert */}
      {!isAdvanceTaxApplicable ? (
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-3">
          <span className="material-symbols-outlined text-xl text-emerald-400">check_circle</span>
          <span>
            <strong>Advance Tax Not Mandatory:</strong> Net estimated tax liability is under ₹10,000 threshold for FY{' '}
            {financialYear}. No interest penalties under Section 234B or 234C will apply.
          </span>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-[#0e2238]/60 border border-[#7dd3fc]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl text-[#7dd3fc] mt-0.5">info</span>
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider">
                Statutory Advance Tax Mandate (Section 208)
              </div>
              <p className="text-xs text-[#a0b4c4] mt-0.5">
                Every assessee whose estimated tax liability exceeds ₹10,000 must pay tax in four specified installments
                (June 15, Sept 15, Dec 15, March 15).
              </p>
            </div>
          </div>

          {/* Actual vs Custom Tax Toggle */}
          <div className="flex items-center gap-2 shrink-0 bg-[#0a101d] p-1.5 rounded-xl border border-white/5">
            <button
              onClick={() => setUseActualComputed(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                useActualComputed ? 'bg-[#0e4d6e] text-white shadow' : 'text-[#a0b4c4] hover:text-white'
              }`}
            >
              Use Books Liability ({formatINR(computedTaxLiability)})
            </button>
            <button
              onClick={() => setUseActualComputed(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !useActualComputed ? 'bg-[#0e4d6e] text-white shadow' : 'text-[#a0b4c4] hover:text-white'
              }`}
            >
              Custom Estimate
            </button>
          </div>
        </div>
      )}

      {/* Custom Tax input if selected */}
      {!useActualComputed && (
        <div className="glacier-card p-4 rounded-xl flex items-center justify-between gap-4">
          <span className="text-xs text-[#a0b4c4]">Estimated Annual Net Tax Liability (INR):</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#7dd3fc]">₹</span>
            <input
              type="number"
              value={customEstimatedTax}
              onChange={(e) => setCustomEstimatedTax(Math.max(0, parseInt(e.target.value) || 0))}
              className="bg-[#141c2e] border border-[#7dd3fc]/30 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold w-48 text-right focus:outline-none focus:border-[#7dd3fc]"
            />
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="glacier-card p-4 rounded-xl">
          <span className="text-[11px] text-[#a0b4c4] uppercase tracking-wider font-semibold">Total Assessed Tax</span>
          <div className="text-xl font-bold font-mono text-white mt-1">{formatINR(estimatedTax)}</div>
          <span className="text-[10px] text-[#a0b4c4]/70 mt-1 block">FY {financialYear} • AY {assessmentYear}</span>
        </div>

        <div className="glacier-card p-4 rounded-xl border-emerald-500/20">
          <span className="text-[11px] text-emerald-400 uppercase tracking-wider font-semibold">Advance Tax Paid</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{formatINR(totalPaid)}</div>
          <span className="text-[10px] text-emerald-300/70 mt-1 block">
            {((totalPaid / (estimatedTax || 1)) * 100).toFixed(1)}% of total liability
          </span>
        </div>

        <div className="glacier-card p-4 rounded-xl border-rose-500/20">
          <span className="text-[11px] text-rose-400 uppercase tracking-wider font-semibold">
            Interest (Sec 234C + 234B)
          </span>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1">
            {formatINR(total234CInterest + estimated234BInterest)}
          </div>
          <span className="text-[10px] text-rose-300/70 mt-1 block">
            234C: {formatINR(total234CInterest)} • 234B: {formatINR(estimated234BInterest)}
          </span>
        </div>

        <div className="glacier-card p-4 rounded-xl border-[#7dd3fc]/30 bg-[#0e4d6e]/20">
          <span className="text-[11px] text-[#7dd3fc] uppercase tracking-wider font-semibold">Net Remaining Due</span>
          <div className="text-xl font-bold font-mono text-[#7dd3fc] mt-1">{formatINR(totalTaxPayableNow)}</div>
          <span className="text-[10px] text-[#a0b4c4] mt-1 block">Includes interest penalties</span>
        </div>
      </div>

      {/* Quarterly Installment Table */}
      <div className="glacier-card rounded-2xl overflow-hidden border border-[#7dd3fc]/20 shadow-xl">
        <div className="px-6 py-4 border-b border-[#7dd3fc]/15 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-headline">Advance Tax Installment Schedule</h3>
            <p className="text-xs text-[#a0b4c4]">
              Statutory percentages, cumulative thresholds, actual payments, and 234C deferment calculations
            </p>
          </div>
          <span className="text-xs text-[#7dd3fc] font-mono">Interest Rate: 1% per month</span>
        </div>

        {/* Mobile Installments Card View (< md screens) */}
        <div className="block md:hidden p-3.5 space-y-3">
          {installments.map((inst, index) => {
            const paidStateSetter =
              index === 0
                ? setQ1Paid
                : index === 1
                ? setQ2Paid
                : index === 2
                ? setQ3Paid
                : setQ4Paid;

            return (
              <div
                key={inst.quarter}
                className="p-4 rounded-xl border border-white/5 bg-[#141c2e]/60 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-base text-white">{inst.quarter} Installment</span>
                    <span className="text-xs text-[#7dd3fc] block font-mono">Due: {inst.dueDate}</span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                      inst.status === 'PAID'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : inst.status === 'PARTIAL'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : inst.status === 'UPCOMING'
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {inst.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-white/5">
                  <div>
                    <span className="text-[11px] text-[#a0b4c4]">Target %</span>
                    <p className="font-bold text-white font-mono">{inst.statutoryPercent}%</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#a0b4c4]">Cumulative Due</span>
                    <p className="font-bold text-white font-mono">{formatINR(inst.cumulativeTaxDue)}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#a0b4c4]">Shortfall</span>
                    <p className={`font-bold font-mono ${inst.shortfall > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {inst.shortfall > 0 ? formatINR(inst.shortfall) : '₹0 (Met)'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#a0b4c4]">Sec 234C Interest</span>
                    <p className={`font-bold font-mono ${inst.interest234C > 0 ? 'text-rose-400' : 'text-[#a0b4c4]'}`}>
                      {inst.interest234C > 0 ? formatINR(inst.interest234C) : '₹0'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[#a0b4c4] font-semibold mb-1">
                    Amount Paid by Assessee (₹)
                  </label>
                  <input
                    type="number"
                    value={inst.amountPaid}
                    onChange={(e) => paidStateSetter(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-[#0b0f19] border border-[#7dd3fc]/30 rounded-lg px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-[#7dd3fc]"
                    placeholder="Enter amount paid..."
                  />
                </div>

                <button
                  onClick={() => {
                    setSelectedChallanQuarter(inst.quarter);
                    setShowChallanModal(true);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-[#0e4d6e]/40 hover:bg-[#0e4d6e]/70 border border-[#7dd3fc]/40 text-[#7dd3fc] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">receipt</span>
                  <span>Generate Challan ITNS 280 ({inst.quarter})</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Desktop Table View (Hidden on mobile < md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b0f19]/60 text-[#a0b4c4] font-semibold uppercase tracking-wider border-b border-white/5">
              <tr>
                <th className="py-3.5 px-4">Quarter & Due Date</th>
                <th className="py-3.5 px-4">Target %</th>
                <th className="py-3.5 px-4">Quarterly Due</th>
                <th className="py-3.5 px-4">Cumulative Target</th>
                <th className="py-3.5 px-4">Amount Paid (INR)</th>
                <th className="py-3.5 px-4">Shortfall</th>
                <th className="py-3.5 px-4">Sec 234C Interest</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {installments.map((inst, index) => {
                const paidStateSetter =
                  index === 0
                    ? setQ1Paid
                    : index === 1
                    ? setQ2Paid
                    : index === 2
                    ? setQ3Paid
                    : setQ4Paid;

                return (
                  <tr key={inst.quarter} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-sans">
                      <div className="font-bold text-white">{inst.quarter}</div>
                      <div className="text-[11px] text-[#7dd3fc]">{inst.dueDate}</div>
                    </td>

                    <td className="py-3 px-4 text-[#a0b4c4]">{inst.statutoryPercent}%</td>

                    <td className="py-3 px-4 text-white">{formatINR(inst.quarterlyTaxDue)}</td>

                    <td className="py-3 px-4 text-[#a0b4c4]">{formatINR(inst.cumulativeTaxDue)}</td>

                    <td className="py-3 px-4">
                      <input
                        type="number"
                        value={inst.amountPaid}
                        onChange={(e) => paidStateSetter(Math.max(0, parseInt(e.target.value) || 0))}
                        className="bg-[#141c2e] border border-[#7dd3fc]/30 rounded-lg px-2.5 py-1 text-xs text-white font-mono font-bold w-28 text-right focus:outline-none focus:border-[#7dd3fc]"
                      />
                    </td>

                    <td className="py-3 px-4">
                      {inst.shortfall > 0 ? (
                        <span className="text-rose-400 font-bold">{formatINR(inst.shortfall)}</span>
                      ) : (
                        <span className="text-emerald-400">₹0 (Met)</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {inst.interest234C > 0 ? (
                        <span className="text-rose-400 font-bold">{formatINR(inst.interest234C)}</span>
                      ) : (
                        <span className="text-[#a0b4c4]">₹0</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-sans">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          inst.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : inst.status === 'PARTIAL'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : inst.status === 'UPCOMING'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {inst.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => {
                          setSelectedChallanQuarter(inst.quarter);
                          setShowChallanModal(true);
                        }}
                        className="text-[11px] text-[#7dd3fc] hover:underline font-semibold flex items-center gap-1 ml-auto"
                      >
                        <span className="material-symbols-outlined text-xs">receipt</span>
                        <span>Challan 280</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 234B Detailed Card */}
      <div className="glacier-card p-5 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-amber-400">balance</span>
            <h4 className="text-sm font-bold text-white">Section 234B Shortfall Interest Analysis</h4>
          </div>
          <p className="text-xs text-[#a0b4c4] mt-1 max-w-2xl leading-relaxed">
            If total advance tax paid before 31 March is less than <strong>90% of assessed tax</strong> (₹
            {Math.round(estimatedTax * 0.9).toLocaleString('en-IN')}), simple interest @ 1% per month is levied from
            April 1 of the assessment year on the shortfall amount (₹
            {shortfall234B.toLocaleString('en-IN')}).
          </p>
        </div>

        <div className="text-right shrink-0 bg-[#0b0f19] p-3 rounded-xl border border-white/5">
          <div className="text-[11px] text-[#a0b4c4]">Sec 234B Status</div>
          <div
            className={`text-base font-bold font-mono mt-0.5 ${
              is234BApplicable ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {is234BApplicable ? `Interest: ${formatINR(estimated234BInterest)}` : 'Exempt (>= 90% Paid)'}
          </div>
        </div>
      </div>

      {/* Challan ITNS 280 Modal Preview */}
      {showChallanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glacier-card-elevated border border-[#7dd3fc]/30 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-3 border-b border-[#7dd3fc]/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0e4d6e]/50 border border-[#7dd3fc]/30 flex items-center justify-center text-[#7dd3fc]">
                  <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-headline">Challan ITNS 280 Generator</h3>
                  <p className="text-xs text-[#a0b4c4]">
                    Government Tax Deposit Slip for {challanData.taxpayerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChallanModal(false)}
                className="text-[#a0b4c4] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Quarter & Bank Pickers */}
            <div className="py-3 grid grid-cols-2 gap-3 border-b border-white/5">
              <div>
                <label className="block text-[11px] font-semibold text-[#a0b4c4] uppercase mb-1">Select Quarter</label>
                <select
                  value={selectedChallanQuarter}
                  onChange={(e) => setSelectedChallanQuarter(e.target.value as any)}
                  className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7dd3fc]"
                >
                  <option value="Q1">Q1 (Due 15 June)</option>
                  <option value="Q2">Q2 (Due 15 September)</option>
                  <option value="Q3">Q3 (Due 15 December)</option>
                  <option value="Q4">Q4 (Due 15 March)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#a0b4c4] uppercase mb-1">Authorized Bank</label>
                <select
                  value={bankName}
                  onChange={(e) => {
                    setBankName(e.target.value);
                    if (e.target.value === 'State Bank of India') setBsrCode('0001248');
                    else if (e.target.value === 'ICICI Bank Ltd') setBsrCode('0330192');
                    else setBsrCode('0210452');
                  }}
                  className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7dd3fc]"
                >
                  <option value="HDFC Bank Ltd">HDFC Bank Ltd (BSR: 0210452)</option>
                  <option value="State Bank of India">State Bank of India (BSR: 0001248)</option>
                  <option value="ICICI Bank Ltd">ICICI Bank Ltd (BSR: 0330192)</option>
                </select>
              </div>
            </div>

            {/* Challan Slip Visual Preview */}
            <div className="py-4 overflow-y-auto flex-1">
              <div className="border border-[#7dd3fc]/30 rounded-xl bg-gradient-to-b from-[#0e1726] to-[#090d16] p-4 text-xs font-mono space-y-3 shadow-inner">
                {/* Header */}
                <div className="text-center border-b border-white/10 pb-2">
                  <div className="text-[11px] font-bold text-[#7dd3fc] uppercase tracking-wider">
                    GOVERNMENT OF INDIA • INCOME TAX DEPARTMENT
                  </div>
                  <div className="text-sm font-black text-white mt-0.5">CHALLAN NO. / ITNS 280</div>
                  <div className="text-[10px] text-[#a0b4c4]">Payment of Advance Tax / Self-Assessment Tax</div>
                </div>

                {/* Grid Info */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                  <div>
                    <span className="text-[#a0b4c4]">PAN:</span>{' '}
                    <strong className="text-white">{challanData.panNumber}</strong>
                  </div>
                  <div>
                    <span className="text-[#a0b4c4]">Assessment Year:</span>{' '}
                    <strong className="text-white">{challanData.assessmentYear}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#a0b4c4]">Taxpayer Name:</span>{' '}
                    <strong className="text-white">{challanData.taxpayerName}</strong>
                  </div>
                  <div>
                    <span className="text-[#a0b4c4]">Major Head:</span>{' '}
                    <strong className="text-[#7dd3fc]">
                      ({challanData.majorHead}){' '}
                      {challanData.majorHead === '0020' ? 'Corporation Tax (Companies)' : 'Income Tax (Other)'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#a0b4c4]">Minor Head:</span>{' '}
                    <strong className="text-[#7dd3fc]">(100) Advance Tax</strong>
                  </div>
                  <div>
                    <span className="text-[#a0b4c4]">Bank Name:</span>{' '}
                    <strong className="text-white">{challanData.bankName}</strong>
                  </div>
                  <div>
                    <span className="text-[#a0b4c4]">BSR Code:</span>{' '}
                    <strong className="text-white">{challanData.bsrCode}</strong>
                  </div>
                  <div>
                    <span className="text-[#a0b4c4]">Challan Sequence:</span>{' '}
                    <strong className="text-white">{challanData.challanNo}</strong>
                  </div>
                  <div>
                    <span className="text-[#a0b4c4]">Tender Date:</span>{' '}
                    <strong className="text-white">{challanData.tenderDate}</strong>
                  </div>
                </div>

                {/* Amount Table */}
                <div className="border border-white/10 rounded-lg overflow-hidden mt-2">
                  <div className="bg-black/40 px-3 py-1.5 font-bold text-white flex justify-between border-b border-white/5">
                    <span>Tax Component</span>
                    <span>Amount (INR)</span>
                  </div>
                  <div className="p-2.5 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#a0b4c4]">Basic Income Tax (0020/0021):</span>
                      <span className="text-white">{formatINR(challanData.basicTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#a0b4c4]">Health & Education Cess (4%):</span>
                      <span className="text-white">{formatINR(challanData.cess)}</span>
                    </div>
                    {challanData.interest234C > 0 && (
                      <div className="flex justify-between text-rose-300">
                        <span>Interest under Section 234C:</span>
                        <span>{formatINR(challanData.interest234C)}</span>
                      </div>
                    )}
                    {challanData.interest234B > 0 && (
                      <div className="flex justify-between text-rose-300">
                        <span>Interest under Section 234B:</span>
                        <span>{formatINR(challanData.interest234B)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-white text-xs">
                      <span className="text-[#7dd3fc]">Total Tax Deposit (Challan 280):</span>
                      <span className="text-emerald-400 text-sm">{formatINR(challanData.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-[#7dd3fc]/15 flex items-center justify-between">
              <button
                onClick={handleCopyChallan}
                className="text-xs text-[#7dd3fc] hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">{challanCopied ? 'done' : 'content_copy'}</span>
                <span>{challanCopied ? 'Copied Slip Details!' : 'Copy Challan Details'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowChallanModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#a0b4c4] hover:bg-white/5 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handlePrintChallan}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#0e4d6e] to-[#0284c7] hover:from-[#0369a1] hover:to-[#38bdf8] text-white font-bold text-xs rounded-xl border border-[#7dd3fc]/40 shadow-lg flex items-center gap-2 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  <span>Print Official Challan Slip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
