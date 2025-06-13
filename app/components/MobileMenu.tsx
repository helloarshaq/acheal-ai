"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"

const MobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseClient()

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

  return (
    <>
      {/* Hamburger/Cross button with animation */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden flex flex-col justify-center items-center gap-1.5 p-2 z-50 relative"
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        <motion.span
          animate={isOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-6 h-0.5 bg-white rounded-full origin-center"
        ></motion.span>
        <motion.span
          animate={isOpen ? { opacity: 0, scale: 0 } : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-6 h-0.5 bg-white rounded-full"
        ></motion.span>
        <motion.span
          animate={isOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-6 h-0.5 bg-white rounded-full origin-center"
        ></motion.span>
      </button>

      {/* Animated menu overlay with frosty blur effect */}
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
              {/* Menu items */}
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

                <Link href="/form" onClick={() => setIsOpen(false)} className="hover:text-[#C9B29C] transition-colors">
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

export default MobileMenu
