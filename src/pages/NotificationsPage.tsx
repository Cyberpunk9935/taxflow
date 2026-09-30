import React, { useState, useMemo } from 'react';
import { NotificationItem, NotificationType } from '../types';

interface NotificationsPageProps {
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onSelectTab: (tab: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectTab,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filterType !== 'ALL' && n.type !== filterType) return false;
      return true;
    });
  }, [notifications, filterType]);

  const todayNotifs = filtered.filter((n) => n.createdAt.toLowerCase().includes('today'));
  const earlierNotifs = filtered.filter((n) => !n.createdAt.toLowerCase().includes('today'));

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'DEADLINE':
        return { icon: 'schedule', color: 'text-amber-800', bg: 'bg-amber-100' };
      case 'MISSING_DOC':
        return { icon: 'folder_open', color: 'text-red-800', bg: 'bg-red-100' };
      case 'STATUS_CHANGE':
        return { icon: 'assignment_turned_in', color: 'text-[#1E3A8A]', bg: 'bg-blue-100' };
      case 'UNVERIFIED_TX':
        return { icon: 'sync', color: 'text-purple-800', bg: 'bg-purple-100' };
      default:
        return { icon: 'notifications', color: 'text-[#596579]', bg: 'bg-[#FAF8F2]' };
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-[#1B2430]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B2430] font-headline">Compliance & Action Alerts</h2>
          <p className="text-xs text-[#596579] mt-0.5">
            Audit observations, statutory due dates, and document verification reminders
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#1B2430]"
          >
            <option value="ALL">All Categories</option>
            <option value="DEADLINE">Deadlines</option>
            <option value="MISSING_DOC">Missing Documents</option>
            <option value="STATUS_CHANGE">Filing Status Changes</option>
            <option value="UNVERIFIED_TX">Reconciliations</option>
          </select>

          <button
            onClick={onMarkAllAsRead}
            className="text-xs text-[#1E3A8A] hover:underline font-semibold cursor-pointer"
          >
            Mark All Read
          </button>
        </div>
      </div>

      {/* Today Group */}
      <div className="bg-[#FFFFFF] rounded-2xl p-5 border border-[#DED8CA] shadow-2xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A]">Today</h3>
        {todayNotifs.length === 0 ? (
          <p className="text-xs text-[#596579] py-3">No new notifications today.</p>
        ) : (
          <div className="space-y-2">
            {todayNotifs.map((n) => {
              const style = getTypeIcon(n.type);
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    onMarkAsRead(n.id);
                    onSelectTab(n.linkPage);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                    !n.isRead
                      ? 'bg-[#FAF8F2] border-[#C8BFAD] hover:border-[#1B2430]'
                      : 'bg-[#FFFFFF] border-[#EFECE3] hover:bg-[#FAF8F2]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg} ${style.color}`}
                    >
                      <span className="material-symbols-outlined text-lg">{style.icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1B2430]">{n.title}</span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#1E3A8A]"></span>
                        )}
                      </div>
                      <p className="text-xs text-[#596579] mt-0.5 leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-[#8C7A6B] font-mono mt-1 block">
                        {n.createdAt}
                      </span>
                    </div>
                  </div>

                  <span className="material-symbols-outlined text-sm text-[#8C7A6B]">
                    chevron_right
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Earlier Group */}
      <div className="bg-[#FFFFFF] rounded-2xl p-5 border border-[#DED8CA] shadow-2xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#596579]">Earlier</h3>
        {earlierNotifs.length === 0 ? (
          <p className="text-xs text-[#596579] py-3">No earlier alerts.</p>
        ) : (
          <div className="space-y-2">
            {earlierNotifs.map((n) => {
              const style = getTypeIcon(n.type);
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    onMarkAsRead(n.id);
                    onSelectTab(n.linkPage);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                    !n.isRead
                      ? 'bg-[#FAF8F2] border-[#C8BFAD]'
                      : 'bg-[#FFFFFF] border-[#EFECE3] hover:bg-[#FAF8F2]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg} ${style.color}`}
                    >
                      <span className="material-symbols-outlined text-lg">{style.icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1B2430]">{n.title}</span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#1E3A8A]"></span>
                        )}
                      </div>
                      <p className="text-xs text-[#596579] mt-0.5 leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-[#8C7A6B] font-mono mt-1 block">
                        {n.createdAt}
                      </span>
                    </div>
                  </div>

                  <span className="material-symbols-outlined text-sm text-[#8C7A6B]">
                    chevron_right
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
