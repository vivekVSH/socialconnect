import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function PostCard({ post, currentUserId }: any) {
  const [liked, setLiked] = useState(post.viewer_liked);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const router = useRouter();
  const actionsRef = useRef<HTMLDivElement>(null);

  // Debug: Log profile data
  console.log('PostCard profile data:', {
    postId: post.id,
    authorId: post.author_id,
    profiles: post.profiles,
    authorUsername: post.author_username,
    profilesUsername: post.profiles?.username,
    profilesFirstName: post.profiles?.first_name,
    profilesLastName: post.profiles?.last_name,
    likeCount: post.like_count,
    viewerLiked: post.viewer_liked,
    currentLiked: liked,
    currentLikeCount: likeCount
  });

  useEffect(() => {
    fetchComments();
  }, [post.id]);

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActions]);

  async function fetchComments() {
    const res = await fetch(`/api/posts/${post.id}/comments`);
    if (res.ok) {
      const data = await res.json();
      setComments(data);
    }
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    setIsLoading(true);
    try {
      const sb = supabaseBrowser();
      const { data: { session } } = await sb.auth.getSession();
      
      if (!session) {
        console.error('No session found');
        return;
      }

      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          content: commentText,
        }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setComments([...comments, newComment]);
        setCommentText("");
      } else {
        const error = await res.json();
        console.error("Failed to post comment:", error);
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const sb = supabaseBrowser();
      const { data: { session } } = await sb.auth.getSession();
      
      if (!session) {
        alert('Please log in to delete posts');
        return;
      }

      console.log('Deleting post:', { postId: post.id, userId: currentUserId });

      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      console.log('Delete response:', { status: res.status, ok: res.ok });

      if (res.ok) {
        console.log('Post deleted successfully');
        window.location.reload();
      } else {
        const error = await res.json();
        console.error('Delete failed:', error);
        alert(`Failed to delete post: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post');
    }
  };

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-neutral-700 overflow-hidden flex-shrink-0">
            {post.profiles?.avatar_url ? (
              <Image
                src={post.profiles.avatar_url}
                alt={post.profiles.username || 'User'}
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-neutral-600 flex items-center justify-center text-sm font-semibold">
                {post.profiles?.username?.charAt(0).toUpperCase() || 
                 post.author_username?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div>
            <Link href={"/users/" + post.author_id} className="font-medium hover:underline">
              {post.profiles?.first_name && post.profiles?.last_name 
                ? `${post.profiles.first_name} ${post.profiles.last_name}`
                : post.profiles?.username || post.author_username || "user"}
            </Link>
            <div className="text-xs text-muted">
              @{post.profiles?.username || post.author_username || "user"} • {new Date(post.created_at).toLocaleString()}
            </div>
          </div>
        </div>
        
        {/* Post Actions Menu - Only show for post author */}
        {currentUserId === post.author_id && (
          <div className="relative" ref={actionsRef}>
            <button
              onClick={() => setShowActions(!showActions)}
              className="text-muted hover:text-white p-1"
            >
              ⋯
            </button>
            {showActions && (
              <div className="absolute right-0 top-8 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg z-10 min-w-[120px]">
                <Link
                  href={`/posts/${post.id}/edit`}
                  className="block px-3 py-2 text-sm hover:bg-neutral-700 rounded-t-lg"
                  onClick={() => setShowActions(false)}
                >
                  Edit Post
                </Link>
                <button
                  onClick={() => {
                    setShowActions(false);
                    handleDeletePost();
                  }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-neutral-700 text-red-400 rounded-b-lg"
                >
                  Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="whitespace-pre-wrap">{post.content}</div>
      {post.image_url ? (
        <div className="relative w-full h-64 overflow-hidden rounded-xl border border-neutral-800">
          <Image src={post.image_url} alt="post image" fill className="object-cover" />
        </div>
      ) : null}
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1">
          <span>❤️</span>
          <span>{likeCount}</span>
        </span>
        <span className="flex items-center gap-1">
          <span>💬</span>
          <span>{comments.length}</span>
        </span>
        {currentUserId && (
          <button
            onClick={async () => {
              if (isLikeLoading) return;
              
              console.log('Like button clicked:', { 
                postId: post.id, 
                currentLiked: liked, 
                action: liked ? 'unlike' : 'like' 
              });
              
              setIsLikeLoading(true);
              try {
                const sb = supabaseBrowser();
                const { data: { session } } = await sb.auth.getSession();
                
                console.log('Session check:', { 
                  hasSession: !!session, 
                  userId: session?.user?.id,
                  accessToken: session?.access_token ? 'Present' : 'Missing'
                });
                
                if (!session) {
                  console.error('No session found');
                  alert('Please log in to like posts');
                  return;
                }

                console.log('Making like API request:', {
                  url: `/api/posts/${post.id}/like`,
                  action: liked ? 'unlike' : 'like',
                  userId: session.user.id
                });

                const res = await fetch(`/api/posts/${post.id}/like`, {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                  },
                  body: JSON.stringify({
                    action: liked ? 'unlike' : 'like'
                  })
                });
                
                console.log('API response:', { 
                  status: res.status, 
                  ok: res.ok, 
                  statusText: res.statusText 
                });

                if (res.ok) {
                  // Update local state instead of reloading
                  setLiked(!liked);
                  setLikeCount((prev: number) => liked ? prev - 1 : prev + 1);
                  console.log('Like/unlike successful:', { liked: !liked, newCount: liked ? likeCount - 1 : likeCount + 1 });
                } else {
                  const error = await res.json();
                  console.error("Failed to like/unlike post:", { 
                    status: res.status, 
                    error: error,
                    responseText: await res.text()
                  });
                  alert(`Failed to ${liked ? 'unlike' : 'like'} post: ${error.error || 'Unknown error'}`);
                }
              } catch (error) {
                console.error("Failed to like/unlike post:", error);
              } finally {
                setIsLikeLoading(false);
              }
            }}
            className={`btn ${isLikeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLikeLoading}
          >
            {isLikeLoading ? "..." : (liked ? "Unlike" : "Like")}
          </button>
        )}
      </div>

      {/* Comments Section */}
      <div className="mt-4 space-y-4 border-t pt-4">
        <div className="font-medium">Comments</div>
        {currentUserId && (
          <form onSubmit={handleCommentSubmit} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="input flex-1"
              disabled={isLoading}
            />
            <button type="submit" className="btn" disabled={isLoading}>
              {isLoading ? "Posting..." : "Post"}
            </button>
          </form>
        )}
        
        <div className="space-y-3">
          {comments.map((comment: any) => (
            <div key={comment.id} className="flex gap-2 text-sm">
              <Link href={`/users/${comment.author_id}`} className="font-medium hover:underline">
                {comment.profiles?.username}
              </Link>
              <span>{comment.content}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
