import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if config is missing to prevent blank screen crashes
if (!firebaseConfig.apiKey) {
  console.error("FIREBASE CONFIG IS MISSING! Please check your environment variables.");
  if (typeof document !== 'undefined') {
    document.body.innerHTML = `
      <div style="padding: 40px; font-family: sans-serif; text-align: center;">
        <h1 style="color: red;">Configuration Error</h1>
        <p>Your Firebase Environment Variables are missing.</p>
        <p>If you are on Render, make sure you added the <b>VITE_FIREBASE_*</b> variables and clicked <b>Manual Deploy -> Clear build cache & deploy</b>.</p>
      </div>
    `;
  }
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
