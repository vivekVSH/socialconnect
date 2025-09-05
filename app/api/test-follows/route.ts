import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServer();
    
    // Test if follows table exists and is accessible
    const { data: followsData, error: followsError } = await supabase
      .from('follows')
      .select('*')
      .limit(5);
    
    // Test if we can count follows
    const { count: followsCount, error: countError } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true });
    
    // Test if we can insert a test follow (will fail if constraints exist, but that's ok)
    const testFollow = {
      follower_id: '00000000-0000-0000-0000-000000000000',
      following_id: '00000000-0000-0000-0000-000000000001',
      status: 'accepted'
    };
    
    const { error: insertError } = await supabase
      .from('follows')
      .insert(testFollow);
    
    // Clean up test data if it was inserted
    if (!insertError) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', testFollow.follower_id)
        .eq('following_id', testFollow.following_id);
    }
    
    return NextResponse.json({
      success: true,
      followsTable: {
        exists: !followsError,
        error: followsError?.message,
        sampleData: followsData,
        count: followsCount
      },
      insertTest: {
        success: !insertError,
        error: insertError?.message
      },
      message: 'Follows table test completed'
    });
    
  } catch (error) {
    console.error('Test follows error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Failed to test follows table'
    }, { status: 500 });
  }
}
