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

    // Get pending follow requests for this user
    const { data: requests, error } = await supabaseAdmin()
      .from('follows')
      .select('id, follower_id, created_at')
      .eq('following_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching follow requests:', error);
      return NextResponse.json({ error: 'Failed to fetch follow requests' }, { status: 500 });
    }

    // Get profile data for each requester
    const transformedRequests = await Promise.all((requests || []).map(async request => {
      const { data: profile } = await supabaseAdmin()
        .from('profiles')
        .select('username, first_name, last_name, avatar_url')
        .eq('id', request.follower_id)
        .single();

      return {
        id: request.id,
        requester_id: request.follower_id,
        created_at: request.created_at,
        requester_username: profile?.username || 'Unknown',
        requester_first_name: profile?.first_name || null,
        requester_last_name: profile?.last_name || null,
        requester_avatar_url: profile?.avatar_url || null
      };
    }));

    return NextResponse.json(transformedRequests);

  } catch (error) {
    console.error('Follow requests API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
