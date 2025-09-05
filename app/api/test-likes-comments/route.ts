import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServer();
    
    // Test 1: Check if likes table exists and has data
    const { data: likesData, error: likesError } = await supabase
      .from('likes')
      .select('*')
      .limit(5);
    
    // Test 2: Check if comments table exists and has data
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .limit(5);
    
    // Test 3: Check RLS policies
    const { data: likesPolicies, error: likesPoliciesError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, qual, with_check')
      .eq('tablename', 'likes')
      .eq('schemaname', 'public');
    
    const { data: commentsPolicies, error: commentsPoliciesError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, qual, with_check')
      .eq('tablename', 'comments')
      .eq('schemaname', 'public');
    
    // Test 4: Try to insert a test like (will fail due to foreign keys, but that's ok)
    const testLike = {
      user_id: '00000000-0000-0000-0000-000000000000',
      post_id: '00000000-0000-0000-0000-000000000001'
    };
    
    const { error: likeInsertError } = await supabase
      .from('likes')
      .insert(testLike);
    
    // Test 5: Try to insert a test comment (will fail due to foreign keys, but that's ok)
    const testComment = {
      content: 'Test comment',
      post_id: '00000000-0000-0000-0000-000000000001',
      author_id: '00000000-0000-0000-0000-000000000000'
    };
    
    const { error: commentInsertError } = await supabase
      .from('comments')
      .insert(testComment);
    
    return NextResponse.json({
      success: true,
      likesTable: {
        exists: !likesError,
        error: likesError?.message,
        sampleData: likesData,
        count: likesData?.length || 0
      },
      commentsTable: {
        exists: !commentsError,
        error: commentsError?.message,
        sampleData: commentsData,
        count: commentsData?.length || 0
      },
      rlsPolicies: {
        likes: {
          policies: likesPolicies,
          error: likesPoliciesError?.message
        },
        comments: {
          policies: commentsPolicies,
          error: commentsPoliciesError?.message
        }
      },
      insertTests: {
        likes: {
          success: !likeInsertError,
          error: likeInsertError?.message
        },
        comments: {
          success: !commentInsertError,
          error: commentInsertError?.message
        }
      },
      message: 'Likes and comments test completed'
    });
    
  } catch (error) {
    console.error('Test likes and comments error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Failed to test likes and comments'
    }, { status: 500 });
  }
}
