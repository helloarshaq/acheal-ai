import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export default async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Create a new middleware client for each request
  const supabase = createMiddlewareClient({ req, res })

  try {
    // Refresh session if expired
    await supabase.auth.getSession()
  } catch (error) {
    console.error("Error in auth middleware:", error)
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|images).*)",
  ],
}