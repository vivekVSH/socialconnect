import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  try {
    console.log('Testing likes table...');
    
    // Check if likes table exists
    const { data: tableCheck, error: tableError } = await supabaseAdmin()
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'likes')
      .eq('table_schema', 'public');
    
    console.log('Table check:', { tableCheck, tableError });
    
    if (tableError) {
      return NextResponse.json({ 
        error: 'Failed to check table existence', 
        details: tableError 
      }, { status: 500 });
    }
    
    if (!tableCheck || tableCheck.length === 0) {
      return NextResponse.json({ 
        error: 'Likes table does not exist',
        suggestion: 'Run the ensure_likes_table.sql migration'
      }, { status: 404 });
    }
    
    // Check likes table structure
    const { data: columns, error: columnsError } = await supabaseAdmin()
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'likes')
      .eq('table_schema', 'public');
    
    console.log('Columns check:', { columns, columnsError });
    
    // Check if there are any likes
    const { data: likes, error: likesError } = await supabaseAdmin()
      .from('likes')
      .select('*')
      .limit(5);
    
    console.log('Likes data:', { likes, likesError });
    
    // Check if there are any posts
    const { data: posts, error: postsError } = await supabaseAdmin()
      .from('posts')
      .select('id, content')
      .limit(5);
    
    console.log('Posts data:', { posts, postsError });
    
    return NextResponse.json({
      success: true,
      tableExists: true,
      columns: columns,
      likesCount: likes?.length || 0,
      postsCount: posts?.length || 0,
      sampleLikes: likes,
      samplePosts: posts
    });
    
  } catch (error) {
    console.error('Test likes error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error 
    }, { status: 500 });
  }
}
