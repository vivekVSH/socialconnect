import { NextRequest, NextResponse } from "next/server";
import { supabaseBrowser } from "@/lib/supabaseClient";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notification_ids } = body;

    if (!notification_ids || !Array.isArray(notification_ids)) {
      return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 });
    }

    const supabase = supabaseBrowser();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mark notifications as read
    const { data: updatedCount, error } = await supabase
      .rpc('mark_notifications_read', {
        p_user_id: user.id,
        p_notification_ids: notification_ids
      } as any);

    if (error) {
      console.error('Error marking notifications as read:', error);
      return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      updated_count: updatedCount 
    });

  } catch (error) {
    console.error('Mark notifications read API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
