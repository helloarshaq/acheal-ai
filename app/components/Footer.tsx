"use client"
import Link from "next/link"
import { Send, MessageCircle } from "lucide-react"

export default function Footer() {
  return (
    <footer
      className="mt-20 py-16"
      style={{
        backgroundImage: "url('/images/gradientBg2.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Main footer content with white background */}
      <div className="relative mx-auto max-w-[1380px] px-6 md:px-12">
        <div className="rounded-3xl bg-white p-8 md:p-12 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Logo */}
            <div className="flex items-start">
              <div className="w-16 h-16 rounded-full border-2 border-[#F8D0D0] flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border border-[#F8D0D0]"></div>
              </div>
            </div>

            {/* Information links */}
            <div>
              <h3 className="text-[#6A6A6A] text-sm mb-6 uppercase tracking-wider font-medium">Information</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="#" className="text-black hover:text-[#693709] transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-black hover:text-[#693709] transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-black hover:text-[#693709] transition-colors">
                    Shipping and payment
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-black hover:text-[#693709] transition-colors">
                    Partners
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-black hover:text-[#693709] transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-black hover:text-[#693709] transition-colors">
                    Contacts
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact information */}
            <div className="flex flex-col items-end">
              <button className="bg-[#693709] text-white rounded-lg px-6 py-3 mb-8 hover:bg-[#7d4209] transition-colors">
                Request a call
              </button>
              <div className="space-y-2 text-right">
                <p className="text-black">L1F21BSCS0926@ucp.edu.pk</p>
                <p className="text-black">L1FS21BSCS0145@ucp.edu.pk</p>
                <p className="text-black">L1S21BSCS0177@ucp.edu.pk</p>
              </div>
            </div>
          </div>

          {/* Bottom section */}
          <div className="mt-16 flex flex-col md:flex-row justify-between items-center">
            {/* Social icons */}
            <div className="flex space-x-3 mb-6 md:mb-0">
              <a
                href="#"
                className="w-12 h-12 rounded-full bg-[#693709] flex items-center justify-center text-white hover:bg-[#7d4209] transition-colors"
              >
                <Send size={20} />
              </a>
              <a
                href="#"
                className="w-12 h-12 rounded-full bg-[#693709] flex items-center justify-center text-white hover:bg-[#7d4209] transition-colors"
              >
                <MessageCircle size={20} />
              </a>
            </div>

            {/* University info */}
            <p className="text-center text-black mb-6 md:mb-0">University Of Punjab, Johar Town, Lahore, Pakistan.</p>

            {/* Age restriction */}
            <div className="flex items-center">
              <span className="text-[#693709] text-2xl font-bold mr-4">18+</span>
              <div className="h-8 w-px bg-gray-300 mr-4"></div>
              <span className="text-[#6A6A6A]">
                Reccomended
                <br />
                for adults
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Project by text */}
      <div className="max-w-[1380px] mx-auto px-6 md:px-12 mt-16">
        <div className="text-center mb-16">
          <h2 className="text-white text-3xl md:text-5xl font-bold">A Project By UCP Students. with love :)</h2>
        </div>

        {/* Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-white/80 mb-4 md:mb-0">© 2024 — Copyright</p>
          <Link href="#" className="text-white/80 hover:text-white transition-colors">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  )
}
