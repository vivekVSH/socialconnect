'use client';
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/useAuth";
import LoadingSkeleton from "@/components/LoadingSkeleton";

export default function EditPostPage() {
  const [post, setPost] = useState<any>(null);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchPost = async () => {
      try {
        const sb = supabaseBrowser();
        const { data, error } = await sb
          .from('posts')
          .select('*')
          .eq('id', postId)
          .eq('author_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching post:', error);
          setError('Post not found or you do not have permission to edit it.');
          return;
        }

        setPost(data);
        setContent(data.content || '');
        setCategory(data.category || 'general');
        setImageUrl(data.image_url);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load post.');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [user, postId, router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user?.id || '');

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { url } = await response.json();
      setImageUrl(url);
    } catch (error) {
      console.error('Image upload error:', error);
      setError('Failed to upload image');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setSaving(true);
      setError('');

      const sb = supabaseBrowser();
      const { error } = await sb
        .from('posts')
        .update({
          content: content.trim(),
          category,
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .eq('author_id', user?.id);

      if (error) {
        throw error;
      }

      router.push('/feed');
    } catch (err) {
      console.error('Error updating post:', err);
      setError('Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      const sb = supabaseBrowser();
      
      // Delete the post
      const { error } = await sb
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('author_id', user?.id);

      if (error) {
        throw error;
      }

      router.push('/feed');
    } catch (err) {
      console.error('Error deleting post:', err);
      setError('Failed to delete post');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-6 text-center">
          <h1 className="text-xl font-semibold mb-4">Post Not Found</h1>
          <p className="text-muted mb-4">
            The post you're looking for doesn't exist or you don't have permission to edit it.
          </p>
          <button
            onClick={() => router.push('/feed')}
            className="btn"
          >
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Edit Post</h1>
          <button
            onClick={handleDelete}
            className="btn-secondary text-red-400 hover:text-red-300 hover:border-red-500"
            disabled={saving}
          >
            {saving ? 'Deleting...' : 'Delete Post'}
          </button>
        </div>

        {error && (
          <div className="form-error mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="input min-h-[120px] resize-none"
              placeholder="What's on your mind?"
              maxLength={2000}
              required
            />
            <div className="text-sm text-muted text-right">
              {content.length}/2000
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
            >
              <option value="general">General</option>
              <option value="tech">Technology</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="news">News</option>
              <option value="entertainment">Entertainment</option>
              <option value="sports">Sports</option>
              <option value="education">Education</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="input"
              disabled={saving}
            />
            {imageUrl && (
              <div className="mt-2">
                <img
                  src={imageUrl}
                  alt="Post image"
                  className="max-w-full h-48 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="btn-secondary text-sm mt-2"
                  disabled={saving}
                >
                  Remove Image
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="btn flex-1"
              disabled={saving || !content.trim()}
            >
              {saving ? 'Saving...' : 'Update Post'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
