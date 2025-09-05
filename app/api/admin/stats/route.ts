import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

async function verifyAdmin(token: string) {
  const supabase = supabaseAdmin();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { error: 'Unauthorized', user: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: 'Forbidden - Admin access required', user: null };
  }

  return { error: null, user };
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { error: adminError } = await verifyAdmin(token);
    
    if (adminError) {
      return NextResponse.json({ error: adminError }, { status: adminError === 'Unauthorized' ? 401 : 403 });
    }

    const supabase = supabaseAdmin();

    // Get today's date range
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get this week's date range
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Get this month's date range
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Fetch all statistics in parallel
    const [
      { count: totalUsers },
      { count: activeUsersToday },
      { count: totalPosts },
      { count: postsToday },
      { count: totalLikes },
      { count: likesToday },
      { count: totalComments },
      { count: commentsToday },
      { count: totalFollows },
      { count: followsToday }
    ] = await Promise.all([
      // Total users
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      
      // Active users today (users who created posts, likes, or comments today)
      supabase.from('profiles').select('id', { count: 'exact', head: true })
        .or(`id.in.(${await getActiveUserIdsToday(supabase)})`),
      
      // Total posts
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      
      // Posts created today
      supabase.from('posts').select('*', { count: 'exact', head: true })
        .gte('created_at', startOfToday.toISOString())
        .lt('created_at', endOfToday.toISOString()),
      
      // Total likes
      supabase.from('likes').select('*', { count: 'exact', head: true }),
      
      // Likes today
      supabase.from('likes').select('*', { count: 'exact', head: true })
        .gte('created_at', startOfToday.toISOString())
        .lt('created_at', endOfToday.toISOString()),
      
      // Total comments
      supabase.from('comments').select('*', { count: 'exact', head: true }),
      
      // Comments today
      supabase.from('comments').select('*', { count: 'exact', head: true })
        .gte('created_at', startOfToday.toISOString())
        .lt('created_at', endOfToday.toISOString()),
      
      // Total follows
      supabase.from('follows').select('*', { count: 'exact', head: true }),
      
      // Follows today
      supabase.from('follows').select('*', { count: 'exact', head: true })
        .gte('created_at', startOfToday.toISOString())
        .lt('created_at', endOfToday.toISOString())
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentPosts } = await supabase
      .from('posts')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // Get category distribution
    const { data: categoryStats } = await supabase
      .from('posts')
      .select('category')
      .not('category', 'is', null);

    const categoryDistribution = categoryStats?.reduce((acc: any, post: any) => {
      acc[post.category] = (acc[post.category] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get top users by post count
    const { data: topUsers } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        first_name,
        last_name,
        posts(count)
      `)
      .order('posts.count', { ascending: false })
      .limit(5);

    return NextResponse.json({
      overview: {
        totalUsers: totalUsers || 0,
        activeUsersToday: activeUsersToday || 0,
        totalPosts: totalPosts || 0,
        postsToday: postsToday || 0,
        totalLikes: totalLikes || 0,
        likesToday: likesToday || 0,
        totalComments: totalComments || 0,
        commentsToday: commentsToday || 0,
        totalFollows: totalFollows || 0,
        followsToday: followsToday || 0
      },
      trends: {
        recentPosts: recentPosts?.length || 0,
        categoryDistribution,
        topUsers: topUsers?.map(user => ({
          id: user.id,
          username: user.username,
          name: `${user.first_name} ${user.last_name}`,
          postsCount: user.posts?.[0]?.count || 0
        })) || []
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Admin stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to get active user IDs today
async function getActiveUserIdsToday(supabase: any): Promise<string> {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const [postsResult, likesResult, commentsResult] = await Promise.all([
    supabase.from('posts').select('author_id').gte('created_at', startOfToday.toISOString()).lt('created_at', endOfToday.toISOString()),
    supabase.from('likes').select('user_id').gte('created_at', startOfToday.toISOString()).lt('created_at', endOfToday.toISOString()),
    supabase.from('comments').select('author_id').gte('created_at', startOfToday.toISOString()).lt('created_at', endOfToday.toISOString())
  ]);

  const activeUserIds = new Set<string>();
  
  postsResult.data?.forEach((post: any) => activeUserIds.add(post.author_id));
  likesResult.data?.forEach((like: any) => activeUserIds.add(like.user_id));
  commentsResult.data?.forEach((comment: any) => activeUserIds.add(comment.author_id));

  return Array.from(activeUserIds).join(',');
}
