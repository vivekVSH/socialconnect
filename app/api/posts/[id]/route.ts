import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const postId = params.id;
    
    const { data: post, error } = await supabaseAdmin()
      .from('posts')
      .select(`
        *,
        profiles!posts_author_id_fkey (
          id,
          username,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('id', postId)
      .single();

    if (error) {
      console.error('Error fetching post:', error);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json(post);

  } catch (error) {
    console.error('Get post API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const postId = params.id;
    
    console.log('Delete post API called:', { postId });
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log('No authorization header');
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted:', token ? 'Present' : 'Missing');
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin().auth.getUser(token);
    
    console.log('Auth result:', { user: user?.id, authError });
    
    if (authError || !user) {
      console.log('Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if post exists and belongs to user
    const { data: post, error: postError } = await supabaseAdmin()
      .from('posts')
      .select('id, author_id')
      .eq('id', postId)
      .single();

    console.log('Post check:', { post, postError });

    if (postError || !post) {
      console.log('Post not found:', postError);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.author_id !== user.id) {
      console.log('User not authorized to delete this post:', { postAuthor: post.author_id, userId: user.id });
      return NextResponse.json({ error: 'Not authorized to delete this post' }, { status: 403 });
    }

    // Delete the post
    console.log('Attempting to delete post:', { postId, authorId: user.id });
    
    const { data, error } = await supabaseAdmin()
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', user.id)
      .select();

    console.log('Delete operation result:', { data, error });

    if (error) {
      console.error('Error deleting post:', error);
      return NextResponse.json({ error: `Failed to delete post: ${error.message}` }, { status: 500 });
    }

    console.log('Post deleted successfully');
    return NextResponse.json({ success: true, message: 'Post deleted successfully' });

  } catch (error) {
    console.error('Delete post API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}