'use client';
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import NotificationBadge from "@/components/NotificationBadge";
import { useAuth } from "@/lib/useAuth";
import AccountManager from "@/lib/accountManager";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  prefetch?: boolean;
}

const navItems: NavItem[] = [
  { href: "/feed", label: "Feed", icon: "home", prefetch: true },
  { href: "/explore", label: "Explore", icon: "trending", prefetch: true },
  { href: "/search", label: "Search", icon: "search", prefetch: true },
  { href: "/messages", label: "Messages", icon: "messages", prefetch: true },
  { href: "/compose", label: "Create", icon: "add", prefetch: true },
];

const adminNavItems: NavItem[] = [
  { href: "/admin", label: "Admin", icon: "admin", adminOnly: true, prefetch: true },
];

export default function Navbar() {
  const { user, profile, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const accountManager = AccountManager.getInstance();

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Load accounts and update when user changes
  useEffect(() => {
    if (user && profile) {
      // Add current user to account manager
      accountManager.addAccount({
        id: user.id,
        email: user.email || '',
        username: profile.username || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        avatar_url: profile.avatar_url || undefined,
        last_login: new Date().toISOString()
      });
      
      // Update accounts list
      setAccounts(accountManager.getAccounts());
    }
  }, [user, profile]);

  const handleLogout = async () => {
    try {
      await logout();
      accountManager.clearAllAccounts();
      setAccounts([]);
      // Force redirect to homepage
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      window.location.href = '/';
    }
  };

  const handleAddAccount = () => {
    setIsUserMenuOpen(false);
    
    // Redirect to login page for adding existing accounts
    window.location.href = '/login';
  };

  const handleSwitchAccount = async (accountId: string) => {
    const accountToSwitch = accountManager.getAccountToSwitchTo(accountId);
    if (!accountToSwitch) return;

    // If trying to switch to the same account, do nothing
    if (accountToSwitch.id === user?.id) {
      setIsAccountMenuOpen(false);
      return;
    }

    try {
      // Log out current user
      await logout();
      
      // Clear current accounts
      accountManager.clearAllAccounts();
      setAccounts([]);
      
      // Redirect to login page with account info for easier switching
      const loginUrl = `/login?switch_to=${encodeURIComponent(accountToSwitch.email || accountToSwitch.username)}`;
      window.location.href = loginUrl;
    } catch (error) {
      console.error('Error switching accounts:', error);
      // Fallback: just redirect to login
      window.location.href = '/login';
    }
  };

  const isActive = (href: string) => {
    if (href === '/feed' && pathname === '/') return true;
    return pathname.startsWith(href);
  };

  const getIcon = (iconName: string) => {
    const iconClass = "w-4 h-4";
    switch (iconName) {
      case "home":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case "trending":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case "search":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case "messages":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case "add":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
      case "admin":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const NavLink = ({ item }: { item: NavItem }) => (
    <Link
      href={item.href}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group relative
        ${isActive(item.href)
          ? 'bg-blue-500 text-white shadow-md'
          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
        }
      `}
      prefetch={item.prefetch}
      title={item.label}
    >
      <span className={`transition-all duration-200 ${isActive(item.href) ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>
        {getIcon(item.icon)}
      </span>
      <span className="hidden md:block text-xs font-medium">{item.label}</span>
    </Link>
  );

  const MobileMenuButton = () => (
    <button
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-200"
      aria-label="Toggle mobile menu"
    >
      <svg
        className={`w-5 h-5 transition-all duration-200 ${isMobileMenuOpen ? 'rotate-90' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
        />
      </svg>
    </button>
  );

  const UserMenu = () => (
    <div className="relative" ref={userMenuRef}>
      <button
        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
        className="flex items-center gap-2 p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-200 group"
      >
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={`${profile.username}'s avatar`}
            width={32}
            height={32}
            className="rounded-lg border border-slate-200 dark:border-slate-700 group-hover:border-blue-300 dark:group-hover:border-blue-500 transition-all duration-200"
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
            {profile?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="hidden sm:block text-left">
          <div className="font-medium text-xs text-slate-900 dark:text-white">
            {profile?.first_name || profile?.username || 'User'}
          </div>
        </div>
        <svg
          className={`w-4 h-4 transition-all duration-200 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 ${isUserMenuOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isUserMenuOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* User Info Header */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={`${profile.username}'s avatar`}
                  width={48}
                  height={48}
                  className="rounded-full border-2 border-slate-200 dark:border-slate-600"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-lg font-semibold text-white ring-2 ring-slate-200 dark:ring-slate-600">
                  {profile?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white truncate">
                  {profile?.first_name && profile?.last_name 
                    ? `${profile.first_name} ${profile.last_name}`
                    : profile?.username || 'User'
                  }
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">@{profile?.username || 'user'}</p>
                {profile?.is_admin && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                    Administrator
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              href={`/users/${user?.id}`}
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors group"
              onClick={() => setIsUserMenuOpen(false)}
            >
              <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>View Profile</span>
            </Link>
            
            <Link
              href={`/users/${user?.id}/edit`}
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors group"
              onClick={() => setIsUserMenuOpen(false)}
            >
              <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Edit Profile</span>
            </Link>
            
            <Link
              href="/notifications"
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors group"
              onClick={() => setIsUserMenuOpen(false)}
            >
              <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.5 19.5a2.5 2.5 0 01-2.5-2.5V7a2.5 2.5 0 012.5-2.5h9a2.5 2.5 0 012.5 2.5v10a2.5 2.5 0 01-2.5 2.5h-9z" />
              </svg>
              <span>Notifications</span>
            </Link>
            
            <div className="border-t border-slate-200 dark:border-slate-700 py-2">
              <button
                className="flex items-center gap-3 px-4 py-3 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-800 dark:hover:text-green-300 transition-colors group w-full text-left"
                onClick={handleAddAccount}
              >
                <svg className="w-4 h-4 text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Account</span>
              </button>
              
              {accounts.length > 1 ? (
                <div className="relative">
                  <button
                    className="flex items-center gap-3 px-4 py-3 text-sm text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-800 dark:hover:text-blue-300 transition-colors group w-full text-left"
                    onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  >
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    <span>Switch Account ({accounts.length})</span>
                    <svg className={`w-4 h-4 ml-auto transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isAccountMenuOpen && (
                    <div className="absolute left-0 right-0 top-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-50 mt-1">
                      {accounts.map((account) => (
                        <button
                          key={account.id}
                          className={`flex items-center gap-3 px-4 py-3 text-sm w-full text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                            account.id === user?.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'
                          }`}
                          onClick={() => {
                            handleSwitchAccount(account.id);
                            setIsAccountMenuOpen(false);
                            setIsUserMenuOpen(false);
                          }}
                        >
                          <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden flex-shrink-0">
                            {account.avatar_url ? (
                              <Image
                                src={account.avatar_url}
                                alt={account.username}
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-400 dark:bg-slate-500 flex items-center justify-center text-xs font-semibold text-white">
                                {account.username?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {account.first_name} {account.last_name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              @{account.username}
                            </div>
                          </div>
                          {account.id === user?.id && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                              Current
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed w-full text-left"
                  disabled
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  <span>Switch Account (1)</span>
                </button>
              )}
            </div>
            
            {profile?.is_admin && (
              <Link
                href="/admin"
                className="flex items-center gap-3 px-4 py-3 text-sm text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-800 dark:hover:text-blue-300 transition-colors group"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Admin Panel</span>
              </Link>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-slate-200 dark:border-slate-700 py-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 transition-colors w-full text-left group"
            >
              <svg className="w-4 h-4 text-red-500 group-hover:text-red-600 dark:group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const UnauthenticatedNav = () => (
    <nav className="flex items-center gap-3">
      <button 
        onClick={() => {
          // Redirect to login page
          window.location.href = '/login';
        }}
        className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-200 font-medium px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60"
      >
        Sign In
      </button>
      <button 
        onClick={() => {
          // Redirect to register page
          window.location.href = '/register';
        }}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
      >
        Get Started
      </button>
    </nav>
  );

  // Show navbar on all pages including homepage

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            href={user ? "/feed" : "/"} 
            className="flex items-center gap-3 font-bold text-xl text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-all duration-200 shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <span className="hidden sm:block font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-blue-800 dark:group-hover:from-blue-400 dark:group-hover:to-blue-300 transition-all duration-200">
              {process.env.NEXT_PUBLIC_APP_NAME || "SocialConnect"}
            </span>
          </Link>

          {/* Desktop Navigation */}
          {user ? (
            <>
              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
                {profile?.is_admin && adminNavItems.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
                <div className="ml-2 pl-2 border-l border-slate-200 dark:border-slate-700 flex items-center gap-1">
                  <NotificationBadge className="hover:bg-blue-50 dark:hover:bg-blue-900/20" />
                </div>
              </nav>

              {/* User Menu */}
              <div className="hidden lg:block">
                <UserMenu />
              </div>

              {/* Mobile Menu Button */}
              <MobileMenuButton />
            </>
          ) : (
            <UnauthenticatedNav />
          )}
        </div>

        {/* Mobile Navigation */}
        {user && isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 py-4 bg-slate-50 dark:bg-slate-800/50 -mx-4 px-4">
            <nav className="grid grid-cols-2 gap-2">
              {navItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
              {profile?.is_admin && adminNavItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <UserMenu />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
