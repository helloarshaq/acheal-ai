import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// Force dynamic rendering for this route
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  
  try {
    const code = requestUrl.searchParams.get("code")
    const type = requestUrl.searchParams.get("type") || ""
    const next = requestUrl.searchParams.get("next") || "/form"

    if (!code) {
      console.error("No code provided in callback")
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=no_code_provided`)
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Error exchanging code for session:", error)
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent(error.message)}`)
    }

    // If this is an email confirmation, redirect to auth page with success message
    if (type === "email_confirmation" || type === "recovery") {
      return NextResponse.redirect(
        `${requestUrl.origin}/auth?message=${encodeURIComponent("Email confirmed successfully! You can now sign in.")}`,
      )
    }

    // Redirect to the form page or specified next page after successful authentication
    return NextResponse.redirect(`${requestUrl.origin}${next}`)
  } catch (error) {
    console.error("Unexpected error in callback route:", error)
    return NextResponse.redirect(`${requestUrl.origin}/auth?error=unexpected_error`)
  }
}
