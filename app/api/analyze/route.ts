import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const ADOBE_BLACKLIST = `
  BANNED BRANDS: Apple, iPhone, iPad, MacBook, Microsoft, Windows, Google, Android, Samsung, Galaxy, Sony, PlayStation, Xbox, Nintendo, Facebook, Meta, Instagram, TikTok, WhatsApp, Snapchat, Amazon, Netflix, Disney, YouTube, Nike, Adidas, Puma, Reebok, Gucci, Prada, Louis Vuitton, Zara, H&M, Walmart, eBay, Tesla, BMW, Mercedes, Ford, Toyota, Honda, Ferrari, Lamborghini, Porsche, Audi, Coca-Cola, Pepsi, Starbucks, McDonald's, KFC, Burger King, Red Bull, Nestlé.
  BANNED ARTISTS: Banksy, Yayoi Kusama, KAWS, Takashi Murakami, Damien Hirst, Jeff Koons, David Hockney, Greg Rutkowski, Artgerm, Loish, WLOP, Beeple, Ross Tran, Dr. Seuss, Maurice Sendak, Beatrix Potter, Jim Henson, Frank Gehry, Zaha Hadid, Le Corbusier.
  BANNED FRANCHISES: Marvel, DC, Iron Man, Batman, Spider-Man, Avengers, Justice League, Pixar, Mickey Mouse, Pokémon, Pikachu, Studio Ghibli, Naruto, Dragon Ball, Star Wars, Harry Potter, Game of Thrones, Barbie, James Bond.
  BANNED TECH SPECS: 4K, 8K, Unreal Engine, V-Ray, Photorealistic, Masterpiece, Photoshop, Nikon.
`;

// Explicitly define this as type Schema to satisfy TypeScript
const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    meta: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
        description: { type: SchemaType.STRING },
        keywords: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              tag: { type: SchemaType.STRING },
              relevance: { type: SchemaType.NUMBER },
            },
          },
        },
        category: { type: SchemaType.NUMBER },
      },
    },
    technical: {
      type: SchemaType.OBJECT,
      properties: {
        quality_score: { type: SchemaType.NUMBER },
        notes: { type: SchemaType.STRING },
      },
    },
    prompts: {
      type: SchemaType.OBJECT,
      properties: {
        sanitized_prompt: { type: SchemaType.STRING },
      },
    },
  },
  required: ["meta", "technical", "prompts"],
};

export async function POST(req: Request) {
  try {
    const { imageUrl, settings } = await req.json();
    
    // 1. Fetch the image directly from your Supabase URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error(`Supabase Fetch Failed: ${imageResponse.status}`);
    
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";
    
    // 2. Initialize Model and attach the Schema
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { 
        responseMimeType: "application/json",
        responseSchema: responseSchema // Now strictly typed!
      }
    });

    const resolutionPrompt = settings.resolution === "8K" 
      ? "EXTREME DETAIL: 8k, UHD, highly detailed, sharp focus, ray tracing, unreal engine 5 render, best quality."
      : "HIGH QUALITY: 4k, photorealistic, balanced lighting, commercial quality.";

    const prompt = `
      ROLE: ADOBE STOCK 2026 MODERATOR & METADATA EXPERT.
      
      STRICT SYSTEM RULES:
      1. BLACKLIST ENFORCEMENT: Remove any words found in this list: ${ADOBE_BLACKLIST}. Replace trademarks with generic terms.
      2. KEYWORD PRIORITY & SCORING: The first 10 keywords MUST be the most critical descriptors. Every keyword must have a relevance score from 0 to 100.
      3. KEYWORD LIMITS: Return exactly between ${settings.keywordMin} and ${settings.keywordMax} keywords.
      4. TITLE LOGIC: Return exactly between ${settings.titleMin} and ${settings.titleMax} chars. Human-readable sentence.
      5. DESCRIPTION LOGIC: Return exactly between ${settings.descMin} and ${settings.descMax} chars.
      6. HALLUCINATION CHECK: Scan for 6 fingers, mangled text, floating limbs, or severe pixel noise.

      TASK 1: METADATA ENGINE
      Generate Title, Description, and Keywords (with 0-100 scores). Determine Category (Business=7, Graphic Resources=13).

      TASK 2: FILE REVIEWER
      Score image quality (0-100). If AI errors are found, subtract 50 points and specify in notes.

      TASK 3: INSPIRATION ENGINE
      Reverse-engineer this image into a text prompt. Strip ALL artist names and copyrighted characters. Add: "${resolutionPrompt}".
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: mimeType } }
    ]);

    // 3. Return the pre-verified JSON safely
    return NextResponse.json(JSON.parse(result.response.text()));

  } catch (error: any) {
    console.error("API Error:", error.message);
    return NextResponse.json({ error: error.message || "Analysis Failed" }, { status: 500 });
  }
}
