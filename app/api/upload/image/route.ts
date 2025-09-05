import { supabaseAdmin } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: "File and userId are required" },
        { status: 400 }
      );
    }

    // Validate file
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Max image size is 2MB" },
        { status: 400 }
      );
    }

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG/PNG allowed" },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin();
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `public/${fileName}`;

    // Upload using service role (bypasses RLS)
    const { data: upload, error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    if (!upload?.path) {
      return NextResponse.json(
        { error: "Upload failed: No path returned" },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: pub } = supabase.storage
      .from('post-images')
      .getPublicUrl(upload.path);

    return NextResponse.json({
      success: true,
      url: pub.publicUrl,
      path: upload.path
    });

  } catch (error: any) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: `Image upload failed: ${error.message}` },
      { status: 500 }
    );
  }
}
