/* app/api/predict-acne/route.ts ------------------------------------------ */
import { NextResponse } from "next/server";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";

/* run on the Node runtime and skip static generation */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ───────────────────────── helpers ───────────────────────── */
const TIMEOUT = (env: string, def = 40_000) =>
  Number(process.env[env]) || def;

async function withTimeout<T>(
  ms: number,
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const ctrl = new AbortController();
  const id   = setTimeout(() => ctrl.abort(), ms);
  try { return await fn(ctrl.signal); }
  finally { clearTimeout(id); }
}

/* lazy-load sharp only when the route executes */
async function prepareImage(dataUri: string): Promise<{ file: File; dataUri: string }> {
  const sharp = (await import("sharp")).default;
  const buf = Buffer.from(dataUri.replace(/^data:.*?;base64,/, ""), "base64");

  const resized = await sharp(buf)
    .resize({ width: 640, height: 640, fit: "inside" })
    .jpeg({ quality: 80 })
    .toBuffer();

  const b64  = resized.toString("base64");
  const out  = `data:image/jpeg;base64,${b64}`;
  const file = new File([resized], "image.jpg", { type: "image/jpeg" });
  return { file, dataUri: out };
}

/* ───────────────────────── route handler ───────────────────────── */
export async function POST(req: Request) {
  try {
    const { imageData } = await req.json();
    if (!imageData)
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });

    /* shrink once, reuse everywhere */
    const { file, dataUri } = await prepareImage(imageData);

    const [rf, a8m, gmn, asgm] = await Promise.allSettled([
      getPredictionFromRoboflow(dataUri),
      callAcne8m(file),
      getPredictionFromGemini(file),
      callASGM(file),
    ]);

    const typeRF  = rf .status === "fulfilled" ? rf .value : "Unknown";
    const typeA8M = a8m.status === "fulfilled" ? a8m.value : "Unknown";
    const typeGMN = gmn.status === "fulfilled" ? gmn.value : "Unknown";
    const sevNum  = asgm.status === "fulfilled" ? asgm.value : 0;

    const geminiTimedOut =
      gmn.status === "rejected" && /timeout/i.test(gmn.reason?.message ?? "");

    const noAcne =
      typeGMN.toLowerCase().includes("no acne") ||
      (geminiTimedOut && typeA8M === "Unknown") ||
      (typeRF === "Unknown" && typeA8M === "Unknown" && typeGMN === "Unknown");

    if (noAcne)
      return NextResponse.json({ error: "NO_ACNE" }, { status: 422 });

    /* consensus / priority */
    let final = "Acne";
    const agree = (a: string, b: string) => a === b && a !== "Unknown";

    if (agree(typeRF, typeA8M))        final = typeRF;
    else if (agree(typeRF, typeGMN))   final = typeRF;
    else if (agree(typeA8M, typeGMN))  final = typeA8M;
    else if (!geminiTimedOut && typeGMN !== "Unknown") final = typeGMN;
    else if (typeA8M !== "Unknown")                    final = typeA8M;
    else if (typeRF  !== "Unknown")                    final = typeRF;

    return NextResponse.json({
      prediction         : fmt(final),
      severity           : severityLabel(sevNum),
      severityNum        : sevNum,
      roboflowPrediction : fmt(typeRF),
      acne8mPrediction   : fmt(typeA8M),
      geminiPrediction   : fmt(typeGMN),
      apiErrors: {
        roboflow : rf .status === "rejected" ? rf .reason?.message  : null,
        acne8m   : a8m.status === "rejected" ? a8m.reason?.message : null,
        gemini   : gmn.status === "rejected" ? gmn.reason?.message : null,
        asgm     : asgm.status === "rejected" ? asgm.reason?.message: null,
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

/* ───────────────────────── model wrappers ───────────────────────── */
async function callAcne8m(file: File): Promise<string> {
  return withTimeout(TIMEOUT("ACNE8M_TIMEOUT_MS"), async (signal) => {
    const form = new FormData();
    form.append("image", file);
    const res = await fetch("https://acne10.aiotlab.io.vn/upload_image",
      { method: "POST", body: form, signal });
    if (!res.ok) throw new Error(`Acne-8M HTTP ${res.status}`);

    const { bounding_boxes } = await res.json() as {
      bounding_boxes: { class_id: string; percentage_conf: string }[];
    };
    if (!bounding_boxes?.length) return "Unknown";
    return bounding_boxes.sort(
      (a, b) => Number(b.percentage_conf) - Number(a.percentage_conf),
    )[0]?.class_id ?? "Unknown";
  });
}

async function callASGM(file: File): Promise<number> {
  return withTimeout(TIMEOUT("ASGM_TIMEOUT_MS"), async (signal) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(
      "https://designarshaq-asgm-api.hf.space/predict",
      { method: "POST", body: form, signal },
    );
    if (!res.ok) throw new Error(`ASGM HTTP ${res.status}`);
    const { predicted_grade } = await res.json() as { predicted_grade: number };
    return predicted_grade;
  });
}

async function getPredictionFromRoboflow(dataUri: string): Promise<string> {
  return withTimeout(TIMEOUT("ROBOFLOW_TIMEOUT_MS"), async (signal) => {
    const url =
      "https://serverless.roboflow.com/acne-detection-g5vvz/1?api_key=szLKaXVpFdMfJ8CE5sR8";
    const res = await fetch(url, {
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

  const uploaded = await withTimeout(
    TIMEOUT("GEMINI_UPLOAD_TIMEOUT_MS", 30_000),
    () => ai.files.upload({ file, config: { mimeType: "image/jpeg" } })
  );

  const prompt = `You are an acne-classification expert.
TASK: Return ONE WORD ONLY – the acne type that best matches the face in this image.
VALID TYPES: Blackhead, Conglobata, Crystalline, Cystic, Flat_wart, Folliculitis,
             Keloid, Milium, Papular, Purulent, Scars, Sebo-crystan-conglo,
             Syringoma, Whitehead
If you detect NO visible acne, or the picture is not a human face, reply exactly: no acne`;

  const resp = await withTimeout(
    TIMEOUT("GEMINI_GEN_TIMEOUT_MS", 30_000),
    () => ai.models.generateContent({
      model   : "gemini-1.5-flash",
      contents: createUserContent([createPartFromUri(uploaded.uri!, uploaded.mimeType!), prompt]),
    })
  );

  return resp.text?.trim() || "Unknown";
}

/* ───────────────────────── utilities ───────────────────────── */
const severityLabel = (n: number) =>
  ["Clear / Normal", "Mild", "Moderate", "Severe"][n] ?? "Unknown";

const fmt = (s: string) =>
  s
    ? s
        .split(/[_\s]+/)
        .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
    : "Acne";