import { GoogleGenAI, Type } from "@google/genai";
import crypto from 'crypto';

// --- CONFIGURATION ---
// Multi-Key Fallback Strategy
const API_KEYS = [
  process.env.API_KEY,
  process.env.API_KEY_SECONDARY, // Optional backup key
  process.env.API_KEY_TERTIARY   // Optional third key
].filter(Boolean) as string[];

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 Minute
const MAX_REQUESTS_PER_IP = 10;
const CACHE_TTL = 60 * 60 * 1000; // 1 Hour

// --- IN-MEMORY STORAGE (Stateless-friendly but persistent on warm containers) ---
const rateLimitMap = new Map<string, { count: number; startTime: number }>();
const cacheMap = new Map<string, { data: any; timestamp: number }>();

// --- TYPES & SCHEMAS ---
const activitySchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      duration: { type: Type.STRING },
      materials: { type: Type.ARRAY, items: { type: Type.STRING } },
      instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
      benefits: { type: Type.STRING },
      safetyTip: { type: Type.STRING }
    },
    required: ["title", "duration", "materials", "instructions", "benefits", "safetyTip"]
  }
};

// --- HELPER FUNCTIONS ---

// 1. Rate Limiter
function checkRateLimit(ip: string) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, startTime: now };

  if (now - record.startTime > RATE_LIMIT_WINDOW) {
    record.count = 1;
    record.startTime = now;
  } else {
    record.count++;
  }

  rateLimitMap.set(ip, record);
  return record.count <= MAX_REQUESTS_PER_IP;
}

// 2. Cache Key Generator
function generateCacheKey(task: string, payload: any): string {
  const str = `${task}-${JSON.stringify(payload)}`;
  return crypto.createHash('sha256').update(str).digest('hex');
}

// 3. AI Client with Rotation
async function callGeminiWithFallback(modelName: string, prompt: string, config: any) {
  let lastError;

  for (const apiKey of API_KEYS) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: config
      });
      
      // Success? Return immediately
      return response;
    } catch (error: any) {
      lastError = error;
      console.warn(`[Gemini Backend] Key failed: ${apiKey.substring(0, 5)}... Reason: ${error.message}`);
      
      // Only rotate on Rate Limit (429) or Service Unavailable (503)
      // If it's a Bad Request (400), rotation won't help.
      if (!error.message.includes('429') && !error.message.includes('503')) {
        throw error;
      }
    }
  }
  throw lastError;
}

// --- MAIN HANDLER (Vercel Format) ---
export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // 1. Rate Limiting Check
  // Note: specific header depends on Vercel/Proxy setup, fallback to arbitrary string for dev
  const ip = request.headers.get('x-forwarded-for') || 'unknown-client';
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait a minute.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { task, payload } = body;

    // 2. Cache Check (Before processing)
    const cacheKey = generateCacheKey(task, payload);
    const cached = cacheMap.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log('[Cache] Hit:', cacheKey);
      return new Response(JSON.stringify(cached.data), {
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
      });
    }

    let resultData;

    // 3. Task Router (Server-side Prompt Construction)
    if (task === 'activities') {
      const { ageContext, focusArea } = payload;
      const prompt = `Bertindaklah sebagai ahli perkembangan anak.
      Subjek: Bayi usia ${ageContext}.
      Tugas: Buat 3 rekomendasi aktivitas stimulasi untuk *hari ini* dengan fokus: ${focusArea}.
      Syarat: Gunakan barang rumah tangga sederhana. Aman. Bahasa Indonesia.
      Output JSON only.`;
      
      const response = await callGeminiWithFallback('gemini-2.5-flash', prompt, {
        responseMimeType: "application/json",
        responseSchema: activitySchema
      });
      
      resultData = JSON.parse(response.text || "[]");

    } else if (task === 'milestone_advice') {
      const { ageMonths } = payload;
      const prompt = `Berikan satu paragraf singkat, hangat, dan menyemangati untuk orang tua tentang apa yang diharapkan secara perkembangan pada bayi usia ${ageMonths} bulan. Bahasa Indonesia.`;
      
      const response = await callGeminiWithFallback('gemini-2.5-flash', prompt, {});
      resultData = { text: response.text };

    } else if (task === 'chat') {
      // For chat, we don't cache as strictly, or we cache based on last user message
      const { message, babyName, ageDisplay, history } = payload;
      // Note: In a real app, 'history' should be managed carefully to avoid token limits
      const prompt = `System: Anda adalah Dokter Anak AI ramah bernama "Keinara Bot". Bayi: ${babyName}, Usia: ${ageDisplay}. Jawab ringkas, suportif, Bahasa Indonesia.
      User: ${message}`;
      
      const response = await callGeminiWithFallback('gemini-2.5-flash', prompt, {});
      resultData = { text: response.text };

    } else {
      return new Response(JSON.stringify({ error: 'Invalid task' }), { status: 400 });
    }

    // 4. Save to Cache
    // Don't cache chat heavily, or implement specific logic. For now, we cache everything.
    if (task !== 'chat') { 
        cacheMap.set(cacheKey, { data: resultData, timestamp: Date.now() });
    }

    return new Response(JSON.stringify(resultData), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
    });

  } catch (error: any) {
    console.error('[API Error]', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}