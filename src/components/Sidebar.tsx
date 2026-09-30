import React from 'react';
import { UserRole } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  userRole: UserRole;
  docCount: number;
  onOpenRecordModal: () => void;
  onOpenFilingModal: () => void;
  onSignOut: () => void;
  onOpenAiScanner?: () => void;
  onOpenExportModal?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  userRole,
  docCount,
  onOpenRecordModal,
  onOpenFilingModal,
  onSignOut,
  onOpenAiScanner,
  onOpenExportModal,
  isMobileOpen,
  onCloseMobile,
}) => {
  // Navigation tabs config based on role
  const isOwner = userRole === 'OWNER';
  const isAccountant = userRole === 'ACCOUNTANT';
  const isAdmin = userRole === 'ADMIN';

  const handleTabClick = (tab: string) => {
    onSelectTab(tab);
    onCloseMobile?.();
  };

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden transition-opacity animate-fadeIn"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-72 sm:w-64 max-w-[85vw] z-50 flex flex-col bg-[#0f1524]/95 lg:bg-[#0f1524]/85 backdrop-blur-2xl border-r border-[#7dd3fc]/15 shadow-[0_0_30px_rgba(125,211,252,0.08)] font-body text-sm font-medium select-none transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between border-b border-[#7dd3fc]/10">
          <div
            onClick={() => handleTabClick('dashboard')}
            className="flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-[#0e4d6e]/40 border border-[#7dd3fc]/30 flex items-center justify-center text-[#7dd3fc] shadow-[0_0_15px_rgba(125,211,252,0.25)] shrink-0">
              <span className="material-symbols-outlined text-xl">shield</span>
            </div>
            <div>
              <h1 className="font-headline text-base font-bold text-[#7dd3fc] tracking-tight">TaxFlowSMB</h1>
              <p className="text-[11px] text-[#a0b4c4] font-normal">Small Business Tax</p>
            </div>
          </div>

          {/* Close button on mobile */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-[#a0b4c4] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Close menu"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs Cluster */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {/* Dashboard */}
          <button
            onClick={() => handleTabClick('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
              currentTab === 'dashboard'
                ? 'bg-[#0e4d6e]/40 text-[#7dd3fc] font-semibold border border-[#7dd3fc]/30 shadow-[0_0_15px_rgba(125,211,252,0.12)]'
                : 'text-[#a0b4c4] hover:bg-[#1a2438]/60 hover:text-[#7dd3fc]'
            }`}
          >
            <span className="material-symbols-outlined text-xl">dashboard</span>
            <span>Dashboard</span>
          </button>

          {/* Business Profile */}
          <button
            onClick={() => handleTabClick('business')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
              currentTab === 'business'
                ? 'bg-[#0e4d6e]/40 text-[#7dd3fc] font-semibold border border-[#7dd3fc]/30 shadow-[0_0_15px_rgba(125,211,252,0.12)]'
                : 'text-[#a0b4c4] hover:bg-[#1a2438]/60 hover:text-[#7dd3fc]'
            }`}
          >
            <span className="material-symbols-outlined text-xl">domain</span>
            <span>Business Profile</span>
          </button>

          {/* Income */}
          <button
            onClick={() => handleTabClick('income')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
              currentTab === 'income'
                ? 'bg-[#0e4d6e]/40 text-[#7dd3fc] font-semibold border border-[#7dd3fc]/30 shadow-[0_0_15px_rgba(125,211,252,0.12)]'
                : 'text-[#a0b4c4] hover:bg-[#1a2438]/60 hover:text-[#7dd3fc]'
            }`}
          >
            <span className="material-symbols-outlined text-xl">payments</span>
            <span>Income</span>
          </button>

          {/* Expenses */}
          <button
            onClick={() => handleTabClick('expenses')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
              currentTab === 'expenses'
                ? 'bg-[#0e4d6e]/40 text-[#7dd3fc] font-semibold border border-[#7dd3fc]/30 shadow-[0_0_15px_rgba(125,211,252,0.12)]'
                : 'text-[#a0b4c4] hover:bg-[#1a2438]/60 hover:text-[#7dd3fc]'
            }`}
          >
            <span className="material-symbols-outlined text-xl">receipt_long</span>
            <span>Expenses</span>
          </button>

          {/* Documents Vault */}
          <button
            onClick={() => handleTabClick('documents')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
              currentTab === 'documents'
                ? 'bg-[#0e4d6e]/40 text-[#7dd3fc] font-semibold border border-[#7dd3fc]/30 shadow-[0_0_15px_rgba(125,211,252,0.12)]'
                : 'text-[#a0b4c4] hover:bg-[#1a2438]/60 hover:text-[#7dd3fc]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl">folder_open</span>
              <span>Documents</span>
            </div>
            <span className="text-[10px] bg-[#0e4d6e] text-[#c8eaff] px-1.5 py-0.5 rounded font-mono font-medium">
              {docCount}
            </span>
          </button>

          {/* Bank Reconciliation & Cash Disallowance */}
          <button
            onClick={() => handleTabClick('bank-recon')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
              currentTab === 'bank-recon'
                ? 'bg-[#0e4d6e]/40 text-[#7dd3fc] font-semibold border border-[#7dd3fc]/30 shadow-[0_0_15px_rgba(125,211,252,0.12)]'
                : 'text-[#a0b4c4] hover:bg-[#1a2438]/60 hover:text-[#7dd3fc]'
            }`}
          >
            <span className="material-symbols-outlined text-xl">account_balance</span>
            <span>Bank Recon & 40A(3)</span>
          </button>

          {/* Tax Summary */}
          <button
            onClick={() => handleTabClick('tax-summary')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
              currentTab === 'tax-summary'
                ? 'bg-[#0e4d6e]/40 text-[#7dd3fc] font-semibold border border-[#7dd3fc]/30 shadow-[0_0_15px_rgba(125,211,252,0.12)]'
                : 'text-[#a0b4c4] hover:bg-[#1a2438]/60 hover:text-[#7dd3fc]'
            }`}
          >
            <span className="material-symbols-outlined text-xl">calculate</span>
            <span>Tax Summary</span>
          </button>

          {/* Advance Tax & Challan 280 */}
          <button
            onClick={() => handleTabClick('advance-tax')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
              currentTab === 'advance-tax'
                ? 'bg-[#0e4d6e]/40 text-[#7dd3fc] font-semibold border border-[#7dd3fc]/30 shadow-[0_0_15px_rgba(125,211,252,0.12)]'
                : 'text-[#a0b4c4] hover:bg-[#1a2438]/60 hover:text-[#7dd3fc]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl">receipt</span>
              <span>Advance Tax 280</span>
            </div>
            <span className="text-[9px] bg-sky-500/20 text-[#7dd3fc] border border-sky-500/30 px-1 py-0.5 rounded font-mono">
              234B/C
            </span>
          </button>

          {/* What-If Scenario Simulator */}
          <button
            onClick={() => handleTabClick('tax-simulator')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
              currentTab === 'tax-simulator'
                ? 'bg-[#3d2060]/50 text-purple-300 font-semibold border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                : 'text-[#a0b4c4] hover:bg-[#1a2438]/60 hover:text-purple-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl">query_stats</span>
              <span>What-If Simulator</span>
            </div>
            <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 py-0.5 rounded font-mono">
              Optimizer
            </span>
          </button>

          {/* Filing Status */}
          <button
            onClick={() => handleTabClick('filing')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
              currentTab === 'filing'
                ? 'bg-[#0e4d6e]/40 text-[#7dd3fc] font-semibold border border-[#7dd3fc]/30 shadow-[0_0_15px_rgba(125,211,252,0.12)]'
                : 'text-[#a0b4c4] hover:bg-[#1a2438]/60 hover:text-[#7dd3fc]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl">assignment_turned_in</span>
              <span>Filing Status</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#7dd3fc] animate-pulse"></span>
          </button>

          {/* Reports */}
          <button
            onClick={() => handleTabClick('reports')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
              currentTab === 'reports'
                ? 'bg-[#0e4d6e]/40 text-[#7dd3fc] font-semibold border border-[#7dd3fc]/30 shadow-[0_0_15px_rgba(125,211,252,0.12)]'
                : 'text-[#a0b4c4] hover:bg-[#1a2438]/60 hover:text-[#7dd3fc]'
            }`}
          >
            <span className="material-symbols-outlined text-xl">analytics</span>
            <span>Reports</span>
          </button>

          {/* Admin Suite Tab (Visible to Admin or for inspection) */}
          {isAdmin && (
            <button
              onClick={() => handleTabClick('admin')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                currentTab === 'admin'
                  ? 'bg-[#3d2060]/50 text-[#c8a0f0] font-semibold border border-[#c8a0f0]/30 shadow-[0_0_15px_rgba(200,160,240,0.15)]'
                  : 'text-[#c8a0f0]/80 hover:bg-[#3d2060]/30 hover:text-[#c8a0f0]'
              }`}
            >
              <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
              <span>Admin Center</span>
            </button>
          )}

          {/* Quick Action: AI OCR Scanner */}
          {onOpenAiScanner && (
            <div className="pt-2 px-1">
              <button
                onClick={() => {
                  onOpenAiScanner();
                  onCloseMobile?.();
                }}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-900/40 to-[#0e4d6e]/50 hover:bg-sky-500/20 text-[#7dd3fc] border border-sky-400/30 hover:border-sky-400/60 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-[0_0_15px_rgba(125,211,252,0.15)] active:scale-95"
              >
                <span className="material-symbols-outlined text-base">document_scanner</span>
                <span>AI Receipt Scanner</span>
              </button>
            </div>
          )}

          {/* Quick Action: Record Transaction */}
          <div className="pt-1 px-1">
            <button
              onClick={() => {
                onOpenRecordModal();
                onCloseMobile?.();
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#7dd3fc]/10 hover:bg-[#7dd3fc]/20 text-[#7dd3fc] border border-[#7dd3fc]/30 hover:border-[#7dd3fc]/50 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-[0_0_20px_rgba(125,211,252,0.1)] active:scale-95"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>Record Transaction</span>
            </button>
          </div>

          {/* Quick Action: Export View */}
          {onOpenExportModal && (
            <div className="pt-1 px-1">
              <button
                onClick={() => {
                  onOpenExportModal();
                  onCloseMobile?.();
                }}
                className="w-full flex items-center justify-center gap-2 bg-white/[0.03] hover:bg-white/[0.08] text-[#c8eaff] border border-white/10 py-1.5 px-3 rounded-lg text-xs font-medium tracking-wide transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-sm text-[#7dd3fc]">file_download</span>
                <span>Export CSV / JSON</span>
              </button>
            </div>
          )}

          {/* Engine Tests Runner shortcut */}
          <div className="pt-1 px-1">
            <button
              onClick={() => handleTabClick('tests')}
              className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-mono border transition-all ${
                currentTab === 'tests'
                  ? 'bg-[#7dd3fc]/20 text-[#7dd3fc] border-[#7dd3fc]/40'
                  : 'text-[#a0b4c4]/70 border-white/5 hover:text-[#7dd3fc] hover:border-[#7dd3fc]/20'
              }`}
            >
              <span className="material-symbols-outlined text-xs">science</span>
              <span>Run Tax Unit Tests</span>
            </button>
          </div>
        </nav>

        {/* SideNav Footer CTA */}
        <div className="p-3 border-t border-[#7dd3fc]/10 space-y-2">
          <button
            onClick={() => {
              onOpenFilingModal();
              onCloseMobile?.();
            }}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-[#0e4d6e] to-[#1a3a4e] text-[#7dd3fc] font-semibold text-xs tracking-wider rounded-lg border border-[#7dd3fc]/40 hover:border-[#7dd3fc] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(125,211,252,0.15)] active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">rocket_launch</span>
            <span>File Return Now</span>
          </button>

          <div className="pt-1 flex flex-col space-y-1">
            <button
              onClick={() => handleTabClick('landing')}
              className="flex items-center gap-2.5 text-[#a0b4c4] px-3 py-1.5 rounded-lg text-xs hover:text-[#7dd3fc] transition-colors w-full text-left"
            >
              <span className="material-symbols-outlined text-base">public</span>
              <span>Landing Page</span>
            </button>

            <button
              onClick={onSignOut}
              className="flex items-center gap-2.5 text-[#a0b4c4] px-3 py-1.5 rounded-lg text-xs hover:text-[#ff6b6b] transition-colors w-full text-left"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

