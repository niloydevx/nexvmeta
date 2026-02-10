import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const BANNED_CONTEXT = `
  STRICT ADOBE STOCK 2026 RULES:
  1. NO TRADEMARKS (Apple, Nike, etc.).
  2. NO ARTIST NAMES (Greg Rutkowski, etc.).
  3. NO TECH SPECS IN TITLE (4k, 8k, etc.).
  4. KEYWORDS: Max 49. STRICTLY ORDERED by relevance.
`;

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      ${BANNED_CONTEXT}
      
      ACT AS A FORENSIC IMAGE EXPERT & PROMPT ENGINEER.
      
      TASK 1: GENERATE "ALWAYS 4K" PROMPTS
      - Create prompts that result in extreme high quality.
      - ALWAYS include: "8k, ultra-detailed, photorealistic, masterpiece, HDR, sharp focus".
      - REMOVE all artist names (Copyright safety).
      
      TASK 2: FORENSIC REVIEW (ADVANCED)
      - Zoom in (metaphorically) to check for: JPEG artifacts, Chromatic Aberration, AI Hallucinations (bad hands, floating objects).
      - If the image looks "AI Generated" (plastic skin, perfect symmetry), flag it.
      
      RETURN STRICT JSON:
      {
        "prompts": {
          "commercialSafe": "string (Descriptive + '8k, ultra-realistic, cinematic lighting' - NO artists)",
          "midjourney": "string (Subject + ' --v 6.0 --ar 16:9 --style raw --stylize 250 --quality 1')",
          "stableDiffusion": "string (Subject + ', masterpiece, best quality, 8k, UHD, dslr, soft lighting, highres')"
        },
        "metadata": {
          "title": "string (Max 70 chars, catchy sentence. NO '4k/8k' in title)",
          "keywords": [
            { "tag": "string", "score": number (0-100 relevance) },
            ... (40-49 keywords, sorted by score)
          ],
          "category": "number"
        },
        "review": {
          "totalScore": number (0-100),
          "technicalScore": number (Noise, Blur, Artifacts),
          "anatomyScore": number (Hands, Eyes, Limbs),
          "commercialScore": number,
          "feedback": "string (Detailed critique)",
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

    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    const data = JSON.parse(cleanJson);

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Analysis Failed" }, { status: 500 });
  }
}