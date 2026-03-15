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
    const envDump = JSON.stringify({
      VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY || "MISSING",
      VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "MISSING",
      VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || "MISSING",
      VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "MISSING",
      VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "MISSING",
      VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID || "MISSING",
      VITE_GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "MISSING",
      VITE_GOOGLE_MAPS_MAP_ID: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "MISSING"
    }, null, 2);

    document.body.innerHTML = `
      <div style="padding: 40px; font-family: sans-serif; text-align: center; max-width: 800px; margin: 0 auto;">
        <h1 style="color: red;">Configuration Error</h1>
        <p>Your Firebase Environment Variables are missing in the built application.</p>
        
        <div style="text-align: left; background: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">What the app currently sees:</h3>
          <pre style="overflow-x: auto; margin: 0;">${envDump}</pre>
        </div>

        <div style="text-align: left; background: #fff3cd; padding: 20px; border-radius: 8px; border: 1px solid #ffe69c;">
          <h3 style="margin-top: 0; color: #856404;">Why is this happening on Render?</h3>
          <p style="color: #856404;">In Vite (React), environment variables are <strong>baked into the code during the build process</strong> (<code>npm run build</code>).</p>
          <p style="color: #856404;">If you added the variables to Render <em>after</em> the build started, or if Render used a cached build, the variables will be <code>"MISSING"</code> (undefined) in the final code.</p>
          <h4 style="color: #856404;">How to fix:</h4>
          <ol style="color: #856404;">
            <li>Go to your Render Dashboard -> Environment.</li>
            <li>Ensure all keys start with exactly <code>VITE_</code>.</li>
            <li>Go to <strong>Manual Deploy</strong> and click <strong>Clear build cache & deploy</strong>.</li>
          </ol>
        </div>
      </div>
    `;
  }
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
