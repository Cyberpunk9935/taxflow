import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B2430]/50 backdrop-blur-none text-[#1B2430]">
      <div className="bg-[#FFFFFF] rounded-2xl p-6 max-w-2xl w-full border border-[#DED8CA] shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#DED8CA] pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1E3A8A] text-xl">help</span>
            <h3 className="text-lg font-bold text-[#1B2430] font-headline">
              Statutory Guidance & Filing FAQ
            </h3>
          </div>
          <button onClick={onClose} className="text-[#596579] hover:text-[#1B2430] p-1">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="space-y-4 text-xs text-[#596579] leading-relaxed">
          <div className="p-3.5 rounded-xl bg-[#FAF8F2] border border-[#DED8CA] text-[#1B2430]">
            <strong className="text-[#1E3A8A] block mb-0.5 font-headline text-sm">Role of TaxFlowSMB:</strong>
            TaxFlowSMB is an autonomous preparatory engine that compiles business ledgers, cross-verifies Section 37 deductibility, calculates progressive slab taxes, and coordinates review between business owners and chartered accountants.
          </div>

          <div>
            <h4 className="font-bold text-[#1B2430] text-sm mb-1 font-headline">1. Section 37 Allowable Business Expenses</h4>
            <p>
              Under Section 37 of the Income Tax Act, any expenditure laid out wholly and exclusively for the purposes of business is allowable as a tax deduction, provided it is not personal, capital, or incurred for any purpose that is an offense or prohibited by law (e.g., fines and penalties are disallowed).
            </p>
          </div>

          <div>
            <h4 className="font-bold text-[#1B2430] text-sm mb-1 font-headline">2. Configurable Dynamic Tax Rules</h4>
            <p>
              In TaxFlowSMB, tax rates and progressive brackets are never hard-coded in the codebase. Administrators configure active tax rule policies per financial year, ensuring immediate updates when budget finance bills are passed.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-[#1B2430] text-sm mb-1 font-headline">3. Role-Based Filing Lifecycle</h4>
            <p>
              The state machine enforces four stages:
              <br />• <strong>DRAFT:</strong> Transactions entered by business staff.
              <br />• <strong>UNDER_REVIEW:</strong> Ledger passed to external or internal CA.
              <br />• <strong>READY_TO_FILE:</strong> Certified with zero blocking errors.
              <br />• <strong>FILED:</strong> Permanent archival and cryptographic locking.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-[#DED8CA]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1B2430] hover:bg-[#283548] text-[#F7F4EC] font-semibold text-xs border border-[#1B2430] cursor-pointer shadow-xs"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
