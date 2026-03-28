"use client";

import { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCheck, ShoppingBag, Stethoscope, Package } from 'lucide-react';
import { useAdminNotifications } from '@/context/NotificationsContext';
import { useRouter } from 'next/navigation';

function timeAgo(ts: any): string {
  if (!ts) return '';
  const ms: number = ts?.toMillis ? ts.toMillis() : (ts.seconds ?? 0) * 1000;
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function EventIcon({ eventType }: { eventType: string }) {
  if (eventType.includes('order')) return <ShoppingBag size={14} className="text-emerald-500 shrink-0 mt-0.5" />;
  if (eventType.includes('consultation')) return <Stethoscope size={14} className="text-blue-500 shrink-0 mt-0.5" />;
  return <Package size={14} className="text-slate-400 shrink-0 mt-0.5" />;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useAdminNotifications();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClickItem = (n: { id: string; read: boolean; deepLink?: string }) => {
    if (!n.read) markRead(n.id);
    if (n.deepLink) router.push(n.deepLink);
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-3.5 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-emerald-600 font-semibold hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)}>
                <X size={15} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <CheckCheck size={28} className="text-slate-300 dark:text-slate-600" />
                <p className="text-xs text-slate-400 dark:text-slate-500">All caught up!</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickItem(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                    !n.read ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''
                  }`}
                >
                  <EventIcon eventType={n.eventType} />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[13px] leading-snug ${
                        !n.read
                          ? 'font-semibold text-slate-800 dark:text-slate-100'
                          : 'font-medium text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {n.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5 line-clamp-2">
                      {n.body}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
