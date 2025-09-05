import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const postId = params.id;
    const { action } = await request.json(); // 'like' or 'unlike'
    
    console.log('Like API called:', { postId, action });
    
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

    if (action === 'like') {
      // Like the post
      console.log('Attempting to like post:', { userId: user.id, postId });
      
      const { data, error } = await supabaseAdmin()
        .from('likes')
        .insert({
          user_id: user.id,
          post_id: postId
        })
        .select();

      console.log('Like operation result:', { data, error });

      if (error) {
        console.error('Like error:', error);
        return NextResponse.json({ error: `Failed to like post: ${error.message}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Post liked successfully' });
    } else if (action === 'unlike') {
      // Unlike the post
      console.log('Attempting to unlike post:', { userId: user.id, postId });
      
      const { data, error } = await supabaseAdmin()
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .select();

      console.log('Unlike operation result:', { data, error });

      if (error) {
        console.error('Unlike error:', error);
        return NextResponse.json({ error: `Failed to unlike post: ${error.message}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Post unliked successfully' });
    } else {
      console.log('Invalid action:', action);
      return NextResponse.json({ error: 'Invalid action. Use "like" or "unlike"' }, { status: 400 });
    }

  } catch (error) {
    console.error('Like API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}