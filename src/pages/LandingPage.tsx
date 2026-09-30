import React from 'react';
import { FinancialMarketBackground } from '../components/FinancialMarketBackground';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onOpenDashboard: () => void;
  isAuthenticated: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onLogin,
  onOpenDashboard,
  isAuthenticated,
}) => {
  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#1B2430] relative font-body selection:bg-[#E4DCCE] selection:text-[#1B2430]">
      {/* Sticky Solid Paper Navbar */}
      <header className="sticky top-0 z-50 w-full bg-[#FFFFFF] border-b border-[#DED8CA] shadow-[0_1px_3px_rgba(27,36,48,0.04)] transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FAF7F0] border border-[#DED8CA] flex items-center justify-center text-[#1B2430] shadow-sm">
              <span className="material-symbols-outlined text-xl">shield</span>
            </div>
            <div>
              <span className="font-headline text-lg font-extrabold text-[#1B2430] tracking-tight">
                TaxFlowSMB
              </span>
              <span className="hidden sm:inline-block ml-2.5 text-[10px] text-[#5C6470] bg-[#FAF7F0] px-2 py-0.5 rounded border border-[#DED8CA] font-semibold">
                Statutory Advisory Aux.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {isAuthenticated ? (
              <button
                onClick={onOpenDashboard}
                className="flex items-center gap-2 bg-[#1B2430] hover:bg-[#2B3848] text-[#F7F4EC] font-bold text-xs tracking-wider rounded-lg border border-[#1B2430] py-2 px-4 shadow-sm active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-base">dashboard</span>
                <span>Go to Dashboard</span>
              </button>
            ) : (
              <>
                <button
                  onClick={onLogin}
                  className="text-xs font-bold text-[#1B2430] hover:text-[#1E3A8A] transition-colors px-3 py-1.5"
                >
                  Sign In
                </button>
                <button
                  onClick={onGetStarted}
                  className="flex items-center gap-2 bg-[#1B2430] hover:bg-[#2B3848] text-[#F7F4EC] font-bold text-xs tracking-wider rounded-lg border border-[#1B2430] py-2 px-4 transition-all shadow-sm active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  <span>Register Account</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section with Live Financial Market Ticker Background & Bold Left-Aligned Layout */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden px-6 sm:px-12 py-16">
        {/* Animated Financial Market Background */}
        <FinancialMarketBackground />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* LEFT SIDE: Bold Title, Tagline & Action Pipeline (Strictly Left Aligned) */}
          <div className="lg:col-span-7 text-left space-y-6">
            {/* Status Indicator */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#DED8CA] text-xs font-bold text-[#1B2430] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse"></span>
              <span>Autonomous Tax Preparation & Advisory Support for SMBs</span>
            </div>

            {/* Title: In Bold on the Left Side */}
            <h1 className="font-headline text-4xl sm:text-6xl font-extrabold tracking-tight text-[#1B2430] leading-tight">
              Digital Tax Filing Support.<br />
              <span className="text-[#1E3A8A] font-black">
                Automated. Audited. Ready.
              </span>
            </h1>

            {/* Left-Aligned Bold Tagline & Description */}
            <p className="text-base sm:text-lg font-medium text-[#2E3A4B] leading-relaxed max-w-xl">
              Organize income receipts, classify Section 37 business expenses, and compute progressive slab taxes with zero hardcoded rates.
            </p>

            <p className="text-xs sm:text-sm text-[#5C6470] font-medium leading-relaxed max-w-xl">
              Strict access control protects your financial vault. Certified workflows connect business owners directly with tax professionals for pre-submission verification.
            </p>

            {/* Feature Bullets (in bold on the left side) */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-[#1B2430]">
                <span className="w-5 h-5 rounded-full bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/30 flex items-center justify-center text-xs">✓</span>
                <span><strong>Section 37 Automated Deductibility Classification</strong></span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-[#1B2430]">
                <span className="w-5 h-5 rounded-full bg-[#1E3A8A]/10 text-[#1E3A8A] border border-[#1E3A8A]/30 flex items-center justify-center text-xs">✓</span>
                <span><strong>Dynamic Progressive Slab Calculations (0% Rounding Errors)</strong></span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-[#1B2430]">
                <span className="w-5 h-5 rounded-full bg-[#6B21A8]/10 text-[#6B21A8] border border-[#6B21A8]/30 flex items-center justify-center text-xs">✓</span>
                <span><strong>Multi-Role Review State Machine (Draft → Review → Ready → Filed)</strong></span>
              </div>
            </div>

            {/* Primary Action Buttons (Left Aligned) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
              <button
                onClick={onOpenDashboard}
                className="w-full sm:w-auto px-7 py-3.5 bg-[#1B2430] hover:bg-[#2B3848] text-[#F7F4EC] font-bold text-sm tracking-wide rounded-xl border border-[#1B2430] shadow-sm transition-all flex items-center justify-center gap-2 group active:scale-95"
              >
                <span>{isAuthenticated ? 'Enter Workspace' : 'Sign In to Access Books'}</span>
                <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>

              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto px-6 py-3.5 bg-[#FFFFFF] hover:bg-[#FAF7F0] border border-[#DED8CA] text-[#1B2430] font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-base text-[#1E3A8A]">person_add</span>
                <span>Register First</span>
              </button>
            </div>

            {/* Left-Aligned Statutory Disclaimer */}
            <div className="pt-4">
              <p className="text-[11px] text-[#5C6470] border-l-2 border-[#1E3A8A]/40 pl-3 leading-relaxed">
                <strong className="text-[#1B2430]">Statutory Notice:</strong> TaxFlowSMB prepares tax summaries and organizes financial records. It does not file taxes directly with the government and is not a substitute for a qualified tax professional.
              </p>
            </div>
          </div>

          {/* RIGHT SIDE: Interactive Financial Overview Solid Paper Card */}
          <div className="lg:col-span-5 hidden lg:block">
            <div className="bg-[#FFFFFF] rounded-2xl p-6 border border-[#DED8CA] shadow-md space-y-5">
              <div className="flex items-center justify-between border-b border-[#E5DFD2] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF7F0] border border-[#DED8CA] flex items-center justify-center text-[#1B2430] text-xs font-bold font-mono">
                    FY
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1B2430] font-headline">Nexify Solutions Pvt Ltd</h3>
                    <p className="text-[11px] text-[#5C6470] font-mono">GSTIN: 27AABCS1429B1Z5</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#15803D] bg-[#15803D]/10 px-2.5 py-0.5 rounded border border-[#15803D]/20">
                  Verified Books
                </span>
              </div>

              {/* Financial Metrics Strip */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#DED8CA]">
                  <span className="text-[11px] text-[#5C6470] block">Total Gross Turnover</span>
                  <span className="text-lg font-bold font-mono text-[#15803D] mt-0.5 block">
                    ₹48,60,000
                  </span>
                  <span className="text-[10px] text-[#15803D] font-medium">+14.2% YoY Growth</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#DED8CA]">
                  <span className="text-[11px] text-[#5C6470] block">Section 37 Allowable</span>
                  <span className="text-lg font-bold font-mono text-[#1E3A8A] mt-0.5 block">
                    ₹19,80,000
                  </span>
                  <span className="text-[10px] text-[#5C6470]">Deductible OPEX</span>
                </div>
              </div>

              {/* Tax Engine Computation Summary */}
              <div className="p-4 rounded-xl bg-[#FAF8F2] border border-[#DED8CA] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#1B2430]">Net Taxable Profit:</span>
                  <span className="font-mono font-bold text-[#1B2430] text-sm">₹27,20,000</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#1B2430]">Computed Tax (25% Slab):</span>
                  <span className="font-mono font-bold text-[#6B21A8] text-sm">₹6,80,000</span>
                </div>
                <div className="w-full bg-[#E5DFD2] rounded-full h-1.5 mt-1 overflow-hidden">
                  <div className="bg-[#1E3A8A] h-full w-3/4"></div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#5C6470] font-mono">
                  <span>Audit Stage: Step 2 of 4</span>
                  <span className="text-[#1E3A8A] font-bold">Under Review</span>
                </div>
              </div>

              {/* Quick Action in Card */}
              <div className="pt-2">
                <button
                  onClick={onOpenDashboard}
                  className="w-full py-2.5 px-3 bg-[#1B2430] hover:bg-[#2B3848] text-[#F7F4EC] font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>{isAuthenticated ? 'Open Protected Ledger' : 'Sign In with Account'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Stage Core Tax Workflow Cards */}
      <section className="max-w-7xl mx-auto px-6 py-16 space-y-12">
        <div className="text-left space-y-2 border-b border-[#DED8CA] pb-4">
          <h2 className="text-xs uppercase tracking-widest font-mono text-[#1E3A8A] font-bold">
            The Digital Tax Filing Support Pipeline
          </h2>
          <p className="text-2xl sm:text-3xl font-extrabold font-headline text-[#1B2430]">
            From Source Documents to Certified Filing Preparation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            {
              step: '01',
              title: 'Record Income',
              desc: 'Log sales receipts, client milestones, and TDS withholding deductions with automatic duplicate detection.',
              icon: 'payments',
              color: '#1E3A8A',
            },
            {
              step: '02',
              title: 'Track Expenses',
              desc: 'Categorize business burn into Section 37 allowable vs non-deductible expenses in real time.',
              icon: 'receipt_long',
              color: '#0F766E',
            },
            {
              step: '03',
              title: 'Upload Documents',
              desc: 'Vault vendor bills, bank statements, and tax challans with strict 5MB PDF/image verification.',
              icon: 'folder_open',
              color: '#6B21A8',
            },
            {
              step: '04',
              title: 'Tax Summary',
              desc: 'Rules-driven engine computes progressive slab taxes, applying active deductions without hardcoded rates.',
              icon: 'account_balance',
              color: '#B45309',
            },
            {
              step: '05',
              title: 'Filing Status',
              desc: 'Structured state machine (Draft → Review → Ready → Filed) with role-gated accountant sign-offs.',
              icon: 'assignment_turned_in',
              color: '#15803D',
            },
          ].map((card) => (
            <div
              key={card.step}
              className="bg-[#FFFFFF] rounded-2xl p-5 flex flex-col justify-between border border-[#DED8CA] shadow-sm hover:border-[#C8BFAD] hover:shadow-md transition-all text-left"
            >
              <div>
                <div className="flex items-center justify-between text-[#5C6470] mb-3">
                  <span className="text-xs font-mono font-bold text-[#1E3A8A]">{card.step}</span>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${card.color}15`, color: card.color }}
                  >
                    <span className="material-symbols-outlined text-lg">{card.icon}</span>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-[#1B2430] font-headline mb-2">{card.title}</h3>
                <p className="text-xs text-[#5C6470] leading-relaxed">{card.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E5DFD2] flex items-center text-[11px] text-[#1E3A8A] font-semibold">
                <span>View process</span>
                <span className="material-symbols-outlined text-xs ml-1">chevron_right</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Metrics & Compliance Proof */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-[#FFFFFF] rounded-2xl p-8 sm:p-10 border border-[#DED8CA] shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-left">
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#1E3A8A] font-mono">4,200+</p>
              <p className="text-xs text-[#5C6470] mt-1 font-semibold">Active Small Businesses</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#1B2430] font-mono">₹840 Cr+</p>
              <p className="text-xs text-[#5C6470] mt-1 font-semibold">Gross Inflow Reconciled</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#6B21A8] font-mono">100%</p>
              <p className="text-xs text-[#5C6470] mt-1 font-semibold">Configurable Dynamic Rules</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#15803D] font-mono">0 Float</p>
              <p className="text-xs text-[#5C6470] mt-1 font-semibold">ROUND_HALF_UP Precision</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Call to Action Banner */}
      <section className="max-w-5xl mx-auto px-6 py-14">
        <div className="bg-[#FFFFFF] rounded-2xl p-8 sm:p-10 border border-[#DED8CA] shadow-md text-left space-y-5">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1B2430] font-headline">
            Ready to Begin Your Tax Filing Preparation?
          </h2>
          <p className="text-xs sm:text-sm text-[#5C6470] max-w-xl">
            Register your business account or sign in with your email to organize your ledgers, attach vouchers, and prepare tax returns.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={onLogin}
              className="px-6 py-3 bg-[#1B2430] hover:bg-[#2B3848] text-[#F7F4EC] font-bold text-xs tracking-wide rounded-xl border border-[#1B2430] shadow-sm transition-all flex items-center gap-2 active:scale-95"
            >
              <span className="material-symbols-outlined text-base">login</span>
              <span>Sign In with Account</span>
            </button>
            <button
              onClick={onGetStarted}
              className="px-6 py-3 bg-[#FAF7F0] hover:bg-[#F2ECE0] text-[#1B2430] font-bold text-xs rounded-xl border border-[#DED8CA] transition-all flex items-center gap-2 active:scale-95"
            >
              <span className="material-symbols-outlined text-base text-[#1E3A8A]">person_add</span>
              <span>Register New Business</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
