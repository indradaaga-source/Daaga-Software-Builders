import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';
const ADMIN_EMAIL = 'yashpillalamarri2013@gmail.com';
const ORDERS_DATA_FILE = path.resolve(process.cwd(), 'data', 'orders.json');

interface ServerSoftwareOrder {
  id: string;
  userId: string;
  orderNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  companyName: string;
  projectTitle: string;
  packageId: string;
  packageTitle: string;
  addonsSummary: string;
  timelineWindow: string;
  engagementModel: string;
  currency: 'INR';
  estimatedTotal: number;
  paymentPreference: string;
  paymentStatus: 'paid' | 'unpaid';
  paidAmount: number;
  paymentRef: string;
  projectBrief: string;
  referenceUrl: string;
  kickoffSlot: string;
  status: string;
  studioNote: string;
  createdAtLabel: string;
  source?: 'cloud' | 'local';
}

function getFirebaseApiKey(): string {
  try {
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) as { apiKey?: string };
      return parsed.apiKey || '';
    }
  } catch {
    // ignore
  }
  return '';
}

function readServerOrders(): ServerSoftwareOrder[] {
  try {
    if (!fs.existsSync(ORDERS_DATA_FILE)) return [];
    const raw = fs.readFileSync(ORDERS_DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeServerOrders(list: ServerSoftwareOrder[]) {
  const dir = path.dirname(ORDERS_DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(ORDERS_DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

async function verifyAdminBearerToken(authHeader?: string): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const idToken = authHeader.slice(7).trim();
  const apiKey = getFirebaseApiKey();
  if (!idToken || !apiKey) return false;
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!resp.ok) return false;
    const data = (await resp.json()) as {
      users?: Array<{ email?: string; emailVerified?: boolean }>;
    };
    const u = data.users?.[0];
    return Boolean(u?.email && u.email.toLowerCase() === ADMIN_EMAIL && u.emailVerified);
  } catch {
    return false;
  }
}

function getAiClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatApiError(err: unknown): { status: number; message: string; requiresPaidKey?: boolean } {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  if (
    lower.includes('resource_exhausted') ||
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('billing') ||
    lower.includes('paid')
  ) {
    return {
      status: 429,
      requiresPaidKey: true,
      message:
        'This model requires a billing-enabled Gemini API key or has reached free-tier quota. You can select a paid API key in Settings > Secrets.',
    };
  }
  if (lower.includes('permission_denied') || lower.includes('api_key_invalid') || lower.includes('api key')) {
    return {
      status: 403,
      message: 'Please check your Gemini API key configuration in the Settings > Secrets panel.',
    };
  }
  return {
    status: 500,
    message: raw || 'Gemini request failed. Please try again.',
  };
}

const BAKERY_SYSTEM_PROMPT = `You are "Chef Daaga AI", the warm, knowledgeable culinary concierge for Daaga's Bakery (डागाज़ बेकरी), an authentic Maharashtrian & South Indian artisanal bakehouse and filter-kaapi / chai bar.
Signature items include Shahi Naankhatai, Hyderabadi Osmania Biscuits, Madurai Butter Murukku, Pune Bhakarwadi Puffs, Ukadiche Modak, Mysore Pak, Puran Poli, Irani Mawa Cake, Puneri Kothimbir Vadi Puffs, Vada Pao, and Coorg Filter Kaapi.
Keep answers helpful, accurate, appetizing, and structured with clear bullet points when recommending dishes, spice levels, dietary options (Vegetarian, Vegan, Gluten-Free), or ingredients.`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '30mb' }));

  // Health check endpoint for Cloud Run & preview probes
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, mode: isProd ? 'production' : 'development' });
  });

  // Provide Google Maps API key from runtime env for client Maps JS SDK initialization
  app.get('/api/config/maps', (_req, res) => {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    res.json({ apiKey });
  });

  // 0. Daaga Web App Orders API (persists Instagram / guest orders alongside Firestore)
  app.post('/api/orders', (req, res) => {
    try {
      const body = req.body as Partial<ServerSoftwareOrder>;
      if (
        !body.id ||
        !body.orderNumber ||
        !body.clientName ||
        !body.clientEmail ||
        !body.projectTitle ||
        !body.projectBrief ||
        body.projectBrief.trim().length < 10
      ) {
        return res.status(400).json({ error: 'Invalid order details.' });
      }

      const estimatedTotal = Math.max(
        699,
        Math.min(1399, Number(body.estimatedTotal) === 1399 ? 1399 : 699)
      );
      const isPaid = body.paymentStatus === 'paid';
      const cleanRef = String(body.paymentRef || '').trim().slice(0, 100);

      const orderRecord: ServerSoftwareOrder = {
        id: String(body.id).slice(0, 128),
        userId: String(body.userId || 'guest-web').slice(0, 128),
        orderNumber: String(body.orderNumber).slice(0, 32),
        clientName: String(body.clientName).trim().slice(0, 100),
        clientEmail: String(body.clientEmail).trim().slice(0, 200),
        clientPhone: String(body.clientPhone || '').trim().slice(0, 30),
        companyName: String(body.companyName || '').trim().slice(0, 120),
        projectTitle: String(body.projectTitle).trim().slice(0, 160),
        packageId: String(body.packageId || 'pkg-basic-business').slice(0, 80),
        packageTitle: String(body.packageTitle || 'Basic Website').slice(0, 160),
        addonsSummary: String(body.addonsSummary || '').slice(0, 600),
        timelineWindow: String(body.timelineWindow || 'standard_4_6_weeks'),
        engagementModel: String(body.engagementModel || 'fixed_scope'),
        currency: 'INR',
        estimatedTotal,
        paymentPreference: String(body.paymentPreference || 'milestone_upi_bank'),
        paymentStatus: isPaid ? 'paid' : 'unpaid',
        paidAmount: isPaid ? estimatedTotal : 0,
        paymentRef: isPaid ? (cleanRef.length >= 3 ? cleanRef : `UPI-${body.orderNumber}`) : '',
        projectBrief: String(body.projectBrief).trim().slice(0, 2500),
        referenceUrl: String(body.referenceUrl || '').trim().slice(0, 300),
        kickoffSlot: String(body.kickoffSlot || 'Morning (10 AM – 1 PM)').slice(0, 100),
        status: 'received',
        studioNote: '',
        createdAtLabel: String(
          body.createdAtLabel ||
            new Date().toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
        ),
        source: body.source === 'cloud' ? 'cloud' : 'local',
      };

      const existing = readServerOrders().filter((o) => o.id !== orderRecord.id);
      writeServerOrders([orderRecord, ...existing]);
      return res.status(201).json({ ok: true, order: orderRecord });
    } catch (err) {
      console.error('Failed saving order:', err);
      return res.status(500).json({ error: 'Could not save order on server.' });
    }
  });

  app.get('/api/orders/lookup', (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    if (!q || q.length < 4) {
      return res.json({ order: null });
    }
    const orders = readServerOrders();
    const match = orders.find(
      (o) => o.orderNumber.toLowerCase() === q || o.clientEmail.toLowerCase() === q
    );
    return res.json({ order: match || null });
  });

  app.post('/api/orders/:id/pay', (req, res) => {
    const orderId = String(req.params.id || '');
    const { orderNumber, paymentRef, paymentPreference } = req.body as {
      orderNumber?: string;
      paymentRef?: string;
      paymentPreference?: string;
    };
    const orders = readServerOrders();
    const idx = orders.findIndex(
      (o) => o.id === orderId && (!orderNumber || o.orderNumber === orderNumber)
    );
    if (idx === -1) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    const target = orders[idx];
    const cleanRef = String(paymentRef || '').trim().slice(0, 100) || `UPI-${target.orderNumber}`;
    orders[idx] = {
      ...target,
      paymentStatus: 'paid',
      paidAmount: target.estimatedTotal,
      paymentRef: cleanRef,
      paymentPreference: paymentPreference || target.paymentPreference,
    };
    writeServerOrders(orders);
    return res.json({ ok: true, order: orders[idx] });
  });

  app.get('/api/orders/admin', async (req, res) => {
    const isVerifiedOwner = await verifyAdminBearerToken(req.headers.authorization);
    if (!isVerifiedOwner) {
      return res.status(403).json({ error: 'Owner authentication required.' });
    }
    return res.json({ orders: readServerOrders() });
  });

  app.patch('/api/orders/:id', async (req, res) => {
    const isVerifiedOwner = await verifyAdminBearerToken(req.headers.authorization);
    if (!isVerifiedOwner) {
      return res.status(403).json({ error: 'Owner authentication required.' });
    }
    const orderId = String(req.params.id || '');
    const { status, studioNote } = req.body as { status?: string; studioNote?: string };
    const orders = readServerOrders();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    orders[idx] = {
      ...orders[idx],
      status: status || orders[idx].status,
      studioNote: typeof studioNote === 'string' ? studioNote.slice(0, 600) : orders[idx].studioNote,
    };
    writeServerOrders(orders);
    return res.json({ ok: true, order: orders[idx] });
  });

  // 1. Multi-Turn Chatbot + Google Search Grounding + Google Maps Grounding
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { model, history = [], message, mode = 'chat', userLocation } = req.body as {
        model?: string;
        history?: Array<{ role: 'user' | 'model'; text: string }>;
        message: string;
        mode?: 'chat' | 'search' | 'maps';
        userLocation?: { latitude: number; longitude: number };
      };

      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required.' });
      }

      const ai = getAiClient();
      const allowedModels = [
        'gemini-4-hydrogen',
        'gemini-3.1-flash-lite',
        'gemini-4-argon',
        'gemini-4-carbon',
      ];
      const chosenModel = allowedModels.includes(model || '') ? (model as string) : 'gemini-4-hydrogen';

      if (mode === 'search') {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: message,
          config: {
            systemInstruction: BAKERY_SYSTEM_PROMPT,
            tools: [{ googleSearch: {} }],
          },
        });
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        return res.json({
          text: response.text ?? '',
          groundingChunks: chunks,
          modelUsed: 'gemini-4-hydrogen',
        });
      }

      if (mode === 'maps') {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: message,
          config: {
            systemInstruction: BAKERY_SYSTEM_PROMPT,
            tools: [{ googleMaps: {} }],
            ...(userLocation &&
            typeof userLocation.latitude === 'number' &&
            typeof userLocation.longitude === 'number'
              ? {
                  toolConfig: {
                    retrievalConfig: {
                      latLng: {
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                      },
                    },
                  },
                }
              : {}),
          },
        });
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        return res.json({
          text: response.text ?? '',
          groundingChunks: chunks,
          modelUsed: 'gemini-4-hydrogen',
        });
      }

      // Standard Multi-Turn Chat with conversation history
      const formattedHistory = history
        .filter((h) => h && h.text && (h.role === 'user' || h.role === 'model'))
        .map((h) => ({
          role: h.role,
          parts: [{ text: h.text }],
        }));

      const chat = ai.chats.create({
        model: chosenModel,
        history: formattedHistory,
        config: {
          systemInstruction: BAKERY_SYSTEM_PROMPT,
        },
      });

      const response = await chat.sendMessage({ message });
      return res.json({
        text: response.text ?? '',
        modelUsed: chosenModel,
      });
    } catch (err) {
      const formatted = formatApiError(err);
      console.error('Gemini chat error:', err);
      return res.status(formatted.status).json({
        error: formatted.message,
        requiresPaidKey: formatted.requiresPaidKey,
      });
    }
  });

  // 2. Image Creation & Editing (gemini-nano-banana-2.1)
  app.post('/api/gemini/image', async (req, res) => {
    try {
      const { prompt, aspectRatio = '1:1', imageSize = '1K', sourceImageBase64, sourceMimeType } =
        req.body as {
          prompt: string;
          aspectRatio?: string;
          imageSize?: string;
          sourceImageBase64?: string;
          sourceMimeType?: string;
        };

      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: 'Prompt is required.' });
      }

      const ai = getAiClient();
      const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];

      if (sourceImageBase64 && sourceMimeType) {
        parts.push({
          inlineData: {
            data: sourceImageBase64,
            mimeType: sourceMimeType,
          },
        });
      }
      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio,
            imageSize,
          },
        },
      });

      let imageUrl = '';
      let caption = '';
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          caption += part.text;
        }
      }

      if (!imageUrl) {
        return res.status(502).json({ error: 'No image was returned by the model.' });
      }

      return res.json({ imageUrl, caption, modelUsed: 'gemini-nano-banana-2.1' });
    } catch (err) {
      const formatted = formatApiError(err);
      console.error('Gemini image error:', err);
      return res.status(formatted.status).json({
        error: formatted.message,
        requiresPaidKey: formatted.requiresPaidKey,
      });
    }
  });

  // 3. Video Generation & Animate Image (gemini-omni-1.2-flash via Interactions API)
  app.post('/api/gemini/video', async (req, res) => {
    try {
      const { prompt, aspectRatio = '16:9', sourceImageBase64, sourceMimeType } = req.body as {
        prompt: string;
        aspectRatio?: '16:9' | '9:16';
        sourceImageBase64?: string;
        sourceMimeType?: string;
      };

      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: 'Prompt is required.' });
      }

      const ai = getAiClient();
      const validAspect = aspectRatio === '9:16' ? '9:16' : '16:9';

      const input =
        sourceImageBase64 && sourceMimeType
          ? [
              {
                type: 'image' as const,
                mime_type: sourceMimeType,
                data: sourceImageBase64,
              },
              {
                type: 'text' as const,
                text: prompt,
              },
            ]
          : prompt;

      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.2-flash',
          input,
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: validAspect,
            duration: '6s',
            resolution: '720p',
          },
        },
        { timeout: 300000 }
      );

      const videoPart = interaction.output_video;
      if (!videoPart?.data && !videoPart?.uri) {
        return res.status(502).json({ error: 'No video output returned by Omni Flash.' });
      }

      const videoUrl = videoPart.data
        ? `data:${videoPart.mime_type || 'video/mp4'};base64,${videoPart.data}`
        : videoPart.uri;

      return res.json({
        videoUrl,
        modelUsed: 'gemini-omni-1.2-flash',
      });
    } catch (err) {
      const formatted = formatApiError(err);
      console.error('Gemini video error:', err);
      return res.status(formatted.status).json({
        error: formatted.message,
        requiresPaidKey: formatted.requiresPaidKey,
      });
    }
  });

  // 4. Music Generation (lyria-3-clip-preview / lyria-3-pro-preview)
  app.post('/api/gemini/music', async (req, res) => {
    try {
      const { prompt, mode = 'clip' } = req.body as {
        prompt: string;
        mode?: 'clip' | 'pro';
      };

      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: 'Music prompt is required.' });
      }

      const ai = getAiClient();
      const model = mode === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';

      const response = await ai.models.generateContentStream({
        model,
        contents: prompt,
      });

      const audioChunks: Buffer[] = [];
      let lyrics = '';
      let mimeType = 'audio/mpeg';

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (audioChunks.length === 0 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
          }
          if (part.text) {
            lyrics += part.text;
          }
        }
      }

      if (audioChunks.length === 0) {
        return res.status(502).json({ error: 'No audio data returned by Lyria.' });
      }

      const audioBase64 = Buffer.concat(audioChunks).toString('base64');
      return res.json({
        audioDataUrl: `data:${mimeType};base64,${audioBase64}`,
        lyrics: lyrics.trim(),
        modelUsed: model,
      });
    } catch (err) {
      const formatted = formatApiError(err);
      console.error('Gemini music error:', err);
      return res.status(formatted.status).json({
        error: formatted.message,
        requiresPaidKey: formatted.requiresPaidKey,
      });
    }
  });

  // 5. Audio Transcription (gemini-3.5-transcribe)
  app.post('/api/gemini/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType = 'audio/webm' } = req.body as {
        audioBase64: string;
        mimeType?: string;
      };

      if (!audioBase64) {
        return res.status(400).json({ error: 'Audio recording data is required.' });
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text: "Transcribe this bakery order or message accurately in plain text.",
            },
          ],
        },
      });

      return res.json({
        transcript: response.text ?? '',
        modelUsed: 'gemini-3.5-transcribe',
      });
    } catch (err) {
      const formatted = formatApiError(err);
      console.error('Gemini transcribe error:', err);
      return res.status(formatted.status).json({
        error: formatted.message,
        requiresPaidKey: formatted.requiresPaidKey,
      });
    }
  });

  // Frontend serving (Vite dev middleware in dev, static dist in prod)
  if (!isProd) {
    app.use((req, _res, next) => {
      if (req.path === '/paid-orders' || req.path === '/paid-orders/') {
        req.url = '/paid-orders.html';
      }
      next();
    });
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get(['/paid-orders', '/paid-orders/'], (_req, res) => {
      res.sendFile(path.join(distPath, 'paid-orders.html'));
    });
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);

  // 6. Real-time Voice WebSocket Proxy (gemini-3.8-live)
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/live')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', async (clientWs: WebSocket) => {
    let session: Awaited<ReturnType<ReturnType<typeof getAiClient>['live']['connect']>> | null = null;
    try {
      const ai = getAiClient();
      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction:
            "You are Daaga's Bakery's friendly live voice counter assistant. Help guests explore Maharashtrian & South Indian bakes (Shahi Naankhatai, Osmania Biscuits, Ukadiche Modak, Bhakarwadi Puffs, Filter Kaapi, Mysore Pak) and custom celebration cakes concisely in warm natural speech.",
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;
            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              clientWs.send(JSON.stringify({ inputTranscript: content.inputTranscription.text }));
            }
            if (content?.outputTranscription?.text) {
              clientWs.send(JSON.stringify({ outputTranscript: content.outputTranscription.text }));
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
            }
            if (content?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onerror: (err: unknown) => {
            if (clientWs.readyState === WebSocket.OPEN) {
              const formatted = formatApiError(err);
              clientWs.send(JSON.stringify({ error: formatted.message }));
            }
          },
          onclose: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ closed: true }));
            }
          },
        },
      });

      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ ready: true }));
      }
    } catch (err) {
      const formatted = formatApiError(err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ error: formatted.message }));
        clientWs.close();
      }
      return;
    }

    clientWs.on('message', (raw) => {
      if (!session) return;
      try {
        const payload = JSON.parse(raw.toString()) as { audio?: string; text?: string };
        if (payload.audio) {
          session.sendRealtimeInput({
            audio: { data: payload.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (payload.text) {
          session.sendRealtimeInput({ text: payload.text });
        }
      } catch (e) {
        console.error('Live WS message parse error:', e);
      }
    });

    clientWs.on('close', () => {
      try {
        session?.close();
      } catch {
        // ignore close errors
      }
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Daaga Software Builders full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
