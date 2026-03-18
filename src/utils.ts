import { GoogleGenAI, Type } from "@google/genai";

export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const checkContentSafety = async (text: string) => {
  if (!text || text.trim() === '') return { isHateful: false, reason: '' };
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following text for hate speech, racism, anti-LGBTQ+ sentiment, or other highly offensive content. Text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isHateful: { type: Type.BOOLEAN, description: "True if the text contains hate speech, racism, anti-LGBTQ+ sentiment, or highly offensive content." },
            reason: { type: Type.STRING, description: "Explanation of why it was flagged, or empty string if safe." }
          },
          required: ["isHateful", "reason"]
        }
      }
    });
    const result = JSON.parse(response.text || '{"isHateful": false, "reason": ""}');
    return result;
  } catch (err) {
    console.error("Safety check failed:", err);
    return { isHateful: false, reason: '' };
  }
};

export function isCartOpen(openTime?: string, closeTime?: string): boolean {
  if (!openTime || !closeTime || typeof openTime !== 'string' || typeof closeTime !== 'string') return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [openH, openM] = openTime.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  
  const [closeH, closeM] = closeTime.split(':').map(Number);
  let closeMinutes = closeH * 60 + closeM;
  
  if (isNaN(openMinutes) || isNaN(closeMinutes)) return false;
  
  if (closeMinutes < openMinutes) {
    closeMinutes += 24 * 60;
  }
  
  let checkMinutes = currentMinutes;
  if (checkMinutes < openMinutes && closeMinutes > 24 * 60) {
    checkMinutes += 24 * 60;
  }
  
  return checkMinutes >= openMinutes && checkMinutes <= closeMinutes;
}
