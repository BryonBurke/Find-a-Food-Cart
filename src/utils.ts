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

export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const MAX_SIZE = 840;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        let quality = 0.7;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        while (dataUrl.length > 800000 && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(dataUrl);
      };
      img.onerror = () => resolve(reader.result as string);
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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

export const getShortName = (name: string) => {
  const ignoredWords = ['the', 'a', 'an', 'and', 'or', 'our', 'your', 'my', 'of', 'in', 'on', 'at'];
  const words = name.split(' ').filter(w => w.trim() !== '');
  const meaningfulWord = words.find(w => !ignoredWords.includes(w.toLowerCase().replace(/[^a-z]/g, '')));
  return meaningfulWord || words[0] || '';
};

export const getTwoLineName = (name: string) => {
  const ignoredWords = ['the', 'a', 'an', 'and', 'or', 'our', 'your', 'my', 'of', 'in', 'on', 'at'];
  const words = name.split(' ').filter(w => w.trim() !== '');
  const meaningfulWords = words.filter(w => !ignoredWords.includes(w.toLowerCase().replace(/[^a-z]/g, '')));
  if (meaningfulWords.length >= 2) {
    return meaningfulWords.slice(0, 2).join('\n');
  }
  return meaningfulWords[0] || words[0] || '';
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
