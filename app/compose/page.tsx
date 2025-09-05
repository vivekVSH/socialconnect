'use client';
import { useEffect, useState } from "react";
import Textarea from "@/components/Textarea";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ComposePage() {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [category, setCategory] = useState('general');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onCreate = async (e:any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const sb = supabaseBrowser();
      
      // Get the current user first to ensure we're authenticated
      const { data: { user }, error: authError } = await sb.auth.getUser();
      if (authError || !user) {
        throw new Error("You must be logged in to create a post");
      }

      let image_url: string | null = null;
      if (imageFile) {
        if (imageFile.size > 2*1024*1024) {
          throw new Error("Max image size is 2MB");
        }
        if (!['image/jpeg','image/png'].includes(imageFile.type)) {
          throw new Error("Only JPEG/PNG allowed");
        }

        try {
          // Use server-side upload API to bypass RLS
          const formData = new FormData();
          formData.append('file', imageFile);
          formData.append('userId', user.id);

          const uploadResponse = await fetch('/api/upload/image', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || 'Upload failed');
          }

          const uploadData = await uploadResponse.json();
          image_url = uploadData.url;
        } catch (uploadErr: any) {
          console.error('Image upload error:', uploadErr);
          throw new Error(`Image upload failed: ${uploadErr.message}`);
        }
      }

      // Create the post
      const { data: postData, error: postError } = await sb.from('posts').insert({
        content,
        image_url,
        category,
        author_id: user.id
      } as any).select('id').single();

      if (postError) {
        console.error('Error creating post:', postError);
        throw postError;
      }

      // Process mentions in post content
      try {
        const { data: authorData } = await sb
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (authorData && postData) {
          const { NotificationService } = await import('@/lib/notificationService');
          await NotificationService.processMentions(
            content,
            (postData as any).id,
            user.id,
            (authorData as any).username
          );
        }
      } catch (mentionError) {
        console.error('Error processing mentions:', mentionError);
        // Don't fail post creation if mention processing fails
      }

      router.replace('/feed');
    } catch (err:any) {
      alert(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg mx-auto card p-6 space-y-4">
      <h1 className="text-xl font-semibold">Create Post</h1>
      <form onSubmit={onCreate} className="space-y-3">
        <Textarea placeholder="What's happening?" maxLength={280} value={content} onChange={e=>setContent(e.target.value)} required />
        <input type="file" accept="image/png,image/jpeg" onChange={e=>setImageFile(e.target.files?.[0] || null)} />
        <select className="input" value={category} onChange={e=>setCategory(e.target.value)}>
          <option value="general">General</option>
          <option value="announcement">Announcement</option>
          <option value="question">Question</option>
        </select>
        <button className="btn w-full" disabled={loading}>{loading ? "Posting..." : "Post"}</button>
      </form>
    </div>
  );
}
