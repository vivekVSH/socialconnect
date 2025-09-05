import { NextRequest, NextResponse } from "next/server";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { NotificationService } from "@/lib/notificationService";

export async function POST(request: NextRequest) {
  try {
    const { targetUserId } = await request.json();
    
    console.log('Follow request received:', { targetUserId });
    
    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    const supabase = supabaseBrowser();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Follow auth check:', { user: user?.id, authError });
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.id === targetUserId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Check if already following
    const { data: existingFollow } = await supabaseAdmin()
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .single();

    if (existingFollow) {
      return NextResponse.json({ error: 'Already following this user' }, { status: 400 });
    }

    // Create follow request (pending status)
    const { data: followData, error: followError } = await supabaseAdmin()
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: targetUserId,
        status: 'pending'
      })
      .select();

    console.log('Follow creation result:', { followData, followError });

    if (followError) {
      console.error('Error creating follow request:', followError);
      return NextResponse.json({ error: 'Failed to send follow request' }, { status: 500 });
    }

    // Create notification for follow request
    try {
      const { data: followerData } = await supabaseAdmin()
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (followerData) {
        await NotificationService.createFollowNotification(
          targetUserId,
          user.id,
          followerData.username
        );
      }
    } catch (notificationError) {
      console.error('Error creating follow notification:', notificationError);
      // Don't fail the follow if notification fails
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Follow API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { targetUserId } = await request.json();
    
    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    const supabase = supabaseBrowser();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Remove follow relationship
    const { error: unfollowError } = await supabaseAdmin()
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId);

    if (unfollowError) {
      console.error('Error removing follow:', unfollowError);
      return NextResponse.json({ error: 'Failed to unfollow user' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Unfollow API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
