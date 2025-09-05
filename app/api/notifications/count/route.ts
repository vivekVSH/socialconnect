import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  try {
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

    // Check if notifications table exists first
    const { data: tableCheck } = await supabaseAdmin()
      .from('notifications')
      .select('id')
      .limit(1);

    if (!tableCheck) {
      // Table doesn't exist, return 0
      return NextResponse.json({ unread_count: 0 });
    }

    // Get unread notification count using the function
    const { data: unreadCount, error } = await supabaseAdmin()
      .rpc('get_unread_notification_count', {
        p_user_id: user.id
      });

    if (error) {
      console.error('Error fetching unread count:', error);
      // If table doesn't exist or has issues, return 0 instead of error
      if (error.message.includes('relation "notifications" does not exist')) {
        return NextResponse.json({ unread_count: 0 });
      }
      return NextResponse.json({ error: 'Failed to fetch unread count' }, { status: 500 });
    }

    return NextResponse.json({ 
      unread_count: unreadCount || 0 
    });

  } catch (error) {
    console.error('Unread count API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
