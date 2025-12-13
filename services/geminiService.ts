import { Activity, FocusArea } from "../types";

// --- API CLIENT ---
async function callBackendAPI(task: string, payload: any) {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, payload }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("Terlalu banyak permintaan. Tunggu sebentar.");
      if (response.status === 202) return await response.json(); // Queued job
      throw new Error(`Server Error (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${task}]:`, error);
    throw error;
  }
}

// --- SERVICES ---

export const generateActivities = async (
  ageMonths: number,
  focusArea: FocusArea,
  exactAgeDisplay: string = "" 
): Promise<Activity[]> => {
  const ageContext = exactAgeDisplay ? `tepatnya ${exactAgeDisplay}` : `${ageMonths} bulan`;
  
  try {
    const data = await callBackendAPI('activities', { ageContext, focusArea });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    // Return empty array to trigger UI error message
    return [];
  }
};

export const getMilestoneAdvice = async (ageMonths: number): Promise<string> => {
  try {
    const data = await callBackendAPI('milestone_advice', { ageMonths });
    return data.text || "Tidak dapat memuat saran saat ini.";
  } catch (error) {
    return "Saran perkembangan sedang tidak tersedia.";
  }
}

export const sendMessageToAssistant = async (
  message: string, 
  babyName: string, 
  ageDisplay: string
): Promise<string> => {
  try {
    const data = await callBackendAPI('chat', { 
        message, 
        babyName, 
        ageDisplay 
    });
    return data.text || "Maaf, saya tidak mengerti.";
  } catch (error) {
    return "Maaf Bunda, koneksi saya sedang gangguan. Boleh diulang pertanyaannya?";
  }
};