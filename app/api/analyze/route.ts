import { NextResponse } from "next/server";

const ADOBE_BLACKLIST = `Apple, iPhone, iPad, MacBook, Microsoft, Windows, Google, Android, Samsung, Meta, Facebook, Instagram, Nike, Adidas, Disney, Marvel, DC, Star Wars, Pixar, 4K, 8K, Unreal Engine, V-Ray, Photorealistic.`;

const ADOBE_CATEGORIES_PROMPT = `1=Animals, 2=Buildings, 3=Business, 4=Drinks, 5=Environment, 6=States of Mind, 7=Food, 8=Graphic Resources, 9=Hobbies, 10=Industry, 11=Landscapes, 12=Lifestyle, 13=People, 14=Plants, 15=Culture, 16=Science, 17=Social Issues, 18=Sports, 19=Technology, 20=Transport, 21=Travel.`;

async function callGroqAPI(model: string, messages: any[], isJson: boolean = false) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model, messages, response_format: isJson ? { type: "json_object" } : undefined, temperature: 0.15 }) 
  });
  if (!response.ok) {
     const errText = await response.text();
     throw new Error(errText); // We pass the exact Groq error text to extract the wait time
  }
  const data = await response.json();
  const limit = response.headers.get("x-ratelimit-remaining-requests");
  const reset = response.headers.get("x-ratelimit-reset-requests");
  
  return { content: data.choices[0].message.content, limit: limit ? parseInt(limit, 10) : null, reset: reset };
}

export async function POST(req: Request) {
  try {
    const { imageUrl, settings } = await req.json();
    
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error("Failed to fetch image from Supabase.");
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64Url = `data:${imageResponse.headers.get("content-type") || "image/jpeg"};base64,${Buffer.from(arrayBuffer).toString("base64")}`;

    const platformsTarget = settings.platforms.join(" and ");
    const resolutionPrompt = settings.resolution === "8K" ? "8k, UHD, highly detailed." : "4k, photorealistic.";

    let finalParsed = null;
    let finalLimit = null;
    let finalReset = null;

    // SMART AUTO-RETRY LOOP (With Dynamic Rate-Limit Parser)
    for (let attempt = 1; attempt <= 4; attempt++) {
        try {
            // FIXED: Using sequential await instead of Promise.all to bypass Groq Concurrency Limit blocks
            const maverickRes = await callGroqAPI("meta-llama/llama-4-maverick-17b-128e-instruct", [{ role: "user", content: [{ type: "text", text: "Act as a Senior Stock QA Inspector. Conduct an extreme pixel-level forensic analysis. Calculate a precise math score (0-100) based on: 1. Micro-contrast & Lighting (25 pts), 2. Sharpness & Chromatic Aberration (25 pts), 3. Composition (25 pts), 4. Generative Artifacts (25 pts). Provide the exact calculated score and a deeply technical 1-sentence reason." }, { type: "image_url", image_url: { url: base64Url } }]}]);
            const scoutRes = await callGroqAPI("meta-llama/llama-4-scout-17b-16e-instruct", [{ role: "user", content: [{ type: "text", text: "Reverse-engineer this image into a highly detailed text-to-image prompt. Strip copyrights." }, { type: "image_url", image_url: { url: base64Url } }]}]);
            const guardRes = await callGroqAPI("meta-llama/llama-guard-4-12b", [{ role: "user", content: [{ type: "text", text: "Is this image safe for a commercial stock platform? Reply SAFE or UNSAFE." }, { type: "image_url", image_url: { url: base64Url } }]}]);

            const seoRes = await callGroqAPI("llama-3.1-8b-instant", [{ role: "user", content: `
              ROLE: MASTER STOCK AGENCY SEO ALGORITHM.
              Forensic Data: ${maverickRes.content} | Base Prompt: ${scoutRes.content}
              Target Platforms: ${platformsTarget}
              
              STRICT SEO RULES:
              1. No blacklist words: ${ADOBE_BLACKLIST}.
              2. 'keywords': Return EXACTLY between ${settings.keywordMin} and ${settings.keywordMax} tags. NO DUPLICATE WORDS.
              3. 'title': Natural sentence, descriptive.
              4. 'description': Deeply semantic SEO description.
              5. 'category': Assign integer ID from: ${ADOBE_CATEGORIES_PROMPT}.
              6. 'quality_score': Extract exact math score (0-100) from Forensic Data.
              7. 'notes': Technical QA reason from Forensic Data.
              8. 'sanitized_prompt': Reverse prompt + "${resolutionPrompt}".
              
              Return JSON EXACTLY: { "meta": { "title": "str", "description": "str", "keywords": [{ "tag": "str", "relevance": num }], "category": num }, "technical": { "quality_score": num, "notes": "str" }, "prompts": { "sanitized_prompt": "str" } }
            `}], true);

            // Safe JSON Parse
            let cleanContent = seoRes.content.replace(/```json/gi, "").replace(/```/g, "").trim();
            const startIndex = cleanContent.indexOf('{');
            const endIndex = cleanContent.lastIndexOf('}');
            if (startIndex !== -1 && endIndex !== -1) { cleanContent = cleanContent.substring(startIndex, endIndex + 1); }
            
            finalParsed = JSON.parse(cleanContent);
            finalLimit = maverickRes.limit;
            finalReset = maverickRes.reset;
            break; // Success! Exit loop.
            
        } catch (err: any) {
            console.error(`Attempt ${attempt} failed:`, err);
            if (attempt === 4) throw new Error("AI Processing Timeout after 4 retries."); // Final Fail
            
            // SMART BACKOFF: Extract wait time directly from Groq's Rate Limit error string
            let waitTime = 3000; // Default 3 sec
            const errStr = String(err.message || err);
            const timeMatch = errStr.match(/try again in ([\d.]+)s/i);
            if (timeMatch && timeMatch[1]) {
                waitTime = (parseFloat(timeMatch[1]) * 1000) + 1000; // Add 1s extra buffer
                console.log(`Rate Limited! Auto-waiting for ${waitTime}ms...`);
            }
            await new Promise(r => setTimeout(r, waitTime));
        }
    }

    // Enforce Rules
    if (finalParsed?.meta) {
       if (finalParsed.meta.title && finalParsed.meta.title.length > settings.titleMax) finalParsed.meta.title = finalParsed.meta.title.substring(0, settings.titleMax).trim();
       if (finalParsed.meta.description && finalParsed.meta.description.length > settings.descMax) finalParsed.meta.description = finalParsed.meta.description.substring(0, settings.descMax).trim();
       if (finalParsed.meta.keywords && Array.isArray(finalParsed.meta.keywords)) {
          if (finalParsed.meta.keywords.length > settings.keywordMax) finalParsed.meta.keywords = finalParsed.meta.keywords.slice(0, settings.keywordMax);
       }
    }

    return NextResponse.json({ ...finalParsed, limit_remaining: finalLimit, limit_reset: finalReset });
  } catch (error: any) {
    console.error("Final Route Error:", error);
    return NextResponse.json({ error: error.message || "Analysis Failed" }, { status: 500 });
  }
}
