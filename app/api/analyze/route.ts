import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const ADOBE_BLACKLIST = `
  BANNED BRANDS: Apple, iPhone, iPad, MacBook, Microsoft, Windows, Google, Android, Samsung, Galaxy, Sony, PlayStation, Xbox, Nintendo, Facebook, Meta, Instagram, TikTok, WhatsApp, Snapchat, Amazon, Netflix, Disney, YouTube, Nike, Adidas, Puma, Reebok, Gucci, Prada, Louis Vuitton, Zara, H&M, Walmart, eBay, Tesla, BMW, Mercedes, Ford, Toyota, Honda, Ferrari, Lamborghini, Porsche, Audi, Coca-Cola, Pepsi, Starbucks, McDonald's, KFC, Burger King, Red Bull, Nestlé.
  BANNED ARTISTS: Banksy, Yayoi Kusama, KAWS, Takashi Murakami, Damien Hirst, Jeff Koons, David Hockney, Greg Rutkowski, Artgerm, Loish, WLOP, Beeple, Ross Tran, Dr. Seuss, Maurice Sendak, Beatrix Potter, Jim Henson, Frank Gehry, Zaha Hadid, Le Corbusier.
  BANNED FRANCHISES: Marvel, DC, Iron Man, Batman, Spider-Man, Avengers, Justice League, Pixar, Mickey Mouse, Pokémon, Pikachu, Studio Ghibli, Naruto, Dragon Ball, Star Wars, Harry Potter, Game of Thrones, Barbie, James Bond.
  BANNED TECH SPECS: 4K, 8K, Unreal Engine, V-Ray, Photorealistic, Masterpiece, Photoshop, Nikon.
`;

export async function POST(req: Request) {
  try {
    const { imageUrl, settings } = await req.json();
    
    // Securely fetch from Supabase
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error("Failed to fetch image from Storage");
    
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      ROLE: ADOBE STOCK 2026 MODERATOR & METADATA EXPERT.
      
      STRICT SYSTEM RULES:
      1. BLACKLIST ENFORCEMENT: Remove any words found in this list: ${ADOBE_BLACKLIST}. Replace trademarks with generic terms (e.g., 'iPhone' -> 'smartphone').
      2. KEYWORD PRIORITY: The first 10 keywords MUST be the most critical descriptors (Subject, Action, Setting). 
      3. KEYWORD LIMITS: Return exactly between ${settings.keywordMin} and ${settings.keywordMax} keywords.
      4. TITLE LOGIC: Max ${settings.titleMax} chars, min ${settings.titleMin} chars. Must be a human-readable sentence.
      5. DESCRIPTION LOGIC: Max ${settings.descMax} chars, min ${settings.descMin} chars. Write a clean, professional description suitable for stock agencies.
      6. HALLUCINATION CHECK: Scan for 6 fingers, mangled text, floating limbs, or severe pixel noise.

      TASK 1: METADATA ENGINE
      Generate the Title, Description, and Keywords. Determine Category (Business=7, Graphic Resources=13, etc).

      TASK 2: FILE REVIEWER
      Score image quality (0-100). If AI errors are found, subtract 50 points and flag it in notes.

      TASK 3: INSPIRATION ENGINE
      Reverse-engineer this image into a text prompt. Strip ALL artist names and copyrighted characters. Use technical descriptions.
      
      RETURN STRICT JSON FORMAT:
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
        "prompts": {
          "sanitized_prompt": "string"
        }
      }
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: mimeType } }
    ]);

    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    
    return NextResponse.json(JSON.parse(cleanJson));
  } catch (error: any) {
    console.error("API Error:", error);

    // Identify Rate Limits explicitly with multiple fail-safes
    if (error.message && (error.message.includes("429") || error.message.includes("Quota exceeded") || error.status === 429)) {
       return NextResponse.json({ error: "Rate limit exceeded (429)." }, { status: 429 });
    }

    return NextResponse.json({ error: error.message || "Analysis Failed" }, { status: 500 });
  }
}
