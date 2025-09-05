'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/navigation';

export default function SetupAdminPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth();
  const router = useRouter();

  const makeAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const sb = supabaseBrowser();
      
      // First, check if the user exists
      const { data: profile, error: fetchError } = await sb
        .from('profiles')
        .select('id, email, username, is_admin')
        .eq('email', email.toLowerCase())
        .single();

      if (fetchError || !profile) {
        setError('User not found with that email address');
        setLoading(false);
        return;
      }

      if ((profile as any).is_admin) {
        setMessage('This user is already an admin');
        setLoading(false);
        return;
      }

      // Update the user to be an admin
      const { error: updateError } = await (sb as any)
        .from('profiles')
        .update({ is_admin: true })
        .eq('email', email.toLowerCase());

      if (updateError) {
        throw updateError;
      }

      setMessage(`Success! ${(profile as any).username} (${(profile as any).email}) is now an admin.`);
      setEmail('');
      
      // If this is the current user, redirect to admin page
      if (user?.email === email.toLowerCase()) {
        setTimeout(() => {
          router.push('/admin');
        }, 2000);
      }
    } catch (err) {
      console.error('Error making user admin:', err);
      setError('Failed to make user admin. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const makeCurrentUserAdmin = async () => {
    if (!user) {
      setError('You must be logged in to make yourself an admin');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const sb = supabaseBrowser();
      
      // First, check current profile
      const { data: currentProfile, error: fetchError } = await sb
        .from('profiles')
        .select('id, email, username, is_admin')
        .eq('id', user.id)
        .single();

      console.log('Current profile:', currentProfile);
      console.log('Fetch error:', fetchError);

      if (fetchError) {
        throw new Error(`Failed to fetch profile: ${fetchError.message}`);
      }

      if (!currentProfile) {
        throw new Error('Profile not found');
      }

      if ((currentProfile as any).is_admin) {
        setMessage('You are already an admin! Redirecting to admin dashboard...');
        setTimeout(() => {
          router.push('/admin');
        }, 2000);
        return;
      }

      // Update the user to be an admin
      const { error: updateError } = await (sb as any)
        .from('profiles')
        .update({
          is_admin: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      console.log('Update error:', updateError);

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      setMessage(`Success! You (${user.email}) are now an admin. Redirecting to admin dashboard...`);
      
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
    } catch (err) {
      console.error('Error making current user admin:', err);
      setError(`Failed to make yourself admin: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-6">
        <h1 className="text-2xl font-bold mb-6">Admin Setup</h1>
        
        <div className="space-y-6">
          {/* Make Current User Admin */}
          <div className="border border-neutral-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">Make Yourself Admin</h2>
            <p className="text-muted text-sm mb-4">
              If you're logged in, you can make yourself an admin with one click.
            </p>
            <button
              onClick={makeCurrentUserAdmin}
              disabled={loading || !user}
              className="btn"
            >
              {loading ? 'Processing...' : 'Make Me Admin'}
            </button>
            {!user && (
              <p className="text-sm text-muted mt-2">Please log in first to use this option.</p>
            )}
          </div>

          {/* Make Specific User Admin */}
          <div className="border border-neutral-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">Make Specific User Admin</h2>
            <p className="text-muted text-sm mb-4">
              Enter the email address of the user you want to make an admin.
            </p>
            
            <form onSubmit={makeAdmin} className="space-y-4">
              <div>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="input"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="btn"
              >
                {loading ? 'Processing...' : 'Make User Admin'}
              </button>
            </form>
          </div>

          {/* Manual Database Method */}
          <div className="border border-neutral-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">Manual Database Method</h2>
            <p className="text-muted text-sm mb-4">
              If the above methods don't work, you can manually update the database.
            </p>
            
            <div className="bg-neutral-900 p-4 rounded-lg">
              <code className="text-sm text-green-400">
                UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';
              </code>
            </div>
            
            <p className="text-xs text-muted mt-2">
              Run this SQL command in your Supabase SQL editor, replacing with your actual email.
            </p>
          </div>

          {/* Messages */}
          {message && (
            <div className="form-success">
              {message}
            </div>
          )}
          
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-neutral-700">
          <h3 className="font-semibold mb-2">Current User Info</h3>
          <div className="text-sm text-muted">
            {user ? (
              <div>
                <p>Email: {user.email}</p>
                <p>ID: {user.id}</p>
              </div>
            ) : (
              <p>Not logged in</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
