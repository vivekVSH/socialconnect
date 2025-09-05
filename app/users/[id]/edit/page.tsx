'use client';
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function EditProfilePage({ params }: any) {
  const { id } = params;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    (async () => {
      // Get current user
      const { data: { user } } = await sb.auth.getUser();
      setCurrentUser(user);

      // Check if user is editing their own profile
      if (user?.id !== id) {
        router.push('/');
        return;
      }

      // Get profile data
      const { data: p } = await sb.from('profiles').select('*').eq('id', id).single();
      if (p) {
        setProfile(p);
        setUsername(p.username || '');
        setFirstName(p.first_name || '');
        setLastName(p.last_name || '');
        setBio(p.bio || '');
        setLocation(p.location || '');
        setWebsite(p.website || '');
        setAvatarPreview(p.avatar_url);
      }

      setLoading(false);
    })();
  }, [id, router]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Avatar image must be less than 2MB');
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setError('Avatar must be JPEG or PNG');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (file: File, userId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('type', 'avatar');

    const response = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }
    return data.url;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const sb = supabaseBrowser();

      // Validate username
      if (!username.match(/^[A-Za-z0-9_]{3,30}$/)) {
        setError('Username must be 3-30 characters, letters/numbers/underscores only');
        return;
      }

      // Check if username is taken by another user
      if (username !== profile.username) {
        const { data: existingUser } = await sb
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('id', id)
          .single();
        
        if (existingUser) {
          setError('Username is already taken');
          return;
        }
      }

      let avatarUrl = profile.avatar_url;

      // Upload new avatar if selected
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile, id);
      }

      // Update profile
      const { error: updateError } = await sb
        .from('profiles')
        .update({
          username: username.trim(),
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          bio: bio.trim() || null,
          location: location.trim() || null,
          website: website.trim() || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        router.push(`/users/${id}`);
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-700 rounded w-1/3"></div>
          <div className="h-4 bg-neutral-700 rounded w-1/2"></div>
          <div className="h-4 bg-neutral-700 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto card p-6 text-center">
        <h2 className="text-xl font-semibold text-red-400">Profile not found</h2>
        <p className="text-muted">This profile doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto card p-6 space-y-6">
      <h1 className="text-2xl font-bold">Edit Profile</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500 text-green-500 p-3 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar Section */}
        <div className="space-y-4">
          <label className="block text-sm font-medium">Profile Picture</label>
          <div className="flex items-center gap-4">
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Avatar preview"
                width={80}
                height={80}
                className="rounded-full border-2 border-neutral-700"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                {username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleAvatarChange}
                className="input"
                disabled={saving}
              />
              <p className="text-xs text-muted mt-1">JPEG or PNG, max 2MB</p>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label htmlFor="firstName" className="form-label">First Name</label>
            <input
              id="firstName"
              type="text"
              className="input"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="form-group">
            <label htmlFor="lastName" className="form-label">Last Name</label>
            <input
              id="lastName"
              type="text"
              className="input"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="username" className="form-label">Username *</label>
          <input
            id="username"
            type="text"
            className="input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            minLength={3}
            maxLength={30}
            required
            disabled={saving}
          />
          <p className="text-xs text-muted mt-1">3-30 characters, letters, numbers, and underscores only</p>
        </div>

        <div className="form-group">
          <label htmlFor="bio" className="form-label">Bio</label>
          <textarea
            id="bio"
            className="input"
            rows={4}
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            maxLength={160}
            disabled={saving}
          />
          <p className="text-xs text-muted mt-1">{bio.length}/160 characters</p>
        </div>

        <div className="form-group">
          <label htmlFor="location" className="form-label">Location</label>
          <input
            id="location"
            type="text"
            className="input"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="City, Country"
            disabled={saving}
          />
        </div>

        <div className="form-group">
          <label htmlFor="website" className="form-label">Website</label>
          <input
            id="website"
            type="url"
            className="input"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            placeholder="https://example.com"
            disabled={saving}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="btn flex-1"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/users/${id}`)}
            className="btn bg-neutral-700 hover:bg-neutral-600"
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
