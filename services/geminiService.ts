import { GoogleGenAI, Type } from "@google/genai";
import { Activity, FocusArea } from "../types";

// Helper to prevent TypeScript build errors regarding 'process'
declare const process: {
  env: {
    API_KEY: string;
  };
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Existing Generator Logic ---
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

  try {
    const config: any = {
      thinkingConfig: { thinkingBudget: 1024 }, // Lower budget for faster response on activities
      maxOutputTokens: 8192, 
      responseMimeType: "application/json",
      responseSchema: activitySchema
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-thinking", // Use flash-thinking for speed + logic balance
      contents: `Bertindaklah sebagai ahli perkembangan anak pribadi untuk bayi bernama Keinara.
      Saat ini usianya ${ageContext}.
      Berikan 3 rekomendasi aktivitas stimulasi untuk *hari ini* dengan fokus pada ${focusArea}.
      
      Panduan:
      1. Aktivitas harus menggunakan barang rumah tangga sederhana.
      2. Jelaskan manfaatnya dari sudut pandang perkembangan saraf atau otot.
      
      Bahasa Indonesia.`,
      config: config
    });

    if (response.text) {
      return JSON.parse(response.text) as Activity[];
    }
  } catch (error) {
    // Fallback logic standard
    try {
        const fallbackResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Buatkan 3 aktivitas stimulasi bayi usia ${ageContext} untuk melatih ${focusArea}. Output JSON array. Bahasa Indonesia.`,
            config: { responseMimeType: "application/json", responseSchema: activitySchema }
        });
        if (fallbackResponse.text) return JSON.parse(fallbackResponse.text);
    } catch (e) { console.error(e); }
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

// --- NEW: Chat Assistant Logic ---
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
    return "Maaf Bunda, koneksi saya sedang gangguan. Bisa diulang lagi?";
  }
};