import { NextResponse } from "next/server"
import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai"

export async function POST(request: Request) {
  try {
    const { imageData } = await request.json()

    if (!imageData) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 })
    }

    // Convert base64 to File object for the new APIs
    const base64Data = imageData.split(",")[1] || imageData
    const binaryData = Buffer.from(base64Data, "base64")
    const blob = new Blob([binaryData], { type: "image/jpeg" })
    const file = new File([blob], "image.jpg", { type: "image/jpeg" })

    // Call all four APIs in parallel
    const [roboflowResult, acne8mResult, geminiResult, asgmResult] = await Promise.allSettled([
      getPredictionFromRoboflow(imageData),
      callAcne8m(file),
      getPredictionFromGemini(imageData),
      callASGM(file),
    ])

    // Extract results or set defaults for failed calls
    const typeRF = roboflowResult.status === "fulfilled" ? roboflowResult.value : "Unknown"
    const typeA8M = acne8mResult.status === "fulfilled" ? acne8mResult.value : "Unknown"
    const typeGMN = geminiResult.status === "fulfilled" ? geminiResult.value : "Unknown"
    const severityNum = asgmResult.status === "fulfilled" ? asgmResult.value : 0

    console.log("API Results:", { typeRF, typeA8M, typeGMN, severityNum })

    // Check if Gemini detected no acne
    if (typeGMN.toLowerCase().includes("no acne")) {
      return NextResponse.json({ error: "NO_ACNE" }, { status: 422 })
    }

    // NEW LOGIC: If all models return Unknown, treat as no acne detected
    if (typeRF === "Unknown" && typeA8M === "Unknown" && typeGMN === "Unknown") {
      return NextResponse.json({ error: "NO_ACNE" }, { status: 422 })
    }

    // Determine final acne type
    let finalType: string
    if (typeRF === typeA8M && typeA8M === typeGMN && typeGMN !== "Unknown") {
      // All three match and are not Unknown
      finalType = typeGMN
    } else {
      // Give priority to Gemini if it's not Unknown, otherwise use first non-Unknown result
      if (typeGMN !== "Unknown") {
        finalType = typeGMN
      } else if (typeRF !== "Unknown") {
        finalType = typeRF
      } else if (typeA8M !== "Unknown") {
        finalType = typeA8M
      } else {
        finalType = "Acne" // Fallback
      }
    }

    // Convert severity number to label
    const severityLabel = getSeverityLabel(severityNum)

    return NextResponse.json({
      prediction: formatPrediction(finalType),
      severity: severityLabel,
      severityNum: severityNum,
      roboflowPrediction: formatPrediction(typeRF),
      acne8mPrediction: formatPrediction(typeA8M),
      geminiPrediction: formatPrediction(typeGMN),
      apiErrors: {
        roboflow: roboflowResult.status === "rejected" ? roboflowResult.reason?.message : null,
        acne8m: acne8mResult.status === "rejected" ? acne8mResult.reason?.message : null,
        gemini: geminiResult.status === "rejected" ? geminiResult.reason?.message : null,
        asgm: asgmResult.status === "rejected" ? asgmResult.reason?.message : null,
      },
    })
  } catch (error) {
    console.error("Error predicting acne type:", error)
    return NextResponse.json(
      {
        error: "Failed to predict acne type",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// New Acne-8M API call
async function callAcne8m(file: File): Promise<string> {
  const form = new FormData()
  form.append("image", file)

  const res = await fetch("https://acne10.aiotlab.io.vn/upload_image", {
    method: "POST",
    body: form,
  })

  if (!res.ok) throw new Error("Acne-8M error " + res.status)

  const { bounding_boxes } = (await res.json()) as {
    bounding_boxes: { class_id: string; percentage_conf: string }[]
  }

  if (!bounding_boxes || bounding_boxes.length === 0) {
    return "Unknown"
  }

  const top = bounding_boxes.sort((a, b) => Number(b.percentage_conf) - Number(a.percentage_conf))[0]
  return top?.class_id ?? "Unknown"
}

// New ASGM API call - Updated with correct field name and response format
async function callASGM(file: File): Promise<number> {
  const form = new FormData()
  form.append("file", file) // Field name MUST be 'file'

  const res = await fetch("https://designarshaq-asgm-api.hf.space/predict", {
    method: "POST",
    body: form,
  })

  if (!res.ok) throw new Error(`ASGM HTTP ${res.status}`)

  const json = (await res.json()) as { predicted_grade: number }
  return json.predicted_grade // 0-3
}

// Convert severity number to label
function getSeverityLabel(n: number): string {
  const labels = ["Clear / Normal", "Mild", "Moderate", "Severe"]
  return labels[n] ?? "Unknown"
}

// Function to get prediction from Roboflow (unchanged)
async function getPredictionFromRoboflow(imageData: string): Promise<string> {
  try {
    const apiUrl = "https://serverless.roboflow.com/acne-detection-g5vvz/1"
    const apiKey = "szLKaXVpFdMfJ8CE5sR8"

    const response = await fetch(`${apiUrl}?api_key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: imageData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Roboflow API error:", errorText)
      return "Acne"
    }

    const data = await response.json()
    console.log("Roboflow API response:", data)

    let result = "Acne"

    if (data.predicted_classes && Array.isArray(data.predicted_classes) && data.predicted_classes.length > 0) {
      result = data.predicted_classes[0]
    } else if (data.predictions && Array.isArray(data.predictions) && data.predictions.length > 0) {
      const sortedPredictions = [...data.predictions].sort((a, b) => b.confidence - a.confidence)
      result = sortedPredictions[0].class
    }

    return result
  } catch (error) {
    console.error("Error with Roboflow prediction:", error)
    return "Acne"
  }
}

// Function to get prediction from Google Gemini (fixed timeout issues)
async function getPredictionFromGemini(imageData: string): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: "AIzaSyAOJHyDrUUnAmRyB4wJDdUm3PQ7v3f6RWI" })

    const base64Data = imageData.split(",")[1] || imageData
    const binaryData = Buffer.from(base64Data, "base64")
    const blob = new Blob([binaryData], { type: "image/jpeg" })
    const file = new File([blob], "image.jpg", { type: "image/jpeg" })

    // Increased timeout for upload
    const uploadPromise = ai.files.upload({
      file,
      config: { mimeType: "image/jpeg" },
    })

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Gemini API upload timeout")), 20000) // Increased to 20 seconds
    })

    const myfile = (await Promise.race([uploadPromise, timeoutPromise])) as any

    // Updated prompt for better classification
    const prompt = `You are an acne-classification expert.
TASK: Return ONE WORD ONLY – the acne type that best matches the face in this image.
VALID TYPES: Blackhead, Conglobata, Crystalline, Cystic, Flat_wart, Folliculitis,
             Keloid, Milium, Papular, Purulent, Scars, Sebo-crystan-conglo,
             Syringoma, Whitehead
If you detect NO visible acne, or the picture is not a human face, reply exactly: no acne`.trim()

    const generatePromise = ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: createUserContent([createPartFromUri(myfile.uri, myfile.mimeType), prompt]),
    })

    // Increased timeout for generation
    const generateTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Gemini API generation timeout")), 25000) // Increased to 25 seconds
    })

    const response = (await Promise.race([generatePromise, generateTimeoutPromise])) as any

    const prediction = response.text.trim()
    return prediction
  } catch (error) {
    console.error("Error with Gemini prediction:", error)
    throw error
  }
}

// Function to format the prediction (unchanged)
function formatPrediction(prediction: string): string {
  if (!prediction) return "Acne"

  return prediction
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}
