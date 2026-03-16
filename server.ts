import express from "express";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";

// Initialize Firebase Admin
let db: admin.firestore.Firestore | null = null;

function getDb() {
  if (!db) {
    let projectId = process.env.FIREBASE_PROJECT_ID;
    let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId) projectId = projectId.trim().replace(/^["']|["']$/g, '');
    if (clientEmail) clientEmail = clientEmail.trim().replace(/^["']|["']$/g, '');

    if (privateKey) {
      // Handle case where user might have pasted the entire JSON service account file
      if (privateKey.trim().startsWith('{')) {
        try {
          const serviceAccount = JSON.parse(privateKey);
          if (serviceAccount.private_key) privateKey = serviceAccount.private_key;
          if (serviceAccount.project_id && !projectId) { /* could potentially use this too */ }
        } catch (e) {
          // Not valid JSON, continue with string processing
        }
      }

      // Clean up the string
      privateKey = privateKey.trim();
      
      // Remove surrounding quotes (common when pasting into env var fields)
      if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || 
          (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
      }

      // Replace literal \n with actual newlines
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      // Ensure the key has the correct PEM headers and footers with newlines
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
      } else {
        // If it has headers, make sure they are on their own lines
        privateKey = privateKey.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
        privateKey = privateKey.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
        // Remove any double newlines we might have created
        privateKey = privateKey.replace(/\n\n+/g, '\n');
      }
    }

    if (!projectId || !clientEmail || !privateKey) {
      console.warn("Firebase credentials missing. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your environment variables.");
      throw new Error("Firebase credentials missing");
    }

    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      }
      db = admin.firestore();
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      throw new Error(`Firebase initialization failed: ${(error as Error).message}`);
    }
  }
  return db;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  let ai: GoogleGenAI | null = null;
  const getAi = () => {
    if (!ai) {
      if (!process.env.GEMINI_API_KEY) {
        console.warn('GEMINI_API_KEY is not set. Content safety checks will be bypassed.');
        return null;
      }
      ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return ai;
  };

  const checkContentSafety = async (text: string) => {
    if (!text || text.trim() === '') return { isHateful: false, reason: '' };
    const aiClient = getAi();
    if (!aiClient) return { isHateful: false, reason: '' }; // Bypass if no key
    try {
      const response = await aiClient.models.generateContent({
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

  const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
      getDb(); // Ensure admin is initialized
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      (req as any).user = decodedToken;
      next();
    } catch (error) {
      console.error('Error verifying auth token', error);
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  const stripImages = (obj: any) => {
    if (!obj) return obj;
    const copy = { ...obj };
    if (copy.imageUrl) copy.imageUrl = '[IMAGE DATA]';
    if (copy.gallery) copy.gallery = '[GALLERY DATA]';
    if (copy.menuGallery) copy.menuGallery = '[MENU GALLERY DATA]';
    return copy;
  };

  const logAction = async (userEmail: string, action: string, details: string, changes?: any, docId?: string, collectionName?: string) => {
    try {
      const logData: any = {
        userEmail,
        action,
        details,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };
      if (changes) {
        logData.changes = changes;
      }
      if (docId) logData.docId = docId;
      if (collectionName) logData.collectionName = collectionName;
      await getDb().collection("logs").add(logData);
    } catch (err) {
      console.error("Failed to log action:", err);
    }
  };

  const cleanupDeletedItems = async () => {
    try {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const podsSnapshot = await getDb().collection("pods").where("deletedAt", "<", oneWeekAgo).get();
      const cartsSnapshot = await getDb().collection("carts").where("deletedAt", "<", oneWeekAgo).get();
      
      if (podsSnapshot.docs.length > 0 || cartsSnapshot.docs.length > 0) {
        const batch = getDb().batch();
        podsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        cartsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`Cleaned up ${podsSnapshot.docs.length} pods and ${cartsSnapshot.docs.length} carts.`);
      }
    } catch (err) {
      console.error("Cleanup error:", err);
    }
  };

  // Run cleanup on startup and every hour
  cleanupDeletedItems();
  setInterval(cleanupDeletedItems, 60 * 60 * 1000);

  // API Routes
  app.get("/api/logs", authMiddleware, async (req, res) => {
    try {
      const snapshot = await getDb().collection("logs").orderBy("timestamp", "desc").limit(100).get();
      const logs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString()
        };
      });
      res.json(logs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/pods", async (req, res) => {
    try {
      const snapshot = await getDb().collection("pods").get();
      let pods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter out the Thompson Track pod as requested
      pods = pods.filter((p: any) => {
        const name = (p.name || '').toLowerCase();
        return !name.includes('thompson track');
      });

      if (req.query.includeDeleted !== 'true') {
        pods = pods.filter((p: any) => !p.deletedAt);
      }
      res.json(pods);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/pods/:id", async (req, res) => {
    try {
      const doc = await getDb().collection("pods").doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Pod not found" });
      const data: any = { id: doc.id, ...doc.data() };
      
      // Hide Thompson Track pod if requested
      const name = (data.name || '').toLowerCase();
      if (name.includes('thompson track')) {
        return res.status(404).json({ error: "Pod not found" });
      }

      if (data.deletedAt && req.query.includeDeleted !== 'true') {
        return res.status(404).json({ error: "Pod not found" });
      }
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/pods", authMiddleware, async (req, res) => {
    try {
      const { name, description, latitude, longitude, address, imageUrl } = req.body;
      const data = { name, description, latitude, longitude, address, imageUrl };
      
      const safety = await checkContentSafety(`${name} ${description} ${address}`);
      if (safety.isHateful) {
        await logAction((req as any).user.email || 'Unknown User', 'Blocked Offensive Content', `Attempted to create Pod. Reason: ${safety.reason}`, { attemptedData: stripImages(data) });
        return res.status(400).json({ error: `Content flagged for violating community guidelines: ${safety.reason}` });
      }

      const docRef = await getDb().collection("pods").add(data);
      await logAction((req as any).user.email || 'Unknown User', 'Created Pod', `Pod: ${name}`, { added: stripImages(data) }, docRef.id, 'pods');
      res.json({ id: docRef.id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.put("/api/pods/:id", authMiddleware, async (req, res) => {
    try {
      const { name, description, latitude, longitude, address, imageUrl } = req.body;
      const data = { name, description, latitude, longitude, address, imageUrl };
      
      const safety = await checkContentSafety(`${name} ${description} ${address}`);
      if (safety.isHateful) {
        await logAction((req as any).user.email || 'Unknown User', 'Blocked Offensive Content', `Attempted to update Pod. Reason: ${safety.reason}`, { attemptedData: stripImages(data) });
        return res.status(400).json({ error: `Content flagged for violating community guidelines: ${safety.reason}` });
      }

      const oldDoc = await getDb().collection("pods").doc(req.params.id).get();
      const oldData = oldDoc.exists ? oldDoc.data() : null;

      await getDb().collection("pods").doc(req.params.id).update(data);
      await logAction((req as any).user.email || 'Unknown User', 'Updated Pod', `Pod: ${name}`, { old: stripImages(oldData), new: stripImages(data) }, req.params.id, 'pods');
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/pods/:id", authMiddleware, async (req, res) => {
    const podId = req.params.id;
    console.log(`Server: Received request to delete pod ${podId}`);
    try {
      const podDoc = await getDb().collection("pods").doc(podId).get();
      const podName = podDoc.exists ? podDoc.data()?.name : podId;

      const batch = getDb().batch();
      const deletedAt = Date.now();
      
      // Soft delete all carts for this pod
      const cartsSnapshot = await getDb().collection("carts").where("podId", "==", podId).get();
      cartsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { deletedAt });
      });
      
      // Soft delete the pod
      const podRef = getDb().collection("pods").doc(podId);
      batch.update(podRef, { deletedAt });
      
      await batch.commit();
      await logAction((req as any).user.email || 'Unknown User', 'Soft Deleted Pod', `Pod: ${podName}`, { deleted: stripImages(podDoc.data()) }, podId, 'pods');
      res.json({ success: true });
    } catch (err) {
      console.error("Server: Error deleting pod:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/pods/:id/restore", authMiddleware, async (req, res) => {
    try {
      const podId = req.params.id;
      const batch = getDb().batch();
      
      // Restore all carts for this pod
      const cartsSnapshot = await getDb().collection("carts").where("podId", "==", podId).get();
      cartsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { deletedAt: admin.firestore.FieldValue.delete() });
      });
      
      // Restore the pod
      const podRef = getDb().collection("pods").doc(podId);
      batch.update(podRef, { deletedAt: admin.firestore.FieldValue.delete() });
      
      await batch.commit();
      await logAction((req as any).user.email || 'Unknown User', 'Restored Pod', `Pod ID: ${podId}`, null, podId, 'pods');
      res.json({ success: true });
    } catch (err) {
      console.error("Server: Error restoring pod:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/pods/:podId/carts", async (req, res) => {
    try {
      const snapshot = await getDb().collection("carts").where("podId", "==", req.params.podId).get();
      let carts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (req.query.includeDeleted !== 'true') {
        carts = carts.filter((c: any) => !c.deletedAt);
      }
      res.json(carts);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/carts", async (req, res) => {
    try {
      const snapshot = await getDb().collection("carts").get();
      let carts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (req.query.includeDeleted !== 'true') {
        carts = carts.filter((c: any) => !c.deletedAt);
      }
      res.json(carts);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/carts/:id", async (req, res) => {
    try {
      const doc = await getDb().collection("carts").doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Cart not found" });
      const data: any = { id: doc.id, ...doc.data() };
      if (data.deletedAt && req.query.includeDeleted !== 'true') {
        return res.status(404).json({ error: "Cart not found" });
      }
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/carts", authMiddleware, async (req, res) => {
    try {
      const { podId, name, cuisine, description, imageUrl, gallery, menuGallery, tags, instagramUrl, websiteUrl, rating, latitude, longitude, openTime, closeTime } = req.body;
      const data: any = { podId, name, cuisine, description, imageUrl, gallery, menuGallery, instagramUrl, websiteUrl, rating };
      if (tags !== undefined) data.tags = tags;
      if (latitude !== undefined) data.latitude = latitude;
      if (longitude !== undefined) data.longitude = longitude;
      if (openTime !== undefined) data.openTime = openTime;
      if (closeTime !== undefined) data.closeTime = closeTime;
      
      const safety = await checkContentSafety(`${name} ${description} ${cuisine}`);
      if (safety.isHateful) {
        await logAction((req as any).user.email || 'Unknown User', 'Blocked Offensive Content', `Attempted to create Cart. Reason: ${safety.reason}`, { attemptedData: stripImages(data) });
        return res.status(400).json({ error: `Content flagged for violating community guidelines: ${safety.reason}` });
      }

      const docRef = await getDb().collection("carts").add(data);
      await logAction((req as any).user.email || 'Unknown User', 'Created Cart', `Cart: ${name}`, { added: stripImages(data) }, docRef.id, 'carts');
      res.json({ id: docRef.id });
    } catch (err) {
      console.error("Error inserting cart:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.put("/api/carts/:id", authMiddleware, async (req, res) => {
    try {
      const { name, cuisine, description, imageUrl, gallery, menuGallery, tags, instagramUrl, websiteUrl, rating, latitude, longitude, openTime, closeTime } = req.body;
      const data: any = { name, cuisine, description, imageUrl, gallery, menuGallery, instagramUrl, websiteUrl, rating };
      if (tags !== undefined) data.tags = tags;
      if (latitude !== undefined) data.latitude = latitude;
      if (longitude !== undefined) data.longitude = longitude;
      if (openTime !== undefined) data.openTime = openTime;
      if (closeTime !== undefined) data.closeTime = closeTime;
      
      const safety = await checkContentSafety(`${name} ${description} ${cuisine}`);
      if (safety.isHateful) {
        await logAction((req as any).user.email || 'Unknown User', 'Blocked Offensive Content', `Attempted to update Cart. Reason: ${safety.reason}`, { attemptedData: stripImages(data) });
        return res.status(400).json({ error: `Content flagged for violating community guidelines: ${safety.reason}` });
      }

      const oldDoc = await getDb().collection("carts").doc(req.params.id).get();
      const oldData = oldDoc.exists ? oldDoc.data() : null;

      if (oldData?.ownerEmail && oldData.ownerEmail !== (req as any).user.email?.toLowerCase() && (req as any).user.email?.toLowerCase() !== 'bryonparis@gmail.com') {
        return res.status(403).json({ error: "Only the cart owner can edit this cart." });
      }

      await getDb().collection("carts").doc(req.params.id).update(data);
      await logAction((req as any).user.email || 'Unknown User', 'Updated Cart', `Cart: ${name}`, { old: stripImages(oldData), new: stripImages(data) }, req.params.id, 'carts');
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating cart:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/carts/:id/favorite", authMiddleware, async (req, res) => {
    try {
      const cartId = req.params.id;
      const userEmail = (req as any).user.email?.toLowerCase();
      if (!userEmail) return res.status(401).json({ error: "Unauthorized" });

      const cartRef = getDb().collection("carts").doc(cartId);
      const cartDoc = await cartRef.get();
      if (!cartDoc.exists) return res.status(404).json({ error: "Cart not found" });

      const cartData = cartDoc.data()!;
      const favorites = cartData.favorites || [];
      
      let newFavorites;
      if (favorites.includes(userEmail)) {
        newFavorites = favorites.filter((e: string) => e !== userEmail);
      } else {
        newFavorites = [...favorites, userEmail];
      }

      await cartRef.update({ favorites: newFavorites });
      res.json({ success: true, favorites: newFavorites });
    } catch (err) {
      console.error("Error toggling favorite:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/carts/:id", authMiddleware, async (req, res) => {
    const cartId = req.params.id;
    console.log(`Server: Received request to delete cart ${cartId}`);
    try {
      const cartDoc = await getDb().collection("carts").doc(cartId).get();
      if (!cartDoc.exists) return res.status(404).json({ error: "Cart not found" });
      
      const cartData = cartDoc.data();
      if (cartData?.ownerEmail && cartData.ownerEmail !== (req as any).user.email?.toLowerCase() && (req as any).user.email?.toLowerCase() !== 'bryonparis@gmail.com') {
        return res.status(403).json({ error: "Only the cart owner can delete this cart." });
      }

      const cartName = cartData?.name || cartId;

      await getDb().collection("carts").doc(cartId).update({ deletedAt: Date.now() });
      await logAction((req as any).user.email || 'Unknown User', 'Soft Deleted Cart', `Cart: ${cartName}`, { deleted: stripImages(cartDoc.data()) }, cartId, 'carts');
      res.json({ success: true });
    } catch (err) {
      console.error("Server: Error deleting cart:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/carts/:id/restore", authMiddleware, async (req, res) => {
    try {
      const cartId = req.params.id;
      await getDb().collection("carts").doc(cartId).update({ deletedAt: admin.firestore.FieldValue.delete() });
      await logAction((req as any).user.email || 'Unknown User', 'Restored Cart', `Cart ID: ${cartId}`, null, cartId, 'carts');
      res.json({ success: true });
    } catch (err) {
      console.error("Server: Error restoring cart:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/ownership_requests", async (req, res) => {
    try {
      const { cartId, email, tenantId } = req.body;
      const data = {
        cartId,
        email,
        tenantId,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      const docRef = await getDb().collection("ownership_requests").add(data);
      res.json({ id: docRef.id });
    } catch (err) {
      console.error("Error creating ownership request:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/ownership_requests", authMiddleware, async (req, res) => {
    try {
      const snapshot = await getDb().collection("ownership_requests").orderBy("createdAt", "desc").get();
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(requests);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.put("/api/ownership_requests/:id", authMiddleware, async (req, res) => {
    try {
      const { status } = req.body;
      const reqDoc = await getDb().collection("ownership_requests").doc(req.params.id).get();
      if (!reqDoc.exists) return res.status(404).json({ error: "Request not found" });
      
      const reqData = reqDoc.data()!;
      await getDb().collection("ownership_requests").doc(req.params.id).update({ status });
      
      if (status === 'approved' && reqData.cartId && reqData.email) {
        await getDb().collection("carts").doc(reqData.cartId).update({ ownerEmail: reqData.email.toLowerCase() });
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating ownership request:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Add request logging to debug static file serving
    app.use((req, res, next) => {
      console.log(`[Static] Request: ${req.method} ${req.url}`);
      next();
    });
    
    app.get("/debug-assets", (req, res) => {
      try {
        const assetsPath = path.join(process.cwd(), "dist", "assets");
        const files = fs.readdirSync(assetsPath);
        const fileStats = files.map(f => {
          const stat = fs.statSync(path.join(assetsPath, f));
          return `${f}: ${stat.size} bytes`;
        });
        res.send(`Assets:\n${fileStats.join('\n')}`);
      } catch (err) {
        res.status(500).send(`Error: ${(err as Error).message}`);
      }
    });

    app.use(express.static(path.join(process.cwd(), "dist"), { 
      index: false,
      setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        }
      }
    }));
    
    app.get("*", (req, res) => {
      console.log(`[Fallback] Serving index.html for: ${req.url}`);
      try {
        const indexPath = path.join(process.cwd(), "dist", "index.html");
        let html = fs.readFileSync(indexPath, "utf-8");
        
        // Remove crossorigin attributes that might cause CORS issues on some hosts
        html = html.replace(/crossorigin/g, "");
        
        // Inject environment variables into the HTML so the frontend can read them at runtime
        const envScript = `<script>
          window.__ENV__ = {
            VITE_FIREBASE_API_KEY: ${JSON.stringify(process.env.VITE_FIREBASE_API_KEY || "")},
            VITE_FIREBASE_AUTH_DOMAIN: ${JSON.stringify(process.env.VITE_FIREBASE_AUTH_DOMAIN || "")},
            VITE_FIREBASE_PROJECT_ID: ${JSON.stringify(process.env.VITE_FIREBASE_PROJECT_ID || "")},
            VITE_FIREBASE_STORAGE_BUCKET: ${JSON.stringify(process.env.VITE_FIREBASE_STORAGE_BUCKET || "")},
            VITE_FIREBASE_MESSAGING_SENDER_ID: ${JSON.stringify(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "")},
            VITE_FIREBASE_APP_ID: ${JSON.stringify(process.env.VITE_FIREBASE_APP_ID || "")},
            VITE_GOOGLE_MAPS_API_KEY: ${JSON.stringify(process.env.VITE_GOOGLE_MAPS_API_KEY || "")},
            VITE_GOOGLE_MAPS_MAP_ID: ${JSON.stringify(process.env.VITE_GOOGLE_MAPS_MAP_ID || "")}
          };
        </script>`;
        
        html = html.replace("</head>", `${envScript}</head>`);
        res.send(html);
      } catch (err) {
        console.error("Error serving index.html:", err);
        res.status(500).send("Error loading application");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
