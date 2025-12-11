import { GoogleGenAI, Type } from "@google/genai";
import { Activity, FocusArea } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateActivities = async (
  ageMonths: number,
  focusArea: FocusArea
): Promise<Activity[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Berikan 3 aktivitas stimulasi yang menyenangkan, aman, dan mendidik untuk bayi usia ${ageMonths} bulan dengan fokus pada ${focusArea}.
      Pastikan instruksi jelas dan menggunakan barang-barang rumah tangga yang sederhana. Bahasa Indonesia.`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json",
        responseSchema: {
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
              benefits: { type: Type.STRING, description: "Manfaat perkembangan bagi bayi" },
              safetyTip: { type: Type.STRING, description: "Tips keamanan penting" }
            },
            required: ["title", "duration", "materials", "instructions", "benefits", "safetyTip"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as Activity[];
    }
    return [];
  } catch (error) {
    console.error("Error generating activities:", error);
    return [];
  }
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