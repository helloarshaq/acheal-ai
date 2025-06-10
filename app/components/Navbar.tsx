"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Home, Grid, Info, Radio, User, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "../lib/supabase-client"

export default function Navbar() {
  const router = useRouter()
  const supabase = getSupabaseClient()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setIsLoggedIn(!!data.session)
    }

    checkSession()

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        setIsLoggedIn(true)
      } else if (event === "SIGNED_OUT") {
        setIsLoggedIn(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <header className="flex items-center justify-between w-full">
      <div className="text-white text-2xl md:text-3xl font-normal font-aeonik">acheal.ai</div>

      {/* Navigation menu with glass effect */}
      <div className="hidden md:flex items-center">
        <div className="glass-effect rounded-full px-4 py-2 flex items-center space-x-6">
          <Link href="/" className="p-2 text-white/80 hover:text-white transition-colors">
            <Home className="w-5 h-5" />
          </Link>
          <button className="p-2 text-white/80 hover:text-white transition-colors">
            <Grid className="w-5 h-5" />
          </button>
          <button className="p-2 text-white/80 hover:text-white transition-colors">
            <Info className="w-5 h-5" />
          </button>
          <button className="p-2 text-white/80 hover:text-white transition-colors">
            <Radio className="w-5 h-5" />
          </button>
          {isLoggedIn ? (
            <div className="relative">
              <button
                className="p-2 text-white hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <User className="w-5 h-5" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut()
                      setIsMenuOpen(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth" className="p-2 text-white/80 hover:text-white transition-colors">
              <User className="w-5 h-5" />
            </Link>
          )}
          <button className="p-2 text-white/80 hover:text-white transition-colors">
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Get started button */}
      <Link
        href={isLoggedIn ? "/form" : "/auth"}
        className="glass-effect text-white rounded-full px-6 py-2 transition-colors hover:bg-white/30 font-aeonik"
      >
        Get started
      </Link>
    </header>
  )
}
