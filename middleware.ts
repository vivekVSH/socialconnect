import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Paths that don't require authentication
  const publicPaths = ['/', '/login', '/register', '/search', '/explore', '/setup-admin', '/become-admin']
  const isPublicPath = publicPaths.includes(request.nextUrl.pathname)

  // Admin paths that require admin privileges
  const adminPaths = ['/admin']
  const isAdminPath = adminPaths.includes(request.nextUrl.pathname)

  if (!session && !isPublicPath) {
    // Redirect to login if trying to access protected route without session
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session && isPublicPath && request.nextUrl.pathname !== '/setup-admin') {
    // Allow homepage with tab parameter for account switching
    if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('tab')) {
      // Allow access to homepage with tab parameter for adding accounts
      return res
    }
    // Allow access to login/register pages for account switching
    if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') {
      return res
    }
    // Allow access to search and explore pages for authenticated users
    if (request.nextUrl.pathname === '/search' || request.nextUrl.pathname === '/explore') {
      return res
    }
    // Redirect to feed if trying to access other public pages while logged in
    return NextResponse.redirect(new URL('/feed', request.url))
  }

  // Check admin access for admin paths
  if (session && isAdminPath) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()

      console.log('Admin check - User ID:', session.user.id)
      console.log('Admin check - Profile:', profile)
      console.log('Admin check - Profile Error:', profileError)

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        return NextResponse.redirect(new URL('/feed', request.url))
      }

      if (!profile?.is_admin) {
        console.log('User is not admin, redirecting to feed')
        // Redirect non-admins to feed page
        return NextResponse.redirect(new URL('/feed', request.url))
      }

      console.log('User is admin, allowing access')
    } catch (error) {
      console.error('Admin check error:', error)
      // Redirect to feed if there's an error checking admin status
      return NextResponse.redirect(new URL('/feed', request.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
