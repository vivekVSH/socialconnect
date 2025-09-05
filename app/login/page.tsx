'use client';
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAlreadyLoggedIn, setIsAlreadyLoggedIn] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(()=>{
    // Check if already logged in
    (async ()=>{
      const sb = supabaseBrowser();
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        setIsAlreadyLoggedIn(true);
      }
    })();
  }, []);

  // Handle switch_to parameter
  useEffect(() => {
    const switchTo = searchParams.get('switch_to');
    if (switchTo) {
      setIdentifier(decodeURIComponent(switchTo));
    }
  }, [searchParams]);

  const handleLogout = async () => {
    const sb = supabaseBrowser();
    await sb.auth.signOut();
    setIsAlreadyLoggedIn(false);
    // Clear form
    setIdentifier('');
    setPassword('');
  };

  const onSubmit = async (e: any) => {
    e.preventDefault();
    console.log('Login form submitted');
    setLoading(true);
    
    try {
      console.log('Starting login process...');
      const sb = supabaseBrowser();
      let email = identifier;
      
      console.log('Identifier:', identifier);
      
      // If identifier is a username, get the email from profiles
      if (!identifier.includes("@")) {
        console.log('Looking up username...');
        const { data, error } = await sb.from('profiles').select('email').eq('username', identifier).single();
        if (error) {
          console.error('Username lookup error:', error);
          throw new Error("Username not found");
        }
        email = (data as any).email;
        console.log('Found email:', email);
      }

      console.log('Calling login API...');
      // Call the login API endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password
        }),
      });

      console.log('API response status:', response.status);
      const data = await response.json();
      console.log('API response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      console.log('Setting session...');
      // Set the session in the Supabase client
      if (data.session) {
        await sb.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
      }

      console.log('Redirecting...');
      // Redirect to feed or previous page
      const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/feed';
      router.replace(redirectTo);
    } catch (err: any) {
      console.error('Login error:', err);
      alert(err.message);
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full mx-auto card p-6 space-y-4">
        <h1 className="text-2xl font-bold text-center">
          {isAlreadyLoggedIn ? 'Add Another Account' : searchParams.get('switch_to') ? 'Switch Account' : 'Sign In'}
        </h1>
        
        {isAlreadyLoggedIn && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <p className="text-blue-800 dark:text-blue-200 text-sm mb-3">
              You're already logged in. To add another account, please sign out first or use the account switcher in the menu.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm px-3 py-2"
              >
                Sign Out & Add Account
              </button>
              <Link
                href="/feed"
                className="btn text-sm px-3 py-2"
              >
                Go to Feed
              </Link>
            </div>
          </div>
        )}

        {searchParams.get('switch_to') && !isAlreadyLoggedIn && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
            <p className="text-green-800 dark:text-green-200 text-sm">
              Switching to account: <strong>{searchParams.get('switch_to')}</strong>
            </p>
            <p className="text-green-700 dark:text-green-300 text-xs mt-1">
              Please enter your password to complete the switch.
            </p>
          </div>
        )}
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium mb-1">Email or Username</label>
            <input 
              id="identifier"
              className="input" 
              placeholder="Enter your email or username" 
              value={identifier} 
              onChange={e => setIdentifier(e.target.value)} 
              required 
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
            <input 
              id="password"
              className="input" 
              type="password" 
              placeholder="Enter your password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit"
            className={`btn w-full ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600 hover:text-white'}`} 
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        
        <p className="text-sm text-center text-muted">
          No account? <Link href="/register" className="text-blue-400 hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
