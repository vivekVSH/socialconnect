'use client';
import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { dataCache } from "@/lib/dataCache";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/useAuth";

export default function SearchPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'posts'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set());

  // Load following status when users change
  useEffect(() => {
    if (user && users.length > 0) {
      loadFollowingStatus();
    }
  }, [user, users]);

  const loadFollowingStatus = async () => {
    if (!user) return;
    
    try {
      const sb = supabaseBrowser();
      const userIds = users.map(u => u.id);
      
      const { data: follows } = await sb
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .in('following_id', userIds)
        .eq('status', 'accepted');
      
      if (follows && Array.isArray(follows)) {
        // Type assertion to fix TS error: treat each f as { following_id: string }
        const followingSet = new Set(
          (follows as { following_id: string }[]).map(f => f.following_id)
        );
        setFollowing(followingSet);
      }
    } catch (error) {
      console.error('Error loading following status:', error);
    }
  };

  const searchUsers = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    // Check cache first
    const cacheKey = `search_users_${searchQuery.toLowerCase()}`;
    const cached = dataCache.get(cacheKey);
    
    if (cached) {
      setUsers(cached as any[]);
      return;
    }

    setLoading(true);
    try {
      const sb = supabaseBrowser();
      console.log('Searching for:', searchQuery);
      
      // Try using profiles_public view first
      const { data, error } = await sb
        .from('profiles_public')
        .select(`
          id,
          username,
          first_name,
          last_name,
          bio,
          avatar_url,
          created_at
        `)
        .or(`username.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
        .neq('id', user?.id || '') // Exclude current user
        .limit(20);

      console.log('Search results:', data);
      console.log('Search error:', error);

      // If profiles_public view fails, try direct profiles table
      let searchResults = data;
      if (error && error.message.includes('profiles_public')) {
        console.log('profiles_public view failed, trying direct profiles table...');
        const { data: fallbackData, error: fallbackError } = await sb
          .from('profiles')
          .select(`
            id,
            username,
            first_name,
            last_name,
            bio,
            avatar_url,
            created_at
          `)
          .or(`username.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
          .neq('id', user?.id || '')
          .limit(20);
        
        if (!fallbackError) {
          searchResults = fallbackData;
          console.log('Fallback search results:', searchResults);
        }
      }

      // Get follower counts for each user
      const userIds = (searchResults as { id: string }[] | null)?.map(u => u.id) || [];
      let followerCounts: { [key: string]: number } = {};
      let postCounts: { [key: string]: number } = {};

      if (userIds.length > 0) {
        // Get follower counts
        const { data: follows } = await sb
          .from('follows')
          .select('following_id')
          .in('following_id', userIds)
          .eq('status', 'accepted');

        if (follows && Array.isArray(follows)) {
          (follows as { following_id: string }[]).forEach(follow => {
            followerCounts[follow.following_id] = (followerCounts[follow.following_id] || 0) + 1;
          });
        }
        const { data: posts } = await sb
          .from('posts')
          .select('author_id')
          .in('author_id', userIds);

        if (posts && Array.isArray(posts)) {
          (posts as { author_id: string }[]).forEach(post => {
            postCounts[post.author_id] = (postCounts[post.author_id] || 0) + 1;
          });
        }

      const results = (searchResults as Array<{ id: string; [key: string]: any }> | null || []).map(user => ({
        ...user,
        followers_count: followerCounts[user.id] || 0,
        posts_count: postCounts[user.id] || 0
      }));

      setUsers(results);
      
      // Cache results for 2 minutes
      dataCache.set(cacheKey, results, 2 * 60 * 1000);
      } else {
        // No results found
        setUsers([]);
      }
    } catch (error) {
      console.error('Search users error:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const searchPosts = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setPosts([]);
      return;
    }

    // Check cache first
    const cacheKey = `search_posts_${searchQuery.toLowerCase()}`;
    const cached = dataCache.get(cacheKey);
    
    if (cached) {
      setPosts(cached as any[]);
      return;
    }

    setLoading(true);
    try {
      const sb = supabaseBrowser();
      const { data } = await sb
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
        .ilike('content', `%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      const results = data || [];
      setPosts(results);
      
      // Cache results for 2 minutes
      dataCache.set(cacheKey, results, 2 * 60 * 1000);
    } catch (error) {
      console.error('Search posts error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    if (activeTab === 'users') {
      searchUsers(searchQuery);
    } else {
      searchPosts(searchQuery);
    }
  };

  const handleTabChange = (tab: 'users' | 'posts') => {
    setActiveTab(tab);
    if (query.trim()) {
      if (tab === 'users') {
        searchUsers(query);
      } else {
        searchPosts(query);
      }
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user || user.id === targetUserId) return;
    
    setFollowLoading(prev => new Set(prev).add(targetUserId));
    
    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId }),
      });
      
      if (response.ok) {
        setFollowing(prev => new Set(prev).add(targetUserId));
        // Update user's followers count
        setUsers(prev => prev.map(u => 
          u.id === targetUserId 
            ? { ...u, followers_count: (u.followers_count || 0) + 1 }
            : u
        ));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to follow user');
      }
    } catch (error) {
      console.error('Follow error:', error);
      alert('Failed to follow user');
    } finally {
      setFollowLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!user || user.id === targetUserId) return;
    
    setFollowLoading(prev => new Set(prev).add(targetUserId));
    
    try {
      const response = await fetch('/api/follow', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId }),
      });
      
      if (response.ok) {
        setFollowing(prev => {
          const newSet = new Set(prev);
          newSet.delete(targetUserId);
          return newSet;
        });
        // Update user's followers count
        setUsers(prev => prev.map(u => 
          u.id === targetUserId 
            ? { ...u, followers_count: Math.max((u.followers_count || 1) - 1, 0) }
            : u
        ));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to unfollow user');
      }
    } catch (error) {
      console.error('Unfollow error:', error);
      alert('Failed to unfollow user');
    } finally {
      setFollowLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Search</h1>
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/test-profiles');
                const data = await response.json();
                console.log('Test profiles result:', data);
                alert(`Found ${data.count} profiles. Check console for details.`);
              } catch (error) {
                console.error('Test profiles error:', error);
                alert('Error testing profiles. Check console.');
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            🔧 Test Profiles
          </button>
        </div>
        
        {/* Search Input */}
        <div className="relative mb-6">
          <input
            type="text"
            className="input w-full pl-10"
            placeholder="Search by username, name, or post content..."
            value={query}
            onChange={e => handleSearch(e.target.value)}
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted">
            🔍
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => handleTabChange('users')}
            className={`btn flex-1 ${activeTab === 'users' ? '' : 'bg-neutral-700 hover:bg-neutral-600'}`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => handleTabChange('posts')}
            className={`btn flex-1 ${activeTab === 'posts' ? '' : 'bg-neutral-700 hover:bg-neutral-600'}`}
          >
            Posts ({posts.length})
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-muted mt-2">Searching...</p>
          </div>
        )}

        {/* Results */}
        {!loading && query.trim() && (
          <div className="space-y-4">
            {activeTab === 'users' ? (
              users.length === 0 ? (
                <div className="text-center py-8 text-muted">
                  <p>No users found for "{query}"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map(searchUser => (
                    <div
                      key={searchUser.id}
                      className="card p-4 hover:bg-neutral-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Link href={`/users/${searchUser.id}`} className="flex-shrink-0">
                          {searchUser.avatar_url ? (
                            <Image
                              src={searchUser.avatar_url}
                              alt={`${searchUser.username}'s avatar`}
                              width={50}
                              height={50}
                              className="rounded-full border border-neutral-700"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white">
                              {searchUser.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/users/${searchUser.id}`} className="hover:underline">
                            <h3 className="font-semibold text-white">@{searchUser.username}</h3>
                          </Link>
                          {searchUser.first_name && searchUser.last_name && (
                            <p className="text-sm text-neutral-300">
                              {searchUser.first_name} {searchUser.last_name}
                            </p>
                          )}
                          {searchUser.bio && (
                            <p className="text-sm text-muted truncate">{searchUser.bio}</p>
                          )}
                          <div className="flex gap-4 text-xs text-muted mt-1">
                            <span>{searchUser.followers_count || 0} followers</span>
                            <span>{searchUser.posts_count || 0} posts</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {user && user.id !== searchUser.id && (
                            <>
                              {following.has(searchUser.id) ? (
                                <button
                                  onClick={() => handleUnfollow(searchUser.id)}
                                  disabled={followLoading.has(searchUser.id)}
                                  className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                  {followLoading.has(searchUser.id) ? '...' : 'Following'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleFollow(searchUser.id)}
                                  disabled={followLoading.has(searchUser.id)}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                  {followLoading.has(searchUser.id) ? '...' : 'Follow'}
                                </button>
                              )}
                              <Link
                                href={`/messages/${searchUser.id}`}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                💬 Message
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              posts.length === 0 ? (
                <div className="text-center py-8 text-muted">
                  <p>No posts found for "{query}"</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map(post => (
                    <div key={post.id} className="card p-4">
                      <div className="flex items-center gap-3 mb-3">
                        {post.author_username ? (
                          <Link
                            href={`/users/${post.author_id}`}
                            className="font-medium hover:underline text-blue-400"
                          >
                            @{post.author_username}
                          </Link>
                        ) : (
                          <span className="font-medium">@{post.author_username || 'user'}</span>
                        )}
                        <span className="text-xs text-muted">
                          {new Date(post.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap mb-3">{post.content}</div>
                      {post.image_url && (
                        <div className="relative w-full h-48 overflow-hidden rounded-lg border border-neutral-800 mb-3">
                          <Image
                            src={post.image_url}
                            alt="Post image"
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted">
                        <span>❤️ {post.like_count}</span>
                        <span>💬 {post.comment_count}</span>
                        <span className="capitalize">{post.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !query.trim() && (
          <div className="text-center py-12 text-muted">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">Search SocialConnect</h3>
            <p>Find users, posts, and more</p>
          </div>
        )}
      </div>
    </div>
  );
}
