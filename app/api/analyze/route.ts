import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { image, customInstructions, safetyLevel } = await req.json();
    
    // 1. Image Pre-processing
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    
    // 2. Model Configuration
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", // Upgraded to 2.0 Flash for speed/cost
      generationConfig: { responseMimeType: "application/json" }
    });

    // 3. Dynamic Context Construction
    const USER_CONTEXT = customInstructions 
      ? `USER OVERRIDE INSTRUCTIONS: ${customInstructions}` 
      : "No custom user overrides.";

    const SAFETY_CONTEXT = safetyLevel === 'strict'
      ? "STRICT SAFETY: Reject any slightly NSFW, gory, or political content immediately."
      : "STANDARD SAFETY: Commercial stock photography standards.";

    const prompt = `
      ROLE: ELITE STOCK PHOTOGRAPHY FORENSIC EXPERT & SEO STRATEGIST.
      
      ${SAFETY_CONTEXT}
      ${USER_CONTEXT}

      STRICT ADOBE STOCK/SHUTTERSTOCK RULES:
      1. NO TRADEMARKS (Logos, Brands).
      2. NO FAMOUS PEOPLE or SPECIFIC ARTISTS.
      3. TITLES must be descriptive, under 70 chars.
      4. KEYWORDS: Exactly 49 tags. Sorted by relevance. English only.

      TASK 1: FORENSIC ANALYSIS
      - Analyze for: Noise, Artifacts, Chromatic Aberration, AI Hallucinations (hands/eyes).
      - Commercial Viability Score (0-100).

      TASK 2: METADATA GENERATION
      - Title: SEO optimized, punchy.
      - Keywords: Mix of broad and specific tags.

      TASK 3: GENERATIVE PROMPTS (8K)
      - Create prompts to RECREATE this image in Midjourney/Stable Diffusion.

      RETURN JSON STRUCTURE:
      {
        "prompts": {
          "midjourney": "string",
          "stableDiffusion": "string"
        },
        "metadata": {
          "title": "string",
          "keywords": [
            { "tag": "string", "score": number }
          ],
          "category": "number"
        },
        "review": {
          "totalScore": number,
          "commercialScore": number,
          "feedback": "string",
          "forensicChecklist": {
             "isFocusSharp": boolean,
             "isLightingNatural": boolean,
             "noArtifactsDetected": boolean,
             "noChromeAberration": boolean,
             "handsAndLimbsNormal": boolean,
             "textIsReadableOrAbsent": boolean
          }
        }
      }
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
    ]);

    const data = JSON.parse(result.response.text());
    return NextResponse.json(data);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Analysis Failed" }, { status: 500 });
  }
}
