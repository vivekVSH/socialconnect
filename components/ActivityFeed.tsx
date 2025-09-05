'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/useAuth';
import Link from 'next/link';
import Image from 'next/image';

interface Activity {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'post';
  user: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  post?: {
    id: string;
    content: string;
    image_url?: string;
  };
  created_at: string;
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const fetchActivities = async () => {
      try {
        const sb = supabaseBrowser();
        
        // Get recent activities from the last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // Get likes on user's posts
        const { data: likes } = await sb
          .from('likes')
          .select(`
            id,
            created_at,
            profiles!user_id (
              id,
              username,
              first_name,
              last_name,
              avatar_url
            ),
            posts!post_id (
              id,
              content,
              image_url,
              author_id
            )
          `)
          .eq('posts.author_id', user.id)
          .gte('created_at', yesterday.toISOString())
          .order('created_at', { ascending: false })
          .limit(10);

        // Get comments on user's posts
        const { data: comments } = await sb
          .from('comments')
          .select(`
            id,
            created_at,
            profiles!author_id (
              id,
              username,
              first_name,
              last_name,
              avatar_url
            ),
            posts!post_id (
              id,
              content,
              image_url,
              author_id
            )
          `)
          .eq('posts.author_id', user.id)
          .gte('created_at', yesterday.toISOString())
          .order('created_at', { ascending: false })
          .limit(10);

        // Get new followers
        const { data: follows } = await sb
          .from('follows')
          .select(`
            id,
            created_at,
            profiles!follower_id (
              id,
              username,
              first_name,
              last_name,
              avatar_url
            )
          `)
          .eq('following_id', user.id)
          .gte('created_at', yesterday.toISOString())
          .order('created_at', { ascending: false })
          .limit(10);

        // Combine and format activities
        const allActivities: Activity[] = [];

        likes?.forEach(like => {
          if (like.profiles && like.posts) {
            allActivities.push({
              id: `like-${like.id}`,
              type: 'like',
              user: like.profiles,
              post: like.posts,
              created_at: like.created_at
            });
          }
        });

        comments?.forEach(comment => {
          if (comment.profiles && comment.posts) {
            allActivities.push({
              id: `comment-${comment.id}`,
              type: 'comment',
              user: comment.profiles,
              post: comment.posts,
              created_at: comment.created_at
            });
          }
        });

        follows?.forEach(follow => {
          if (follow.profiles) {
            allActivities.push({
              id: `follow-${follow.id}`,
              type: 'follow',
              user: follow.profiles,
              created_at: follow.created_at
            });
          }
        });

        // Sort by creation time
        allActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        setActivities(allActivities.slice(0, 20));
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [user]);

  const getActivityText = (activity: Activity) => {
    switch (activity.type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      case 'follow':
        return 'started following you';
      default:
        return 'interacted with your content';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'like':
        return '❤️';
      case 'comment':
        return '💬';
      case 'follow':
        return '👥';
      default:
        return '🔔';
    }
  };

  if (!user) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold mb-3">Recent Activity</h3>
        <div className="text-center py-4">
          <div className="text-4xl mb-2">🔒</div>
          <p className="text-muted text-sm">Sign in to see your activity</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold mb-3">Recent Activity</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-8 w-8 bg-neutral-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-neutral-700 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-neutral-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold mb-3">Recent Activity</h3>
        <div className="text-center py-4">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-muted text-sm mb-2">No recent activity</p>
          <p className="text-xs text-muted-foreground">
            Start posting content to see likes, comments, and follows here!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-3">Recent Activity</h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-neutral-700 overflow-hidden flex-shrink-0">
              {activity.user.avatar_url ? (
                <Image
                  src={activity.user.avatar_url}
                  alt={activity.user.username}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-neutral-600 flex items-center justify-center text-xs font-semibold">
                  {activity.user.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm">
                <Link
                  href={`/users/${activity.user.id}`}
                  className="font-medium hover:underline text-blue-400"
                >
                  {activity.user.first_name} {activity.user.last_name}
                </Link>
                <span className="text-muted ml-1">
                  {getActivityIcon(activity.type)} {getActivityText(activity)}
                </span>
              </div>
              {activity.post && (
                <Link
                  href={`/posts/${activity.post.id}`}
                  className="block mt-1 text-xs text-muted hover:text-white transition-colors bg-neutral-800/50 p-2 rounded"
                >
                  "{activity.post.content.length > 60
                    ? `${activity.post.content.substring(0, 60)}...`
                    : activity.post.content}"
                </Link>
              )}
              <div className="text-xs text-muted mt-1">
                {new Date(activity.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
