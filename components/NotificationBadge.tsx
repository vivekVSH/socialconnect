'use client';
import Link from 'next/link';
import { useNotifications } from '@/lib/useNotifications';

interface NotificationBadgeProps {
  className?: string;
}

export default function NotificationBadge({ className = '' }: NotificationBadgeProps) {
  const { unreadCount, loading } = useNotifications();

  if (loading) {
    return (
      <div className={`w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse ${className}`} />
    );
  }

  return (
    <Link 
      href="/notifications" 
      className={`relative inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-105 ${className}`}
      title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
    >
      <svg 
        className={`w-4 h-4 text-slate-600 dark:text-slate-400 transition-colors ${unreadCount > 0 ? 'text-blue-600 dark:text-blue-400' : ''}`}
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M15 17h5l-5 5v-5zM4.5 19.5a2.5 2.5 0 01-2.5-2.5V7a2.5 2.5 0 012.5-2.5h9a2.5 2.5 0 012.5 2.5v10a2.5 2.5 0 01-2.5 2.5h-9z" 
        />
      </svg>
      
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[16px] h-4 animate-bounce shadow-md">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}