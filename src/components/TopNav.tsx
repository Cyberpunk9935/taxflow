import React, { useState } from 'react';
import { User, NotificationItem, Business } from '../types';

interface TopNavProps {
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (user: User) => void;
  financialYear: string;
  onChangeFY: (fy: string) => void;
  notifications: NotificationItem[];
  onSelectTab: (tab: string) => void;
  onOpenHelp: () => void;
  business: Business;
  onOpenEntitySwitcher: () => void;
  onOpenExportModal: () => void;
  onOpenAiScanner: () => void;
  onToggleMobileMenu?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  financialYear,
  onChangeFY,
  notifications,
  onSelectTab,
  onOpenHelp,
  business,
  onOpenEntitySwitcher,
  onOpenExportModal,
  onOpenAiScanner,
  onToggleMobileMenu,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showFYMenu, setShowFYMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fyOptions = ['2024-25', '2023-24'];

  return (
    <header className="sticky top-0 w-full z-40 bg-[#0f1524]/85 backdrop-blur-xl border-b border-[#7dd3fc]/10 shadow-[0_4px_30px_rgba(125,211,252,0.04)] select-none">
      <div className="flex items-center justify-between px-3 sm:px-6 md:px-8 py-2.5 sm:py-3.5 w-full">
        {/* Left: Mobile Drawer Trigger + Entity Switcher & Fiscal Year selector */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Menu Hamburger */}
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-1.5 rounded-lg bg-[#141c2e] border border-[#7dd3fc]/20 text-[#7dd3fc] hover:border-[#7dd3fc]/50 hover:bg-[#0e4d6e]/40 transition-colors flex items-center justify-center shrink-0"
              title="Open Navigation Menu"
            >
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>
          )}

          {/* Active Entity Button */}
          <button
            onClick={onOpenEntitySwitcher}
            title="Click to switch business client or entity"
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#0e4d6e]/40 border border-[#7dd3fc]/30 text-xs font-semibold text-white hover:border-[#7dd3fc] hover:bg-[#0e4d6e]/60 transition-all shadow-[0_0_12px_rgba(125,211,252,0.12)] cursor-pointer group shrink-0"
          >
            <div className="w-5 h-5 rounded bg-[#7dd3fc] text-[#0f1524] text-[10px] font-black flex items-center justify-center shrink-0">
              {business.name.slice(0, 1)}
            </div>
            <span className="max-w-[90px] xs:max-w-[130px] sm:max-w-[180px] md:max-w-[220px] truncate text-left">
              {business.name}
            </span>
            <span className="text-[10px] text-[#7dd3fc] bg-[#141c2e] px-1.5 py-0.5 rounded border border-[#7dd3fc]/20 font-mono hidden md:inline-block">
              {business.panNumber}
            </span>
            <span className="material-symbols-outlined text-xs text-[#7dd3fc] group-hover:translate-y-0.5 transition-transform">
              unfold_more
            </span>
          </button>

          {/* FY Selector */}
          <div className="relative">
            <button
              onClick={() => setShowFYMenu(!showFYMenu)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-[#141c2e]/80 border border-[#7dd3fc]/20 text-xs font-medium text-[#7dd3fc] hover:border-[#7dd3fc]/40 transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-sm hidden xs:inline">calendar_month</span>
              <span className="font-semibold text-[11px] sm:text-xs">FY {financialYear}</span>
              <span className="material-symbols-outlined text-xs text-[#a0b4c4]">expand_more</span>
            </button>

            {showFYMenu && (
              <div className="absolute left-0 mt-2 w-36 glacier-card rounded-lg p-1.5 shadow-xl border border-[#7dd3fc]/20 z-50">
                {fyOptions.map((fy) => (
                  <button
                    key={fy}
                    onClick={() => {
                      onChangeFY(fy);
                      setShowFYMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                      financialYear === fy
                        ? 'bg-[#0e4d6e]/50 text-[#7dd3fc] font-semibold'
                        : 'text-[#a0b4c4] hover:bg-[#1a2438] hover:text-[#e0e8f0]'
                    }`}
                  >
                    <span>FY {fy}</span>
                    {financialYear === fy && <span className="material-symbols-outlined text-xs">check</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Action Cluster: Quick AI Scanner, Export, Role Switcher, Notifications */}
        <div className="flex items-center gap-1 sm:gap-2.5">
          {/* Quick AI OCR Scanner Button */}
          <button
            onClick={onOpenAiScanner}
            title="Scan Receipt with AI OCR"
            className="flex items-center gap-1 p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-sky-500/10 border border-sky-400/30 text-xs font-semibold text-[#7dd3fc] hover:bg-sky-500/20 hover:border-sky-400/50 transition-all shadow-[0_0_12px_rgba(125,211,252,0.1)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">document_scanner</span>
            <span className="hidden md:inline">AI Scanner</span>
          </button>

          {/* Quick Export Current View Button */}
          <button
            onClick={onOpenExportModal}
            title="Export Current View as CSV or JSON"
            className="flex items-center gap-1 p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-[#141c2e] border border-[#7dd3fc]/20 text-xs font-semibold text-[#c8eaff] hover:border-[#7dd3fc]/50 hover:text-white transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-[#7dd3fc]">file_download</span>
            <span className="hidden md:inline">Export</span>
          </button>

          {/* Quick Role Switcher Pill (Visible on sm screens and up) */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              title="Switch user role to test permissions"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1a2438] border border-[#7dd3fc]/20 text-[11px] text-[#7dd3fc] hover:border-[#7dd3fc]/50 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#7dd3fc]"></span>
              <span className="font-mono uppercase font-semibold">{currentUser.role}</span>
              <span className="material-symbols-outlined text-xs text-[#a0b4c4]">swap_horiz</span>
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] glacier-card-elevated rounded-xl p-2 shadow-2xl border border-[#7dd3fc]/30 z-50">
                <div className="px-2 py-1.5 border-b border-[#7dd3fc]/10 mb-1">
                  <p className="text-[11px] font-semibold text-[#7dd3fc]">Simulate Role / User</p>
                  <p className="text-[10px] text-[#a0b4c4]">Switch profiles to test RBAC & filing workflows</p>
                </div>
                {allUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSwitchUser(u);
                      setShowRoleMenu(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                      currentUser.id === u.id
                        ? 'bg-[#0e4d6e]/50 text-[#7dd3fc] font-semibold border border-[#7dd3fc]/20'
                        : 'text-[#e0e8f0] hover:bg-[#1a2438]'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-[#0e4d6e] border border-[#7dd3fc]/30 flex items-center justify-center text-[10px] font-bold text-[#7dd3fc]">
                      {u.avatarUrl || u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{u.name}</p>
                      <p className="text-[10px] text-[#a0b4c4] capitalize">{u.role.toLowerCase()}</p>
                    </div>
                    {currentUser.id === u.id && (
                      <span className="material-symbols-outlined text-xs text-[#7dd3fc]">check</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification Bell with unread badge */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-1.5 sm:p-2 rounded-lg bg-[#1a2438]/50 hover:bg-[#202c42] text-[#a0b4c4] hover:text-[#7dd3fc] border border-[#7dd3fc]/15 transition-colors"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-lg sm:text-xl">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 sm:top-1 sm:right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#7dd3fc] text-[9px] sm:text-[10px] font-bold text-[#001f2e] shadow-[0_0_10px_rgba(125,211,252,0.6)]">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] glacier-card-elevated rounded-xl p-2.5 shadow-2xl border border-[#7dd3fc]/30 z-50">
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#7dd3fc]/10 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#e0e8f0]">Notifications</span>
                    <span className="text-[10px] bg-[#0e4d6e] text-[#7dd3fc] px-1.5 py-0.2 rounded font-mono">
                      {unreadCount} new
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onSelectTab('notifications');
                      setShowNotifMenu(false);
                    }}
                    className="text-[11px] text-[#7dd3fc] hover:underline"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {notifications.slice(0, 4).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        onSelectTab(n.linkPage);
                        setShowNotifMenu(false);
                      }}
                      className={`p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        !n.isRead ? 'bg-[#0e4d6e]/25 border border-[#7dd3fc]/20' : 'hover:bg-[#1a2438]'
                      }`}
                    >
                      <p className="font-semibold text-[#e0e8f0] text-[11px] line-clamp-1">{n.title}</p>
                      <p className="text-[10px] text-[#a0b4c4] mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[9px] text-[#7dd3fc]/70 mt-1 font-mono">{n.createdAt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Help Icon */}
          <button
            onClick={onOpenHelp}
            className="p-1.5 sm:p-2 rounded-lg bg-[#1a2438]/50 hover:bg-[#202c42] text-[#a0b4c4] hover:text-[#7dd3fc] border border-[#7dd3fc]/15 transition-colors hidden xs:flex items-center justify-center"
            aria-label="Help & Advisory Guidance"
            title="Statutory Guidance & Help"
          >
            <span className="material-symbols-outlined text-lg sm:text-xl">help</span>
          </button>

          <div className="h-5 sm:h-6 w-px bg-[#7dd3fc]/15 hidden xs:block"></div>

          {/* User Profile Pill matching Image 1 */}
          <div
            onClick={() => onSelectTab('business')}
            className="flex items-center gap-1.5 sm:gap-3 pl-0.5 sm:pl-1 cursor-pointer group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#0e4d6e] to-[#3d2060] border border-[#7dd3fc]/40 flex items-center justify-center text-[#7dd3fc] font-bold text-xs sm:text-sm shadow-[0_0_10px_rgba(125,211,252,0.2)]">
              {currentUser.avatarUrl || currentUser.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="font-headline text-sm font-semibold text-[#e0e8f0] group-hover:text-[#7dd3fc] transition-colors leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[11px] text-[#7dd3fc]/80 font-medium leading-tight capitalize">
                {currentUser.role === 'OWNER'
                  ? 'Business Owner'
                  : currentUser.role === 'ACCOUNTANT'
                  ? 'Certified Accountant'
                  : 'System Administrator'}
              </span>
            </div>
            <span className="material-symbols-outlined text-xs text-[#a0b4c4] ml-0.5 hidden sm:inline">arrow_drop_down</span>
          </div>
        </div>
      </div>
    </header>
  );
};
