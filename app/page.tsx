'use client';
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser, createPost } from "@/lib/supabaseClient";

export default function Home() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'login' | 'register'>('register');
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register form state
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');

  // Composer state (shown once authenticated)
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [category, setCategory] = useState('general');
  const [postLoading, setPostLoading] = useState(false);
  const [postMessage, setPostMessage] = useState('');

  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      const { data: { user } } = await sb.auth.getUser();
      setSessionUserId(user?.id || null);
      setLoadingSession(false);
    })();
  }, []);

  // Handle URL parameters for tab switching
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'login' || tabParam === 'register') {
      setTab(tabParam);
      // Scroll to the forms section
      setTimeout(() => {
        const homePage = document.getElementById('home-page');
        if (homePage) {
          homePage.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const sb = supabaseBrowser();
      let emailToUse = identifier;
      if (!identifier.includes('@')) {
        const { data, error } = await sb
          .from('profiles')
          .select('email')
          .eq('username', identifier)
          .single();
        if (error) {
          setLoginError('Username not found');
          return;
        }
        emailToUse = (data as any).email as string;
      }

      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse, password: loginPassword })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setLoginError(data.error || 'Login failed');
        return;
      }
      if (data.session) {
        await sb.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
      }
      const { data: { user } } = await sb.auth.getUser();
      setSessionUserId(user?.id || null);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError('');
    setRegisterSuccess('');
    try {
      if (password.length < 6) {
        setRegisterError('Password must be at least 6 characters long');
        return;
      }
      if (!username.match(/^[A-Za-z0-9_]{3,30}$/)) {
        setRegisterError('Username must be 3-30 characters, letters/numbers/underscores only');
        return;
      }
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        setRegisterError('Please enter a valid email address');
        return;
      }

      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          username: username.trim(),
          first_name: first.trim(),
          last_name: last.trim()
        })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setRegisterError(data.error || 'Registration failed');
        return;
      }
      setRegisterSuccess('Registration successful! Please sign in below.');
      setTab('login');
    } catch (err: any) {
      setRegisterError(err.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostLoading(true);
    setPostMessage('');
    try {
      await createPost(content, imageFile, category);
      setContent('');
      setImageFile(null);
      setCategory('general');
      setPostMessage('Post created!');
    } catch (err: any) {
      setPostMessage(err.message || 'Failed to create post');
    } finally {
      setPostLoading(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-muted mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show a simple composer directly on the home page
  if (sessionUserId) {
    return (
      <div className="max-w-lg mx-auto card p-6 space-y-4">
        <h1 className="text-xl font-semibold">Create Post</h1>
        {postMessage && (
          <div className={`text-sm ${postMessage.includes('created') ? 'text-green-400' : 'text-red-400'}`}>
            {postMessage}
          </div>
        )}
        <form onSubmit={handleCreatePost} className="space-y-3">
          <textarea
            className="input"
            placeholder="What's happening?"
            maxLength={280}
            value={content}
            onChange={e => setContent(e.target.value)}
            required
          />
          <input type="file" accept="image/png,image/jpeg" onChange={e=>setImageFile(e.target.files?.[0] || null)} />
          <select className="input" value={category} onChange={e=>setCategory(e.target.value)}>
            <option value="general">General</option>
            <option value="announcement">Announcement</option>
            <option value="question">Question</option>
          </select>
          <button className="btn w-full" disabled={postLoading}>{postLoading ? 'Posting...' : 'Post'}</button>
        </form>
      </div>
    );
  }

  // Otherwise, show signup/login forms inline
  return (
    <div id="home-page" className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-xl w-full mx-auto card p-6 space-y-6">
        <h1 className="text-3xl font-bold text-center text-white mb-8">Welcome to SocialConnect</h1>
        
        <div className="flex gap-2">
          <button
            data-tab="register"
            className={`btn flex-1 ${tab === 'register' ? '' : 'bg-neutral-700 hover:bg-neutral-600'}`}
            onClick={() => setTab('register')}
          >
            Create account
          </button>
          <button
            data-tab="login"
            className={`btn flex-1 ${tab === 'login' ? '' : 'bg-neutral-700 hover:bg-neutral-600'}`}
            onClick={() => setTab('login')}
          >
            Sign in
          </button>
        </div>

      {tab === 'register' ? (
        <form onSubmit={handleRegister} className="space-y-4">
          {registerSuccess && (
            <div className="bg-green-500/10 border border-green-500 text-green-500 p-3 rounded">{registerSuccess}</div>
          )}
          {registerError && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded">{registerError}</div>
          )}
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium mb-1">Email</label>
            <input id="reg-email" type="email" className="input" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required disabled={registerLoading} />
          </div>
          <div>
            <label htmlFor="reg-username" className="block text-sm font-medium mb-1">Username</label>
            <input id="reg-username" className="input" placeholder="username" value={username} onChange={e=>setUsername(e.target.value)} minLength={3} maxLength={30} required disabled={registerLoading} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-first" className="block text-sm font-medium mb-1">First name</label>
              <input id="reg-first" className="input" placeholder="First name" value={first} onChange={e=>setFirst(e.target.value)} disabled={registerLoading} />
            </div>
            <div>
              <label htmlFor="reg-last" className="block text-sm font-medium mb-1">Last name</label>
              <input id="reg-last" className="input" placeholder="Last name" value={last} onChange={e=>setLast(e.target.value)} disabled={registerLoading} />
            </div>
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium mb-1">Password</label>
            <input id="reg-password" type="password" className="input" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required disabled={registerLoading} />
          </div>
          <button type="submit" className="btn w-full" disabled={registerLoading}>{registerLoading ? 'Creating account...' : 'Create Account'}</button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          {loginError && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded">{loginError}</div>
          )}
          <div>
            <label htmlFor="login-id" className="block text-sm font-medium mb-1">Email or Username</label>
            <input id="login-id" className="input" placeholder="you@example.com or username" value={identifier} onChange={e=>setIdentifier(e.target.value)} required disabled={loginLoading} />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium mb-1">Password</label>
            <input id="login-password" type="password" className="input" placeholder="••••••••" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required disabled={loginLoading} />
          </div>
          <button type="submit" className="btn w-full" disabled={loginLoading}>{loginLoading ? 'Signing in...' : 'Sign In'}</button>
        </form>
      )}
      </div>
    </div>
  );
}
