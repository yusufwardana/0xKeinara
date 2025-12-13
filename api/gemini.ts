import { GoogleGenAI, Type } from "@google/genai";
import crypto from 'crypto';

/**
 * VERCEL SERVERLESS BACKEND
 * Runtime: Node.js (Recommended for AI tasks due to higher timeout limits vs Edge)
 */

// --- 1. CONFIGURATION & SECRETS ---
const API_KEYS = [
  process.env.API_KEY,
  process.env.API_KEY_SECONDARY,
  process.env.API_KEY_TERTIARY
].filter(Boolean) as string[];

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 Minute
const MAX_REQUESTS_PER_IP = 15;
const CACHE_TTL = 60 * 60 * 1000; // 1 Hour

// --- 2. IN-MEMORY STORAGE (Stateless-friendly) ---
// Note: In a real serverless scaling scenario, use Redis (e.g., Vercel KV / Upstash)
const rateLimitMap = new Map<string, { count: number; startTime: number }>();
const cacheMap = new Map<string, { data: any; timestamp: number }>();
const jobQueue = new Map<string, { status: 'queued' | 'processing' | 'done' | 'failed', result?: any, createdAt: number }>();

// --- 3. SCHEMAS ---
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

// --- 4. HELPER FUNCTIONS ---

function getClientIP(req: any): string {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(ip: string): boolean {
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

function generateCacheKey(task: string, payload: any): string {
  // Hash the payload to create a consistent key
  const str = `${task}-${JSON.stringify(payload)}`;
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * 5. GEMINI API CLIENT WITH FALLBACK
 * Automatically rotates keys on 429 (Rate Limit) or 5xx errors.
 */
async function callGeminiWithFallback(modelName: string, promptParts: any, config: any) {
  let lastError;

  for (const apiKey of API_KEYS) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: promptParts, // Modified to accept complex contents (text + image)
        config: config
      });
      return response;
    } catch (error: any) {
      console.warn(`[Gemini] Key ending in ...${apiKey.slice(-4)} failed: ${error.message}`);
      lastError = error;
      
      // Stop rotation if error is User's fault (400)
      if (error.message.includes('400')) break;
      
      // Continue to next key if error is 429 or 5xx
    }
  }
  throw lastError;
}

/**
 * 6. ASYNC JOB WORKER (Simulation)
 * In production, this would be a separate Vercel Function triggered by QStash.
 */
async function processAsyncJob(jobId: string, payload: any) {
    console.log(`[Worker] Starting job ${jobId}`);
    jobQueue.set(jobId, { status: 'processing', createdAt: Date.now() });
    
    // Simulate heavy processing delay (e.g. generating full report PDF content)
    setTimeout(() => {
        jobQueue.set(jobId, { 
            status: 'done', 
            result: { message: "Laporan perkembangan detail berhasil dibuat.", pages: 5 },
            createdAt: Date.now() 
        });
        console.log(`[Worker] Job ${jobId} finished`);
    }, 5000);
}

// --- 7. MAIN HANDLER (Node.js Signature) ---
export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // A. Rate Limit Check
  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' });
  }

  try {
    // B. Job Status Check (GET)
    if (req.method === 'GET') {
        const { jobId } = req.query;
        if (!jobId || !jobQueue.has(jobId)) {
            return res.status(404).json({ error: 'Job not found' });
        }
        return res.status(200).json(jobQueue.get(jobId));
    }

    // C. Task Processing (POST)
    const { task, payload } = req.body;

    // 1. Check Cache (Read-Through)
    // IMPORTANT: We do NOT cache requests that include images (too large/variable)
    let cached = null;
    const hasImage = payload.imageBase64 && payload.imageBase64.length > 0;
    
    if (!hasImage) {
        const cacheKey = generateCacheKey(task, payload);
        cached = cacheMap.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
            console.log(`[Cache] HIT for ${task}`);
            res.setHeader('X-Cache', 'HIT');
            return res.status(200).json(cached.data);
        }
    }

    // 2. Task Routing
    if (task === 'heavy_job') {
        // --- QUEUE PATTERN ---
        // For long running tasks, return 202 immediately
        const jobId = crypto.randomUUID();
        jobQueue.set(jobId, { status: 'queued', createdAt: Date.now() });
        
        // Trigger worker (Fire and Forget in this context, or await if strictly Serverless)
        // Note: In pure Vercel without background functions, we must use `waitUntil` or accept that
        // the function needs to stay alive. Here we simulate the trigger.
        processAsyncJob(jobId, payload);
        
        return res.status(202).json({ 
            status: 'queued', 
            jobId, 
            message: 'Tugas sedang diproses di background.' 
        });
    }

    // --- REALTIME TASKS ---
    let resultData;

    if (task === 'activities') {
      const { ageContext, focusArea, imageBase64 } = payload;
      
      const systemPrompt = `Bertindaklah sebagai ahli perkembangan anak.
      Subjek: Bayi usia ${ageContext}.
      Tugas: Buat 3 rekomendasi aktivitas stimulasi untuk *hari ini* dengan fokus: ${focusArea}.
      Syarat: Aman. Bahasa Indonesia. Output JSON only.`;

      const promptParts: any = { parts: [] };
      
      // Add Image if exists
      if (imageBase64) {
          promptParts.parts.push({
              inlineData: {
                  mimeType: "image/jpeg",
                  data: imageBase64
              }
          });
          promptParts.parts.push({
              text: `${systemPrompt} 
              KHUSUS: Analisis gambar yang saya kirim. Gunakan objek/mainan/lingkungan dalam foto tersebut sebagai alat utama aktivitas.`
          });
      } else {
          promptParts.parts.push({
              text: `${systemPrompt} Gunakan barang rumah tangga sederhana.`
          });
      }
      
      const response = await callGeminiWithFallback('gemini-2.5-flash', promptParts, {
        responseMimeType: "application/json",
        responseSchema: activitySchema
      });
      resultData = JSON.parse(response.text || "[]");

    } else if (task === 'milestone_advice') {
      const { ageMonths } = payload;
      const prompt = `Berikan satu paragraf singkat (maks 50 kata), hangat, untuk orang tua tentang milestone bayi ${ageMonths} bulan. Bahasa Indonesia.`;
      const response = await callGeminiWithFallback('gemini-2.5-flash', prompt, {});
      resultData = { text: response.text };

    } else if (task === 'chat') {
      const { message, babyName, ageDisplay } = payload;
      const prompt = `System: Kamu adalah Dokter Kecil AI. Bayi: ${babyName} (${ageDisplay}). Jawab pertanyaan user dengan ramah dan suportif. Bahasa Indonesia.
      User: ${message}`;
      const response = await callGeminiWithFallback('gemini-2.5-flash', prompt, {});
      resultData = { text: response.text };

    } else {
        return res.status(400).json({ error: 'Unknown task' });
    }

    // 3. Write Cache (Only for text-only requests)
    if (task !== 'chat' && !hasImage) {
        const cacheKey = generateCacheKey(task, payload);
        cacheMap.set(cacheKey, { data: resultData, timestamp: Date.now() });
    }

    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(resultData);

  } catch (error: any) {
    console.error('[API Internal Error]', error);
    return res.status(500).json({ 
        error: 'Internal Server Error', 
        details: error.message 
    });
  }
}