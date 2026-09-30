import React, { useState } from 'react';
import { Business, BusinessType } from '../types';

interface EntitySwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: Business[];
  activeBusiness: Business;
  onSelectBusiness: (biz: Business) => void;
  onAddBusiness: (biz: Business) => void;
}

export const EntitySwitcherModal: React.FC<EntitySwitcherModalProps> = ({
  isOpen,
  onClose,
  businesses,
  activeBusiness,
  onSelectBusiness,
  onAddBusiness,
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form fields for new business
  const [name, setName] = useState('');
  const [type, setType] = useState<BusinessType>('Private Limited');
  const [ownerName, setOwnerName] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [taxRegistrationNo, setTaxRegistrationNo] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [financialYear, setFinancialYear] = useState('2024-25');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setIsAddingNew(false);
    setName('');
    setType('Private Limited');
    setOwnerName('');
    setPanNumber('');
    setTaxRegistrationNo('');
    setEmail('');
    setPhone('');
    setAddress('');
    setErrorMsg(null);
  };

  const handleCreateBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a legal business name');
      return;
    }
    if (!panNumber.trim() || panNumber.trim().length !== 10) {
      setErrorMsg('Please enter a valid 10-character Indian PAN number');
      return;
    }

    const newBiz: Business = {
      id: 'biz-' + Date.now(),
      ownerId: 'user-rajesh',
      name: name.trim(),
      type,
      ownerName: ownerName.trim() || 'Principal Officer',
      address: address.trim() || 'Corporate Office',
      phone: phone.trim() || '+91 98000 00000',
      email: email.trim() || 'contact@business.com',
      taxRegistrationNo: taxRegistrationNo.trim() || '27' + panNumber.trim().toUpperCase() + '1Z5',
      panNumber: panNumber.trim().toUpperCase(),
      financialYear,
      createdAt: new Date().toISOString().substring(0, 10),
      updatedAt: new Date().toISOString().substring(0, 10),
    };

    onAddBusiness(newBiz);
    onSelectBusiness(newBiz);
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glacier-card-elevated border border-[#7dd3fc]/30 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#7dd3fc]/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0e4d6e]/50 border border-[#7dd3fc]/30 flex items-center justify-center text-[#7dd3fc]">
              <span className="material-symbols-outlined text-xl">domain</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-headline">Multi-Entity & Client Switcher</h3>
              <p className="text-xs text-[#a0b4c4]">
                Switch active ledger, books, and tax returns across your business entities
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-[#a0b4c4] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {!isAddingNew ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#a0b4c4] uppercase tracking-wider">
                  Available Business Entities ({businesses.length})
                </span>
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="text-xs text-[#7dd3fc] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Add New Client / Firm</span>
                </button>
              </div>

              {/* Entity Cards */}
              <div className="space-y-2.5">
                {businesses.map((biz) => {
                  const isActive = biz.id === activeBusiness.id;
                  return (
                    <div
                      key={biz.id}
                      onClick={() => {
                        onSelectBusiness(biz);
                        onClose();
                      }}
                      className={`p-3.5 sm:p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-[#0e4d6e]/50 border-[#7dd3fc] shadow-[0_0_20px_rgba(125,211,252,0.18)]'
                          : 'bg-[#141c2e]/60 border-white/5 hover:border-white/20 hover:bg-[#1a2438]/80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 border ${
                            isActive
                              ? 'bg-[#7dd3fc] text-[#0b1329] border-[#7dd3fc]'
                              : 'bg-[#141c2e] text-[#a0b4c4] border-white/10'
                          }`}
                        >
                          {biz.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-white font-headline truncate max-w-[200px] xs:max-w-none">
                              {biz.name}
                            </h4>
                            <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-[#a0b4c4] border border-white/10">
                              {biz.type}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#a0b4c4] mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono">
                            <span>
                              PAN: <strong className="text-white">{biz.panNumber}</strong>
                            </span>
                            <span className="hidden xs:inline">
                              GSTIN: <strong className="text-white">{biz.taxRegistrationNo}</strong>
                            </span>
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-[#a0b4c4]/70 mt-0.5 truncate max-w-xs sm:max-w-md">
                            {biz.address}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 self-end xs:self-center flex items-center gap-2">
                        {isActive ? (
                          <span className="text-[11px] sm:text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Active Entity</span>
                          </span>
                        ) : (
                          <button className="text-xs text-[#7dd3fc] font-semibold hover:underline">
                            Switch To →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Add New Entity Form */
            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-xs font-semibold text-[#a0b4c4] uppercase tracking-wider">
                  Register New Client / Business Entity
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-xs text-[#a0b4c4] hover:text-white"
                >
                  Back to List
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#a0b4c4] uppercase mb-1">
                    Legal Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zenith Tech Labs Pvt Ltd"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7dd3fc]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a0b4c4] uppercase mb-1">
                    Business Entity Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as BusinessType)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7dd3fc]"
                  >
                    <option value="Private Limited">Private Limited (Companies Act 2013)</option>
                    <option value="LLP">Limited Liability Partnership (LLP Act 2008)</option>
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                    <option value="Partnership">Partnership Firm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a0b4c4] uppercase mb-1">
                    PAN Number (10 Characters) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="e.g. ABCDE1234F"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-[#7dd3fc]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a0b4c4] uppercase mb-1">
                    GSTIN / Tax ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 27ABCDE1234F1Z5"
                    value={taxRegistrationNo}
                    onChange={(e) => setTaxRegistrationNo(e.target.value.toUpperCase())}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-[#7dd3fc]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a0b4c4] uppercase mb-1">
                    Owner / Principal Officer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Anand Kulkarni"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7dd3fc]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a0b4c4] uppercase mb-1">
                    Financial Year
                  </label>
                  <select
                    value={financialYear}
                    onChange={(e) => setFinancialYear(e.target.value)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7dd3fc]"
                  >
                    <option value="2024-25">FY 2024-25</option>
                    <option value="2023-24">FY 2023-24</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-[#a0b4c4] uppercase mb-1">
                    Registered Office Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 501 Tech Park, Whitefield, Bengaluru, KA 560066"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-[#141c2e] border border-[#7dd3fc]/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7dd3fc]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#a0b4c4] hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-[#0e4d6e] to-[#0284c7] hover:from-[#0369a1] hover:to-[#38bdf8] text-white font-bold text-xs rounded-xl border border-[#7dd3fc]/40 shadow-lg flex items-center gap-2 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-base">check</span>
                  <span>Save & Switch to Entity</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#7dd3fc]/15 flex items-center justify-between text-xs text-[#a0b4c4]">
          <div>
            Current Entity: <strong className="text-white">{activeBusiness.name}</strong> (
            <span className="font-mono text-[#7dd3fc]">{activeBusiness.panNumber}</span>)
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl text-xs text-[#a0b4c4] hover:bg-white/5 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
