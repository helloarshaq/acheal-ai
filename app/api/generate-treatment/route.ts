import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

// POST handler to generate treatment plan
export async function POST(request: Request) {
  try {
    const { acneType, skinType, mode = "daily" } = await request.json()

    if (!acneType) {
      return NextResponse.json({ error: "Acne type is required" }, { status: 400 })
    }

    let treatmentPlan = null
    let geminiError = null

    try {
      treatmentPlan = await generateTreatmentWithGemini(acneType, skinType, mode)
      console.log(`Gemini ${mode} treatment plan generated successfully`)
    } catch (error) {
      console.error(`Error with Gemini ${mode} treatment generation:`, error)
      geminiError = error instanceof Error ? error.message : String(error)
    }

    if (!treatmentPlan) {
      console.log(`Using fallback ${mode} treatment plan`)
      treatmentPlan = getFallbackTreatmentPlan(acneType, mode)
    }

    return NextResponse.json({
      ...treatmentPlan,
      geminiError,
    })
  } catch (error) {
    console.error("Error generating treatment plan:", error)
    return NextResponse.json(
      {
        ...getFallbackTreatmentPlan("General", "daily"),
        error: "Failed to generate treatment plan",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 200 },
    )
  }
}

// Generate treatment plan using Google Gemini
async function generateTreatmentWithGemini(acneType: string, skinType = "Normal", mode = "daily") {
  const genAI = new GoogleGenerativeAI("AIzaSyAOJHyDrUUnAmRyB4wJDdUm3PQ7v3f6RWI")
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

  let prompt = ""

  if (mode === "daily") {
    prompt = `Make a 6-day treatment plan for someone with ${acneType} acne and ${skinType} skin type. Use only general, easily available skincare products and some homeopathic remedies. Recommend simple serums (e.g., with niacinamide, salicylic acid, AHA/BHA, etc.) and avoid anything with known side effects. Make sure the plan is gentle and can be safely followed by anyone. Break down the plan day by day.

Format your response exactly like this, with each day's treatment on a new line:
Day 1: [treatment for day 1]
Day 2: [treatment for day 2]
Day 3: [treatment for day 3]
Day 4: [treatment for day 4]
Day 5: [treatment for day 5]
Day 6: [treatment for day 6]`
  } else {
    prompt = `Make a 4-week treatment plan for someone with ${acneType} acne and ${skinType} skin type. Use only general, easily available skincare products and some homeopathic remedies. Recommend simple serums (e.g., with niacinamide, salicylic acid, AHA/BHA, etc.) and avoid anything with known side effects. Make sure the plan is gentle and can be safely followed by anyone. Break down the plan week by week.

Format your response exactly like this, with each week's treatment on a new line:
Week 1: [treatment for week 1]
Week 2: [treatment for week 2]
Week 3: [treatment for week 3]
Week 4: [treatment for week 4]`
  }

  const generatePromise = model.generateContent(prompt)

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Gemini API generation timeout")), 15000),
  )

  const result = await Promise.race([generatePromise, timeoutPromise])

  if (typeof result !== "object" || !("response" in result) || typeof result.response.text !== "function") {
    throw new Error("Unexpected Gemini response format")
  }

  const text = await result.response.text()

  if (mode === "daily") {
    const treatmentPlan = parseDailyTreatmentPlan(text)
    if (!treatmentPlan) throw new Error("Failed to parse daily treatment plan from Gemini response")
    return treatmentPlan
  } else {
    const treatmentPlan = parseWeeklyTreatmentPlan(text)
    if (!treatmentPlan) throw new Error("Failed to parse weekly treatment plan from Gemini response")
    return treatmentPlan
  }
}

// Parse the Gemini response into a usable daily treatment object
function parseDailyTreatmentPlan(text: string) {
  try {
    const dayRegex = /Day (\d+): (.*?)(?=Day \d+:|$)/gs
    const matches = [...text.matchAll(dayRegex)]

    const plan: Record<string, string> = {
      day1: "",
      day2: "",
      day3: "",
      day4: "",
      day5: "",
      day6: "",
    }

    matches.forEach((match) => {
      const day = Number.parseInt(match[1])
      const treatment = match[2].trim()
      if (day >= 1 && day <= 6) {
        plan[`day${day}`] = treatment
      }
    })

    if (plan.day1) return plan

    // Fallback parsing if regex fails
    const lines = text.split("\n")
    let currentDay = 0

    for (const line of lines) {
      const trimmed = line.trim()
      const match = trimmed.match(/^Day (\d+):(.*)/)
      if (match) {
        currentDay = Number.parseInt(match[1])
        if (currentDay >= 1 && currentDay <= 6) {
          plan[`day${currentDay}`] = match[2].trim()
        }
      } else if (currentDay && trimmed) {
        plan[`day${currentDay}`] += " " + trimmed
      }
    }

    return plan.day1 ? plan : null
  } catch (error) {
    console.error("Error parsing daily treatment plan:", error)
    return null
  }
}

// Parse the Gemini response into a usable weekly treatment object
function parseWeeklyTreatmentPlan(text: string) {
  try {
    const weekRegex = /Week (\d+): (.*?)(?=Week \d+:|$)/gs
    const matches = [...text.matchAll(weekRegex)]

    const plan: Record<string, string> = {
      week1: "",
      week2: "",
      week3: "",
      week4: "",
    }

    matches.forEach((match) => {
      const week = Number.parseInt(match[1])
      const treatment = match[2].trim()
      if (week >= 1 && week <= 4) {
        plan[`week${week}`] = treatment
      }
    })

    if (plan.week1) return plan

    // Fallback parsing if regex fails
    const lines = text.split("\n")
    let currentWeek = 0

    for (const line of lines) {
      const trimmed = line.trim()
      const match = trimmed.match(/^Week (\d+):(.*)/)
      if (match) {
        currentWeek = Number.parseInt(match[1])
        if (currentWeek >= 1 && currentWeek <= 4) {
          plan[`week${currentWeek}`] = match[2].trim()
        }
      } else if (currentWeek && trimmed) {
        plan[`week${currentWeek}`] += " " + trimmed
      }
    }

    return plan.week1 ? plan : null
  } catch (error) {
    console.error("Error parsing weekly treatment plan:", error)
    return null
  }
}

// Static fallback plan for different acne types
function getFallbackTreatmentPlan(acneType: string, mode = "daily") {
  if (mode === "daily") {
    const defaultPlans: Record<string, Record<string, string>> = {
      Papules: {
        day1: "Gentle cleansing with salicylic acid face wash. Benzoyl peroxide spot treatment. Oil-free moisturizer.",
        day2: "Niacinamide serum in morning. Sunscreen. Adapalene gel at night if prescribed.",
        day3: "Tea tree oil (diluted) in morning. Clay mask in evening.",
        day4: "Moisturizer with ceramides in morning. BHA exfoliant in evening.",
        day5: "Azelaic acid in morning. Retinol at night if tolerated.",
        day6: "Soothing mask with aloe vera or centella asiatica in evening.",
      },
      Blackhead: {
        day1: "Salicylic acid cleanser. BHA toner. Clay mask at night.",
        day2: "Niacinamide serum in morning. Retinol in evening.",
        day3: "Vitamin C serum in morning. BHA in evening.",
        day4: "Gentle cleanser. Use pore strip or extraction tool at night.",
        day5: "Mattifying primer. Glycolic acid exfoliant in evening.",
        day6: "Non-comedogenic moisturizer. Benzoyl peroxide at night.",
      },
      Whitehead: {
        day1: "BHA serum in morning. Retinoid cream at night.",
        day2: "Salicylic acid cleanser. Niacinamide. Benzoyl peroxide at night.",
        day3: "Azelaic acid in morning. AHA exfoliant in evening.",
        day4: "Moisturizer in morning. Sulfur-based treatment at night.",
        day5: "Tea tree oil in morning. Clay mask in evening.",
        day6: "Non-comedogenic moisturizer in morning. Adapalene gel at night.",
      },
      Cystic: {
        day1: "Ice compress in morning. Benzoyl peroxide at night.",
        day2: "Niacinamide in morning. Warm compress + salicylic acid at night.",
        day3: "Green tea extract in morning. Azelaic acid in evening.",
        day4: "Aloe vera in morning. Sulfur clay mask at night.",
        day5: "Zinc-based serum in morning. Adapalene if prescribed.",
        day6: "Centella asiatica in morning. Hydrocolloid patch at night.",
      },
      General: {
        day1: "Hydrating toner. Oil-free moisturizer. Salicylic acid spot treatment at night.",
        day2: "Niacinamide serum. Benzoyl peroxide in evening.",
        day3: "Vitamin C in morning. Clay mask at night.",
        day4: "Hydrating serum. BHA exfoliant in evening.",
        day5: "Azelaic acid in morning. Retinol at night.",
        day6: "Centella asiatica in morning. Overnight hydrating mask.",
      },
    }

    for (const [key, plan] of Object.entries(defaultPlans)) {
      if (acneType.toLowerCase().includes(key.toLowerCase())) {
        return plan
      }
    }

    return defaultPlans.General
  } else {
    // Weekly fallback plans
    const defaultWeeklyPlans: Record<string, Record<string, string>> = {
      Papules: {
        week1:
          "Focus on gentle cleansing with salicylic acid face wash twice daily. Apply benzoyl peroxide spot treatment on affected areas. Use a light, oil-free moisturizer. Avoid picking or squeezing papules.",
        week2:
          "Continue with the cleansing routine. Add niacinamide serum in the morning to reduce inflammation. Use a clay mask twice this week. Start using adapalene gel at night if prescribed by a dermatologist.",
        week3:
          "Maintain the cleansing and treatment routine. Add gentle exfoliation with BHA once or twice this week. Continue with niacinamide in the morning and adapalene at night. Use hydrating sheet masks to prevent dryness.",
        week4:
          "Continue with the established routine. If improvement is seen, maintain the regimen. If not, consider adding azelaic acid in the morning. Use soothing ingredients like centella asiatica or aloe vera to calm any irritation.",
      },
      Blackhead: {
        week1:
          "Use a salicylic acid cleanser twice daily. Apply a BHA toner to help dissolve oil in pores. Use a clay mask twice this week to draw out impurities. Avoid heavy, comedogenic products.",
        week2:
          "Continue with the salicylic acid cleanser. Add niacinamide serum to regulate oil production. Use a gentle retinol product 2-3 times this week to promote cell turnover. Apply a charcoal mask once.",
        week3:
          "Maintain cleansing routine. Add a vitamin C serum in the morning for antioxidant protection. Continue with retinol at night. Use a pore strip or gentle extraction tool after steaming face once this week.",
        week4:
          "Continue with the established routine. Add a glycolic acid treatment 1-2 times this week to exfoliate skin surface. Use a mattifying primer if needed for oil control. Assess progress and adjust as needed.",
      },
      Cystic: {
        week1:
          "Use a gentle, non-foaming cleanser twice daily. Apply ice compresses to reduce inflammation. Start with a low concentration benzoyl peroxide treatment at night. Use a light, non-comedogenic moisturizer.",
        week2:
          "Continue gentle cleansing. Add niacinamide serum in the morning. Apply warm compresses before treatment. Use salicylic acid spot treatment. Consider hydrocolloid patches for individual cysts.",
        week3:
          "Maintain cleansing routine. Add azelaic acid to reduce inflammation and bacteria. Continue with spot treatments. Use a sulfur-based mask once this week. Ensure adequate hydration with a ceramide moisturizer.",
        week4:
          "Continue with established routine. If prescribed, use adapalene gel at night. Add a zinc-based serum to reduce inflammation. Use centella asiatica products to promote healing. Assess if dermatologist consultation is needed.",
      },
      General: {
        week1:
          "Start with a gentle cleanser twice daily. Use a hydrating toner. Apply a light, oil-free moisturizer. Use salicylic acid spot treatment for any breakouts. Wear sunscreen during the day.",
        week2:
          "Continue cleansing routine. Add niacinamide serum in the morning. Use benzoyl peroxide spot treatment at night. Apply a clay mask twice this week. Maintain sun protection.",
        week3:
          "Maintain cleansing routine. Add vitamin C serum in the morning. Begin gentle exfoliation with BHA 2-3 times this week. Use a hydrating mask once. Continue spot treatments as needed.",
        week4:
          "Continue established routine. Add azelaic acid in the morning if needed. Consider introducing retinol at night (start with 1-2 times per week). Use soothing ingredients like aloe vera or centella asiatica as needed.",
      },
    }

    for (const [key, plan] of Object.entries(defaultWeeklyPlans)) {
      if (acneType.toLowerCase().includes(key.toLowerCase())) {
        return plan
      }
    }

    return defaultWeeklyPlans.General
  }
}
