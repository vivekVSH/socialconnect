'use client';
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import PostCard from "@/components/PostCard";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import TrendingHashtags from "@/components/TrendingHashtags";
import SuggestedUsers from "@/components/SuggestedUsers";
import { dataCache } from "@/lib/dataCache";
import Link from "next/link";
import Image from "next/image";

export default function ExplorePage() {
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    (async () => {
      try {
        // Get current user
        const { data: { user } } = await sb.auth.getUser();
        setCurrentUser(user);

        // Check cache for trending posts
        const trendingCacheKey = dataCache.KEYS.EXPLORE_POSTS;
        const cachedTrending = dataCache.get(trendingCacheKey);
        
        if (cachedTrending) {
          setTrendingPosts(cachedTrending as any[]);
        }

        // Check cache for recent users
        const usersCacheKey = dataCache.KEYS.RECENT_USERS;
        const cachedUsers = dataCache.get(usersCacheKey);
        
        if (cachedUsers) {
          setRecentUsers(cachedUsers as any[]);
        }

        // If we have cached data, show it immediately
        if (cachedTrending && cachedUsers) {
          setLoading(false);
        }

        // Fetch fresh data in background
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: trending } = await sb
          .from('posts')
          .select(`
            *,
            profiles!author_id (
              username,
              first_name,
              last_name,
              avatar_url
            )
          `)
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('like_count', { ascending: false })
          .limit(10);

        setTrendingPosts(trending || []);
        dataCache.set(trendingCacheKey, trending || [], 5 * 60 * 1000); // 5 minutes

        // Get recent users (joined in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recent } = await sb
          .from('profiles_public')
          .select('*')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(8);

        setRecentUsers(recent || []);
        dataCache.set(usersCacheKey, recent || [], 10 * 60 * 1000); // 10 minutes

      } catch (error) {
        console.error('Explore loading error:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="card p-6">
        <h1 className="text-3xl font-bold mb-2">Explore</h1>
        <p className="text-muted">Discover trending posts and new users</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trending Posts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                🔥 Trending Posts
                <span className="text-sm text-muted">(Last 7 days)</span>
              </h2>
              <button 
                onClick={() => {
                  dataCache.delete(dataCache.KEYS.EXPLORE_POSTS);
                  dataCache.delete(dataCache.KEYS.RECENT_USERS);
                  window.location.reload();
                }}
                className="btn-secondary text-sm"
              >
                🔄 Refresh
              </button>
            </div>
            
            {trendingPosts.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <p>No trending posts yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {trendingPosts.map(post => (
                  <PostCard key={post.id} post={post} currentUserId={currentUser?.id} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Suggested Users */}
          <SuggestedUsers />
          
          {/* Trending Hashtags */}
          <TrendingHashtags />
          
          {/* Recent Users */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              👥 New Users
              <span className="text-sm text-muted">(Last 30 days)</span>
            </h3>
            
            {recentUsers.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <p>No new users</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentUsers.map(user => (
                  <Link
                    key={user.id}
                    href={`/users/${user.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800/50 transition-colors"
                  >
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={`${user.username}'s avatar`}
                        width={40}
                        height={40}
                        className="rounded-full border border-neutral-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                        {user.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">@{user.username}</p>
                      {user.first_name && user.last_name && (
                        <p className="text-xs text-neutral-400 truncate">
                          {user.first_name} {user.last_name}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">📊 Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted">Total Posts</span>
                <span className="font-semibold">{trendingPosts.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">New Users</span>
                <span className="font-semibold">{recentUsers.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Most Liked</span>
                <span className="font-semibold">
                  {trendingPosts[0]?.like_count || 0} likes
                </span>
              </div>
            </div>
          </div>

          {/* Search CTA */}
          <div className="card p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">🔍 Looking for something specific?</h3>
            <p className="text-muted text-sm mb-4">Search for users, posts, and more</p>
            <Link href="/search" className="btn w-full">
              Go to Search
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
