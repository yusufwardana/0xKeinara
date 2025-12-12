import { GoogleGenAI, Type } from "@google/genai";
import { Activity, FocusArea, GrowthRecord } from "../types";

// Helper to prevent TypeScript build errors regarding 'process'
declare const process: {
  env: {
    API_KEY: string;
  };
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Activity Generator Logic ---
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
  const prompt = `Bertindaklah sebagai ahli perkembangan anak pribadi untuk bayi bernama Keinara.
      Saat ini usianya ${ageContext}.
      Berikan 3 rekomendasi aktivitas stimulasi untuk *hari ini* dengan fokus pada ${focusArea}.
      
      Panduan:
      1. Aktivitas harus menggunakan barang rumah tangga sederhana.
      2. Jelaskan manfaatnya dari sudut pandang perkembangan saraf atau otot.
      
      Bahasa Indonesia. Keluarkan output JSON array.`;

  try {
    // Attempt 1: Gemini 2.5 Flash with Schema (Most structured)
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { 
        responseMimeType: "application/json", 
        responseSchema: activitySchema 
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as Activity[];
    }
  } catch (error) {
    console.warn("Attempt 1 (Schema) failed, retrying with loose JSON...", error);
    try {
        // Attempt 2: Fallback without strict schema (More robust against validation errors)
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt + "\n\nFormat output sebagai JSON Array of objects dengan keys: title, duration, materials, instructions, benefits, safetyTip.",
            config: { 
                responseMimeType: "application/json"
            }
        });

        if (response.text) {
            return JSON.parse(response.text) as Activity[];
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
    // Reset session on error to clear potentially stuck state
    chatSession = null;
    return "Maaf Bunda, saya sedang mengalami gangguan koneksi. Boleh diulang pertanyaannya?";
  }
};

// --- Growth Analysis Logic ---
export const analyzeGrowth = async (
  records: GrowthRecord[],
  babyName: string,
  gender: string,
  birthDate: string
): Promise<string> => {
  if (records.length === 0) return "Belum ada data pertumbuhan untuk dianalisis.";

  // Format records for the prompt
  const recordsStr = records
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(r => `- Tanggal: ${r.date}, Berat: ${r.weight}kg, Tinggi: ${r.height}cm`)
    .join('\n');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analisis data pertumbuhan bayi berikut ini.
      
      Profil:
      - Nama: ${babyName}
      - Jenis Kelamin: ${gender}
      - Tanggal Lahir: ${birthDate}
      
      Data Pertumbuhan:
      ${recordsStr}
      
      Tugas:
      1. Bandingkan tren pertumbuhan ini dengan standar kurva WHO (Weight-for-age dan Length-for-age) secara umum. Apakah grafiknya naik stabil, stagnan, atau turun?
      2. Berikan penilaian status gizi singkat (misal: Pertumbuhan baik, Perlu perhatian, dll) berdasarkan data terakhir.
      3. Berikan 3 saran nutrisi atau pola makan (jika sudah MPASI) dan stimulasi fisik yang relevan dengan kondisi pertumbuhan ini.
      
      Gunakan bahasa yang menenangkan, suportif, dan mudah dipahami orang tua. Jangan mendiagnosis medis secara definitif, tapi sarankan konsultasi ke dokter jika ada tanda bahaya (red flag).`,
    });

    return response.text || "Gagal menganalisis data.";
  } catch (error) {
    console.error("Growth Analysis Error", error);
    return "Maaf, sistem sedang sibuk. Silakan coba lagi nanti.";
  }
};