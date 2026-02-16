import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const ADOBE_BLACKLIST = `
  BANNED BRANDS: Apple, iPhone, iPad, MacBook, Microsoft, Windows, Google, Android, Samsung, Galaxy, Sony, PlayStation, Xbox, Nintendo, Facebook, Meta, Instagram, TikTok, WhatsApp, Snapchat, Amazon, Netflix, Disney, YouTube, Nike, Adidas, Puma, Reebok, Gucci, Prada, Louis Vuitton, Zara, H&M, Walmart, eBay, Tesla, BMW, Mercedes, Ford, Toyota, Honda, Ferrari, Lamborghini, Porsche, Audi, Coca-Cola, Pepsi, Starbucks, McDonald's, KFC, Burger King, Red Bull, Nestlé.
  BANNED ARTISTS: Banksy, Yayoi Kusama, KAWS, Takashi Murakami, Damien Hirst, Jeff Koons, David Hockney, Greg Rutkowski, Artgerm, Loish, WLOP, Beeple, Ross Tran, Dr. Seuss, Maurice Sendak, Beatrix Potter, Jim Henson, Frank Gehry, Zaha Hadid, Le Corbusier.
  BANNED TECH SPECS: 4K, 8K, Unreal Engine, V-Ray, Photorealistic, Masterpiece, Photoshop, Nikon.
`;

export async function POST(req: Request) {
  try {
    const { imageUrl, settings } = await req.json();
    
    // Fetch image from Supabase URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error("Failed to fetch image from Storage");
    
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-lite-preview-02-05",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      ROLE: ADOBE STOCK 2026 MODERATOR & METADATA EXPERT.
      
      STRICT SYSTEM RULES:
      1. BLACKLIST: Remove words in this list: ${ADOBE_BLACKLIST}. Replace trademarks with generic terms.
      2. KEYWORD PRIORITY: First 10 keywords MUST be the most critical (Subject, Action, Setting).
      3. SCORING: Provide a relevance score (0-100) for every keyword.
      4. LIMITS: Exactly ${settings.keywordMin}-${settings.keywordMax} keywords. Title max ${settings.titleMax} chars.
      5. QUALITY: Scan for AI errors (6 fingers, artifacts, mangled text).

      TASK: Generate Title, Description, and Keywords (with scores). Check technical quality.
      
      RETURN JSON:
      {
        "meta": {
          "title": "string",
          "description": "string",
          "keywords": [{ "tag": "string", "relevance": number }],
          "category": number
        },
        "technical": {
          "quality_score": number,
          "notes": "string"
        },
        "prompts": { "sanitized_prompt": "string" }
      }
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: mimeType } }
    ]);

    return NextResponse.json(JSON.parse(result.response.text()));
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Analysis Failed" }, { status: 500 });
  }
}
