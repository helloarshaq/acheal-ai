"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image" // Added Image import
import Link from "next/link"
import { useRouter } from "next/navigation"
import localFont from "next/font/local"
import { User, Clock, FileText, LogOut, Download } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import DiagnosisReport from "@/app/components/diagnosis-report"
import type { UserProfile, TreatmentHistoryItem } from "@/app/types/dashboard-types" // Updated import

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

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [treatmentHistory, setTreatmentHistory] = useState<TreatmentHistoryItem[]>([])
  const [latestTreatment, setLatestTreatment] = useState<TreatmentHistoryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("profile")
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/auth")
          return
        }

        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (profileError && profileError.code !== "PGRST116") {
          // PGRST116 means no rows found, which is fine for new users
          console.error("Error fetching profile:", profileError)
          // Potentially set an error state here to show to the user
        }

        const userProfileData: UserProfile = {
          id: profileData?.id || user.id, // Use auth user.id as fallback for id if profileData is null
          auth_id: user.id,
          name: profileData?.name || user.user_metadata?.full_name || "User",
          email: user.email || "No email",
          age: profileData?.age || null,
          skintype: profileData?.skintype || null,
          acnetype: profileData?.acnetype || null,
          // Handle severity fields safely - they might not exist in all database schemas
          severity: profileData?.severity !== undefined ? profileData.severity : null,
          severity_num: profileData?.severity_num !== undefined ? profileData.severity_num : null,
          imageurl: profileData?.imageurl || null,
          created_at: profileData?.created_at || user.created_at || new Date().toISOString(),
        }
        setUserProfile(userProfileData)

        // Fetch treatments only if profileData.id exists (meaning user has a profile row)
        if (profileData?.id) {
          const { data: treatmentData, error: treatmentError } = await supabase
            .from("treatments")
            .select("*")
            .eq("user_id", profileData.id)
            .order("treatment_date", { ascending: false })

          if (treatmentError) {
            console.error("Error fetching treatments:", treatmentError)
          }
          setTreatmentHistory(treatmentData || [])
          if (treatmentData && treatmentData.length > 0) {
            setLatestTreatment(treatmentData[0])
          }
        } else {
          // If no profileData.id, user might be new, so no treatments to fetch
          setTreatmentHistory([])
          setLatestTreatment(null)
        }
      } catch (error) {
        console.error("Error in fetchUserData:", error)
        // Potentially set an error state here
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleDownloadReport = async () => {
    if (!userProfile || !latestTreatment) {
      alert("User profile or latest treatment data is not available to generate the report.")
      return
    }

    // Ensure html2pdf is loaded client-side
    if (typeof window !== "undefined") {
      // Add a small delay to ensure the DOM is ready
      setTimeout(async () => {
        const html2pdf = (await import("html2pdf.js")).default
        const reportElement = document.getElementById("diagnosisReportToPrint")

        if (reportElement) {
          const opt = {
            margin: 0.5,
            filename: `${userProfile.name || "user"}_acheal_report.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true, allowTaint: true }, // Turned logging to false for production
            jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
          }
          try {
            html2pdf().from(reportElement).set(opt).save()
          } catch (pdfError) {
            console.error("Error during PDF generation:", pdfError)
            alert("Failed to generate PDF. Please try again or contact support if the issue persists.")
          }
        } else {
          console.error("Report element not found for PDF generation.")
          alert("Could not find report content to generate PDF.")
        }
      }, 100) // 100ms delay
    }
  }

  // Function to get severity color based on severity level
  const getSeverityColor = (severityLevel: string): string => {
    switch (severityLevel.toLowerCase()) {
      case "clear / normal":
      case "normal":
        return "bg-green-100 text-green-800"
      case "mild":
        return "bg-yellow-100 text-yellow-800"
      case "moderate":
        return "bg-orange-100 text-orange-800"
      case "severe":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen bg-[#EEEBE7] flex items-center justify-center ${aeonikPro.variable}`}>
        <div className="text-2xl">Loading your profile...</div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-[#EEEBE7] ${aeonikPro.variable}`}>
      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-[1380px] bg-white rounded-[30px] overflow-hidden shadow-lg">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <Link
              href="/"
              className="text-4xl font-light bg-gradient-to-r from-[#E4B2BE] via-[#80629A] to-[#355C73] bg-clip-text text-transparent"
            >
              acheal.ai
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>

          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/4 p-6 border-r border-gray-200">
              <div className="flex flex-col items-center mb-8">
                <div className="w-24 h-24 bg-[#F8D0D0] rounded-full flex items-center justify-center mb-4 overflow-hidden">
                  {userProfile?.imageurl ? (
                    <Image
                      src={
                        userProfile.imageurl.startsWith("data:")
                          ? userProfile.imageurl
                          : userProfile.imageurl || "/placeholder.svg?width=96&height=96"
                      }
                      alt={userProfile.name || "User"}
                      width={96}
                      height={96}
                      className="rounded-full object-cover"
                      unoptimized={userProfile.imageurl.startsWith("data:")} // Important for base64
                    />
                  ) : (
                    <User size={40} className="text-[#693709]" />
                  )}
                </div>
                <h2 className="text-xl font-medium">{userProfile?.name || "User"}</h2>
                <p className="text-gray-500 text-sm truncate w-full text-center px-2">
                  {userProfile?.email || "No email available"}
                </p>
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    activeTab === "profile" ? "bg-[#F8D0D0]/20 text-[#693709]" : "hover:bg-gray-100"
                  }`}
                >
                  <User size={18} />
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    activeTab === "history" ? "bg-[#F8D0D0]/20 text-[#693709]" : "hover:bg-gray-100"
                  }`}
                >
                  <Clock size={18} />
                  Treatment History
                </button>
              </nav>

              <div className="mt-auto pt-8">
                <Link
                  href="/form"
                  className="block w-full bg-black text-white rounded-full py-3 px-4 text-center hover:bg-gray-800 transition-colors"
                >
                  New Analysis
                </Link>
              </div>
            </div>

            <div className="w-full md:w-3/4 p-6">
              {activeTab === "profile" ? (
                <div>
                  <h1 className="text-2xl font-medium mb-6">Your Profile</h1>
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Name</h3>
                        <p className="text-lg">{userProfile?.name || "Not provided"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
                        <p className="text-lg">{userProfile?.email || "Not provided"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Age</h3>
                        <p className="text-lg">{userProfile?.age || "Not provided"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Skin Type</h3>
                        <p className="text-lg">{userProfile?.skintype || "Not provided"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Latest Acne Type</h3>
                        <p className="text-lg">{userProfile?.acnetype || "Not analyzed yet"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Severity Level</h3>
                        {userProfile?.severity ? (
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-sm ${getSeverityColor(userProfile.severity)}`}
                          >
                            {userProfile.severity}
                          </span>
                        ) : (
                          <p className="text-lg">Not analyzed yet</p>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Member Since</h3>
                        <p className="text-lg">
                          {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : "Unknown"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-8">
                      <button
                        onClick={handleDownloadReport}
                        disabled={!userProfile || !latestTreatment}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-full py-3 px-4 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download size={18} />
                        Download Diagnosis Report
                      </button>
                      {(!userProfile || !latestTreatment) && (
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          Complete an analysis and generate a treatment plan to download a report.
                        </p>
                      )}
                    </div>

                    <div style={{ position: "fixed", left: "-200vw", top: 0, zIndex: -100 }} ref={reportRef}>
                      {" "}
                      {/* Ensure it's off-screen but available in DOM */}
                      <div id="diagnosisReportToPrint">
                        {userProfile && latestTreatment && (
                          <DiagnosisReport
                            userProfile={userProfile}
                            treatmentHistory={latestTreatment}
                            imageUrl={userProfile.imageurl || "/images/report-placeholder.png"}
                          />
                        )}
                      </div>
                    </div>

                    {(!userProfile?.name || !userProfile?.age || !userProfile?.skintype) && (
                      <div className="mt-8 p-4 bg-amber-50 rounded-lg">
                        <p className="text-amber-800">
                          Your profile is incomplete. Complete a skin analysis to update your profile information.
                        </p>
                        <Link href="/form" className="mt-2 inline-block text-amber-800 underline">
                          Start skin analysis
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-medium mb-6">Treatment History</h1>
                  {treatmentHistory.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
                      <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                      <h3 className="text-xl font-medium mb-2">No treatments yet</h3>
                      <p className="text-gray-500 mb-6">
                        You haven't generated any treatment plans yet. Start a skin analysis to get personalized
                        recommendations.
                      </p>
                      <Link
                        href="/form"
                        className="inline-block bg-black text-white rounded-full py-3 px-6 hover:bg-gray-800 transition-colors"
                      >
                        Start Analysis
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {treatmentHistory.map((treatment) => (
                        <div key={treatment.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-xl font-medium">{treatment.acne_type} Treatment</h3>
                              <p className="text-gray-500 text-sm">
                                {new Date(treatment.treatment_date).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {treatment.treatment_plan?.mode === "weekly" ? "Weekly Plan" : "Daily Plan"}
                              </p>
                            </div>
                            <Link
                              href={`/treatment?id=${treatment.user_id}&treatmentId=${treatment.id}`}
                              className="text-[#693709] hover:underline text-sm"
                            >
                              View Details
                            </Link>
                          </div>
                          <div className="border-t border-gray-100 pt-4 mt-4">
                            <h4 className="font-medium mb-2 text-sm">Treatment Summary</h4>
                            <p className="text-gray-600 line-clamp-3 text-sm">
                              {treatment.treatment_plan?.day1 ||
                                treatment.treatment_plan?.week1 ||
                                "Custom treatment plan"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}