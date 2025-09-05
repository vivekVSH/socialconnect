import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  try {
    // Get all profiles to see what's in the table
    const { data, error } = await supabaseAdmin()
      .from('profiles')
      .select('id, username, first_name, last_name, created_at')
      .limit(10);

    if (error) {
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      profiles: data,
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Test profiles API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
