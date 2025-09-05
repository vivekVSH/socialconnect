'use client';
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/useAuth";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import Image from "next/image";

interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  stats: {
    posts: number;
    followers: number;
    following: number;
    likes: number;
  };
}

interface Post {
  id: string;
  content: string;
  image_url?: string;
  category: string;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  stats: {
    likes: number;
    comments: number;
  };
}

interface Stats {
  overview: {
    totalUsers: number;
    activeUsersToday: number;
    totalPosts: number;
    postsToday: number;
    totalLikes: number;
    likesToday: number;
    totalComments: number;
    commentsToday: number;
    totalFollows: number;
    followsToday: number;
  };
  trends: {
    recentPosts: number;
    recentPostsData: Array<any>;
    categoryDistribution: Record<string, number>;
    topUsers: Array<{
      id: string;
      username: string;
      name: string;
      avatar_url?: string;
      postsCount: number;
    }>;
  };
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'posts'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [postSearch, setPostSearch] = useState('');
  const [userStatus, setUserStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [postCategory, setPostCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    // Admin check is handled by middleware, so just load stats
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      
      const sb = supabaseBrowser();
      const { data: { session } } = await sb.auth.getSession();
      
      if (!session?.access_token) {
        setError('Not authenticated');
        return;
      }

      // Get today's date for today's stats
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      console.log('Starting admin stats loading...');
      
      // Try to get posts first to debug
      console.log('Testing posts query...');
      const testPosts = await sb.from('posts').select('*').limit(5);
      console.log('Test posts result:', testPosts);
      
      // Get basic stats first (simplified for reliability)
      const [
        usersResult, 
        postsResult, 
        likesResult, 
        commentsResult,
        postsTodayResult,
        likesTodayResult,
        commentsTodayResult
      ] = await Promise.all([
        sb.from('profiles').select('*', { count: 'exact', head: true }),
        sb.from('posts').select('*', { count: 'exact', head: true }),
        sb.from('likes').select('*', { count: 'exact', head: true }),
        sb.from('comments').select('*', { count: 'exact', head: true }),
        sb.from('posts').select('*', { count: 'exact', head: true })
          .gte('created_at', startOfToday.toISOString())
          .lt('created_at', endOfToday.toISOString()),
        sb.from('likes').select('*', { count: 'exact', head: true })
          .gte('created_at', startOfToday.toISOString())
          .lt('created_at', endOfToday.toISOString()),
        sb.from('comments').select('*', { count: 'exact', head: true })
          .gte('created_at', startOfToday.toISOString())
          .lt('created_at', endOfToday.toISOString())
      ]);

      console.log('Basic stats results:', {
        users: usersResult.count,
        posts: postsResult.count,
        likes: likesResult.count,
        comments: commentsResult.count,
        postsToday: postsTodayResult.count,
        likesToday: likesTodayResult.count,
        commentsToday: commentsTodayResult.count
      });

      // Debug: Check if we can actually see posts
      if (postsResult.count === 0) {
        console.log('No posts found - checking if RLS is blocking...');
        const debugPosts = await sb.from('posts').select('*').limit(3);
        console.log('Debug posts query result:', debugPosts);
      }

      // Get additional data separately to avoid complex joins
      let recentPostsResult: any[] = [];
      let topUsersResult: any[] = [];
      let categoryData: any[] = [];

      try {
        console.log('Fetching additional data...');
        
        const [recentPosts, topUsers, categories] = await Promise.all([
          sb.from('posts').select(`
            id, 
            content, 
            image_url, 
            category, 
            created_at, 
            author_id,
            profiles!author_id (
              username,
              first_name,
              last_name,
              avatar_url
            )
          `).order('created_at', { ascending: false }).limit(5),
          sb.from('profiles').select('id, username, first_name, last_name, avatar_url').limit(5),
          sb.from('posts').select('category').not('category', 'is', null)
        ]);
        
        console.log('Additional data results:', {
          recentPosts: recentPosts.data?.length || 0,
          topUsers: topUsers.data?.length || 0,
          categories: categories.data?.length || 0,
          categoryData: categories.data
        });
        
        recentPostsResult = recentPosts.data || [];
        topUsersResult = topUsers.data || [];
        categoryData = categories.data || [];
      } catch (additionalError) {
        console.warn('Additional stats failed:', additionalError);
        // Continue with basic stats
      }

      // Get category distribution
      const categoryDistribution = categoryData?.reduce((acc: any, post: any) => {
        acc[post.category] = (acc[post.category] || 0) + 1;
        return acc;
      }, {}) || {};

      console.log('Category distribution:', categoryDistribution);

      const finalStats = {
        overview: {
          totalUsers: usersResult.count || 0,
          totalPosts: postsResult.count || 0,
          totalLikes: likesResult.count || 0,
          totalComments: commentsResult.count || 0,
          activeUsersToday: 0, // Simplified for now
          postsToday: postsTodayResult.count || 0,
          likesToday: likesTodayResult.count || 0,
          commentsToday: commentsTodayResult.count || 0,
          totalFollows: 0,
          followsToday: 0
        },
        trends: {
          recentPosts: recentPostsResult?.length || 0,
          recentPostsData: recentPostsResult || [],
          categoryDistribution,
          topUsers: await Promise.all(
            (topUsersResult || []).map(async (user: any) => {
              // Get actual post count for each user
              const { count: userPostsCount } = await sb
                .from('posts')
                .select('*', { count: 'exact', head: true })
                .eq('author_id', user.id);
              
                              return {
                  id: user.id,
                  username: user.username,
                  name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
                  avatar_url: user.avatar_url,
                  postsCount: userPostsCount || 0
                };
            })
          )
        },
        generatedAt: new Date().toISOString()
      };

      console.log('Final stats being set:', finalStats);
      setStats(finalStats);
    } catch (err) {
      console.error('Error loading stats:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      setError(`Failed to load statistics: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (page = 1) => {
    try {
      const sb = supabaseBrowser();
      const { data: { session } } = await sb.auth.getSession();
      
      if (!session?.access_token) {
        setError('Not authenticated');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search: userSearch,
        status: userStatus
      });

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const data = await response.json();
      setUsers(data.users);
      setTotalPages(data.pagination.pages);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    }
  };

  const loadPosts = async (page = 1) => {
    try {
      const sb = supabaseBrowser();
      const { data: { session } } = await sb.auth.getSession();
      
      if (!session?.access_token) {
        setError('Not authenticated');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search: postSearch,
        category: postCategory,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });

      const response = await fetch(`/api/admin/posts?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load posts');
      }

      const data = await response.json();
      setPosts(data.posts);
      setTotalPages(data.pagination.pages);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Failed to load posts');
    }
  };

  const handleUserAction = async (userId: string, action: 'activate' | 'deactivate' | 'make_admin' | 'remove_admin') => {
    try {
      const sb = supabaseBrowser();
      const { data: { session } } = await sb.auth.getSession();
      
      if (!session?.access_token) {
        setError('Not authenticated');
        return;
      }

      if (action === 'make_admin' || action === 'remove_admin') {
        // Handle admin actions directly with Supabase
        const sb = supabaseBrowser();
        const { error } = await (sb as any)
          .from('profiles')
          .update({ is_admin: action === 'make_admin' })
          .eq('id', userId);

        if (error) {
          throw error;
        }

        // Reload users and stats
        loadUsers(currentPage);
        loadStats();
      } else {
        // Handle activate/deactivate through API
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action })
        });

        if (!response.ok) {
          throw new Error(`Failed to ${action} user`);
        }

        // Reload users
        loadUsers(currentPage);
      }
    } catch (err) {
      console.error(`Error ${action}ing user:`, err);
      setError(`Failed to ${action} user`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const sb = supabaseBrowser();
      const { data: { session } } = await sb.auth.getSession();
      
      if (!session?.access_token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`/api/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      // Reload posts
      loadPosts(currentPage);
    } catch (err) {
      console.error('Error deleting post:', err);
      setError('Failed to delete post');
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'posts') {
      loadPosts();
    }
  }, [activeTab, userSearch, userStatus, postSearch, postCategory]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="card p-6 text-center">
          <h1 className="text-xl font-semibold mb-4">Admin Dashboard</h1>
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={() => loadStats()}
            disabled={loading}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'overview' 
                ? 'bg-blue-600 text-white' 
                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'users' 
                ? 'bg-blue-600 text-white' 
                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'posts' 
                ? 'bg-blue-600 text-white' 
                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
            }`}
          >
            Posts
          </button>
        </div>
      </div>

      {activeTab === 'overview' && stats && (
    <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="text-muted text-sm">Total Users</div>
              <div className="text-2xl font-semibold">{stats.overview.totalUsers}</div>
              <div className="text-xs text-green-400">+{stats.overview.activeUsersToday} today</div>
            </div>
            <div className="card p-4">
              <div className="text-muted text-sm">Total Posts</div>
              <div className="text-2xl font-semibold">{stats.overview.totalPosts}</div>
              <div className="text-xs text-green-400">+{stats.overview.postsToday} today</div>
            </div>
            <div className="card p-4">
              <div className="text-muted text-sm">Total Likes</div>
              <div className="text-2xl font-semibold">{stats.overview.totalLikes}</div>
              <div className="text-xs text-green-400">+{stats.overview.likesToday} today</div>
      </div>
      <div className="card p-4">
              <div className="text-muted text-sm">Total Comments</div>
              <div className="text-2xl font-semibold">{stats.overview.totalComments}</div>
              <div className="text-xs text-green-400">+{stats.overview.commentsToday} today</div>
            </div>
          </div>

          {/* Debug Section */}
          <div className="card p-4 bg-yellow-900/20 border border-yellow-500">
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">Debug Info</h3>
            <div className="text-sm space-y-1">
              <p><strong>Posts Found:</strong> {stats.overview.totalPosts}</p>
              <p><strong>Recent Posts:</strong> {stats.trends.recentPosts}</p>
              <p><strong>Categories:</strong> {Object.keys(stats.trends.categoryDistribution).length}</p>
              <p><strong>Top Users:</strong> {stats.trends.topUsers.length}</p>
              <p className="text-xs text-muted mt-2">
                Check browser console for detailed logs
              </p>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Post Categories</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.trends.categoryDistribution).map(([category, count]) => (
                <div key={category} className="text-center">
                  <div className="text-2xl font-semibold">{count as number}</div>
                  <div className="text-sm text-muted capitalize">{category}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Posts */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Posts</h3>
            <div className="space-y-4">
              {stats.trends.recentPosts > 0 ? (
                stats.trends.recentPostsData.map((post: any) => (
                  <div key={post.id} className="border border-neutral-700 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-700 overflow-hidden flex-shrink-0">
                        {post.profiles?.avatar_url ? (
                          <Image
                            src={post.profiles.avatar_url}
                            alt={post.profiles.username}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-neutral-600 flex items-center justify-center text-sm font-semibold">
                            {post.profiles?.username?.charAt(0).toUpperCase() || 
                             post.author_id?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {(post.profiles?.first_name && post.profiles?.last_name) 
                              ? `${post.profiles.first_name} ${post.profiles.last_name}` 
                              : 'Unknown User'}
                          </span>
                          <span className="text-muted text-sm">@{post.profiles?.username || 'unknown'}</span>
                          <span className="text-muted text-xs">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted mb-2 line-clamp-2">{post.content}</p>
                        {post.image_url && (
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-neutral-800">
                            <Image
                              src={post.image_url}
                              alt="Post image"
                              width={80}
                              height={80}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                          <span>Category: {post.category || 'None'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted">
                  <p>No recent posts found</p>
                  <p className="text-sm">Posts will appear here once created</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Users */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Top Users by Posts</h3>
        <div className="space-y-3">
              {stats.trends.topUsers.map((user, index) => (
                <div key={user.id} className="flex items-center justify-between p-3 border border-neutral-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-muted text-sm">#{index + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-neutral-700 overflow-hidden flex-shrink-0">
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
                          {user.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{user.name}</div>
                      <div className="text-muted text-xs">@{user.username}</div>
                    </div>
                  </div>
                  <span className="text-sm text-blue-400 font-medium">{user.postsCount} posts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User Filters */}
          <div className="card p-4">
            <div className="flex gap-4 items-center">
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="input flex-1"
              />
              <select
                value={userStatus}
                onChange={(e) => setUserStatus(e.target.value as any)}
                className="input"
              >
                <option value="all">All Users</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Users List */}
          <div className="card p-4">
            <h3 className="text-lg font-semibold mb-4">Users ({users.length})</h3>
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border border-neutral-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-neutral-700 overflow-hidden">
                      {user.avatar_url ? (
                        <Image
                          src={user.avatar_url}
                          alt={user.username}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-600 flex items-center justify-center text-sm font-semibold">
                          {user.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {user.first_name} {user.last_name}
                        {user.is_admin && <span className="text-blue-400 ml-2">(Admin)</span>}
                      </div>
                      <div className="text-sm text-muted">@{user.username}</div>
                      <div className="text-xs text-muted">
                        {user.stats.posts} posts • {user.stats.followers} followers • Joined {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!user.is_admin && (
                      <button
                        onClick={() => handleUserAction(user.id, 'make_admin')}
                        className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Make Admin
                      </button>
                    )}
                    {user.is_admin && (
                      <button
                        onClick={() => handleUserAction(user.id, 'remove_admin')}
                        className="px-3 py-1 text-sm rounded bg-orange-600 text-white hover:bg-orange-700"
                      >
                        Remove Admin
                      </button>
                    )}
                    <button
                      onClick={() => handleUserAction(user.id, user.is_active ? 'deactivate' : 'activate')}
                      className={`px-3 py-1 text-sm rounded ${
                        user.is_active
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
            </div>
          ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => loadUsers(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-neutral-700 text-white rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-muted">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => loadUsers(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-neutral-700 text-white rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'posts' && (
        <div className="space-y-6">
          {/* Post Filters */}
          <div className="card p-4">
            <div className="flex gap-4 items-center">
              <input
                type="text"
                placeholder="Search posts..."
                value={postSearch}
                onChange={(e) => setPostSearch(e.target.value)}
                className="input flex-1"
              />
              <select
                value={postCategory}
                onChange={(e) => setPostCategory(e.target.value)}
                className="input"
              >
                <option value="all">All Categories</option>
                <option value="general">General</option>
                <option value="tech">Technology</option>
                <option value="lifestyle">Lifestyle</option>
                <option value="news">News</option>
                <option value="entertainment">Entertainment</option>
                <option value="sports">Sports</option>
                <option value="education">Education</option>
              </select>
            </div>
          </div>

          {/* Posts List */}
          <div className="card p-4">
            <h3 className="text-lg font-semibold mb-4">Posts ({posts.length})</h3>
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="border border-neutral-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-full bg-neutral-700 overflow-hidden">
                          {post.profiles.avatar_url ? (
                            <Image
                              src={post.profiles.avatar_url}
                              alt={post.profiles.username}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-neutral-600 flex items-center justify-center text-xs font-semibold">
                              {post.profiles.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {post.profiles.first_name} {post.profiles.last_name}
                          </div>
                          <div className="text-xs text-muted">@{post.profiles.username}</div>
                        </div>
                        <span className="text-xs text-muted">
                          {new Date(post.created_at).toLocaleString()}
                        </span>
                        <span className="text-xs bg-neutral-700 px-2 py-1 rounded">
                          {post.category}
                        </span>
                      </div>
                      <div className="text-sm mb-2">
                        {post.content.length > 200 
                          ? `${post.content.substring(0, 200)}...` 
                          : post.content}
                      </div>
                      {post.image_url && (
                        <div className="w-32 h-20 bg-neutral-700 rounded overflow-hidden">
                          <Image
                            src={post.image_url}
                            alt="Post image"
                            width={128}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex gap-4 text-xs text-muted mt-2">
                        <span>❤️ {post.stats.likes} likes</span>
                        <span>💬 {post.stats.comments} comments</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => loadPosts(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-neutral-700 text-white rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-muted">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => loadPosts(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-neutral-700 text-white rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
        </div>
      </div>
      )}
    </div>
  );
}
