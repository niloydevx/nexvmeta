import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Act as an AI Image Expert. Analyze this image and return a STRICT JSON object:
      {
        "prompts": {
          "midjourney": "string (include --v 6 --ar 16:9)",
          "dalle": "string (descriptive)",
          "stableDiffusion": "string (comma separated tags)"
        },
        "metadata": {
          "title": "string (Catchy Title)",
          "keywords": ["tag1", "tag2", ... (15 tags)]
        },
        "review": {
          "totalScore": number (0-100),
          "resolutionScore": number (0-100),
          "noiseScore": number (0-100),
          "compositionScore": number (0-100),
          "commercialScore": number (0-100),
          "feedback": "string (short critique)"
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
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
