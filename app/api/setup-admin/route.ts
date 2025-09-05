import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    // Check if user exists
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, username, is_admin')
      .eq('email', email.toLowerCase())
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (profile.is_admin) {
      return NextResponse.json({ 
        message: 'User is already an admin',
        user: profile 
      });
    }

    // Make user admin
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        is_admin: true,
        updated_at: new Date().toISOString()
      })
      .eq('email', email.toLowerCase());

    if (updateError) {
      console.error('Error making user admin:', updateError);
      return NextResponse.json({ error: 'Failed to make user admin' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'User is now an admin',
      user: {
        ...profile,
        is_admin: true
      }
    });

  } catch (error) {
    console.error('Setup admin API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
