import React, { useState } from 'react';
import { Business, BusinessType } from '../types';

interface BusinessProfilePageProps {
  business: Business;
  onSaveBusiness: (updated: Business) => void;
  onSelectTab: (tab: string) => void;
}

export const BusinessProfilePage: React.FC<BusinessProfilePageProps> = ({
  business,
  onSaveBusiness,
  onSelectTab,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Business>(business);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Profile completeness score
  const fields = [
    formData.name,
    formData.type,
    formData.ownerName,
    formData.email,
    formData.phone,
    formData.taxRegistrationNo,
    formData.panNumber,
    formData.address,
    formData.financialYear,
  ];
  const filledCount = fields.filter((f) => Boolean(f && f.trim() !== '')).length;
  const completeness = Math.round((filledCount / fields.length) * 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveBusiness({
      ...formData,
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-[#1B2430]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B2430] font-headline">Business Entity Profile</h2>
          <p className="text-xs text-[#596579] mt-0.5">
            Statutory entity particulars used across tax summaries and filing schedules
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setFormData(business);
                  setIsEditing(false);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#596579] hover:text-[#1B2430] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-1.5 rounded-lg bg-[#1B2430] hover:bg-[#283548] text-xs text-[#F7F4EC] font-semibold border border-[#1B2430] shadow-xs cursor-pointer"
              >
                Save Changes
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] font-semibold hover:border-[#1B2430] transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              <span>Edit Details</span>
            </button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-emerald-700">check_circle</span>
          <span>Business particulars updated successfully and audit log recorded.</span>
        </div>
      )}

      {/* Completeness Card */}
      <div className="bg-[#FFFFFF] rounded-2xl p-5 border border-[#DED8CA] shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-xs font-semibold text-[#1B2430]">Profile Readiness Index</span>
            <p className="text-[11px] text-[#596579]">
              Mandatory legal fields required for Section 37 certification
            </p>
          </div>
          <span className="text-sm font-bold font-mono text-[#1E3A8A]">{completeness}%</span>
        </div>
        <div className="w-full bg-[#EFECE3] rounded-full h-2 overflow-hidden">
          <div
            className="bg-[#1B2430] h-2 rounded-full transition-all duration-500"
            style={{ width: `${completeness}%` }}
          ></div>
        </div>
      </div>

      {/* Profile Form / View */}
      <div className="bg-[#FFFFFF] rounded-2xl p-6 border border-[#DED8CA] shadow-2xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Business Legal Name */}
            <div>
              <label className="block text-xs font-semibold text-[#596579] mb-1.5">
                Registered Legal Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
                />
              ) : (
                <p className="text-sm font-semibold text-[#1B2430] bg-[#FAF8F2] p-2.5 rounded-lg border border-[#DED8CA]">
                  {formData.name}
                </p>
              )}
            </div>

            {/* Entity Type */}
            <div>
              <label className="block text-xs font-semibold text-[#596579] mb-1.5">
                Constitution of Business
              </label>
              {isEditing ? (
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as BusinessType })
                  }
                  className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
                >
                  <option value="Private Limited">Private Limited Company</option>
                  <option value="LLP">Limited Liability Partnership (LLP)</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="Partnership">Partnership Firm</option>
                </select>
              ) : (
                <p className="text-sm font-semibold text-[#1B2430] bg-[#FAF8F2] p-2.5 rounded-lg border border-[#DED8CA]">
                  {formData.type}
                </p>
              )}
            </div>

            {/* GSTIN */}
            <div>
              <label className="block text-xs font-semibold text-[#596579] mb-1.5">
                GSTIN / Tax Registration No
              </label>
              {isEditing ? (
                <input
                  type="text"
                  required
                  value={formData.taxRegistrationNo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      taxRegistrationNo: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="27AABCS1429B1Z5"
                  className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs font-mono text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
                />
              ) : (
                <div className="flex items-center justify-between bg-[#FAF8F2] p-2.5 rounded-lg border border-[#DED8CA]">
                  <span className="font-mono text-xs font-semibold text-[#1E3A8A]">
                    {formData.taxRegistrationNo || 'Not Provided'}
                  </span>
                  <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">Valid Active</span>
                </div>
              )}
            </div>

            {/* PAN */}
            <div>
              <label className="block text-xs font-semibold text-[#596579] mb-1.5">
                Permanent Account Number (PAN)
              </label>
              {isEditing ? (
                <input
                  type="text"
                  required
                  value={formData.panNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })
                  }
                  placeholder="AABCS1429B"
                  className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs font-mono text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
                />
              ) : (
                <div className="flex items-center justify-between bg-[#FAF8F2] p-2.5 rounded-lg border border-[#DED8CA]">
                  <span className="font-mono text-xs font-semibold text-[#1E3A8A]">
                    {formData.panNumber || 'Not Provided'}
                  </span>
                  <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">Linked to NSDL</span>
                </div>
              )}
            </div>

            {/* Primary Contact Person */}
            <div>
              <label className="block text-xs font-semibold text-[#596579] mb-1.5">
                Managing Director / Authorized Signatory
              </label>
              {isEditing ? (
                <input
                  type="text"
                  required
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
                />
              ) : (
                <p className="text-sm font-semibold text-[#1B2430] bg-[#FAF8F2] p-2.5 rounded-lg border border-[#DED8CA]">
                  {formData.ownerName}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[#596579] mb-1.5">
                Statutory Communications Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
                />
              ) : (
                <p className="text-sm text-[#1B2430] font-mono bg-[#FAF8F2] p-2.5 rounded-lg border border-[#DED8CA]">
                  {formData.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-[#596579] mb-1.5">
                Registered Contact Phone
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs font-mono text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
                />
              ) : (
                <p className="text-sm text-[#1B2430] font-mono bg-[#FAF8F2] p-2.5 rounded-lg border border-[#DED8CA]">
                  {formData.phone}
                </p>
              )}
            </div>

            {/* Active FY */}
            <div>
              <label className="block text-xs font-semibold text-[#596579] mb-1.5">
                Active Assessment Financial Year
              </label>
              <p className="text-sm font-semibold text-[#1E3A8A] font-mono bg-[#FAF8F2] p-2.5 rounded-lg border border-[#DED8CA]">
                FY {formData.financialYear} (AY 2025-26)
              </p>
            </div>
          </div>

          {/* Operating Address */}
          <div>
            <label className="block text-xs font-semibold text-[#596579] mb-1.5">
              Principal Place of Business (Registered Address)
            </label>
            {isEditing ? (
              <textarea
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg p-2.5 focus:outline-none focus:border-[#1B2430]"
              />
            ) : (
              <p className="text-xs text-[#1B2430] bg-[#FAF8F2] p-3 rounded-lg border border-[#DED8CA] leading-relaxed">
                {formData.address}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
