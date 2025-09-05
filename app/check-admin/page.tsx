'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/useAuth';
import Link from 'next/link';

export default function CheckAdminPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      if (authLoading) {
        return;
      }

      if (!user) {
        setError('Not logged in');
        setLoading(false);
        return;
      }

      try {
        const sb = supabaseBrowser();
        const { data, error } = await sb
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          throw error;
        }

        setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, authLoading]);

  const makeAdmin = async () => {
    try {
      const response = await fetch('/api/setup-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        alert('You are now an admin!');
        window.location.reload();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      alert('Error making admin: ' + err);
    }
  };

  if (loading || authLoading) {
    return <div className="max-w-2xl mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Status Check</h1>
      
      {error && <div className="form-error mb-4">Error: {error}</div>}

      {!user && !error && (
        <div className="text-muted text-center py-8">
          <p>You are not logged in.</p>
          <Link href="/login" className="btn mt-4">Login</Link>
        </div>
      )}

      {user && profile && (
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="text-xl font-semibold mb-2">Your User Info</h2>
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Username:</strong> {profile.username}</p>
            <p><strong>Is Admin:</strong> 
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                profile.is_admin 
                  ? 'bg-green-900 text-green-400' 
                  : 'bg-red-900 text-red-400'
              }`}>
                {profile.is_admin ? 'YES' : 'NO'}
              </span>
            </p>
          </div>

          {!profile.is_admin && (
            <div className="card p-4">
              <h2 className="text-xl font-semibold mb-2">Make Yourself Admin</h2>
              <p className="text-muted mb-4">Click the button below to make yourself an admin:</p>
              <button
                onClick={makeAdmin}
                className="btn bg-green-600 hover:bg-green-700 text-white"
              >
                Make Me Admin
              </button>
            </div>
          )}

          {profile.is_admin && (
            <div className="card p-4">
              <h2 className="text-xl font-semibold mb-2">Admin Access</h2>
              <p className="text-green-400 mb-4">✅ You have admin access!</p>
              <Link href="/admin" className="btn bg-blue-600 hover:bg-blue-700 text-white">
                Go to Admin Dashboard
              </Link>
            </div>
          )}

          <div className="card p-4">
            <h2 className="text-xl font-semibold mb-2">Raw Profile Data</h2>
            <pre className="bg-neutral-800 p-3 rounded-md text-sm overflow-x-auto">
              <code>{JSON.stringify(profile, null, 2)}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}