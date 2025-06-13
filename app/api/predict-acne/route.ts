/* /app/api/predict-acne/route.ts */
import { NextResponse } from "next/server";
import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";
import sharp from "sharp";

// ─────────────────────────────────────────────────────────────────────────────
// ensure Node runtime so global File exists even on older platforms
export const runtime = "nodejs";

// handy helpers ──────────────────────────────────────────────────────────────
const TIMEOUT = (env: string, def = 40000) =>
  Number(process.env[env]) || def;

/** Run an async fn with AbortController timeout. */
async function withTimeout<T>(
  ms: number,
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(id);
  }
}

/** Resize & re-encode → returns {file, dataUri} */
async function prepareImage(dataURI: string): Promise<{ file: File; dataUri: string }> {
  const buf = Buffer.from(dataURI.replace(/^data:.*?;base64,/, ""), "base64");
  const resized = await sharp(buf)
    .resize({ width: 640, height: 640, fit: "inside" })
    .jpeg({ quality: 80 })
    .toBuffer();

  const b64 = resized.toString("base64");
  const dataUri = `data:image/jpeg;base64,${b64}`;
  const file = new File([resized], "image.jpg", { type: "image/jpeg" });
  return { file, dataUri };
}

// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { imageData } = await request.json();
    if (!imageData) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    // shrink once – reuse everywhere
    const { file, dataUri } = await prepareImage(imageData);

    // run four models in parallel
    const [rf, a8m, gmn, asgm] = await Promise.allSettled([
      getPredictionFromRoboflow(dataUri),
      callAcne8m(file),
      getPredictionFromGemini(file),
      callASGM(file),
    ]);

    const typeRF  = rf  .status === "fulfilled" ? rf .value : "Unknown";
    const typeA8M = a8m .status === "fulfilled" ? a8m.value : "Unknown";
    const typeGMN = gmn .status === "fulfilled" ? gmn.value : "Unknown";
    const sevNum  = asgm.status === "fulfilled" ? asgm.value : 0;

    console.log("API results →", { typeRF, typeA8M, typeGMN, sevNum });

    // ── no-acne heuristics ──────────────────────────────────────────────────
    const geminiTimedOut =
      gmn.status === "rejected" &&
      /timeout/i.test(gmn.reason?.message ?? "");

    const noAcneDetected =
      typeGMN.toLowerCase().includes("no acne") ||
      (geminiTimedOut && typeA8M === "Unknown") ||
      (typeRF === "Unknown" && typeA8M === "Unknown" && typeGMN === "Unknown");

    if (noAcneDetected) {
      return NextResponse.json({ error: "NO_ACNE" }, { status: 422 });
    }

    // ── majority / priority decision ───────────────────────────────────────
    let final = "Acne";                       // default fallback

    const agreeTwo = (a: string, b: string) =>
      a === b && a !== "Unknown";

    if (agreeTwo(typeRF, typeA8M))       final = typeRF;
    else if (agreeTwo(typeRF, typeGMN))  final = typeRF;
    else if (agreeTwo(typeA8M, typeGMN)) final = typeA8M;
    else if (!geminiTimedOut && typeGMN !== "Unknown") final = typeGMN;
    else if (typeA8M !== "Unknown")                   final = typeA8M;
    else if (typeRF  !== "Unknown")                   final = typeRF;

    const severityLabel = getSeverityLabel(sevNum);

    return NextResponse.json({
      prediction          : formatPrediction(final),
      severity            : severityLabel,
      severityNum         : sevNum,
      roboflowPrediction  : formatPrediction(typeRF),
      acne8mPrediction    : formatPrediction(typeA8M),
      geminiPrediction    : formatPrediction(typeGMN),
      apiErrors: {
        roboflow : rf  .status === "rejected" ? rf .reason?.message : null,
        acne8m   : a8m .status === "rejected" ? a8m.reason?.message : null,
        gemini   : gmn .status === "rejected" ? gmn.reason?.message : null,
        asgm     : asgm.status === "rejected" ? asgm.reason?.message : null,
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

// ── MODEL WRAPPERS ──────────────────────────────────────────────────────────
async function callAcne8m(file: File): Promise<string> {
  return withTimeout(TIMEOUT("ACNE8M_TIMEOUT_MS"), async (signal) => {
    const form = new FormData();
    form.append("image", file);

    const res = await fetch("https://acne10.aiotlab.io.vn/upload_image", {
      method: "POST",
      body  : form,
      signal,
    });
    if (!res.ok) throw new Error(`Acne-8M HTTP ${res.status}`);

    const { bounding_boxes } = (await res.json()) as {
      bounding_boxes: { class_id: string; percentage_conf: string }[];
    };

    if (!bounding_boxes?.length) return "Unknown";
    const top = bounding_boxes.sort(
      (a, b) => Number(b.percentage_conf) - Number(a.percentage_conf),
    )[0];
    return top?.class_id ?? "Unknown";
  });
}

async function callASGM(file: File): Promise<number> {
  return withTimeout(TIMEOUT("ASGM_TIMEOUT_MS"), async (signal) => {
    const form = new FormData();
    form.append("file", file); // field must be 'file'
    const res = await fetch(
      "https://designarshaq-asgm-api.hf.space/predict",
      { method: "POST", body: form, signal },
    );
    if (!res.ok) throw new Error(`ASGM HTTP ${res.status}`);
    const { predicted_grade } = (await res.json()) as { predicted_grade: number };
    return predicted_grade;
  });
}

async function getPredictionFromRoboflow(dataUri: string): Promise<string> {
  return withTimeout(TIMEOUT("ROBOFLOW_TIMEOUT_MS"), async (signal) => {
    const apiUrl = "https://serverless.roboflow.com/acne-detection-g5vvz/1?api_key=szLKaXVpFdMfJ8CE5sR8";
    const res = await fetch(apiUrl, {
      method : "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body   : dataUri,
      signal,
    });
    if (!res.ok) throw new Error(`Roboflow HTTP ${res.status}`);

    const data = await res.json();
    if (Array.isArray(data.predicted_classes) && data.predicted_classes.length)
      return data.predicted_classes[0];

    if (Array.isArray(data.predictions) && data.predictions.length)
      return [...data.predictions].sort((a, b) => b.confidence - a.confidence)[0].class;

    return "Unknown";
  });
}

async function getPredictionFromGemini(file: File): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  // upload (with timeout)
  const myfile = await withTimeout(TIMEOUT("GEMINI_UPLOAD_TIMEOUT_MS", 30000), async () =>
    ai.files.upload({ file, config: { mimeType: "image/jpeg" } }),
  );

  // generate (with timeout)
  const prompt = `You are an acne-classification expert.
TASK: Return ONE WORD ONLY – the acne type that best matches the face in this image.
VALID TYPES: Blackhead, Conglobata, Crystalline, Cystic, Flat_wart, Folliculitis,
             Keloid, Milium, Papular, Purulent, Scars, Sebo-crystan-conglo,
             Syringoma, Whitehead
If you detect NO visible acne, or the picture is not a human face, reply exactly: no acne`;

  const resp = await withTimeout(TIMEOUT("GEMINI_GEN_TIMEOUT_MS", 30000), async () =>
    ai.models.generateContent({
      model   : "gemini-1.5-flash",
      contents: createUserContent([createPartFromUri(myfile.uri!, myfile.mimeType!), prompt]),
    }),
  );

  return resp.text?.trim() || "Unknown";
}

// ── utility fns ─────────────────────────────────────────────────────────────
function getSeverityLabel(n: number): string {
  return ["Clear / Normal", "Mild", "Moderate", "Severe"][n] ?? "Unknown";
}
function formatPrediction(p: string) {
  return p
    ? p
        .split(/[_\s]+/)
        .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
    : "Acne";
}
