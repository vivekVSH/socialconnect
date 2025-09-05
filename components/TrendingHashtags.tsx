'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function TrendingHashtags() {
  const [hashtags, setHashtags] = useState<{tag: string, count: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrendingHashtags = async () => {
      try {
        const sb = supabaseBrowser();
        
        // Get posts from the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: posts } = await sb
          .from('posts')
          .select('content')
          .gte('created_at', sevenDaysAgo.toISOString());

        if (posts) {
          // Extract hashtags from post content
          const hashtagCounts: {[key: string]: number} = {};
          
          posts.forEach(post => {
            const hashtags = post.content.match(/#\w+/g);
            if (hashtags) {
              hashtags.forEach(tag => {
                const cleanTag = tag.toLowerCase();
                hashtagCounts[cleanTag] = (hashtagCounts[cleanTag] || 0) + 1;
              });
            }
          });

          // Sort by count and take top 10
          const sortedHashtags = Object.entries(hashtagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

          setHashtags(sortedHashtags);
        }
      } catch (error) {
        console.error('Error fetching trending hashtags:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingHashtags();
  }, []);

  if (loading) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold mb-3">Trending Hashtags</h3>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (hashtags.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold mb-3">Trending Hashtags</h3>
        <p className="text-muted text-sm">No trending hashtags yet</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-3">Trending Hashtags</h3>
      <div className="space-y-2">
        {hashtags.map(({ tag, count }, index) => (
          <div key={tag} className="flex items-center justify-between">
            <Link
              href={`/search?q=${encodeURIComponent(tag)}&tab=posts`}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              {tag}
            </Link>
            <span className="text-muted text-xs">
              {count} {count === 1 ? 'post' : 'posts'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
