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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'all';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    const supabase = supabaseAdmin();

    // Build the query with author details
    let query = supabase
      .from('posts')
      .select(`
        id,
        content,
        image_url,
        category,
        created_at,
        updated_at,
        profiles!posts_author_id_fkey (
          id,
          username,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply search filter
    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    // Apply category filter
    if (category !== 'all') {
      query = query.eq('category', category);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: posts, error: postsError } = await query;

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });

    if (search) {
      countQuery = countQuery.ilike('content', `%${search}%`);
    }

    if (category !== 'all') {
      countQuery = countQuery.eq('category', category);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting posts:', countError);
      return NextResponse.json({ error: 'Failed to count posts' }, { status: 500 });
    }

    // Get additional statistics for each post
    const postsWithStats = await Promise.all(
      (posts || []).map(async (post) => {
        const [
          { count: likesCount },
          { count: commentsCount }
        ] = await Promise.all([
          supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
          supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id)
        ]);

        return {
          ...post,
          stats: {
            likes: likesCount || 0,
            comments: commentsCount || 0
          }
        };
      })
    );

    return NextResponse.json({
      posts: postsWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Admin posts API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
