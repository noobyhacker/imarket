import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PROTECTED_ROUTES = ['/create', '/chat', '/profile', '/settings'];
const AUTH_ROUTES = ['/login', '/signup'];
const ADMIN_ROUTES = ['/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin route protection
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return new NextResponse(null, { status: 404 });
    }
  }

  // Protected routes — redirect to login
  if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Auth routes — redirect authenticated users to home
  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
