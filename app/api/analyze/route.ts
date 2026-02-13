import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// INCREASE LIMIT FOR 8K IMAGES
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '40mb',
    },
  },
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { image, settings } = await req.json();
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    
    // USE GEMINI 1.5 PRO (Strongest Logic)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      generationConfig: { responseMimeType: "application/json" }
    });

    // RESOLUTION LOGIC
    const resolutionPrompt = settings.resolution === "8K" 
      ? "EXTREME DETAIL: 8k, UHD, highly detailed, sharp focus, ray tracing, unreal engine 5 render, best quality."
      : "HIGH QUALITY: 4k, photorealistic, balanced lighting, commercial quality.";

    const prompt = `
      ROLE: ELITE STOCK PHOTOGRAPHY CURATOR & PROMPT ENGINEER.
      
      USER SETTINGS:
      - Platform: ${settings.platform}
      - Title Length: ${settings.titleMin}-${settings.titleMax} chars.
      - Keyword Count: ${settings.keywordMin}-${settings.keywordMax} tags.
      - Upscale Target: ${settings.resolution} (${resolutionPrompt})

      TASK 1: METADATA (SEO OPTIMIZED)
      - Title: Punchy, descriptive, commercial.
      - Keywords: Ranked by search volume.
      - Description: Full sentences including variations of the subject.

      TASK 2: TECHNICAL FORENSICS
      - Analyze for: Noise, Compression, AI Artifacts.
      - Score: 0-100 (Commercial Standard).

      TASK 3: UPSCALE/GENERATION PROMPT
      - Write a prompt specifically for "MagnificAI" or "Midjourney" to upscale this image.
      - MUST INCLUDE: "${resolutionPrompt}"
      
      RETURN JSON:
      {
        "meta": {
          "title": "string",
          "description": "string",
          "keywords": [{ "tag": "string" }],
          "category": "number"
        },
        "technical": {
          "quality_score": number,
          "notes": "string"
        },
        "prompts": {
          "upscale_prompt": "string",
          "midjourney": "string"
        }
      }
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
    ]);

    return NextResponse.json(JSON.parse(result.response.text()));
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Analysis Failed" }, { status: 500 });
  }
}
