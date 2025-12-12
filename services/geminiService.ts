import { GoogleGenAI, Type } from "@google/genai";
import { Activity, FocusArea } from "../types";

// Helper to prevent TypeScript build errors regarding 'process'
declare const process: {
  env: {
    API_KEY: string;
  };
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema definition used for both strategies
const activitySchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Judul aktivitas yang menarik" },
      duration: { type: Type.STRING, description: "Perkiraan durasi (misal: 5-10 menit)" },
      materials: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Daftar alat/bahan yang dibutuhkan"
      },
      instructions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Langkah-langkah melakukan aktivitas"
      },
      benefits: { type: Type.STRING, description: "Manfaat perkembangan bagi bayi (jelaskan aspek neurosains/motorik)" },
      safetyTip: { type: Type.STRING, description: "Tips keamanan spesifik untuk aktivitas ini" }
    },
    required: ["title", "duration", "materials", "instructions", "benefits", "safetyTip"]
  }
};

export const generateActivities = async (
  ageMonths: number,
  focusArea: FocusArea,
  exactAgeDisplay: string = "" 
): Promise<Activity[]> => {
  
  const ageContext = exactAgeDisplay ? `tepatnya ${exactAgeDisplay}` : `${ageMonths} bulan`;

  // Strategy 1: Try Thinking Mode (Gemini 3 Pro)
  try {
    const config: any = {
      thinkingConfig: { thinkingBudget: 32768 },
      maxOutputTokens: 65536, 
      responseMimeType: "application/json",
      responseSchema: activitySchema
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Bertindaklah sebagai ahli perkembangan anak pribadi untuk bayi bernama Keinara.
      Saat ini usianya ${ageContext}.
      Analisis tahap perkembangan bayi usia ini secara presisi (hari ke hari) menggunakan kemampuan "Thinking Mode".
      Berikan 3 rekomendasi aktivitas stimulasi untuk *hari ini* dengan fokus pada ${focusArea}.
      
      Panduan:
      1. Aktivitas harus menggunakan barang rumah tangga sederhana.
      2. Jelaskan manfaatnya dari sudut pandang perkembangan saraf atau otot.
      3. Sesuaikan dengan nuansa usia spesifik (misal: jika hampir ganti bulan, berikan tantangan transisi).
      
      Bahasa Indonesia.`,
      config: config
    });

    if (response.text) {
      return JSON.parse(response.text) as Activity[];
    }
  } catch (error) {
    console.warn("Thinking mode failed, falling back to standard model:", error);
  }

  // Strategy 2: Fallback to Flash (Gemini 2.5) if Thinking fails/timeouts
  try {
    const fallbackResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Buatkan 3 aktivitas stimulasi bayi usia ${ageContext} untuk melatih ${focusArea}. 
      Gunakan alat sederhana di rumah. Berikan judul, durasi, alat, instruksi, manfaat, dan tips keamanan. 
      Output JSON array. Bahasa Indonesia.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: activitySchema
      }
    });

    if (fallbackResponse.text) {
      return JSON.parse(fallbackResponse.text) as Activity[];
    }
  } catch (fallbackError) {
    console.error("Fallback generation failed:", fallbackError);
  }

  return [];
};

export const getMilestoneAdvice = async (ageMonths: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Berikan satu paragraf singkat, hangat, dan menyemangati untuk orang tua tentang apa yang diharapkan secara perkembangan pada bayi usia ${ageMonths} bulan. Fokus pada milestones utama. Bahasa Indonesia.`,
    });
    return response.text || "Terjadi kesalahan saat memuat saran.";
  } catch (error) {
    return "Tidak dapat memuat saran saat ini.";
  }
}