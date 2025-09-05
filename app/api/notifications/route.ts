import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
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
    const { data: tableCheck, error: tableError } = await supabaseAdmin()
      .from('notifications')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('Table check error:', tableError);
      if (tableError.message.includes('relation "notifications" does not exist')) {
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: 'Database error', details: tableError.message }, { status: 500 });
    }

    if (!tableCheck) {
      // Table doesn't exist, return empty array
      return NextResponse.json([]);
    }

    // Try to get notifications using the function first
    const { data: notifications, error } = await supabaseAdmin()
      .rpc('get_user_notifications', {
        p_user_id: user.id,
        p_limit: limit
      });

    if (error) {
      console.error('Error fetching notifications with function:', error);
      
      // If function fails due to type mismatch, try direct query as fallback
      if (error.message.includes('structure of query does not match function result type')) {
        console.log('Function type mismatch detected, trying direct query...');
        
        const { data: directNotifications, error: directError } = await supabaseAdmin()
          .from('notifications')
          .select(`
            id,
            actor_id,
            type,
            entity_type,
            entity_id,
            title,
            message,
            is_read,
            created_at
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (directError) {
          console.error('Direct query also failed:', directError);
          return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
        }

        // Transform direct query results to match expected format
        const transformedNotifications = (directNotifications || []).map(notification => ({
          id: notification.id,
          actor_id: notification.actor_id,
          type: notification.type,
          entity_type: notification.entity_type,
          entity_id: notification.entity_id,
          title: notification.title,
          message: notification.message,
          is_read: notification.is_read,
          created_at: notification.created_at,
          actor_username: 'Unknown',
          actor_avatar_url: null,
          actor_first_name: null,
          actor_last_name: null
        }));

        return NextResponse.json(transformedNotifications);
      }
      
      // If table doesn't exist or has other issues, return empty array instead of error
      if (error.message.includes('relation "notifications" does not exist')) {
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // The function already returns the data in the correct format
    return NextResponse.json(notifications || []);

  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      user_id, 
      actor_id, 
      type, 
      entity_type, 
      entity_id, 
      title, 
      message 
    } = body;

    if (!user_id || !actor_id || !type || !entity_type || !entity_id || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    
    // Create notification using the function
    const { data: notificationId, error } = await supabase
      .rpc('create_notification', {
        p_user_id: user_id,
        p_actor_id: actor_id,
        p_type: type,
        p_entity_type: entity_type,
        p_entity_id: entity_id,
        p_title: title,
        p_message: message
      });

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      notification_id: notificationId 
    });

  } catch (error) {
    console.error('Create notification API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
