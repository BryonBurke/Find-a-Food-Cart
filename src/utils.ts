import { GoogleGenAI, Type } from "@google/genai";
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

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

export const uploadFileToStorage = async (file: File): Promise<string> => {
  const uploadPromise = (async () => {
    const name = file.name || `upload_${Date.now()}.jpg`;
    const fileExtension = name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
    const storageRef = ref(storage, `uploads/${fileName}`);
    
    console.log(`Starting upload for ${name} (${file.size} bytes)`);
    
    // Upload the file directly to Firebase Storage with metadata
    const metadata = {
      contentType: file.type || 'image/jpeg'
    };
    
    return new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);
      
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done. State: ${snapshot.state}`);
        }, 
        (error) => {
          console.error("Upload failed in state_changed:", error);
          reject(error);
        }, 
        async () => {
          console.log("Upload successful, getting download URL...");
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (err) {
            console.error("Failed to get download URL:", err);
            reject(err);
          }
        }
      );
    });
  })();

  const timeoutPromise = new Promise<string>((_, reject) => 
    setTimeout(() => reject(new Error("Upload timed out after 120 seconds")), 120000)
  );

  return Promise.race([uploadPromise, timeoutPromise]);
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
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not found, skipping safety check");
      return { isHateful: false, reason: '' };
    }
    const ai = new GoogleGenAI({ apiKey });
    
    // Add a timeout to the safety check
    const safetyPromise = ai.models.generateContent({
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

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Safety check timed out")), 10000)
    );

    const response = await Promise.race([safetyPromise, timeoutPromise]) as any;
    const result = JSON.parse(response.text || '{"isHateful": false, "reason": ""}');
    return result;
  } catch (err) {
    console.error("Safety check failed:", err);
    return { isHateful: false, reason: '' };
  }
};

export const getRandomFoodImage = (seed: string) => {
  const keywords = ['food', 'restaurant', 'cart', 'streetfood', 'meal', 'cooking'];
  const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
  return `https://picsum.photos/seed/${encodeURIComponent(seed + '-' + randomKeyword)}/1200/800`;
};
