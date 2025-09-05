'use client';
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";

interface UserMenuProps {
  user: any;
  profile: any;
}

export default function UserMenu({ user, profile }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const sb = supabaseBrowser();
      await sb.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-muted hover:text-white transition-colors p-2 rounded-lg hover:bg-neutral-800"
      >
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={`${profile.username}'s avatar`}
            width={32}
            height={32}
            className="rounded-full border border-neutral-700"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
            {profile?.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden sm:block font-medium">@{profile?.username || 'user'}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-neutral-700">
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={`${profile.username}'s avatar`}
                  width={48}
                  height={48}
                  className="rounded-full border border-neutral-700"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white">
                  {profile?.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">
                  {profile?.first_name && profile?.last_name 
                    ? `${profile.first_name} ${profile.last_name}`
                    : profile?.username || 'User'
                  }
                </p>
                <p className="text-sm text-muted truncate">@{profile?.username || 'user'}</p>
              </div>
            </div>
          </div>

          <div className="py-2">
            <Link
              href={`/users/${user.id}`}
              className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <span>👤</span>
              <span>View Profile</span>
            </Link>
            
            <Link
              href={`/users/${user.id}/edit`}
              className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <span>⚙️</span>
              <span>Edit Profile</span>
            </Link>
            
            <Link
              href="/notifications"
              className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <span>🔔</span>
              <span>Notifications</span>
            </Link>
            
            {profile?.is_admin && (
              <Link
                href="/admin"
                className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <span>🛠️</span>
                <span>Admin Panel</span>
              </Link>
            )}
          </div>

          <div className="border-t border-neutral-700 py-2">
            <button
              onClick={handleLogout}
              disabled={loading}
              className="flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors w-full text-left"
            >
              <span>🚪</span>
              <span>{loading ? 'Logging out...' : 'Logout'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
