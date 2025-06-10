"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import localFont from "next/font/local"
import { ArrowRight, Loader2, AlertTriangle } from "lucide-react"
import { getSupabaseClient } from "../../lib/supabase-client"

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

interface UserData {
  id?: string
  name: string
  age: string
  skintype: string
  imageurl: string
  acnetype?: string
  created_at?: string
  auth_id?: string
}

interface DailyTreatmentPlan {
  day1: string
  day2: string
  day3: string
  day4: string
  day5: string
  day6: string
  loading: boolean
  error: string | null
  isUsingFallback: boolean
}

interface WeeklyTreatmentPlan {
  week1: string
  week2: string
  week3: string
  week4: string
  loading: boolean
  error: string | null
  isUsingFallback: boolean
}

export default function TreatmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get("id")

  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily")
  const [dailyTreatmentPlan, setDailyTreatmentPlan] = useState<DailyTreatmentPlan>({
    day1: "",
    day2: "",
    day3: "",
    day4: "",
    day5: "",
    day6: "",
    loading: true,
    error: null,
    isUsingFallback: false,
  })
  const [weeklyTreatmentPlan, setWeeklyTreatmentPlan] = useState<WeeklyTreatmentPlan>({
    week1: "",
    week2: "",
    week3: "",
    week4: "",
    loading: true,
    error: null,
    isUsingFallback: false,
  })
  const [treatmentSaved, setTreatmentSaved] = useState(false)
  const [canSaveTreatment, setCanSaveTreatment] = useState(false)

  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchUserData() {
      if (!userId) {
        // If no user ID is provided, show a demo mode with sample data
        setUserData({
          name: "Demo User",
          age: "25",
          skintype: "Normal",
          imageurl: "/diverse-faces.png",
          acnetype: "Acne",
        })
        setCanSaveTreatment(false)
        setLoading(false)

        // Generate a demo treatment plan
        generateTreatmentPlan("Acne", "Normal", "daily", false)
        return
      }

      try {
        const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()

        if (error) {
          throw error
        }

        if (data) {
          setUserData(data)
          setCanSaveTreatment(true)
          setLoading(false)

          // Generate daily treatment plan based on acne type
          if (data.acnetype) {
            generateTreatmentPlan(data.acnetype, data.skintype, "daily", true)
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        setError("Failed to load user data")
        setLoading(false)
      }
    }

    fetchUserData()
  }, [userId, supabase])

  // Effect to handle view mode changes
  useEffect(() => {
    if (userData && userData.acnetype) {
      if (viewMode === "weekly" && weeklyTreatmentPlan.loading) {
        generateTreatmentPlan(userData.acnetype, userData.skintype || "Normal", "weekly", canSaveTreatment)
      }
    }
  }, [viewMode, userData, weeklyTreatmentPlan.loading, canSaveTreatment])

  const generateTreatmentPlan = async (acneType: string, skinType = "Normal", mode = "daily", shouldSave = false) => {
    try {
      if (mode === "daily") {
        setDailyTreatmentPlan((prev) => ({ ...prev, loading: true, error: null }))
      } else {
        setWeeklyTreatmentPlan((prev) => ({ ...prev, loading: true, error: null }))
      }

      console.log(`Generating ${mode} treatment plan for:`, acneType, "with skin type:", skinType)

      const response = await fetch("/api/generate-treatment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ acneType, skinType, mode }),
      })

      console.log("API response status:", response.status)

      const data = await response.json()
      console.log(`API response data for ${mode}:`, data)

      if (mode === "daily") {
        // Check if we got a valid response with at least day1
        if (data && data.day1) {
          const dailyPlan = {
            day1: data.day1,
            day2: data.day2,
            day3: data.day3,
            day4: data.day4,
            day5: data.day5,
            day6: data.day6,
          }

          setDailyTreatmentPlan({
            ...dailyPlan,
            loading: false,
            error: data.geminiError ? "Using recommended treatment plan due to AI service limitations." : null,
            isUsingFallback: !!data.geminiError,
          })

          // Save the treatment plan to the database if we have a valid user
          if (shouldSave && userData && userData.id) {
            console.log("Saving daily treatment plan...")
            await saveTreatmentPlan(acneType, dailyPlan, "daily")
          }
        } else {
          throw new Error("Invalid response format from API for daily plan")
        }
      } else {
        // Check if we got a valid response with at least week1
        if (data && data.week1) {
          setWeeklyTreatmentPlan({
            week1: data.week1,
            week2: data.week2,
            week3: data.week3,
            week4: data.week4,
            loading: false,
            error: data.geminiError ? "Using recommended treatment plan due to AI service limitations." : null,
            isUsingFallback: !!data.geminiError,
          })

          // Save the treatment plan to the database if we have a valid user
          if (shouldSave) {
            saveTreatmentPlan(
              acneType,
              {
                week1: data.week1,
                week2: data.week2,
                week3: data.week3,
                week4: data.week4,
              },
              "weekly",
            )
          }
        } else {
          throw new Error("Invalid response format from API for weekly plan")
        }
      }
    } catch (error) {
      console.error(`Error generating ${mode} treatment plan:`, error)

      if (mode === "daily") {
        // Set a generic fallback daily treatment plan
        const fallbackPlan = {
          day1: "Gentle cleansing with a mild face wash. Apply a thin layer of benzoyl peroxide spot treatment on affected areas. Use a light, oil-free moisturizer.",
          day2: "Morning: Cleanse with the same face wash. Apply niacinamide serum. Use oil-free sunscreen. Evening: Double cleanse. Apply a thin layer of adapalene gel if prescribed.",
          day3: "Morning: Gentle cleansing. Apply tea tree oil diluted with a carrier oil. Evening: Cleanse and apply a clay mask for 10-15 minutes.",
          day4: "Morning: Cleanse and apply a light moisturizer with ceramides. Evening: Cleanse and exfoliate with a gentle BHA product.",
          day5: "Morning: Cleanse and apply azelaic acid serum. Evening: Cleanse and apply a thin layer of retinol if recommended.",
          day6: "Morning: Gentle cleansing and moisturizing. Evening: Apply a soothing mask with ingredients like aloe vera or chamomile.",
        }

        setDailyTreatmentPlan({
          ...fallbackPlan,
          loading: false,
          error: "Could not generate a custom treatment plan. Using recommended defaults instead.",
          isUsingFallback: true,
        })

        // Save the fallback plan if we have a valid user
        if (shouldSave) {
          saveTreatmentPlan(acneType, fallbackPlan, "daily")
        }
      } else {
        // Set a generic fallback weekly treatment plan
        const fallbackPlan = {
          week1:
            "Focus on gentle cleansing with a mild cleanser twice daily. Use a light, oil-free moisturizer. Apply spot treatments with benzoyl peroxide or salicylic acid as needed. Avoid picking or squeezing acne lesions.",
          week2:
            "Continue with the cleansing routine. Add a niacinamide serum in the morning to reduce inflammation. Use a clay mask twice this week. Consider introducing a gentle exfoliant 1-2 times this week.",
          week3:
            "Maintain the cleansing and treatment routine. Continue with niacinamide in the morning. Add a vitamin C serum for antioxidant protection. Use hydrating masks to prevent dryness from treatments.",
          week4:
            "Continue with the established routine. If improvement is seen, maintain the regimen. If not, consider adding azelaic acid or adapalene (if prescribed). Use soothing ingredients like centella asiatica or aloe vera.",
        }

        setWeeklyTreatmentPlan({
          ...fallbackPlan,
          loading: false,
          error: "Could not generate a custom treatment plan. Using recommended defaults instead.",
          isUsingFallback: true,
        })

        // Save the fallback plan if we have a valid user
        if (shouldSave) {
          saveTreatmentPlan(acneType, fallbackPlan, "weekly")
        }
      }
    }
  }

  // Function to save treatment plan to the database
  const saveTreatmentPlan = async (acneType: string, treatmentPlan: any, mode: "daily" | "weekly") => {
    // Check if we have valid user data with an ID
    if (!userData || !userData.id) {
      console.log("Cannot save treatment plan: No user data available or missing ID")
      return
    }

    try {
      console.log(`Attempting to save ${mode} treatment plan for user ${userData.id}`, treatmentPlan)

      // Insert the treatment plan into the treatments table
      const { data, error } = await supabase
        .from("treatments")
        .insert([
          {
            user_id: userData.id,
            acne_type: acneType,
            treatment_date: new Date().toISOString(),
            treatment_plan: {
              ...treatmentPlan,
              mode: mode,
            },
          },
        ])
        .select()

      if (error) {
        console.error(`Error saving ${mode} treatment plan:`, error)
        return
      }

      console.log(`${mode} treatment plan saved successfully:`, data)
      setTreatmentSaved(true)
    } catch (error) {
      console.error(`Error saving ${mode} treatment plan:`, error)
    }
  }

  const handleViewModeChange = (mode: "daily" | "weekly") => {
    setViewMode(mode)
  }

  if (loading) {
    return (
      <div className={`min-h-screen bg-[#EEEBE7] flex items-center justify-center ${aeonikPro.variable}`}>
        <div className="text-2xl">Loading treatment plan...</div>
      </div>
    )
  }

  if (error && !userData) {
    return (
      <div className={`min-h-screen bg-[#EEEBE7] flex flex-col items-center justify-center ${aeonikPro.variable}`}>
        <div className="text-2xl mb-4">Something went wrong</div>
        <p className="text-[#6A6A6A] mb-8">{error || "User data not found"}</p>
        <Link
          href="/form"
          className="border border-[#000] rounded-full px-8 py-2 hover:bg-black hover:text-white transition-colors"
        >
          Try Again
        </Link>
      </div>
    )
  }

  const currentTreatmentPlan = viewMode === "daily" ? dailyTreatmentPlan : weeklyTreatmentPlan
  const isLoading = viewMode === "daily" ? dailyTreatmentPlan.loading : weeklyTreatmentPlan.loading

  return (
    <div className={`min-h-screen bg-[#EEEBE7] ${aeonikPro.variable}`}>
      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-[1380px] bg-[#E5E1DB] rounded-[30px] overflow-hidden shadow-lg">
          {/* Header with logo centered */}
          <div className="flex justify-center p-6">
            <Link
              href="/"
              className="text-4xl font-light bg-gradient-to-r from-[#E4B2BE] via-[#80629A] to-[#355C73] bg-clip-text text-transparent"
            >
              acheal.ai
            </Link>
          </div>

          {/* User info section */}
          <div className="p-6">
            <div className="flex flex-col md:flex-row">
              {/* User's image */}
              <div className="w-full md:w-1/4 mb-6 md:mb-0 pr-6">
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
                  {userData?.imageurl && (
                    <Image
                      src={userData.imageurl.startsWith("data:") ? userData.imageurl : "/placeholder.svg"}
                      alt="User's skin"
                      fill
                      className="object-cover"
                      priority
                    />
                  )}
                </div>
              </div>

              {/* Main content area with user details and acne type */}
              <div className="w-full md:w-3/4">
                <div className="bg-white bg-opacity-20 rounded-2xl p-8 shadow-sm">
                  <div className="flex flex-col md:flex-row">
                    {/* User details */}
                    <div className="w-full md:w-1/2 md:border-r border-gray-200 pr-8">
                      <h2 className="text-2xl font-medium mb-6">Your Details</h2>
                      <div className="space-y-3">
                        <p className="text-lg">
                          <span className="font-medium">Name:</span> {userData?.name || "Not provided"}
                        </p>
                        <p className="text-lg">
                          <span className="font-medium">Age:</span> {userData?.age || "Not provided"}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <div className="inline-block bg-[#FFD6C4] bg-opacity-20 text-[#693709] rounded-full px-4 py-1">
                            {userData?.skintype || "Normal"} Skin
                          </div>
                          <div className="inline-block bg-[#E0F2E3] text-[#1A932E] rounded-full px-4 py-1">NORMAL</div>
                        </div>
                      </div>
                    </div>

                    {/* Acne type */}
                    <div className="w-full md:w-1/2 pl-0 md:pl-8 mt-6 md:mt-0">
                      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">TYPE</h2>
                      <h1 className="text-5xl md:text-7xl font-light bg-gradient-to-r from-[#E4B2BE] via-[#80629A] to-[#355C73] bg-clip-text text-transparent">
                        {userData?.acnetype || "Normal"}
                      </h1>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Treatment section */}
          <div className="p-6">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-medium">Generated Treatment</h2>
              <div className="bg-white rounded-full p-1 flex">
                <button
                  className={`px-4 py-1 rounded-full flex items-center gap-2 ${
                    viewMode === "weekly" ? "bg-gray-200" : "bg-white"
                  } transition-colors`}
                  onClick={() => handleViewModeChange("weekly")}
                >
                  <Image src="/images/weeklyIcon.png" alt="Weekly view" width={20} height={20} />
                  Weekly
                </button>
                <button
                  className={`px-4 py-1 rounded-full flex items-center gap-2 ${
                    viewMode === "daily" ? "bg-gray-200" : "bg-white"
                  } transition-colors`}
                  onClick={() => handleViewModeChange("daily")}
                >
                  <Image src="/images/DailyIcon.png" alt="Daily view" width={20} height={20} />
                  Daily
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row">
              {/* Left sidebar */}
              <div className="w-full md:w-1/4 mb-8 md:mb-0 pr-8 border-r border-gray-200">
                <div className="flex justify-center mb-6">
                  {viewMode === "daily" ? (
                    <Image src="/images/DailyIcon.png" alt="Daily view" width={60} height={60} />
                  ) : (
                    <Image src="/images/weeklyIcon.png" alt="Weekly view" width={60} height={60} />
                  )}
                </div>
                <h3 className="text-2xl font-medium text-center mb-4">
                  {viewMode === "daily" ? "Daily" : "Weekly"} Treatment
                </h3>
                <p className="text-sm text-gray-600 text-center mb-2">For People Who wants a fast treatment.</p>
                <p className="text-sm text-gray-600 text-center">"Can or Cannot work for every Skin type"</p>

                {/* Treatment saved notification */}
                {treatmentSaved && (
                  <div className="mt-4 p-2 bg-green-50 text-green-600 rounded-md text-center text-sm">
                    Treatment plan saved to your history!
                  </div>
                )}

                {/* Demo mode notification */}
                {!canSaveTreatment && (
                  <div className="mt-4 p-2 bg-amber-50 text-amber-700 rounded-md text-center text-sm">
                    Demo mode: Treatment plans won't be saved.
                    <Link href="/form" className="block mt-1 underline">
                      Create an account to save treatments
                    </Link>
                  </div>
                )}
              </div>

              {/* Treatment cards */}
              <div className="w-full md:w-3/4 pl-0 md:pl-8">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                    <span className="ml-2 text-gray-500">Generating your personalized treatment plan...</span>
                  </div>
                ) : (
                  <>
                    {currentTreatmentPlan.error && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-6 flex items-center">
                        <AlertTriangle size={18} className="mr-2" />
                        {currentTreatmentPlan.error}
                      </div>
                    )}

                    {viewMode === "daily" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Day 1 */}
                        <div className="bg-white bg-opacity-20 rounded-xl p-6 shadow-sm">
                          <h3 className="text-xl font-medium mb-4">Day 1</h3>
                          <p className="text-gray-600">{dailyTreatmentPlan.day1}</p>
                        </div>

                        {/* Day 2 */}
                        <div className="bg-white bg-opacity-20 rounded-xl p-6 shadow-sm">
                          <h3 className="text-xl font-medium mb-4">Day 2</h3>
                          <p className="text-gray-600">{dailyTreatmentPlan.day2}</p>
                        </div>

                        {/* Day 3 */}
                        <div className="bg-white bg-opacity-20 rounded-xl p-6 shadow-sm">
                          <h3 className="text-xl font-medium mb-4">Day 3</h3>
                          <p className="text-gray-600">{dailyTreatmentPlan.day3}</p>
                        </div>

                        {/* Day 4 */}
                        <div className="bg-white bg-opacity-20 rounded-xl p-6 shadow-sm">
                          <h3 className="text-xl font-medium mb-4">Day 4</h3>
                          <p className="text-gray-600">{dailyTreatmentPlan.day4}</p>
                        </div>

                        {/* Day 5 */}
                        <div className="bg-white bg-opacity-20 rounded-xl p-6 shadow-sm">
                          <h3 className="text-xl font-medium mb-4">Day 5</h3>
                          <p className="text-gray-600">{dailyTreatmentPlan.day5}</p>
                        </div>

                        {/* Day 6 */}
                        <div className="bg-white bg-opacity-20 rounded-xl p-6 shadow-sm">
                          <h3 className="text-xl font-medium mb-4">Day 6</h3>
                          <p className="text-gray-600">{dailyTreatmentPlan.day6}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6">
                        {/* Week 1 */}
                        <div className="bg-white bg-opacity-20 rounded-xl p-6 shadow-sm">
                          <h3 className="text-xl font-medium mb-4">Week 1</h3>
                          <p className="text-gray-600">{weeklyTreatmentPlan.week1}</p>
                        </div>

                        {/* Week 2 */}
                        <div className="bg-white bg-opacity-20 rounded-xl p-6 shadow-sm">
                          <h3 className="text-xl font-medium mb-4">Week 2</h3>
                          <p className="text-gray-600">{weeklyTreatmentPlan.week2}</p>
                        </div>

                        {/* Week 3 */}
                        <div className="bg-white bg-opacity-20 rounded-xl p-6 shadow-sm">
                          <h3 className="text-xl font-medium mb-4">Week 3</h3>
                          <p className="text-gray-600">{weeklyTreatmentPlan.week3}</p>
                        </div>

                        {/* Week 4 */}
                        <div className="bg-white bg-opacity-20 rounded-xl p-6 shadow-sm">
                          <h3 className="text-xl font-medium mb-4">Week 4</h3>
                          <p className="text-gray-600">{weeklyTreatmentPlan.week4}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Dermatologist section */}
          <div className="p-6 border-t border-gray-200 mt-8">
            <h2 className="text-2xl font-medium mb-2">Consult with more than 1000+ Dermatologists</h2>
            <p className="text-gray-600 mb-6">Over 1000 Great Dermatologists waiting to provide you their Assistance</p>

            <div className="flex items-center mb-6">
              <div className="flex -space-x-4">
                <div className="w-12 h-12 rounded-full bg-gray-300 border-2 border-white overflow-hidden relative">
                  <Image src="/professional-woman-doctor.png" alt="Dermatologist" fill className="object-cover" />
                </div>
                <div className="w-12 h-12 rounded-full bg-gray-300 border-2 border-white overflow-hidden relative">
                  <Image src="/professional-man-doctor.png" alt="Dermatologist" fill className="object-cover" />
                </div>
                <div className="w-12 h-12 rounded-full bg-gray-300 border-2 border-white overflow-hidden relative">
                  <Image
                    src="/professional-woman-dermatologist.png"
                    alt="Dermatologist"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>

            <button className="border border-[#000] rounded-full px-6 py-2 flex items-center hover:bg-black hover:text-white transition-colors">
              Explore Dermatologists <ArrowRight size={16} className="ml-2" />
            </button>
          </div>

          {/* Disclaimer */}
          <div className="p-6 text-center">
            <p className="text-xs text-[#6A6A6A]">
              Note: <span className="underline">Acheal.ai</span> is not 100% correct, we advise to check in with your
              dermatologist if you think your case is very rare or serious
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
