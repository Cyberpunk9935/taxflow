import React, { useState } from 'react';
import { TaxFiling, FilingStatus, User, Business, IncomeRecord, ExpenseRecord, DocumentItem } from '../types';
import { can_transition } from '../core/filing';
import { validate_filing_ready } from '../core/validators';
import { formatINR } from '../core/decimal';

interface FilingStatusPageProps {
  filing: TaxFiling;
  currentUser: User;
  business: Business;
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  documents: DocumentItem[];
  onUpdateStatus: (nextStatus: FilingStatus, notes?: string) => void;
  onSelectTab: (tab: string) => void;
}

export const FilingStatusPage: React.FC<FilingStatusPageProps> = ({
  filing,
  currentUser,
  business,
  incomes,
  expenses,
  documents,
  onUpdateStatus,
  onSelectTab,
}) => {
  const [accountantNotes, setAccountantNotes] = useState(filing.reviewNotes || '');
  const [confirmModalTarget, setConfirmModalTarget] = useState<FilingStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Validate filing readiness
  const readiness = validate_filing_ready(business, incomes, expenses, documents);

  const steps: { key: FilingStatus; label: string; desc: string; num: number }[] = [
    { key: 'DRAFT', label: 'Draft', desc: 'Ledger recording', num: 1 },
    { key: 'UNDER_REVIEW', label: 'Under Review', desc: 'Accountant verification', num: 2 },
    { key: 'READY_TO_FILE', label: 'Ready to File', desc: 'Final certified books', num: 3 },
    { key: 'FILED', label: 'Filed', desc: 'Statutory record locked', num: 4 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === filing.status);

  // Handle transition check
  const handleTransitionRequest = (target: FilingStatus) => {
    setErrorMessage(null);
    const check = can_transition(filing.status, target, currentUser.role);
    if (!check.allowed) {
      setErrorMessage(check.reason || 'This status transition is not permitted.');
      return;
    }

    if (target === 'READY_TO_FILE' && !readiness.isReady) {
      setErrorMessage(
        'Cannot advance to Ready to File: Resolve all blocking errors in the checklist below first.'
      );
      return;
    }

    setConfirmModalTarget(target);
  };

  const handleConfirmTransition = () => {
    if (confirmModalTarget) {
      onUpdateStatus(confirmModalTarget, accountantNotes);
      setConfirmModalTarget(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-[#1B2430]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B2430] font-headline">Filing Preparation Lifecycle</h2>
          <p className="text-xs text-[#5C6470] mt-0.5">
            Role-governed audit state machine for FY {filing.financialYear} return certification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5C6470]">Current Role:</span>
          <span className="text-xs font-mono font-bold text-[#1E3A8A] bg-[#1E3A8A]/10 border border-[#1E3A8A]/20 px-2.5 py-1 rounded">
            {currentUser.name} ({currentUser.role})
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C] flex items-start gap-2.5">
          <span className="material-symbols-outlined text-base text-[#B91C1C] mt-0.5">error</span>
          <div>
            <p className="font-semibold text-[#991B1B]">State Transition Disallowed</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* 4-Step Animated Workflow Tracker (Prompt requirement) */}
      <div className="bg-[#FFFFFF] rounded-2xl p-6 border border-[#DED8CA] shadow-sm space-y-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A]">
          Filing Progress Pipeline (Step {currentStepIndex + 1} of 4)
        </h3>

        <div className="relative flex items-center justify-between">
          {/* Connecting Track Line */}
          <div className="absolute top-5 left-6 right-6 h-1 bg-[#E5DFD2] -z-0">
            <div
              className="h-full bg-[#1E3A8A] transition-all duration-500"
              style={{
                width: `${(currentStepIndex / (steps.length - 1)) * 100}%`,
              }}
            ></div>
          </div>

          {/* Steps */}
          {steps.map((st, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={st.key} className="flex flex-col items-center relative z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                    isCompleted
                      ? 'bg-[#15803D] text-[#FFFFFF] border border-[#15803D]'
                      : isCurrent
                      ? 'bg-[#1B2430] text-[#F7F4EC] border-2 border-[#1E3A8A] shadow-md'
                      : 'bg-[#FAF7F0] text-[#5C6470] border border-[#DED8CA]'
                  }`}
                >
                  {isCompleted ? (
                    <span className="material-symbols-outlined text-base font-bold">check</span>
                  ) : (
                    <span>{st.num}</span>
                  )}
                </div>

                <p
                  className={`text-xs font-semibold mt-2 ${
                    isCurrent ? 'text-[#1E3A8A] font-bold' : isCompleted ? 'text-[#15803D]' : 'text-[#5C6470]'
                  }`}
                >
                  {st.label}
                </p>
                <p className="text-[10px] text-[#5C6470]/80 hidden sm:block">{st.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Workflow Action Buttons Based on Role (Prompt requirement) */}
        <div className="pt-4 border-t border-[#E5DFD2] flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-[#5C6470]">
            <span>Next Recommended Step: </span>
            {filing.status === 'DRAFT' && (
              <strong className="text-[#1B2430]">Submit records for accountant audit</strong>
            )}
            {filing.status === 'UNDER_REVIEW' && (
              <strong className="text-[#1B2430]">Accountant review & certify Ready to File</strong>
            )}
            {filing.status === 'READY_TO_FILE' && (
              <strong className="text-[#1B2430]">Perform statutory submission & lock books</strong>
            )}
            {filing.status === 'FILED' && (
              <strong className="text-[#15803D]">Books permanently locked and archived</strong>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Owner action: Submit for review */}
            {filing.status === 'DRAFT' && (
              <button
                onClick={() => handleTransitionRequest('UNDER_REVIEW')}
                className="px-4 py-2 bg-[#1B2430] hover:bg-[#2B3848] text-[#F7F4EC] font-bold text-xs rounded-lg border border-[#1B2430] shadow-sm transition-all"
              >
                Submit for CA Review
              </button>
            )}

            {/* Under Review actions */}
            {filing.status === 'UNDER_REVIEW' && (
              <>
                <button
                  onClick={() => handleTransitionRequest('DRAFT')}
                  className="px-3.5 py-2 bg-[#FAF8F2] text-[#5C6470] hover:text-[#1B2430] font-medium text-xs rounded-lg border border-[#DED8CA]"
                >
                  Return to Draft
                </button>
                <button
                  onClick={() => handleTransitionRequest('READY_TO_FILE')}
                  className="px-4 py-2 bg-[#1B2430] hover:bg-[#2B3848] text-[#F7F4EC] font-bold text-xs rounded-lg border border-[#1B2430] shadow-sm transition-all"
                >
                  Certify Ready to File
                </button>
              </>
            )}

            {/* Ready to File actions */}
            {filing.status === 'READY_TO_FILE' && (
              <>
                <button
                  onClick={() => handleTransitionRequest('UNDER_REVIEW')}
                  className="px-3.5 py-2 bg-[#FAF8F2] text-[#5C6470] hover:text-[#1B2430] font-medium text-xs rounded-lg border border-[#DED8CA]"
                >
                  Re-open Review
                </button>
                <button
                  onClick={() => handleTransitionRequest('FILED')}
                  className="px-4 py-2 bg-[#15803D] hover:bg-[#166534] text-white font-bold text-xs rounded-lg border border-[#15803D] shadow-sm"
                >
                  Mark as Officially Filed
                </button>
              </>
            )}

            {filing.status === 'FILED' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/30 text-xs font-semibold">
                <span className="material-symbols-outlined text-sm">lock</span>
                <span>Filing Sealed</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Readiness Blocking Checklist (Prompt requirement) */}
      <div className="bg-[#FFFFFF] rounded-2xl p-6 border border-[#DED8CA] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1B2430] font-headline">
              Certification Readiness Checklist
            </h3>
            <p className="text-xs text-[#5C6470]">
              Mandatory statutory requirements that block transition to "Ready to File"
            </p>
          </div>
          <span
            className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
              readiness.isReady
                ? 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/30'
                : 'bg-[#B45309]/10 text-[#B45309] border-[#B45309]/30'
            }`}
          >
            {readiness.isReady ? 'Ready for Certification' : 'Prerequisites Incomplete'}
          </span>
        </div>

        <div className="space-y-2.5">
          {readiness.problems.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#15803D]/10 border border-[#15803D]/25 text-xs text-[#15803D] flex items-center gap-2">
              <span className="material-symbols-outlined text-base">verified</span>
              <span>All validation rules satisfied: GSTIN registered, income posted, and records backed by vault receipts.</span>
            </div>
          ) : (
            readiness.problems.map((prob, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-[#FAF8F2] border border-[#DED8CA] flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-lg ${
                      prob.severity === 'ERROR' ? 'text-[#B91C1C]' : 'text-[#B45309]'
                    }`}
                  >
                    {prob.severity === 'ERROR' ? 'cancel' : 'warning'}
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-[#1B2430]">{prob.message}</span>
                    <p className="text-[10px] text-[#5C6470] capitalize">
                      Category: {prob.category.toLowerCase().replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onSelectTab(prob.actionLink)}
                  className="text-xs text-[#1E3A8A] hover:underline flex items-center gap-1 font-semibold flex-shrink-0"
                >
                  <span>Resolve</span>
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Accountant Audit Notes & Status History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Review Notes */}
        <div className="bg-[#FFFFFF] rounded-2xl p-5 border border-[#DED8CA] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A]">
              Accountant Audit Notes
            </h3>
            {currentUser.role === 'ACCOUNTANT' && (
              <span className="text-[10px] text-[#15803D] font-mono font-semibold">Editor Active</span>
            )}
          </div>

          <textarea
            rows={4}
            disabled={currentUser.role !== 'ACCOUNTANT' && currentUser.role !== 'ADMIN'}
            value={accountantNotes}
            onChange={(e) => setAccountantNotes(e.target.value)}
            placeholder="Accountant review observations regarding TDS matching, Section 37 vouchers..."
            className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430] disabled:opacity-70"
          />

          <div className="flex items-center justify-between text-[11px] text-[#5C6470]">
            <span>Last reviewed by: {filing.reviewedBy || 'Priya Mehta (CA)'}</span>
            {(currentUser.role === 'ACCOUNTANT' || currentUser.role === 'ADMIN') && (
              <button
                onClick={() => {
                  onUpdateStatus(filing.status, accountantNotes);
                }}
                className="text-[#1E3A8A] hover:underline font-semibold"
              >
                Save Notes
              </button>
            )}
          </div>
        </div>

        {/* Status History Timeline (Prompt requirement) */}
        <div className="bg-[#FFFFFF] rounded-2xl p-5 border border-[#DED8CA] shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A]">
            Audit Trail & History
          </h3>

          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {filing.history.map((h, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-[#1E3A8A] mt-1.5 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1B2430]">{h.status}</span>
                    <span className="text-[10px] text-[#5C6470] font-mono">{h.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-[#5C6470]">
                    Updated by {h.changedBy} ({h.role})
                  </p>
                  {h.notes && (
                    <p className="text-[10px] text-[#1E3A8A] italic mt-0.5">"{h.notes}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B2430]/50 backdrop-blur-none text-[#1B2430]">
          <div className="bg-[#FFFFFF] rounded-2xl p-6 max-w-sm w-full border border-[#DED8CA] shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#1E3A8A]/10 border border-[#1E3A8A]/25 text-[#1E3A8A] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">verified</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1B2430] font-headline">Confirm Status Transition</h3>
              <p className="text-xs text-[#5C6470] mt-1">
                You are transitioning the filing status from <strong className="text-[#1B2430]">{filing.status}</strong> to <strong className="text-[#1E3A8A]">{confirmModalTarget}</strong>.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmModalTarget(null)}
                className="px-4 py-2 rounded-lg bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#5C6470] hover:text-[#1B2430]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTransition}
                className="px-4 py-2 rounded-lg bg-[#1B2430] hover:bg-[#2B3848] text-[#F7F4EC] text-xs font-semibold shadow-sm"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
