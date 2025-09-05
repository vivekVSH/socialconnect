import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin();
    
    // Test notifications table structure
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_columns', { table_name: 'notifications' });
    
    // Alternative: Direct query to check columns
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'notifications')
      .eq('table_schema', 'public')
      .order('ordinal_position');
    
    // Test if we can insert a test notification
    const testNotification = {
      recipient_id: '00000000-0000-0000-0000-000000000000',
      sender_id: '00000000-0000-0000-0000-000000000001',
      notification_type: 'test',
      message: 'Test notification'
    };
    
    const { error: insertError } = await supabase
      .from('notifications')
      .insert(testNotification);
    
    // Clean up test data if it was inserted
    if (!insertError) {
      await supabase
        .from('notifications')
        .delete()
        .eq('message', 'Test notification');
    }
    
    return NextResponse.json({
      success: true,
      tableStructure: {
        columns: columns,
        error: columnsError?.message
      },
      insertTest: {
        success: !insertError,
        error: insertError?.message
      },
      message: 'Notifications table test completed'
    });
    
  } catch (error) {
    console.error('Test notifications table error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Failed to test notifications table'
    }, { status: 500 });
  }
}
