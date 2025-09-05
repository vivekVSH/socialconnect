'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/useAuth';
import Link from 'next/link';
import Image from 'next/image';

export default function SuggestedUsers() {
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchSuggestedUsers = async () => {
      try {
        const sb = supabaseBrowser();
        
        // Get users that the current user is not following
        const { data: allUsers } = await sb
          .from('profiles_public')
          .select('*')
          .neq('id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        // Get current user's following list
        const { data: followingData } = await sb
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = new Set(followingData?.map(f => f.following_id) || []);
        setFollowing(followingIds);

        // Filter out users that are already being followed
        const suggestions = allUsers?.filter(u => !followingIds.has(u.id)) || [];
        
        // Shuffle and take first 5
        const shuffled = suggestions.sort(() => 0.5 - Math.random()).slice(0, 5);
        setSuggestedUsers(shuffled);
      } catch (error) {
        console.error('Error fetching suggested users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestedUsers();
  }, [user]);

  const handleFollow = async (userId: string) => {
    if (!user) return;

    try {
      const sb = supabaseBrowser();
      const { error } = await sb
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: userId
        });

      if (!error) {
        setFollowing(prev => new Set([...prev, userId]));
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollow = async (userId: string) => {
    if (!user) return;

    try {
      const sb = supabaseBrowser();
      const { error } = await sb
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      if (!error) {
        setFollowing(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  if (loading) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold mb-3">Suggested Users</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-8 w-8 bg-neutral-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-neutral-700 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-neutral-700 rounded w-1/2"></div>
              </div>
              <div className="h-6 w-16 bg-neutral-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestedUsers.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold mb-3">Suggested Users</h3>
        <p className="text-muted text-sm">No suggestions available</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-3">Suggested Users</h3>
      <div className="space-y-3">
        {suggestedUsers.map((user) => (
          <div key={user.id} className="flex items-center gap-3">
            <Link href={`/users/${user.id}`} className="flex items-center gap-3 flex-1">
              <div className="h-8 w-8 rounded-full bg-neutral-700 overflow-hidden">
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.username}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-600 flex items-center justify-center text-xs font-semibold">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {user.first_name} {user.last_name}
                </div>
                <div className="text-muted text-xs truncate">
                  @{user.username}
                </div>
              </div>
            </Link>
            <button
              onClick={() => following.has(user.id) ? handleUnfollow(user.id) : handleFollow(user.id)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                following.has(user.id)
                  ? 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {following.has(user.id) ? 'Following' : 'Follow'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
