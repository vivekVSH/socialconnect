import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action'); // 'follow' or 'unfollow'
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin().auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUserId = params.id;
    const followerId = user.id;

    if (action === 'follow') {
      // Follow user
      const { error } = await supabaseAdmin()
        .from('follows')
        .insert({
          follower_id: followerId,
          following_id: targetUserId
        });

      if (error) {
        console.error('Follow error:', error);
        return NextResponse.json({ error: 'Failed to follow user' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'User followed successfully' });
    } else if (action === 'unfollow') {
      // Unfollow user
      const { error } = await supabaseAdmin()
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', targetUserId);

      if (error) {
        console.error('Unfollow error:', error);
        return NextResponse.json({ error: 'Failed to unfollow user' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'User unfollowed successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "follow" or "unfollow"' }, { status: 400 });
    }

  } catch (error) {
    console.error('Follow API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
