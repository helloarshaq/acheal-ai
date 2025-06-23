"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import localFont from "next/font/local"
import { ChevronDown, AlertTriangle, X } from "lucide-react"
import Button from "./Glowing button/Button.jsx"

// Update the font paths with absolute paths starting from public directory
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
}

interface AnalysisValues {
  severity: number
  harsh: number
  freq: number
  impact: number
  rare: number
  scary: number
  reco: number
}

interface ApiErrors {
  [key: string]: string | null;
}

export default function ResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get("id")

  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acneType, setAcneType] = useState<string | null>(null)
  const [acneDescription, setAcneDescription] = useState<string>("")
  const [analysisValues, setAnalysisValues] = useState<AnalysisValues>({
    severity: 5,
    harsh: 4,
    freq: 10,
    impact: 6,
    rare: 1,
    scary: 3,
    reco: 4,
  })
  const [severity, setSeverity] = useState<string | null>(null)
  const [severityNum, setSeverityNum] = useState<number>(0)
  const [roboflowPrediction, setRoboflowPrediction] = useState<string | null>(null)
  const [acne9mPrediction, setacne9mPrediction] = useState<string | null>(null)
  const [geminiPrediction, setGeminiPrediction] = useState<string | null>(null)
  const [apiErrors, setApiErrors] = useState<any>(null)
  const [showNoAcneModal, setShowNoAcneModal] = useState(false)

  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchUserData() {
      if (!userId) {
        setError("No user ID provided")
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()

        if (error) {
          throw error
        }

        if (data) {
          setUserData(data)

          // Always call the API to get fresh prediction for the current image
          await predictAcneType(data.imageurl, data.id)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        setError("Failed to load user data")
        setLoading(false)
      }
    }

    fetchUserData()
  }, [userId, supabase])

  const predictAcneType = async (imageUrl: string, userId: string) => {
    try {
      const imageData = imageUrl.startsWith("data:") ? imageUrl.split(",")[1] : null

      if (!imageData) {
        throw new Error("Invalid image format")
      }

      const response = await fetch("/api/predict-acne", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageData }),
      })

      if (response.status === 422) {
        const data = await response.json()
        if (data.error === "NO_ACNE") {
          // Show modal immediately when no acne is detected
          setShowNoAcneModal(true)
          setLoading(false)
          return
        }
      }

      if (!response.ok) {
        throw new Error("Failed to predict acne type")
      }

      const data = await response.json()
      const predictedType = data.prediction || "Normal"

      // Store all predictions and severity
      setRoboflowPrediction(data.roboflowPrediction || null)
      setacne9mPrediction(data.acne9mPrediction || null)
      setGeminiPrediction(data.geminiPrediction || null)
      setSeverity(data.severity || null)
      setSeverityNum(data.severityNum || 0)
      setApiErrors(data.apiErrors || null)

      // Set the final prediction
      setAcneType(predictedType)
      setAcneDescription(getAcneDescription(predictedType))
      setAnalysisValues(getAnalysisValues(predictedType))

      // Update the user record with the predicted acne type and severity
      const updateData = {
        acnetype: predictedType,
        severity: data.severity || null,
        severity_num: data.severityNum || 0,
      }

      console.log("Updating user with latest analysis:", updateData)

      const { error: updateError } = await supabase.from("users").update(updateData).eq("id", userId)

      if (updateError) {
        console.error("Error updating user with latest analysis:", updateError)
      } else {
        console.log("Successfully updated user with latest analysis")

        // Also update the local userData state to reflect the changes immediately
        setUserData((prev) =>
          prev
            ? {
                ...prev,
                acnetype: predictedType,
                severity: data.severity || null,
                severity_num: data.severityNum || 0,
              }
            : null,
        )
      }

      setLoading(false)
    } catch (error) {
      console.error("Error predicting acne type:", error)
      setAcneType("Normal")
      setAcneDescription(getAcneDescription("Normal"))
      setAnalysisValues(getAnalysisValues("Normal"))
      setLoading(false)
    }
  }

  const handleReupload = () => {
    setShowNoAcneModal(false)
    // Preserve user data and redirect to form with upload step and user data
    const params = new URLSearchParams({
      step: "upload",
      name: userData?.name || "",
      age: userData?.age || "",
      skintype: userData?.skintype || "",
      userId: userId || "",
    })
    router.push(`/form?${params.toString()}`)
  }

  // Function to get analysis values based on acne type (unchanged)
  const getAnalysisValues = (type: string): AnalysisValues => {
    const primaryType = type.split(", ")[0]

    const analysisTable: Record<string, AnalysisValues> = {
      Acne: { severity: 5, harsh: 4, freq: 10, impact: 6, rare: 1, scary: 3, reco: 4 },
      Blackhead: { severity: 2, harsh: 1, freq: 10, impact: 3, rare: 1, scary: 1, reco: 2 },
      Conglobata: { severity: 9, harsh: 9, freq: 2, impact: 10, rare: 9, scary: 8, reco: 9 },
      Crystalline: { severity: 3, harsh: 2, freq: 2, impact: 2, rare: 7, scary: 2, reco: 3 },
      Cystic: { severity: 8, harsh: 8, freq: 4, impact: 9, rare: 5, scary: 7, reco: 8 },
      "Flat Wart": { severity: 3, harsh: 2, freq: 4, impact: 4, rare: 4, scary: 2, reco: 4 },
      Folliculitis: { severity: 4, harsh: 3, freq: 6, impact: 4, rare: 3, scary: 3, reco: 3 },
      Keloid: { severity: 6, harsh: 3, freq: 3, impact: 8, rare: 6, scary: 5, reco: 8 },
      Milium: { severity: 1, harsh: 1, freq: 6, impact: 2, rare: 3, scary: 1, reco: 2 },
      Papular: { severity: 4, harsh: 4, freq: 6, impact: 5, rare: 2, scary: 3, reco: 3 },
      Purulent: { severity: 5, harsh: 5, freq: 5, impact: 6, rare: 2, scary: 4, reco: 4 },
      Scars: { severity: 6, harsh: 2, freq: 4, impact: 8, rare: 3, scary: 5, reco: 7 },
      "Sebo-crystan-conglo": { severity: 8, harsh: 7, freq: 1, impact: 9, rare: 10, scary: 7, reco: 9 },
      Syringoma: { severity: 2, harsh: 1, freq: 3, impact: 3, rare: 5, scary: 2, reco: 3 },
      Whitehead: { severity: 2, harsh: 1, freq: 9, impact: 3, rare: 1, scary: 1, reco: 2 },
      Papules: { severity: 4, harsh: 4, freq: 6, impact: 5, rare: 2, scary: 3, reco: 3 },
      Pustules: { severity: 5, harsh: 5, freq: 5, impact: 6, rare: 2, scary: 4, reco: 4 },
      Blackheads: { severity: 2, harsh: 1, freq: 10, impact: 3, rare: 1, scary: 1, reco: 2 },
      Whiteheads: { severity: 2, harsh: 1, freq: 9, impact: 3, rare: 1, scary: 1, reco: 2 },
      Nodules: { severity: 7, harsh: 7, freq: 3, impact: 8, rare: 4, scary: 6, reco: 7 },
      Cysts: { severity: 8, harsh: 8, freq: 4, impact: 9, rare: 5, scary: 7, reco: 8 },
      Normal: { severity: 1, harsh: 1, freq: 1, impact: 1, rare: 1, scary: 1, reco: 1 },
    }

    return analysisTable[primaryType] || analysisTable.Acne
  }

  // Function to get description based on acne type (unchanged)
  const getAcneDescription = (type: string): string => {
    const descriptions: Record<string, string> = {
      Acne: "Acne vulgaris is a common skin condition characterized by the formation of comedones (blackheads and whiteheads), papules, pustules, nodules, and/or cysts due to obstruction and inflammation of hair follicles and their accompanying sebaceous glands. It typically affects the face and upper trunk and is most prevalent among adolescents.",

      Blackhead:
        "Blackheads, or open comedones, are small, dark lesions on the skin caused by clogged hair follicles. They occur when a pore becomes clogged with sebum and dead skin cells, and the exposure to air causes the clog to oxidize and turn black.",

      Conglobata:
        "Acne conglobata is a rare and severe form of acne characterized by interconnected nodules, cysts, and abscesses that can lead to significant scarring. It commonly affects the face, chest, back, and buttocks and is more prevalent in males.",

      Crystalline:
        "Crystalline acne refers to the presence of polarizable crystalline material within acne comedones. These crystals are more prominent in closed comedones and may contribute to the persistence of acne lesions.",

      Cystic:
        "Cystic acne is a severe form of acne where the pores in the skin become blocked, leading to infection and inflammation. This results in large, painful cysts beneath the skin's surface, which can cause scarring.",

      "Flat Wart":
        "Flat warts, or verruca plana, are small, smooth, flat-topped bumps caused by the human papillomavirus (HPV). They often appear in clusters on the face, hands, or legs and are more common in children and young adults.",

      Folliculitis:
        "Folliculitis is the inflammation of hair follicles, often resulting in red, pimple-like bumps. It can be caused by bacterial or fungal infections and may resemble acne.",

      Keloid:
        "Keloids are raised overgrowths of scar tissue that occur at the site of skin injury. They can develop after acne lesions heal and are more common in individuals with darker skin tones.",

      Milium:
        "Milia are small, white cysts that form when keratin becomes trapped beneath the skin's surface. They are commonly found around the eyes and cheeks and are not a form of acne.",

      Papular:
        "Papular acne consists of small, raised, red bumps that are inflamed but do not contain pus. These lesions can be tender to the touch and are a sign of moderate acne.",

      Purulent:
        "Purulent acne lesions, also known as pustules, are inflamed bumps filled with pus. They are a result of bacterial infection within clogged pores and are a common feature of moderate to severe acne.",

      Scars:
        "Acne scars are permanent textural changes and indentations that occur on the skin due to severe acne. They can be atrophic (depressed) or hypertrophic (raised) and may require dermatological treatments to improve appearance.",

      "Sebo-crystan-conglo":
        "This appears to be a classification used in certain dermatological datasets to describe complex acne lesions involving sebaceous activity, crystalline structures, and conglobate features. It represents a combination of different acne characteristics that may require specialized treatment.",

      Syringoma:
        "Syringomas are benign tumors of the sweat glands, presenting as small, flesh-colored or yellowish bumps, typically around the eyes. They are not related to acne but can be mistaken for milia or other skin conditions.",

      Whitehead:
        "Whiteheads, or closed comedones, occur when a pore becomes clogged with sebum and dead skin cells, but the top of the pore closes up. This results in a small, white bump on the skin's surface.",

      Papules:
        "Papules are comedones that become inflamed, forming small red or pink bumps on the skin. This type of pimple may be sensitive to the touch. Picking or squeezing can make the inflammation worse and may lead to scarring.",

      Pustules:
        "Pustules are similar to papules but are filled with pus. They appear as red, tender bumps with white or yellow centers. They are a common form of inflammatory acne.",

      Blackheads:
        "Blackheads are a type of comedone that forms when a pore is clogged with sebum and dead skin cells but remains open at the surface. The black color is not from dirt but from the oxidation of melanin when exposed to air.",

      Whiteheads:
        "Whiteheads are closed comedones that develop when a pore is clogged with sebum and dead skin cells and is covered by skin. They appear as small, flesh-colored or white bumps under the skin's surface.",

      Nodules:
        "Nodules are severe forms of acne that develop deep within the skin. They are large, painful, solid lesions that are lodged deep within the skin. They can cause tissue damage and scarring.",

      Cysts:
        "Cysts are the most severe form of acne. They are large, painful, pus-filled lesions that form deep under the skin. They can cause significant scarring and tissue damage.",

      Normal:
        "Your skin appears to be in a healthy condition without significant acne concerns. Continue with a gentle skincare routine to maintain skin health.",
    }

    const primaryType = type.split(", ")[0]
    return (
      descriptions[primaryType] ||
      "This type of acne forms when hair follicles become clogged with oil and dead skin cells. Treatment depends on the specific type and severity."
    )
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
        <div className="text-2xl">Analyzing your skin...</div>
      </div>
    )
  }

  if (error || !userData) {
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

  return (
    <div className={`min-h-screen bg-[#EEEBE7] ${aeonikPro.variable}`}>
      {/* No Acne Modal with beautiful blur background - NO CLOSE BUTTON */}
      {showNoAcneModal && (
        <div className="fixed inset-0 z-50">
          {/* Blurred backdrop */}
          <div
            className="absolute inset-0 backdrop-blur-md bg-black/30"
            style={{
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          />
          {/* Modal content */}
          <div className="relative flex items-center justify-center min-h-screen p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-4 shadow-2xl border border-white/20">
              <div className="mb-4">
                <h2 className="text-2xl font-medium">No Acne Detected</h2>
              </div>
              <p className="text-gray-600 mb-6">
                We couldn't detect acne in that photo. Please upload a clear facial image.
              </p>
              <button
                onClick={handleReupload}
                className="w-full bg-black text-white rounded-full py-3 px-4 hover:bg-gray-800 transition-colors"
              >
                Re-upload Image
              </button>
            </div>
          </div>
        </div>
      )}

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

          <div className="flex flex-col md:flex-row p-6">
            {/* Left column - Image and user details */}
            <div className="w-full md:w-1/3 mb-8 md:mb-0">
              {/* User's uploaded image */}
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-8">
                {userData.imageurl && (
                  <Image
                    src={userData.imageurl.startsWith("data:") ? userData.imageurl : "/placeholder.svg"}
                    alt="User's skin"
                    fill
                    className="object-cover"
                    priority
                  />
                )}
              </div>

              {/* User details */}
              <div className="border-t border-gray-200 pt-4">
                <h2 className="text-2xl font-medium mb-4">Your Details</h2>
                <div className="space-y-2">
                  <p className="text-lg">
                    <span className="font-medium">Name:</span> {userData.name}
                  </p>
                  <p className="text-lg">
                    <span className="font-medium">Age:</span> {userData.age}
                  </p>
                  <div className="mt-2">
                    <span className="inline-block bg-green-100 text-green-800 rounded-full px-4 py-1">
                      {userData.skintype} Skin
                    </span>
                  </div>
                  {/* Display severity if available */}
                  {severity && (
                    <div className="mt-2">
                      <span className={`inline-block rounded-full px-4 py-1 ${getSeverityColor(severity)}`}>
                        Severity: {severity}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Model predictions */}
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h3 className="text-lg font-medium mb-2">AI Analysis</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  {roboflowPrediction && <p>Roboflow: {roboflowPrediction}</p>}
                  {acne9mPrediction && <p>Acne-8M: {acne9mPrediction}</p>}
                  {geminiPrediction ? (
                    <p>Gemini: {geminiPrediction}</p>
                  ) : (
                    <div className="flex items-center gap-1 text-amber-600">
                      <AlertTriangle size={14} />
                      <p>Gemini: Unavailable</p>
                    </div>
                  )}
                  {apiErrors && Object.keys(apiErrors).length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {Object.entries(apiErrors as Record<string, string | null>).map(
                        ([api, error]) =>
                          error && (
                            <p key={api} className="flex items-center gap-1">
                              <AlertTriangle size={12} className="text-amber-600" />
                              {api}: {error}
                            </p>
                          ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right column - Results */}
            <div className="w-full md:w-2/3 md:pl-8">
              {/* Results header */}
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-4xl font-medium">Results</h1>
                <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2">
                  Acne Type Analysis <ChevronDown size={16} />
                </button>
              </div>

              {/* Acne severity tag */}
              <div className="inline-block bg-[#1A932E]/10 text-[#1A932E] rounded-md px-3 py-1 text-sm mb-4">
                {acneType === "Normal" ? "NORMAL" : "DETECTED"}
              </div>

              {/* Acne type result */}
              <div>
                <h2 className="text-2xl mb-2">Your Acne Type is</h2>
                <h1 className="text-7xl font-light bg-gradient-to-r from-[#E4B2BE] via-[#80629A] to-[#355C73] bg-clip-text text-transparent mb-4">
                  {acneType || "Normal"}
                </h1>
                <p className="text-[#6A6A6A] mb-8 max-w-2xl">{acneDescription}</p>
              </div>

              {/* Analysis visualization */}
              <div className="bg-white rounded-xl p-6 mb-8 shadow-sm">
                <h3 className="text-xl font-medium mb-4">Type Analysis</h3>

                <div className="grid grid-cols-7 gap-4 mb-6">
                  {/* Severity column */}
                  <div className="flex flex-col items-center">
                    <div className="flex flex-col-reverse gap-1 mb-2 h-40">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                            i === 10 - analysisValues.severity
                              ? "bg-[#E65F2B] border-[#E65F2B] text-white"
                              : "border-gray-300"
                          }`}
                        >
                          {i === 10 - analysisValues.severity && (
                            <div className="text-xs text-center">{analysisValues.severity}</div>
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-[#6A6A6A]">severity</span>
                  </div>

                  {/* Harsh column */}
                  <div className="flex flex-col items-center">
                    <div className="flex flex-col-reverse gap-1 mb-2 h-40">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                            i === 10 - analysisValues.harsh ? "bg-black border-black text-white" : "border-gray-300"
                          }`}
                        >
                          {i === 10 - analysisValues.harsh && (
                            <div className="text-xs text-center">
                              {analysisValues.harsh.toString().padStart(2, "0")}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-[#6A6A6A]">Harsh</span>
                  </div>

                  {/* Freq column */}
                  <div className="flex flex-col items-center">
                    <div className="flex flex-col-reverse gap-1 mb-2 h-40">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                            i === 10 - analysisValues.freq ? "bg-black border-black text-white" : "border-gray-300"
                          }`}
                        >
                          {i === 10 - analysisValues.freq && (
                            <div className="text-xs text-center">{analysisValues.freq.toString().padStart(2, "0")}</div>
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-[#6A6A6A]">Freq</span>
                  </div>

                  {/* Impact column */}
                  <div className="flex flex-col items-center">
                    <div className="flex flex-col-reverse gap-1 mb-2 h-40">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                            i === 10 - analysisValues.impact ? "bg-black border-black text-white" : "border-gray-300"
                          }`}
                        >
                          {i === 10 - analysisValues.impact && (
                            <div className="text-xs text-center">
                              {analysisValues.impact.toString().padStart(2, "0")}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-[#6A6A6A]">impact</span>
                  </div>

                  {/* Rare column */}
                  <div className="flex flex-col items-center">
                    <div className="flex flex-col-reverse gap-1 mb-2 h-40">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                            i === 10 - analysisValues.rare ? "bg-black border-black text-white" : "border-gray-300"
                          }`}
                        >
                          {i === 10 - analysisValues.rare && (
                            <div className="text-xs text-center">{analysisValues.rare.toString().padStart(2, "0")}</div>
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-[#6A6A6A]">Rare</span>
                  </div>

                  {/* Scary column */}
                  <div className="flex flex-col items-center">
                    <div className="flex flex-col-reverse gap-1 mb-2 h-40">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                            i === 10 - analysisValues.scary ? "bg-black border-black text-white" : "border-gray-300"
                          }`}
                        >
                          {i === 10 - analysisValues.scary && (
                            <div className="text-xs text-center">
                              {analysisValues.scary.toString().padStart(2, "0")}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-[#6A6A6A]">Scary</span>
                  </div>

                  {/* Reco column */}
                  <div className="flex flex-col items-center">
                    <div className="flex flex-col-reverse gap-1 mb-2 h-40">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                            i === 10 - analysisValues.reco ? "bg-black border-black text-white" : "border-gray-300"
                          }`}
                        >
                          {i === 10 - analysisValues.reco && (
                            <div className="text-xs text-center">{analysisValues.reco.toString().padStart(2, "0")}</div>
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-[#6A6A6A]">Reco</span>
                  </div>
                </div>

                <p className="text-sm text-[#6A6A6A]">
                  This analysis will rank your Acne type on various factor on a scale of 1 to 10. (eg: 1 being low and
                  10 being high)
                </p>
              </div>

              {/* Treatment guidelines section */}
              <div className="mb-8">
                <h2 className="text-3xl font-light mb-2">
                  Do you want us to give you our specially curated treatment guidelines?
                </h2>
                <p className="text-[#6A6A6A] mb-6">Fill up a form so we can provide promising results.</p>

                {/* Use the Button component instead of Link */}
                <Button
                  hueValue={0}
                  className="font-aeonik text-white rounded-full px-6 py-3.5 w-auto flex items-center gap-3"
                  onClick={() => {
                    router.push(`/treatment?id=${userId}`)
                  }}
                >
                  Generate Treatment
                </Button>
              </div>
            </div>
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