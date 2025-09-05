'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/useAuth';

interface FollowButtonProps {
  targetUserId: string;
  isFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
}

export default function FollowButton({ 
  targetUserId, 
  isFollowing = false, 
  onFollowChange,
  className = '' 
}: FollowButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState(isFollowing);

  // Don't show follow button for own profile
  if (!user || user.id === targetUserId) {
    return null;
  }

  const handleFollow = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch('/api/follow', {
        method: following ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId })
      });

      if (response.ok) {
        const newFollowingState = !following;
        setFollowing(newFollowingState);
        onFollowChange?.(newFollowingState);
      } else {
        const error = await response.json();
        console.error('Follow error:', error);
      }
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`
        px-4 py-2 rounded-lg font-medium transition-all duration-200
        ${following
          ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
        }
        ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        ${className}
      `}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span>{following ? 'Unfollowing...' : 'Following...'}</span>
        </div>
      ) : (
        following ? 'Following' : 'Follow'
      )}
    </button>
  );
}
