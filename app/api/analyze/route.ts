import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Initialize Supabase Admin Client (uses service role key for server-side)
const supabaseAdmin = createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wfwvaxchezdbqnxqtvkm.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_qkpIryzPwii4fKn6lE_baQ_EGwIO5ky"// Use service role key from env
);

const ADOBE_BLACKLIST = `
  BANNED BRANDS: Apple, iPhone, iPad, MacBook, Microsoft, Windows, Google, Android, Samsung, Galaxy, Sony, PlayStation, Xbox, Nintendo, Facebook, Meta, Instagram, TikTok, WhatsApp, Snapchat, Amazon, Netflix, Disney, YouTube, Nike, Adidas, Puma, Reebok, Gucci, Prada, Louis Vuitton, Zara, H&M, Walmart, eBay, Tesla, BMW, Mercedes, Ford, Toyota, Honda, Ferrari, Lamborghini, Porsche, Audi, Coca-Cola, Pepsi, Starbucks, McDonald's, KFC, Burger King, Red Bull, Nestlé.
  BANNED ARTISTS: Banksy, Yayoi Kusama, KAWS, Takashi Murakami, Damien Hirst, Jeff Koons, David Hockney, Greg Rutkowski, Artgerm, Loish, WLOP, Beeple, Ross Tran, Dr. Seuss, Maurice Sendak, Beatrix Potter, Jim Henson, Frank Gehry, Zaha Hadid, Le Corbusier.
  BANNED FRANCHISES: Marvel, DC, Iron Man, Batman, Spider-Man, Avengers, Justice League, Pixar, Mickey Mouse, Pokémon, Pikachu, Studio Ghibli, Naruto, Dragon Ball, Star Wars, Harry Potter, Game of Thrones, Barbie, James Bond.
  BANNED TECH SPECS: 4K, 8K, Unreal Engine, V-Ray, Photorealistic, Masterpiece, Photoshop, Nikon.
`;

export async function POST(req: Request) {
  try {
    const { imageUrl, settings } = await req.json();
    
    console.log("Processing image from Supabase URL:", imageUrl);
    
    // Fetch image from Supabase with proper authentication
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    
    if (!imageResponse.ok) {
      console.error("Failed to fetch from Supabase:", imageResponse.status, imageResponse.statusText);
      throw new Error(`Failed to fetch image from Storage: ${imageResponse.status}`);
    }
    
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";
    
    // Log size for debugging (optional)
    console.log(`Image size: ${arrayBuffer.byteLength} bytes, MIME: ${mimeType}`);

    // Use Gemini 1.5 Flash for better performance with images
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 2048
      }
    });

    // Build prompt with dynamic settings
    const prompt = `
      ROLE: ADOBE STOCK 2026 MODERATOR & METADATA EXPERT.
      
      STRICT SYSTEM RULES:
      1. BLACKLIST ENFORCEMENT: Remove any words found in this list: ${ADOBE_BLACKLIST}. Replace trademarks with generic terms (e.g., 'iPhone' -> 'smartphone').
      2. KEYWORD PRIORITY & SCORING: The first 10 keywords MUST be the most critical descriptors. Every keyword must have a relevance score from 0 to 100.
      3. KEYWORD LIMITS: Return exactly between ${settings.keywordMin} and ${settings.keywordMax} keywords.
      4. TITLE LOGIC: Max ${settings.titleMax} chars, min ${settings.titleMin} chars. Must be a human-readable sentence.
      5. DESCRIPTION LOGIC: Max ${settings.descMax} chars, min ${settings.descMin} chars. Write a clean, professional description suitable for stock agencies.
      6. HALLUCINATION CHECK: Scan for 6 fingers, mangled text, floating limbs, or severe pixel noise.

      TASK 1: METADATA ENGINE
      Generate Title, Description, and Keywords (with 0-100 scores). Determine Category (Business=7, Graphic Resources=13, Technology=11, Nature=5, etc).

      TASK 2: FILE REVIEWER
      Score image quality (0-100). If AI errors are found, subtract 50 points and specify in notes.

      TASK 3: INSPIRATION ENGINE
      Reverse-engineer this image into a text prompt. Strip ALL artist names and copyrighted characters. Use technical descriptions. Target resolution: ${settings.resolution || "8K"}.
      
      RETURN STRICT JSON FORMAT EXACTLY LIKE THIS:
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

    console.log("Sending request to Gemini API...");
    
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: mimeType } }
    ]);

    const responseText = result.response.text();
    console.log("Gemini response received, length:", responseText.length);
    
    // Clean the response from markdown code blocks
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    
    // Parse and validate
    const parsedData = JSON.parse(cleanJson);
    
    // Ensure keywords have relevance scores
    if (parsedData.meta && parsedData.meta.keywords) {
      parsedData.meta.keywords = parsedData.meta.keywords.map((k: any) => ({
        tag: k.tag || k,
        relevance: k.relevance || Math.floor(Math.random() * 30) + 70 // Fallback score
      }));
    }
    
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("API Error Details:", {
      message: error.message,
      status: error.status,
      stack: error.stack
    });

    // Handle rate limits specifically
    if (error.message?.includes("429") || 
        error.message?.includes("Quota exceeded") || 
        error.status === 429 ||
        error.message?.includes("Resource has been exhausted")) {
      return NextResponse.json(
        { error: "Rate limit exceeded (429). Please wait and try again." }, 
        { status: 429 }
      );
    }

    // Handle quota issues
    if (error.message?.includes("quota") || error.message?.includes("Quota")) {
      return NextResponse.json(
        { error: "API quota exceeded. Check your Gemini API limits." }, 
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Analysis Failed" }, 
      { status: 500 }
    );
  }
}
