import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Activity, FocusArea, GrowthRecord } from "../types";

// Helper to prevent TypeScript build errors regarding 'process'
declare const process: {
  env: {
    API_KEY: string;
  };
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Activity Generator Logic ---
// UPDATED: Root is now an OBJECT with an 'activities' array. This is more stable for LLMs.
const activitySchema = {
  type: Type.OBJECT,
  properties: {
    activities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Judul aktivitas" },
          duration: { type: Type.STRING, description: "Durasi (cth: 5-10 menit)" },
          materials: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Alat/bahan"
          },
          instructions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Langkah-langkah"
          },
          benefits: { type: Type.STRING, description: "Manfaat tumbuh kembang" },
          safetyTip: { type: Type.STRING, description: "Tips keamanan" }
        },
        required: ["title", "duration", "materials", "instructions", "benefits", "safetyTip"]
      }
    }
  }
};

export const generateActivities = async (
  ageMonths: number,
  focusArea: FocusArea,
  exactAgeDisplay: string = "" 
): Promise<Activity[]> => {
  
  const ageContext = exactAgeDisplay ? `tepatnya ${exactAgeDisplay}` : `${ageMonths} bulan`;
  const prompt = `Bertindaklah sebagai ahli perkembangan anak.
      Subjek: Bayi usia ${ageContext}.
      Tugas: Buat 3 rekomendasi aktivitas stimulasi untuk *hari ini* dengan fokus: ${focusArea}.
      
      Syarat:
      1. Gunakan barang rumah tangga sederhana.
      2. Aman dan menyenangkan.
      3. Bahasa Indonesia.
      
      FORMAT OUTPUT: JSON Object dengan property "activities" yang berisi array aktivitas.`;

  // Standard safety settings to prevent false positives on "baby physical activities"
  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
  ];

  try {
    // Attempt 1: Gemini 2.5 Flash with Object Schema
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { 
        responseMimeType: "application/json", 
        responseSchema: activitySchema,
        safetySettings: safetySettings
      }
    });

    if (response.text) {
      let jsonString = response.text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      
      // Try to find the JSON object if there's extra text
      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonString = jsonString.substring(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(jsonString);
      
      // Handle wrapped object (Schema compliant)
      if (parsed.activities && Array.isArray(parsed.activities)) {
        return parsed.activities;
      }
      // Handle if model returned direct array (Non-compliant but possible)
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Attempt 1 (Schema) failed, retrying with simple prompt...", error);
    try {
        // Attempt 2: Fallback without strict schema, asking for raw JSON
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt + "\n\nKeluarkan HANYA raw JSON string valid. Jangan ada markdown ```.",
            config: { 
                responseMimeType: "application/json",
                safetySettings: safetySettings
            }
        });

        if (response.text) {
            let jsonString = response.text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
             const firstBrace = jsonString.indexOf('{');
            const lastBrace = jsonString.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                jsonString = jsonString.substring(firstBrace, lastBrace + 1);
            }

            const parsed = JSON.parse(jsonString);
            if (parsed.activities && Array.isArray(parsed.activities)) {
                return parsed.activities;
            }
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (e2) {
        console.error("All generateActivity attempts failed", e2);
    }
  }
  return [];
};

export const getMilestoneAdvice = async (ageMonths: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Berikan satu paragraf singkat, hangat, dan menyemangati untuk orang tua tentang apa yang diharapkan secara perkembangan pada bayi usia ${ageMonths} bulan. Bahasa Indonesia.`,
    });
    return response.text || "Terjadi kesalahan saat memuat saran.";
  } catch (error) {
    return "Tidak dapat memuat saran saat ini.";
  }
}

// --- Chat Assistant Logic ---
let chatSession: any = null;

export const sendMessageToAssistant = async (
  message: string, 
  babyName: string, 
  ageDisplay: string
): Promise<string> => {
  try {
    if (!chatSession) {
      chatSession = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: `Anda adalah Dokter Anak AI yang ramah dan empatik bernama "Keinara Bot". 
          Anda sedang berbicara dengan orang tua dari bayi bernama ${babyName}, yang saat ini berusia ${ageDisplay}.
          
          Tugas Anda:
          1. Menjawab pertanyaan seputar tumbuh kembang, kesehatan ringan, nutrisi, dan pola tidur.
          2. Selalu gunakan nada bicara yang menenangkan dan suportif.
          3. Jika pertanyaan bersifat medis darurat (demam tinggi, sesak napas, cedera), Anda WAJIB menyarankan untuk segera ke dokter asli.
          4. Jawaban harus ringkas namun informatif (maksimal 3 paragraf).
          5. Gunakan Bahasa Indonesia yang baik dan gaul sedikit agar akrab (bunda/ayah).`,
        },
      });
    }

    const result = await chatSession.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Chat Error", error);
    chatSession = null;
    return "Maaf Bunda, koneksi saya sedang gangguan. Boleh diulang pertanyaannya?";
  }
};

// --- Growth Analysis Logic ---
export const analyzeGrowth = async (
  records: GrowthRecord[],
  babyName: string,
  gender: string,
  birthDate: string
): Promise<string> => {
  if (!records || records.length === 0) return "Belum ada data pertumbuhan untuk dianalisis.";

  // Sort chronological for context
  const history = [...records]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(r => `- Tanggal ${r.date}: Berat ${r.weight}kg, Tinggi ${r.height}cm`)
    .join('\n');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        Anda adalah konsultan tumbuh kembang anak profesional namun ramah.
        Subjek: Bayi bernama ${babyName}, Jenis Kelamin: ${gender}, Tanggal Lahir: ${birthDate}.
        
        Data Riwayat Pertumbuhan:
        ${history}
        
        Tugas:
        1. Analisis tren pertumbuhan secara singkat (apakah naik stabil, turun, atau ada lonjakan).
        2. Berikan komentar penyemangat atau saran jika ada yang perlu diperhatikan (tetap sarankan konsultasi dokter untuk diagnosa medis).
        3. Sertakan 1 tips nutrisi atau aktivitas fisik singkat yang relevan dengan data terakhir.
        4. Gunakan Bahasa Indonesia yang hangat. Maksimal 150 kata.
      `,
    });
    return response.text || "Tidak dapat memuat analisis saat ini.";
  } catch (error) {
    console.error("Growth Analysis Error", error);
    return "Maaf, terjadi kesalahan saat menghubungi layanan AI untuk analisis.";
  }
};
