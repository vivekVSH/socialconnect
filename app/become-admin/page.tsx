'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/useAuth';
import Link from 'next/link';

export default function BecomeAdminPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (profile?.is_admin) {
      setIsAdmin(true);
    }
  }, [profile]);

  const makeAdmin = async () => {
    if (!user) {
      setMessage('Please log in first');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/setup-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage('✅ You are now an admin! Redirecting...');
        setIsAdmin(true);
        setTimeout(() => {
          window.location.href = '/admin';
        }, 2000);
      } else {
        setMessage('❌ Error: ' + result.error);
      }
    } catch (err) {
      setMessage('❌ Error: ' + err);
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="card p-8 text-center">
          <div className="text-6xl mb-4">👑</div>
          <h1 className="text-3xl font-bold text-green-400 mb-4">You're Already an Admin!</h1>
          <p className="text-muted mb-6">You have full admin access to the platform.</p>
          <div className="space-y-4">
            <Link href="/admin" className="btn w-full">
              Go to Admin Dashboard
            </Link>
            <Link href="/feed" className="btn-secondary w-full">
              Back to Feed
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="card p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-3xl font-bold mb-4">Become an Admin</h1>
          <p className="text-muted">
            Get admin access to manage users, content, and platform settings.
          </p>
        </div>

        {user ? (
          <div className="space-y-6">
            <div className="bg-neutral-800 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Your Account</h3>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>User ID:</strong> {user.id}</p>
            </div>

            <div className="text-center">
              <button
                onClick={makeAdmin}
                disabled={loading}
                className="btn bg-blue-600 hover:bg-blue-700 text-white w-full"
              >
                {loading ? 'Making You Admin...' : 'Make Me Admin'}
              </button>
            </div>

            {message && (
              <div className={`p-4 rounded-lg text-center ${
                message.includes('✅') 
                  ? 'bg-green-900/20 border border-green-500 text-green-400'
                  : 'bg-red-900/20 border border-red-500 text-red-400'
              }`}>
                {message}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-muted mb-4">Please log in to become an admin</p>
            <Link href="/login" className="btn">Login</Link>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-neutral-700">
          <h3 className="font-semibold mb-3">Admin Features Include:</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li>• View and manage all users</li>
            <li>• Moderate posts and comments</li>
            <li>• Access platform analytics</li>
            <li>• Manage user permissions</li>
            <li>• View detailed statistics</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
