import { createClient } from "@supabase/supabase-js";

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const supabaseBrowser = () => {
  if (supabaseInstance) return supabaseInstance;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  supabaseInstance = createClient(url, anon, {
    auth: {
      persistSession: true,
      storageKey: 'sb-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      autoRefreshToken: true,
      detectSessionInUrl: false // Disable URL session detection for faster loading
    },
    realtime: {
      params: {
        eventsPerSecond: 10 // Limit realtime events for better performance
      }
    }
  });
  
  return supabaseInstance;
};

// Helper for uploading images via API route (bypasses RLS issues)
export async function uploadImage(file: File, userId: string) {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Max image size is 2MB");
  }
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error("Only JPEG/PNG allowed");
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);

    const response = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    return data.url;
  } catch (error: any) {
    console.error('Image upload error:', error);
    throw new Error(`Image upload failed: ${error.message}`);
  }
}

// Helper for creating posts
export async function createPost(content: string, imageFile: File | null = null, category = "general") {
  const supabase = supabaseBrowser();

  // Get the logged-in user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  // Upload image if provided
  let image_url: string | null = null;
  if (imageFile) {
    image_url = await uploadImage(imageFile, user.id);
  }

  // Insert post with author_id
  const { data, error } = await supabase.from("posts").insert({
    content,
    image_url,
    category,
    author_id: user.id
  } as any);

  if (error) {
    console.error('Error creating post:', error);
    throw error;
  }

  return data;
}
