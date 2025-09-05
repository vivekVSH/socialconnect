import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServer();
    
    // Test 1: Check if triggers exist
    const { data: triggers, error: triggersError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_object_table, action_timing, event_manipulation')
      .in('event_object_table', ['follows', 'likes', 'comments'])
      .eq('trigger_schema', 'public');
    
    // Test 2: Check if trigger functions exist
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .like('routine_name', '%notify%')
      .eq('routine_schema', 'public');
    
    // Test 3: Check current data counts
    const { count: postsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });
    
    const { count: likesCount } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true });
    
    const { count: commentsCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true });
    
    const { count: notificationsCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });
    
    // Test 4: Try to get a sample post to test with
    const { data: samplePost, error: postError } = await supabase
      .from('posts')
      .select('id, author_id')
      .limit(1)
      .single();
    
    return NextResponse.json({
      success: true,
      triggers: {
        data: triggers,
        error: triggersError?.message,
        count: triggers?.length || 0
      },
      functions: {
        data: functions,
        error: functionsError?.message,
        count: functions?.length || 0
      },
      dataCounts: {
        posts: postsCount || 0,
        likes: likesCount || 0,
        comments: commentsCount || 0,
        notifications: notificationsCount || 0
      },
      samplePost: {
        data: samplePost,
        error: postError?.message
      },
      message: 'Trigger test completed'
    });
    
  } catch (error) {
    console.error('Test triggers error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Failed to test triggers'
    }, { status: 500 });
  }
}
