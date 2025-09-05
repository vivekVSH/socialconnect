import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServer();
    
    // Test 1: Check RLS policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, qual, with_check')
      .eq('tablename', 'notifications')
      .eq('schemaname', 'public');
    
    // Test 2: Try to insert a test notification
    const testNotification = {
      recipient_id: '00000000-0000-0000-0000-000000000000',
      sender_id: '00000000-0000-0000-0000-000000000001',
      notification_type: 'test',
      message: 'RLS test notification'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('notifications')
      .insert(testNotification)
      .select();
    
    // Clean up test data if it was inserted
    if (!insertError && insertData) {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', insertData[0].id);
    }
    
    // Test 3: Check if we can select notifications
    const { data: selectData, error: selectError } = await supabase
      .from('notifications')
      .select('id, recipient_id, sender_id, notification_type, message')
      .limit(5);
    
    return NextResponse.json({
      success: true,
      rlsPolicies: {
        policies: policies,
        error: policiesError?.message
      },
      insertTest: {
        success: !insertError,
        error: insertError?.message,
        data: insertData
      },
      selectTest: {
        success: !selectError,
        error: selectError?.message,
        count: selectData?.length || 0
      },
      message: 'Notifications RLS test completed'
    });
    
  } catch (error) {
    console.error('Test notifications RLS error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Failed to test notifications RLS'
    }, { status: 500 });
  }
}
