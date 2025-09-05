import { supabaseAdmin } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = supabaseAdmin();
    const body = await request.json();
    const { email, password, username, first_name, last_name } = body;

    // Log request data (without password)
    console.log('Registration attempt:', {
      email,
      username,
      first_name,
      last_name
    });

    // Validate required fields
    if (!email || !password || !username) {
      return NextResponse.json(
        { error: "Email, password, and username are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Validate password
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Validate username format (3-30 chars, alphanumeric + underscore)
    if (!username.match(/^[A-Za-z0-9_]{3,30}$/)) {
      return NextResponse.json(
        { error: "Username must be 3-30 characters long and contain only letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    // Convert to lowercase for consistent checks
    const lowerEmail = email.toLowerCase();
    const lowerUsername = username.toLowerCase();

    // Check if user exists in auth
    const { data: existingUsers, error: authCheckError } = await supabase.auth.admin.listUsers();
    
    if (authCheckError) {
      console.error('Error checking existing users:', authCheckError);
      return NextResponse.json(
        { error: "Unable to verify account availability" },
        { status: 500 }
      );
    }

    console.log('Checking for existing email:', lowerEmail);
    const emailExists = existingUsers.users.some(user => {
      const exists = user.email?.toLowerCase() === lowerEmail;
      if (exists) {
        console.log('Found existing email user:', user.email);
      }
      return exists;
    });

    if (emailExists) {
      console.log('Email already exists in auth system');
      return NextResponse.json(
        { error: "This email is already registered. Please try logging in instead." },
        { status: 400 }
      );
    }

    // Check if username exists in profiles
    console.log('Checking for existing username:', lowerUsername);
    const { data: existingUser, error: userCheckError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', lowerUsername)
      .maybeSingle();

    if (userCheckError) {
      console.error('Error checking username:', userCheckError);
      return NextResponse.json(
        { error: "Unable to verify username availability" },
        { status: 500 }
      );
    }

    if (existingUser) {
      console.log('Username already exists:', existingUser);
      return NextResponse.json(
        { error: "This username is already taken. Please choose another one." },
        { status: 400 }
      );
    }
    
    console.log('Username and email checks passed, proceeding with registration');

    // First, check if there's an existing profile with this email
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', lowerEmail)
      .single();

    if (existingProfile) {
      // Try to delete the existing auth user if it exists
      await supabase.auth.admin.deleteUser(existingProfile.id);
      
      // Delete the existing profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', existingProfile.id);
        
      console.log('Cleaned up existing profile for:', lowerEmail);
    }

    // Create the new user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: lowerEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username: lowerUsername,
        first_name,
        last_name
      }
    });

    if (authError) {
      console.error('Error creating user:', authError);
      return NextResponse.json(
        { error: authError.message || "Failed to create account" },
        { status: 400 }
      );
    }

    if (!authData?.user?.id) {
      console.error('No user ID returned from auth creation');
      return NextResponse.json(
        { error: "Failed to create account properly" },
        { status: 500 }
      );
    }

    // Wait a moment for auth to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create the profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: lowerEmail,
        username: lowerUsername,
        first_name: first_name || null,
        last_name: last_name || null,
        role: 'user',
        is_active: true
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Rollback auth user creation
      await supabase.auth.admin.deleteUser(authData.user.id);

      return NextResponse.json(
        { error: "Failed to create profile. Please try again." },
        { status: 500 }
      );
    }

    // Return success with user data
    return NextResponse.json({
      message: "Registration successful",
      user: {
        id: authData.user.id,
        email: lowerEmail,
        username: lowerUsername
      }
    });

  } catch (error: any) {
    console.error('Unexpected error during registration:', error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
