import { Activity, FocusArea } from "../types";

// --- API CLIENT ---
// Centralized fetcher that handles the network call to our new Backend
async function callBackendAPI(task: string, payload: any) {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task, payload }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Terlalu banyak permintaan. Mohon tunggu sebentar.");
      }
      throw new Error(`Server Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Call Failed:", error);
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
    return data as Activity[];
  } catch (error) {
    console.error("Activity generation failed:", error);
    return [];
  }
};

export const getMilestoneAdvice = async (ageMonths: number): Promise<string> => {
  try {
    const data = await callBackendAPI('milestone_advice', { ageMonths });
    return data.text || "Tidak dapat memuat saran saat ini.";
  } catch (error) {
    return "Tidak dapat memuat saran saat ini.";
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
    return data.text;
  } catch (error) {
    return "Maaf Bunda, koneksi saya sedang gangguan. Boleh diulang pertanyaannya?";
  }
};