import Image from "next/image"
import type { UserProfile, TreatmentHistoryItem } from "@/app/types/dashboard-types"

interface DiagnosisReportProps {
  userProfile: UserProfile | null
  treatmentHistory: TreatmentHistoryItem | null
  imageUrl?: string | null
}

// Helper to get the treatment summary
const getTreatmentSummary = (
  plan: any,
  mode: "daily" | "weekly" | undefined,
): { title: string; description: string }[] => {
  if (!plan) return []
  const actualMode = plan.mode || mode

  if (actualMode === "daily") {
    return [
      { title: "Day 1", description: plan.day1 || "N/A" },
      { title: "Day 2", description: plan.day2 || "N/A" },
      { title: "Day 3", description: plan.day3 || "N/A" },
      { title: "Day 4", description: plan.day4 || "N/A" },
      { title: "Day 5", description: plan.day5 || "N/A" },
      { title: "Day 6", description: plan.day6 || "N/A" },
    ]
  }
  if (actualMode === "weekly") {
    return [
      { title: "Week 1", description: plan.week1 || "N/A" },
      { title: "Week 2", description: plan.week2 || "N/A" },
      { title: "Week 3", description: plan.week3 || "N/A" },
      { title: "Week 4", description: plan.week4 || "N/A" },
    ]
  }
  return [{ title: "Treatment", description: "No plan details available." }]
}

// Function to get acne description
const getAcneDescription = (type: string | null | undefined): string => {
  if (!type) return "No acne type detected or analysis pending."
  // Simplified for brevity, ensure all your types are covered
  const descriptions: Record<string, string> = {
    Acne: "Acne vulgaris is a common skin condition.",
    Papules: "Papules are small, raised, red bumps.",
    Blackhead: "Blackheads are small, dark lesions caused by clogged hair follicles.",
    Conglobata: "Acne conglobata is a rare and severe form of acne.",
    Crystalline: "Crystalline acne refers to crystals within acne comedones.",
    Cystic: "Cystic acne involves large, painful cysts beneath the skin.",
    "Flat Wart": "Flat warts are small, smooth, flat-topped bumps caused by HPV.",
    Folliculitis: "Folliculitis is the inflammation of hair follicles.",
    Keloid: "Keloids are raised overgrowths of scar tissue.",
    Milium: "Milia are small, white cysts.",
    Purulent: "Purulent acne lesions (pustules) are inflamed bumps filled with pus.",
    Scars: "Acne scars are permanent textural changes.",
    "Sebo-crystan-conglo":
      "Complex acne lesions with sebaceous activity, crystalline structures, and conglobate features.",
    Syringoma: "Syringomas are benign tumors of the sweat glands.",
    Whitehead: "Whiteheads occur when a pore is clogged and the top closes up.",
    Normal: "Your skin appears to be in a healthy condition.",
    // Add other descriptions as needed
  }
  return (
    descriptions[type] ||
    `A type of acne requiring specific care. Please consult a dermatologist for detailed information if your condition is severe.`
  )
}

export default function DiagnosisReport({ userProfile, treatmentHistory, imageUrl }: DiagnosisReportProps) {
  if (!userProfile) {
    return <div className="p-8 text-center text-red-500">User data not available for report.</div>
  }

  const acneDescription = getAcneDescription(userProfile.acnetype)
  const treatmentItems = getTreatmentSummary(treatmentHistory?.treatment_plan, treatmentHistory?.treatment_plan?.mode)
  const treatmentPlanMode =
    treatmentHistory?.treatment_plan?.mode ||
    (treatmentItems.some((item) => item.title.startsWith("Day")) ? "Daily" : "Weekly")

  return (
    <div className="p-10 bg-white font-sans w-[210mm] min-h-[297mm] mx-auto" id="diagnosisReportContent">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-light bg-gradient-to-r from-[#E4B2BE] via-[#80629A] to-[#355C73] bg-clip-text text-transparent">
          acheal.ai
        </h1>
      </header>

      <section className="mb-8">
        <h2 className="text-4xl font-bold text-blue-600 mb-4">{userProfile.name || "User"}</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <h3 className="text-xl font-semibold mb-1">Detected Acne type: {userProfile.acnetype || "N/A"}</h3>
            <p className="text-gray-700 text-sm leading-relaxed">{acneDescription}</p>
          </div>
          <div className="text-sm">
            <p>
              <span className="font-semibold">Age:</span> {userProfile?.age || "N/A"}
            </p>
            <p>
              <span className="font-semibold">Skin Type:</span> {userProfile?.skintype || "N/A"}
            </p>
            <p>
              <span className="font-semibold">Severity:</span> {userProfile?.severity || "N/A"}
            </p>
            <p>
              <span className="font-semibold">Treatment Plan:</span> {treatmentPlanMode || "N/A"}
            </p>
            <p>
              <span className="font-semibold">Report Date:</span> {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl || "/placeholder.svg"} // Fallback to placeholder
              alt="User's skin analysis"
              width={400}
              height={256}
              className="object-contain"
              unoptimized={imageUrl.startsWith("data:")} // Add this if using base64 images
            />
          ) : (
            <svg
              className="w-24 h-24 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-2xl font-bold mb-4">Treatment plan</h3>
        <div className="space-y-4">
          {treatmentItems.length > 0 ? (
            treatmentItems.map((item, index) => (
              <div key={index}>
                <h4 className="text-lg font-semibold mb-1">{item.title}</h4>
                <p className="text-gray-700 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-700 text-sm">No treatment plan details available.</p>
          )}
        </div>
      </section>

      <footer className="mt-12 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Note: This report is generated by Acheal.ai an AI based acne detection and treatment platform. It can make
          mistakes and is not 100% accurate so contact an actual dermatologist if you think your case is rare.
        </p>
      </footer>
    </div>
  )
}