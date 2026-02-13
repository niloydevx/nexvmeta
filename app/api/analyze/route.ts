import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// 1. INCREASE UPLOAD LIMIT TO 20MB
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '30mb',
    },
  },
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { 
      image, 
      settings 
    } = await req.json();

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    
    // Use Gemini 1.5 Pro for best reasoning
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      ROLE: ADOBE STOCK EXPERT & METADATA SPECIALIST.
      
      USER SETTINGS (STRICTLY FOLLOW THESE RANGES):
      - Platform: ${settings.platform} (Optimize for this algorithm)
      - Title Length: Between ${settings.titleMin} and ${settings.titleMax} characters.
      - Description Length: Between ${settings.descMin} and ${settings.descMax} characters.
      - Keyword Count: Exactly ${settings.keywordMax} tags (Minimum ${settings.keywordMin}).
      
      TASK 1: GENERATE METADATA
      - Title: Punchy, SEO-heavy, no filler words.
      - Keywords: Sorted by relevance.
      - Description: Detailed sentence for SEO.

      TASK 2: FORENSIC & TECHNICAL
      - Analyze for AI artifacts, noise, and upscaling errors.
      
      TASK 3: PROMPTS (8K)
      - Create a prompt to recreate this image.

      RETURN JSON:
      {
        "meta": {
          "title": "string",
          "description": "string",
          "keywords": [{ "tag": "string" }],
          "category": "number"
        },
        "technical": {
          "quality_score": number (0-100),
          "notes": "string"
        },
        "prompts": {
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
    return NextResponse.json({ error: "File too large or AI busy" }, { status: 500 });
  }
}
