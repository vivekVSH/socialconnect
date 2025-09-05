'use client';
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import PostCard from "@/components/PostCard";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import ActivityFeed from "@/components/ActivityFeed";
import { dataCache } from "@/lib/dataCache";
import Link from "next/link";

export default function FeedPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = supabaseBrowser();
    (async () => {
      try {
        const { data: { user } } = await sb.auth.getUser();
        setMe(user);
        
        if (!user) {
          setLoading(false);
          return;
        }

        // Check cache first
        const cacheKey = dataCache.KEYS.FEED_POSTS;
        const cachedPosts = dataCache.get(cacheKey);
        
        console.log('Feed cache check:', { cacheKey, hasCached: !!cachedPosts, cachedCount: Array.isArray(cachedPosts) ? cachedPosts.length : 0 });
        
        if (cachedPosts && Array.isArray(cachedPosts)) {
          setPosts(cachedPosts);
          setLoading(false);
          console.log('Using cached feed data');
          // Still fetch fresh data in background
        }

        // Get following ids + own id
        const uid = user.id;
        let following: string[] = [];
        const { data: f } = await sb.from('follows').select('following_id').eq('follower_id', uid);
        following = (f || []).map((r:any)=>r.following_id);
        following.push(uid);
        
        console.log('Following logic:', { uid, following, followingCount: following.length });
        
        // Try with likes join first
        let query = sb.from('posts').select(`
          *,
          profiles!author_id (
            username,
            first_name,
            last_name,
            avatar_url
          ),
          likes (
            id,
            user_id
          )
        `).order('created_at', { ascending: false }).limit(50);
        if (following.length) query = query.in('author_id', following);
        
        let { data, error } = await query;
        
        console.log('Initial query result:', { data: data?.length, error });
        
        // If likes join fails, try without it
        if (error && error.message.includes('likes')) {
          console.log('Likes join failed, trying without likes...');
          query = sb.from('posts').select(`
            *,
            profiles!author_id (
              username,
              first_name,
              last_name,
              avatar_url
            )
          `).order('created_at', { ascending: false }).limit(50);
          if (following.length) query = query.in('author_id', following);
          
          const fallbackResult = await query;
          data = fallbackResult.data;
          error = fallbackResult.error;
          console.log('Fallback query result:', { data: data?.length, error });
        }
        
        console.log('Raw query result:', { data, error, dataLength: data?.length });
        if (data && data.length > 0) {
          console.log('Sample raw post data:', data[0]);
          console.log('Sample profiles data:', (data[0] as any)?.profiles);
          console.log('Sample likes data:', (data[0] as any)?.likes);
          console.log('Likes array length:', (data[0] as any)?.likes?.length);
        }
        
        if (error) {
          console.error('Failed to fetch posts:', error);
          console.error('Error details:', error.message, error.details, error.hint);
          // Don't throw error, just show empty state
          setPosts([]);
          setLoading(false);
          return;
        }
        
        const postsData = data || [];
        
        // If we don't have likes data from the join, fetch it separately
        let likesData: any = {};
        if (postsData.length > 0 && !(postsData[0] as any).likes) {
          console.log('Fetching likes data separately...');
          try {
            const postIds = postsData.map((p: any) => p.id);
            const { data: likes } = await sb
              .from('likes')
              .select('post_id, user_id')
              .in('post_id', postIds);
            
            if (likes) {
              // Group likes by post_id
              likesData = likes.reduce((acc: any, like: any) => {
                if (!acc[like.post_id]) {
                  acc[like.post_id] = [];
                }
                acc[like.post_id].push(like);
                return acc;
              }, {});
              console.log('Separate likes data:', likesData);
            }
          } catch (likesError) {
            console.error('Error fetching likes separately:', likesError);
          }
        }
        
        // Process posts to add like counts and viewer_liked status
        const processedPosts = postsData.map((post: any) => {
          // Handle both cases: with likes data from join or separate query
          const postLikes = post.likes || likesData[post.id] || [];
          const likeCount = postLikes.length;
          const viewerLiked = postLikes.some((like: any) => like.user_id === uid);
          
          console.log('Processing post:', { 
            id: post.id, 
            hasLikes: !!post.likes, 
            hasSeparateLikes: !!likesData[post.id],
            postLikes: postLikes,
            likeCount, 
            viewerLiked,
            profiles: post.profiles
          });
          
          return {
            ...post,
            like_count: likeCount,
            viewer_liked: viewerLiked,
            likes: undefined, // Remove the likes array to clean up the data
            // Ensure profiles data is properly structured
            profiles: post.profiles || {}
          };
        });
        
        console.log('Feed data fetched:', { count: processedPosts.length, posts: processedPosts });
        console.log('Sample post profile data:', processedPosts[0]?.profiles);
        console.log('Sample post like data:', {
          id: processedPosts[0]?.id,
          like_count: processedPosts[0]?.like_count,
          viewer_liked: processedPosts[0]?.viewer_liked,
          hasLikes: !!processedPosts[0]?.likes
        });
        console.log('Setting posts state with:', processedPosts.length, 'posts');
        setPosts(processedPosts);
        
        // Cache the results
        dataCache.set(cacheKey, processedPosts, 1 * 60 * 1000); // 1 minute cache
        console.log('Feed data cached');
        
        // Only set loading to false if we didn't have cached data
        if (!cachedPosts) {
          setLoading(false);
          console.log('Loading set to false (no cache)');
        }
        
      } catch (error) {
        console.error('Feed loading error:', error);
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  const refreshFeed = () => {
    // Clear all post-related caches and reload
    dataCache.delete(dataCache.KEYS.FEED_POSTS);
    dataCache.delete(dataCache.KEYS.EXPLORE_POSTS);
    dataCache.delete(dataCache.KEYS.RECENT_USERS);
    setLoading(true);
    window.location.reload();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Your Feed</h1>
            <div className="flex gap-2">
              <button 
                onClick={refreshFeed}
                className="btn-secondary text-sm"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
              <Link href="/compose" className="btn">Compose</Link>
            </div>
          </div>
          {posts.length === 0 ? (
            <div className="text-muted text-center py-8">
              No posts yet. Follow people or create one!
              <br />
              <button 
                onClick={refreshFeed}
                className="btn-secondary mt-2"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh Feed'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((p:any)=> <PostCard key={p.id} post={p} currentUserId={me?.id} />)}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
