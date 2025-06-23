/* --------------------------------------------------------------------------
   /app/api/predict/route.ts
   Next.js (App Router) server action – runs on Node
--------------------------------------------------------------------------- */
import { NextResponse } from "next/server";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";

/* run only on server + disable prerender */
export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";
export async function POST(request: Request) {
  try {
    const { imageData } = await request.json();
    if (!imageData)
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });

    /* base-64 → File ------------------------------------------------------ */
    const base64Data = imageData.split(",")[1] || imageData;
    const binaryData = Buffer.from(base64Data, "base64");
    const blob       = new Blob([binaryData], { type: "image/jpeg" });
    const file       = new File([blob], "image.jpg", { type: "image/jpeg" });

    /* call 4 APIs in parallel -------------------------------------------- */
    const [roboflowResult, acne9mResult, geminiResult, asgmResult] =
      await Promise.allSettled([
        getPredictionFromRoboflow(imageData),
        callAcne9m(file),                       // 🔄 NEW
        getPredictionFromGemini(imageData),
        callASGM(file),
      ]);

    const typeRF   = roboflowResult.status === "fulfilled" ? roboflowResult.value : "Unknown";
    const typeA9M  = acne9mResult .status === "fulfilled" ? acne9mResult .value : "Unknown";
    const typeGMN  = geminiResult .status === "fulfilled" ? geminiResult .value : "Unknown";
    const severityNum = asgmResult.status === "fulfilled" ? asgmResult.value  : 0;

    console.log("API results:", { typeRF, typeA9M, typeGMN, severityNum });

    /* heuristics ‒ detect “no acne” scenarios ----------------------------- */
    const geminiTimedOut =
      geminiResult.status === "rejected" &&
      /(timeout|Timeout)/i.test((geminiResult.reason as Error)?.message ?? "");

    if (
      typeGMN.toLowerCase().includes("no acne") ||
      (geminiTimedOut && typeA9M === "Unknown") ||
      (typeRF === "Unknown" && typeA9M === "Unknown" && typeGMN === "Unknown")
    )
      return NextResponse.json({ error: "NO_ACNE" }, { status: 422 });

    /* majority / priority merge ------------------------------------------ */
    let finalType = "Acne";
    const agree = (a: string, b: string) => a === b && a !== "Unknown";

    if      (agree(typeRF,  typeA9M))                      finalType = typeRF;
    else if (agree(typeRF,  typeGMN))                      finalType = typeRF;
    else if (agree(typeA9M, typeGMN))                      finalType = typeA9M;
    else if (!geminiTimedOut && typeGMN !== "Unknown")     finalType = typeGMN;
    else if (typeA9M !== "Unknown")                        finalType = typeA9M;
    else if (typeRF  !== "Unknown")                        finalType = typeRF;

    /* respond ------------------------------------------------------------- */
    return NextResponse.json({
      prediction         : formatPrediction(finalType),
      severity           : getSeverityLabel(severityNum),
      severityNum        : severityNum,
      roboflowPrediction : formatPrediction(typeRF),
      acne9mPrediction   : formatPrediction(typeA9M),     // 🔄 new key
      geminiPrediction   : formatPrediction(typeGMN),
      apiErrors: {
        roboflow : roboflowResult.status === "rejected" ? (roboflowResult.reason as Error).message : null,
        acne9m   : acne9mResult .status === "rejected" ? (acne9mResult .reason as Error).message : null,
        gemini   : geminiResult .status === "rejected" ? (geminiResult .reason as Error).message : null,
        asgm     : asgmResult   .status === "rejected" ? (asgmResult   .reason as Error).message : null,
      },
    });
  } catch (err) {
    console.error("Fatal route error:", err);
    return NextResponse.json(
      { error: "Failed to predict acne type", details: String(err) },
      { status: 500 },
    );
  }
}

/* ───────────────── Acne-9M (Hugging Face Space) ──────────────────────── */
async function callAcne9m(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);                  // FastAPI expects 'file'

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 40_000);

  try {
    const res = await fetch(
      "https://designarshaq-acne9m.hf.space/predict",
      { method: "POST", body: form, signal: controller.signal },
    );
    clearTimeout(id);

    if (!res.ok) throw new Error(`Acne-9M HTTP ${res.status}`);

    const { label } = await res.json() as { label: string; confidence: number };
    return label || "Unknown";
  } catch (err: any) {
    if (err.name === "AbortError") console.log("Acne-9M timed out");
    throw err;
  }
}

/* ───────────────── ASGM severity grade (unchanged) ───────────────────── */
async function callASGM(file: File): Promise<number> {
  const form = new FormData();
  form.append("file", file);

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 40_000);

  try {
    const res = await fetch(
      "https://designarshaq-asgm-api.hf.space/predict",
      { method: "POST", body: form, signal: controller.signal },
    );
    clearTimeout(id);

    if (!res.ok) throw new Error(`ASGM HTTP ${res.status}`);
    const { predicted_grade } = await res.json() as { predicted_grade: number };
    return predicted_grade;
  } catch (err: any) {
    if (err.name === "AbortError") console.log("ASGM timed out");
    throw err;
  }
}

/* ───────────────── Roboflow (unchanged) ──────────────────────────────── */
async function getPredictionFromRoboflow(imageData: string): Promise<string> {
  try {
    const apiUrl = "https://serverless.roboflow.com/acne-detection-g5vvz/1";
    const apiKey = "szLKaXVpFdMfJ8CE5sR8";

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 40_000);

    const res = await fetch(`${apiUrl}?api_key=${apiKey}`, {
      method : "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body   : imageData,
      signal : controller.signal,
    });
    clearTimeout(id);

    if (!res.ok) {
      console.error("Roboflow error:", await res.text());
      return "Acne";
    }

    const data = await res.json();
    if (Array.isArray(data.predicted_classes) && data.predicted_classes.length)
      return data.predicted_classes[0];

    if (Array.isArray(data.predictions) && data.predictions.length)
      return [...data.predictions].sort((a, b) => b.confidence - a.confidence)[0].class;

    return "Unknown";
  } catch (err: any) {
    if (err.name === "AbortError") console.log("Roboflow timed out");
    console.error("Roboflow exception:", err);
    return "Acne";
  }
}

/* ───────────────── Gemini (unchanged) ────────────────────────────────── */
async function getPredictionFromGemini(imageData: string): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

    const base64 = imageData.split(",")[1] || imageData;
    const binary = Buffer.from(base64, "base64");
    const blob   = new Blob([binary], { type: "image/jpeg" });
    const file   = new File([blob], "image.jpg", { type: "image/jpeg" });

    /* upload */
    const upCtrl = new AbortController();
    const upId   = setTimeout(() => upCtrl.abort(), 40_000);

    const myfile = await ai.files.upload({
      file,
      config: { mimeType: "image/jpeg" },
    });
    clearTimeout(upId);

    /* prompt */
    const prompt = `You are an acne-classification expert.
TASK: Return ONE WORD ONLY – the acne type that best matches the face in this image.
VALID TYPES: Blackhead, Conglobata, Crystalline, Cystic, Flat_wart, Folliculitis,
             Keloid, Milium, Papular, Purulent, Scars, Sebo-crystan-conglo,
             Syringoma, Whitehead
If you detect NO visible acne, or the picture is not a human face, reply exactly: no acne`;

    const genCtrl = new AbortController();
    const genId   = setTimeout(() => genCtrl.abort(), 40_000);

    const resp = await ai.models.generateContent({
      model   : "gemini-1.5-flash",
      contents: createUserContent([
        createPartFromUri(myfile.uri!, myfile.mimeType!), prompt,
      ]),
    });
    clearTimeout(genId);

    return resp.text?.trim() ?? "Unknown";
  } catch (err: any) {
    if (err.name === "AbortError") console.log("Gemini timed out");
    throw err;
  }
}

/* ───────────────── Utilities ─────────────────────────────────────────── */
function getSeverityLabel(n: number) {
  const labels = ["Clear / Normal", "Mild", "Moderate", "Severe"];
  return labels[n] ?? "Unknown";
}

function formatPrediction(prediction: string) {
  return prediction
    ? prediction
        .split(/[_\s]+/)
        .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
    : "Acne";
}
