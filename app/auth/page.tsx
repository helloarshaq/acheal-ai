"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import localFont from "next/font/local"
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react"
import { getSupabaseClient } from "../../lib/supabase-client"
import Image from "next/image"

// Font configuration
const aeonikPro = localFont({
  src: [
    {
      path: "../../public/fonts/AeonikProTRIAL-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/AeonikProTRIAL-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-aeonik-pro",
})

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Check URL parameters for error or success message
  useEffect(() => {
    const errorParam = searchParams.get("error")
    const messageParam = searchParams.get("message")

    if (errorParam) {
      setError(decodeURIComponent(errorParam))
    }

    if (messageParam) {
      setMessage(decodeURIComponent(messageParam))
    }
  }, [searchParams])

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.push("/form")
      }
    }
    checkSession()
  }, [router, supabase.auth])

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        // Sign up
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error

        setMessage("Check your email for the confirmation link")
      } else {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        router.push("/form")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("Starting Google sign-in process...")

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })

      if (error) {
        console.error("Supabase OAuth error:", error)
        throw error
      }

      console.log("OAuth response:", data)
      // No need to redirect here as Supabase will handle the redirect
    } catch (error) {
      console.error("Detailed error:", error)
      setError(error instanceof Error ? error.message : "An error occurred with Google sign in")
      setLoading(false)
    }
  }

  const handleContinueWithoutAccount = () => {
    router.push("/form")
  }

  return (
    <div className={`min-h-screen bg-[#EEEBE7] ${aeonikPro.variable}`}>
      <div className="flex items-center justify-center p-4 min-h-screen">
        <div className="w-full max-w-[1380px] flex flex-col md:flex-row rounded-[30px] overflow-hidden bg-white shadow-lg">
          {/* Left side - Form */}
          <div className="w-full md:w-1/2 p-8 md:p-12">
            <div className="mb-8">
              <Link href="/" className="inline-flex items-center text-gray-600 hover:text-black transition-colors">
                <ArrowLeft className="mr-2" size={20} />
                Back to home
              </Link>
            </div>

            <div className="flex justify-center mb-8">
              <Link
                href="/"
                className="text-4xl font-light bg-gradient-to-r from-[#E4B2BE] via-[#80629A] to-[#355C73] bg-clip-text text-transparent"
              >
                Acheal.ai
              </Link>
            </div>

            <div className="max-w-md mx-auto">
              <h1 className="text-3xl font-medium mb-2 text-center">Explore to experience the beauty within you</h1>
              <p className="text-[#6A6A6A] text-center mb-8">
                Sign {isSignUp ? "up" : "in"} or Sign {isSignUp ? "in" : "up"} to keep progress
              </p>

              {/* Success message */}
              {message && (
                <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-6 flex items-center">
                  <CheckCircle size={20} className="mr-2 flex-shrink-0" />
                  <p>{message}</p>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center">
                  <AlertCircle size={20} className="mr-2 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Google Sign In Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-full py-3 px-4 mb-6 hover:bg-gray-50 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center mb-6">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="px-4 text-gray-500 text-sm">OR</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {/* Email Sign In Form */}
              <form onSubmit={handleEmailSignIn}>
                <div className="mb-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className="w-full bg-gray-100 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-[#80629A]"
                  />
                </div>
                <div className="mb-6">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full bg-gray-100 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-[#80629A]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white rounded-full py-3 px-4 mb-4 hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {loading ? "Processing..." : isSignUp ? "Sign up with email" : "Sign in with email"}
                </button>
              </form>

              <div className="text-center mb-6">
                <button onClick={() => setIsSignUp(!isSignUp)} className="text-[#693709] hover:underline">
                  {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                </button>
              </div>

              <div className="text-center">
                <button onClick={handleContinueWithoutAccount} className="text-gray-500 hover:text-gray-700 text-sm">
                  continue, I don't want to keep Progress...
                </button>
              </div>
            </div>
          </div>

          {/* Right side - Logo Image */}
          <div className="hidden md:block w-1/2 bg-white relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <Image
                src="/images/acheallogowhite.png"
                alt="Acheal Logo"
                width={300}
                height={300}
                className="object-contain"
                priority
                unoptimized
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
