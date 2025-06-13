"use client"

import Image from "next/image"
import localFont from "next/font/local"
import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import Button from "./Glowing button/Button"
import Footer from "./components/Footer"
import Link from "next/link"
import Navbar from "./components/Navbar"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Grid, Phone } from "lucide-react"

// Update the font path with absolute path starting from public directory
const aeonikPro = localFont({
  src: [
    {
      path: "../public/fonts/AeonikProTRIAL-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/AeonikProTRIAL-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-aeonik-pro",
})

export default function LandingPage() {
  const aboutSectionRef = useRef<HTMLDivElement>(null)
  const [opacity, setOpacity] = useState(0.3)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setIsLoggedIn(!!data.session)
    }

    checkSession()
  }, [supabase])

  useEffect(() => {
    const handleScroll = () => {
      if (!aboutSectionRef.current) return

      const rect = aboutSectionRef.current.getBoundingClientRect()
      const windowHeight = window.innerHeight

      const visiblePercentage = 1 - rect.top / windowHeight

      if (visiblePercentage > 0 && visiblePercentage < 1) {
        const newOpacity = 0.3 + visiblePercentage * 0.7
        setOpacity(Math.min(1, Math.max(0.3, newOpacity)))
      }
    }

    window.addEventListener("scroll", handleScroll)
    handleScroll()

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (window.innerWidth <= 768) {
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        viewport.setAttribute("content", "width=device-width, initial-scale=0.85, maximum-scale=1.0, user-scalable=no")
      }
    }
  }, [])

  return (
    <div className={`min-h-screen bg-[#EEEBE7] ${aeonikPro.variable}`}>
      {/* Hero Section */}
      <div className="flex items-center justify-center p-4">
        <div className="relative w-full max-w-[1380px] h-[100vh] md:h-[948px] rounded-[30px] overflow-hidden">
          {/* Background image with animation */}
          <motion.div
            initial={{ height: "100vh", scale: 1.2, filter: "blur(8px)" }}
            animate={{ height: "100%", scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.6, ease: [0.77, 0, 0.175, 1] }}
            className="absolute inset-0 z-0"
          >
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/skinn.png-MowCH3uFsCjmy4KJISAKkqfQ05iWM6.jpeg"
              alt="Beauty faces background"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/60"></div>
          </motion.div>

          {/* Content container */}
          <div className="relative z-10 flex flex-col h-full px-6 py-8 md:px-12">
            {/* Navigation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.8, ease: "easeOut" }}
            >
              <Navbar />
            </motion.div>

            {/* Main content */}
            <main className="flex flex-col justify-end flex-1 pb-16 md:pb-24">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.2, delayChildren: 2 } }, // Delay content after background
                }}
                className="max-w-3xl"
              >
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-white/90 text-base md:text-lg lg:text-xl mb-4 font-aeonik"
                >
                  Discover a new era beauty and self-care where
                  <br className="hidden md:block" />
                  cutting-edge technology meets personalised solutions
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-white text-[40px] sm:text-[50px] md:text-[60px] lg:text-[100px] font-light leading-tight font-aeonik text-balance"
                >
                  <div className="inline-block whitespace-nowrap">
                    Unlock Your <span className="italic font-serif font-light">Beauty</span>
                  </div>
                  <br />
                  <span className="text-[#C9B29C]">Potential with AI</span>
                </motion.h1>

                {/* Mobile-only Get Started button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="mt-8 md:hidden"
                >
                  <Link href={isLoggedIn ? "/form" : "/auth"}>
                    <Button>Get started</Button>
                  </Link>
                </motion.div>
              </motion.div>
            </main>
          </div>
        </div>
      </div>

      {/* About Us Section */}
      <AboutSection opacity={opacity} aboutSectionRef={aboutSectionRef} isLoggedIn={isLoggedIn} />

      {/* Meet the Team Section */}
      <TeamSection />

      {/* Footer */}
      <Footer />
    </div>
  )
}

function AboutSection({
  opacity,
  aboutSectionRef,
  isLoggedIn,
}: { opacity: number; aboutSectionRef: any; isLoggedIn: boolean }) {
  const words =
    "Our AI-driven Platform acne type classification and treatment recommendations just for you, ensuring that every product and routine enhances your unique radiance".split(
      " ",
    )

  return (
    <div ref={aboutSectionRef} className="py-12 md:py-20 px-6 md:px-12 max-w-[1380px] mx-auto">
      {/* Heading */}
      <h2 className="text-[#6A6A6A] text-2xl md:text-3xl lg:text-4xl font-light mb-6 font-aeonik">About us</h2>

      {/* Paragraph animated word by word */}
      <motion.p
        className="text-[#693709] text-2xl md:text-4xl lg:text-6xl font-light leading-tight font-aeonik max-w-4xl mb-12 flex flex-wrap"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={{
          visible: { transition: { staggerChildren: 0.04 } },
        }}
      >
        {words.map((word, index) => (
          <motion.span
            key={index}
            className="mr-2"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
            }}
          >
            {word}
          </motion.span>
        ))}
      </motion.p>

      {/* Button */}
      <Link href="/auth">
        <Button>Get started</Button>
      </Link>

      {/* Bento Grid Section */}
      <div className="mt-12 md:mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Effortless Skin Perfection */}
        <div className="bg-[#F8F3EE] rounded-3xl p-6 md:p-8 flex flex-col justify-between">
          <div className="w-12 h-12 rounded-full border-2 border-[#F8D0D0]"></div>
          <h3 className="text-[#C9B29C] text-2xl md:text-3xl font-light mt-auto">
            Effortless
            <br />
            Skin
            <br />
            Perfection
          </h3>
        </div>

        {/* Your Best Skincare Solution */}
        <div className="bg-[#F8F3EE] rounded-3xl p-6 md:p-8 md:col-span-2 flex flex-col items-center">
          <h2 className="text-[#693709] text-3xl md:text-4xl lg:text-5xl font-medium mb-6 text-center">
            Your Best
            <br />
            Skincare
            <br />
            Solution
          </h2>
          <div className="relative w-36 h-36 md:w-48 md:h-48 mt-4">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ellipse-BqYK9s7IfmEJTNTAwEw2vRFX0Ut9ll.png"
              alt="Acheal logo"
              fill
              className="object-contain"
            />
          </div>
        </div>

        {/* 12K happy users */}
        <div className="bg-[#F8F3EE] rounded-3xl p-6 md:p-8">
          <h2 className="text-[#F9A26C] text-4xl md:text-5xl font-medium mb-2">12K</h2>
          <p className="text-[#A89B8C] mb-6">happy users</p>
          <div className="flex -space-x-3">
            <div className="w-12 h-12 rounded-full bg-[#F9A26C] border-2 border-white"></div>
            <div className="w-12 h-12 rounded-full bg-white border-2 border-white flex items-center justify-center">
              <div className="w-4 h-4 bg-[#F9A26C] rotate-45"></div>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#9747FF] border-2 border-white"></div>
          </div>
        </div>

        {/* Generate Button - Now links to form page */}
        <div className="bg-[#F8F3EE] rounded-3xl p-6 md:p-8 flex items-center justify-center">
          <Link href={isLoggedIn ? "/form" : "/auth"}>
            <button className="border-2 border-[#693709] text-[#693709] rounded-full px-6 py-3 flex items-center gap-2 hover:bg-[#693709] hover:text-white transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-camera"
              >
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              Generate
            </button>
          </Link>
        </div>

        {/* Branching paths */}
        <div className="bg-[#F8F3EE] rounded-3xl p-6 md:p-8 flex flex-col justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-[#8B1D1D] flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <div className="h-px w-24 bg-gray-300 relative">
              <div className="absolute top-0 left-1/2 h-2 w-2 bg-[#F9A26C] rounded-full transform -translate-y-1/2"></div>
            </div>
          </div>
          <div className="mt-auto">
            <h3 className="text-[#693709] text-xl font-medium mb-2">Branching paths</h3>
            <p className="text-[#A89B8C]">Explore multiple treatment directions.</p>
          </div>
        </div>

        {/* 25M created Data */}
        <div className="bg-[#F8F3EE] rounded-3xl p-6 md:p-8 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-16 h-8 bg-gray-300 rounded-full flex items-center">
              <div className="w-8 h-8 rounded-full bg-[#F9A26C] flex items-center justify-center text-white">
                <Grid size={16} />
              </div>
            </div>
          </div>
          <div className="mt-auto">
            <h2 className="text-[#C9B29C] text-4xl md:text-5xl font-medium mb-2">25M</h2>
            <div className="bg-[#E8D7D1] rounded-md px-3 py-1 inline-flex items-center">
              <span className="text-[#693709] text-sm">created Data</span>
            </div>
          </div>
        </div>

        {/* Easy-to-use interface */}
        <div className="bg-[#F8F3EE] rounded-3xl p-6 md:p-8 md:col-span-2 flex flex-col justify-between">
          <div className="flex items-center">
            <div className="h-px w-24 bg-gray-300 relative">
              <div className="absolute top-0 left-1/4 h-3 w-3 bg-[#F9A26C] rounded-full transform -translate-y-1/2"></div>
              <div className="absolute top-0 right-1/4 h-3 w-3 bg-[#C9B29C] rounded-full transform -translate-y-1/2"></div>
            </div>
          </div>
          <div className="mt-auto">
            <h3 className="text-[#693709] text-xl font-medium mb-2">Just the image you need</h3>
            <p className="text-[#A89B8C]">within easy-to-use interface</p>
          </div>
        </div>

        {/* File formats and Request Call button */}
        <div className="bg-[#F8F3EE] rounded-3xl p-6 md:p-8 flex flex-col justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="bg-[#E8D7D1] rounded-full px-4 py-1 text-sm text-[#693709]">14 days trial</div>
            <div className="bg-[#F9A26C] rounded-full w-8 h-8 flex items-center justify-center text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-file-check"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="m9 15 2 2 4-4" />
              </svg>
            </div>
            <div className="bg-[#9747FF] rounded-full w-8 h-8 flex items-center justify-center text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-camera"
              >
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <div className="w-3 h-3 rounded-full bg-[#9747FF]"></div>
              <span className="text-xs text-[#693709]">JPG</span>
              <div className="w-3 h-3 rounded-full bg-[#F9A26C]"></div>
              <span className="text-xs text-[#693709]">PNG</span>
              <div className="w-3 h-3 rounded-full bg-[#4CC2FF]"></div>
              <span className="text-xs text-[#693709]">PDF</span>
            </div>
            <div className="bg-[#E8D7D1] rounded-full px-4 py-1 text-sm text-[#693709] mt-2">
              <span className="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-refresh-cw"
                >
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
                Rewrite
              </span>
            </div>
            <div className="bg-[#E8D7D1] rounded-full px-4 py-1 text-sm text-[#693709] mt-2">
              <span className="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-file-check"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="m9 15 2 2 4-4" />
                </svg>
                Completed
              </span>
            </div>

            {/* Request a call button */}
            <a
              href="tel:+923174037003"
              className="mt-4 w-full bg-[#693709] text-white rounded-full px-4 py-2 flex items-center justify-center gap-2 hover:bg-[#8B4D1D] transition-colors"
            >
              <Phone size={16} />
              Request a call
            </a>
          </div>
        </div>
      </div>

      <div className="text-center mt-12 mb-6">
        <p className="text-[#A89B8C]">Check out all of these by clicking the below buttons</p>
      </div>

      <div className="flex justify-center">
        <Link href="/auth">
          <Button>Get started</Button>
        </Link>
      </div>
    </div>
  )
}

function TeamSection() {
  return (
    <div className="py-12 md:py-20 px-6 md:px-12 max-w-[1380px] mx-auto">
      {/* Section heading */}
      <h3 className="text-[#6A6A6A] text-2xl md:text-3xl font-light mb-4 font-aeonik">Meet the Team</h3>
      <h2 className="text-black text-3xl md:text-4xl lg:text-6xl font-light leading-tight font-aeonik max-w-4xl mb-8 md:mb-16">
        Great Product Starts with Great People. Meet our visionaries for this project
      </h2>

      {/* Team members grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {/* Team Member 1 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="flex flex-col"
        >
          <div className="bg-[#E5E5E5] aspect-square w-full mb-4"></div>
          <div className="flex items-start">
            <div className="mr-6">
              <p className="text-black text-xl font-medium">09</p>
              <p className="text-black text-xl font-medium">26</p>
            </div>
            <div>
              <h4 className="text-black text-2xl font-medium mb-1">Abdullah Nasir</h4>
              <p className="text-[#6A6A6A]">Design and Documentation</p>
            </div>
          </div>
        </motion.div>

        {/* Team Member 2 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="flex flex-col"
        >
          <div className="bg-[#E5E5E5] aspect-square w-full mb-4"></div>
          <div className="flex items-start">
            <div className="mr-6">
              <p className="text-black text-xl font-medium">01</p>
              <p className="text-black text-xl font-medium">45</p>
            </div>
            <div>
              <h4 className="text-black text-2xl font-medium mb-1">Izzah Shah</h4>
              <p className="text-[#6A6A6A]">Frontend and Documentation</p>
            </div>
          </div>
        </motion.div>

        {/* Team Member 3 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
          className="flex flex-col"
        >
          <div className="bg-[#E5E5E5] aspect-square w-full mb-4"></div>
          <div className="flex items-start">
            <div className="mr-6">
              <p className="text-black text-xl font-medium">01</p>
              <p className="text-black text-xl font-medium">77</p>
            </div>
            <div>
              <h4 className="text-black text-2xl font-medium mb-1">Hani Shah</h4>
              <p className="text-[#6A6A6A]">Machine learning and Documentation</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
