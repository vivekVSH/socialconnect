import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { NotificationService } from "@/lib/notificationService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requester_id, action } = body;

    if (!requester_id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

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

    if (action === 'accept') {
      // Update the follow request to accepted
      const { error: updateError } = await supabaseAdmin()
        .from('follows')
        .update({ status: 'accepted' })
        .eq('follower_id', requester_id)
        .eq('following_id', user.id)
        .eq('status', 'pending');

      if (updateError) {
        console.error('Error accepting follow request:', updateError);
        return NextResponse.json({ error: 'Failed to accept follow request' }, { status: 500 });
      }

      // Create notification for accepted follow request
      try {
        const { data: accepterData } = await supabaseAdmin()
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (accepterData) {
          await NotificationService.createAcceptedFollowNotification(
            requester_id, // Notify the requester
            user.id,      // Actor is the one who accepted
            accepterData.username
          );
        }
      } catch (notificationError) {
        console.error('Error creating accepted follow notification:', notificationError);
        // Don't fail the accept if notification fails
      }
    } else {
      // Delete the follow request (decline)
      const { error: deleteError } = await supabaseAdmin()
        .from('follows')
        .delete()
        .eq('follower_id', requester_id)
        .eq('following_id', user.id)
        .eq('status', 'pending');

      if (deleteError) {
        console.error('Error declining follow request:', deleteError);
        return NextResponse.json({ error: 'Failed to decline follow request' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      action: action 
    });

  } catch (error) {
    console.error('Follow respond API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
