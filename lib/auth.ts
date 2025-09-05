import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function requireUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { error: "Missing bearer token", status: 401 as const };
  try {
    const sb = supabaseAdmin();
    const { data: { user }, error } = await sb.auth.getUser(token);
    if (error || !user) return { error: "Invalid token", status: 401 as const };
    return { user };
  } catch (e:any) {
    return { error: "Auth error", status: 401 as const };
  }
}

export function isAdmin(user: any) {
  const role = (user.user_metadata && (user.user_metadata.role || user.app_metadata?.role)) || user.role;
  return role === "admin";
}
