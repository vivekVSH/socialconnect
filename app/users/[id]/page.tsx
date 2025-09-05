'use client';
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import PostCard from "@/components/PostCard";
import Link from "next/link";
import Image from "next/image";

export default function UserPage({ params }: any) {
  const { id } = params;
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  // Function to refresh profile counts
  const refreshProfileCounts = async () => {
    if (!profile) return;
    
    try {
      const sb = supabaseBrowser();
      
      // Get followers count
      const { count: followersCount } = await sb
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', id)
        .eq('status', 'accepted');
      
      // Get following count
      const { count: followingCount } = await sb
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', id)
        .eq('status', 'accepted');
      
      // Get posts count
      const { count: postsCount } = await sb
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', id);
      
      console.log('Refreshed counts:', { 
        followersCount, 
        followingCount, 
        postsCount 
      });
      
      setProfile(prev => ({
        ...prev,
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        posts_count: postsCount || 0
      }));
    } catch (error) {
      console.error('Error refreshing counts:', error);
    }
  };

  useEffect(() => {
    const sb = supabaseBrowser();
    (async () => {
      // Get current user
      const { data: { user } } = await sb.auth.getUser();
      console.log('Current user in profile page:', { 
        user: !!user, 
        userId: user?.id, 
        profileId: id 
      });
      setCurrentUser(user);

      // Get profile data
      let { data: p, error: profileError } = await sb.from('profiles_public').select('*').eq('id', id).single();
      
      // If profiles_public view fails, try direct profiles table
      if (profileError && profileError.message.includes('profiles_public')) {
        console.log('profiles_public view failed, trying direct profiles table...');
        const fallbackResult = await sb
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();
        p = fallbackResult.data;
        profileError = fallbackResult.error;
      }
      
      console.log('Profile data result:', { profile: p, profileError });
      
      // Calculate real-time counts if profile exists
      if (p) {
        try {
          // Get followers count
          const { count: followersCount } = await sb
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', id)
            .eq('status', 'accepted');
          
          // Get following count
          const { count: followingCount } = await sb
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', id)
            .eq('status', 'accepted');
          
          // Get posts count
          const { count: postsCount } = await sb
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('author_id', id);
          
          console.log('Real-time counts:', { 
            followersCount, 
            followingCount, 
            postsCount 
          });
          
          // Update profile with real-time counts
          p.followers_count = followersCount || 0;
          p.following_count = followingCount || 0;
          p.posts_count = postsCount || 0;
        } catch (countError) {
          console.error('Error calculating counts:', countError);
          // Use default values if calculation fails
          p.followers_count = p.followers_count || 0;
          p.following_count = p.following_count || 0;
          p.posts_count = p.posts_count || 0;
        }
      }
      
      setProfile(p);

      // Get posts with proper joins
      let { data: list, error: postsError } = await sb
        .from('posts')
        .select(`
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
        `)
        .eq('author_id', id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      console.log('Profile posts query result:', { list, postsError, count: list?.length });
      
      // If likes join fails, try without it
      if (postsError && postsError.message.includes('likes')) {
        console.log('Likes join failed, trying without likes...');
        const fallbackResult = await sb
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
          .eq('author_id', id)
          .order('created_at', { ascending: false })
          .limit(50);
        
        list = fallbackResult.data;
        postsError = fallbackResult.error;
        console.log('Profile posts fallback result:', { list, postsError, count: list?.length });
      }
      
      if (postsError) {
        console.error('Error fetching profile posts:', postsError);
        setPosts([]);
      } else {
        // If we don't have likes data from the join, fetch it separately
        let likesData: any = {};
        if (list && list.length > 0 && !(list[0] as any).likes) {
          console.log('Fetching likes data separately for profile posts...');
          try {
            const postIds = list.map((p: any) => p.id);
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
              console.log('Separate likes data for profile:', likesData);
            }
          } catch (likesError) {
            console.error('Error fetching likes separately for profile:', likesError);
          }
        }
        
        // Process posts to add like counts and viewer_liked status
        const processedPosts = (list || []).map((post: any) => {
          const postLikes = post.likes || likesData[post.id] || [];
          const likeCount = postLikes.length;
          const viewerLiked = user ? postLikes.some((like: any) => like.user_id === user.id) : false;
          
          console.log('Processing profile post:', { 
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
            profiles: post.profiles || {}
          };
        });
        
        console.log('Profile posts processed:', { count: processedPosts.length });
        setPosts(processedPosts);
      }

      // Check if current user is following this profile
      if (user && p) {
        const { data: followData } = await sb
          .from('follows')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', id)
          .single();
        setIsFollowing(!!followData);
      }

      setLoading(false);
    })();
  }, [id]);

  const handleFollow = async () => {
    console.log('Follow button clicked!', { 
      currentUser: !!currentUser, 
      profile: !!profile, 
      isFollowing, 
      followLoading 
    });
    
    if (!currentUser || !profile) {
      console.log('Cannot follow: missing currentUser or profile');
      return;
    }
    
    setFollowLoading(true);
    try {
      const sb = supabaseBrowser();
      
      if (isFollowing) {
        console.log('Unfollowing user...');
        // Unfollow
        const { error: unfollowError } = await sb
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', id);
        
        if (unfollowError) {
          console.error('Unfollow error:', unfollowError);
          throw unfollowError;
        }
        
        setIsFollowing(false);
        console.log('Successfully unfollowed');
        
        // Update counts in real-time
        const { count: newFollowersCount } = await sb
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', id)
          .eq('status', 'accepted');
        
        setProfile(prev => ({ 
          ...prev, 
          followers_count: newFollowersCount || 0 
        }));
      } else {
        console.log('Following user...');
        // Follow
        const { error: followError } = await sb
          .from('follows')
          .insert({ 
            follower_id: currentUser.id, 
            following_id: id,
            status: 'accepted' // Auto-accept follows
          });
        
        if (followError) {
          console.error('Follow error:', followError);
          throw followError;
        }
        
        setIsFollowing(true);
        console.log('Successfully followed');
        
        // Update counts in real-time
        const { count: newFollowersCount } = await sb
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', id)
          .eq('status', 'accepted');
        
        setProfile(prev => ({ 
          ...prev, 
          followers_count: newFollowersCount || 0 
        }));
      }
    } catch (error) {
      console.error('Follow/unfollow error:', error);
      alert(`Follow/unfollow failed: ${error.message}`);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-neutral-700 rounded w-1/3"></div>
            <div className="h-4 bg-neutral-700 rounded w-1/2"></div>
            <div className="h-4 bg-neutral-700 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <div className="card p-6 text-center">
          <h2 className="text-xl font-semibold text-red-400">User not found</h2>
          <p className="text-muted">This user doesn't exist or has been deleted.</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === id;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="card p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={`${profile.username}'s avatar`}
                width={120}
                height={120}
                className="rounded-full border-2 border-neutral-700"
              />
            ) : (
              <div className="w-30 h-30 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white">
                {profile.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-2xl font-bold">@{profile.username}</h1>
              {(() => {
                console.log('Follow button render check:', { 
                  isOwnProfile, 
                  currentUser: !!currentUser, 
                  profile: !!profile,
                  isFollowing,
                  followLoading 
                });
                
                if (isOwnProfile) {
                  return (
                    <Link href={`/users/${id}/edit`} className="btn">
                      Edit Profile
                    </Link>
                  );
                } else if (currentUser) {
                  return (
                    <button
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={`btn ${isFollowing ? 'bg-red-600 hover:bg-red-700' : ''}`}
                    >
                      {followLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                  );
                } else {
                  console.log('No follow button: not logged in');
                  return null;
                }
              })()}
            </div>

            {profile.first_name && profile.last_name && (
              <h2 className="text-lg font-medium text-neutral-300 mb-2">
                {profile.first_name} {profile.last_name}
              </h2>
            )}

            {profile.bio && (
              <p className="text-neutral-300 mb-4 whitespace-pre-wrap">{profile.bio}</p>
            )}

            {/* Profile Stats */}
            <div className="flex items-center gap-6 text-sm text-muted mb-4">
              <div className="flex items-center gap-2">
                <span><strong className="text-white">{profile.followers_count}</strong> followers</span>
                <button
                  onClick={refreshProfileCounts}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  title="Refresh counts"
                >
                  🔄
                </button>
              </div>
              <span><strong className="text-white">{profile.following_count}</strong> following</span>
              <span><strong className="text-white">{profile.posts_count}</strong> posts</span>
            </div>

            {/* Additional Info */}
            <div className="space-y-2 text-sm text-muted">
              {profile.location && (
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.website && (
                <div className="flex items-center gap-2">
                  <span>🌐</span>
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    {profile.website}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Posts</h2>
        {posts.length === 0 ? (
          <div className="card p-6 text-center text-muted">
            <p>No posts yet.</p>
            {isOwnProfile && (
              <Link href="/compose" className="btn mt-4 inline-block">
                Create your first post
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(p => <PostCard key={p.id} post={p} currentUserId={currentUser?.id} />)}
          </div>
        )}
      </div>
    </div>
  );
}
