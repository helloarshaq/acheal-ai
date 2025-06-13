"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseClient()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        setIsLoggedIn(!!data.session)
      } catch (error) {
        console.error("Error checking session:", error)
      }
    }

    checkSession()

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || session) {
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
    setIsOpen(false)
    router.push("/")
  }

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isOpen])

  /* ──────────────────────────────────────────────────── */
  return (
    <>
      {/* two-bar burger / cross */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        className="md:hidden relative w-8 h-8 p-2 z-50"
      >
        {/* top bar */}
        <motion.span
          initial={false}
          animate={
            isOpen
              ? { rotate: 50, top: "50%", y: "-50%" }
              : { rotate: 0,   top: "35%" }
          }
          transition={{ duration: 0.3 }}
          className="absolute left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white rounded-full"
        />
        {/* bottom bar */}
        <motion.span
          initial={false}
          animate={
            isOpen
              ? { rotate: -50, top: "50%", y: "-50%" }
              : { rotate: 0,    top: "65%" }
          }
          transition={{ duration: 0.3 }}
          className="absolute left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white rounded-full"
        />
      </button>

      {/* frosted overlay menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 backdrop-blur-xl bg-black/60"
          >
            <div className="flex flex-col h-full p-8 text-white">
              <div className="flex flex-col items-start gap-8 mt-24 text-4xl font-light">

                {isLoggedIn && (
                  <Link
                    href="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="hover:text-[#C9B29C] transition-colors"
                  >
                    Dashboard
                  </Link>
                )}

                {isLoggedIn ? (
                  <button
                    onClick={handleSignOut}
                    className="text-left text-4xl font-light hover:text-[#C9B29C] transition-colors"
                  >
                    Sign out
                  </button>
                ) : (
                  <Link
                    href="/auth"
                    onClick={() => setIsOpen(false)}
                    className="hover:text-[#C9B29C] transition-colors"
                  >
                    Sign in
                  </Link>
                )}

                <Link
                  href="/form"
                  onClick={() => setIsOpen(false)}
                  className="hover:text-[#C9B29C] transition-colors"
                >
                  Get started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
