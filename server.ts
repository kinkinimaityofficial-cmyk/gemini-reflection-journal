import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Top-Level Request Deserialization
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Lazy GoogleGenAI client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Requests will fail if key is missing.');
    }
    aiClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return aiClient;
}

// Resilient Gemini Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface GenerateResponseResult {
  text: string;
  modelUsed: string;
  attempts: string[];
}

/**
 * Generate AI content with fallback ladder protocol
 */
async function generateContentWithFallback(
  systemInstruction: string,
  contents: string | Array<{ role: string; parts: Array<{ text: string }> }>
): Promise<GenerateResponseResult> {
  const ai = getAI();
  const attempts: string[] = [];
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      attempts.push(model);
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const text = response.text || '';
      return {
        text,
        modelUsed: model,
        attempts,
      };
    } catch (err: any) {
      console.error(`Attempt with model ${model} failed:`, err?.message || err);
      lastError = err;
      // Continue down the fallback ladder for 503, 429, 404, 500, or invalid model errors
    }
  }

  throw new Error(`All models in fallback ladder failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// API Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// API: Process Reflection / Journal Multi-turn Prompt
app.post('/api/gemini/reflect', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { prompt, mode = 'reflect', history = [] } = body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Valid prompt text is required' });
    }

    const safePrompt = prompt.trim();
    const safeHistory: ChatMessage[] = Array.isArray(history) ? history : [];

    let systemInstruction = `You are a thoughtful, empathetic, and insightful personal journaling and reflection partner powered by Gemini.
Your purpose is to help the user process their thoughts, gain clarity, organize ideas, discover insights, and find actionable personal growth takeaways.
Always maintain an encouraging, non-judgmental, warm, and structured tone. Use clean markdown formatting (bolding, clear bullet points, brief paragraphs) where appropriate.`;

    if (mode === 'summarize') {
      systemInstruction += `\nMode: Summarization & Theme Extraction. Provide:
1. **Core Theme & Summary**: A crisp 2-3 sentence distillation of what the user expressed.
2. **Key Insights & Emotional Pulse**: 2-4 bullet points highlighting underlying patterns or feelings.
3. **Takeaway Question**: 1 gentle, high-impact reflection question.`;
    } else if (mode === 'brainstorm') {
      systemInstruction += `\nMode: Brainstorming & Idea Expansion.
Provide creative, diverse angles, alternative perspectives, structured solutions, and imaginative possibilities based on the user's reflection.`;
    } else if (mode === 'action') {
      systemInstruction += `\nMode: Actionable Growth Steps.
Turn the user's reflection into practical, bite-sized, and realistic action items or habits they can apply today, this week, or over time.`;
    } else {
      systemInstruction += `\nMode: Deep Reflection & Gentle Inquiry.
Validate their experience, offer a fresh thoughtful perspective, and ask 1-2 thoughtful guiding questions to help them dive deeper into their thoughts.`;
    }

    // Build multi-turn contents format for GoogleGenAI SDK
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Map conversation history
    for (const msg of safeHistory) {
      if (msg.role && msg.content) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: String(msg.content) }],
        });
      }
    }

    // Append current turn
    contents.push({
      role: 'user',
      parts: [{ text: safePrompt }],
    });

    const result = await generateContentWithFallback(systemInstruction, contents);

    return res.json({
      success: true,
      response: result.text,
      modelUsed: result.modelUsed,
      attempts: result.attempts,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/reflect:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to process reflection with Gemini',
    });
  }
});

// API: Generate Entry Title & Tags
app.post('/api/gemini/summarize-title', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }

    const systemInstruction = `You are a concise metadata tagger. Given a user's journal reflection, output a JSON object with:
1. "title": A meaningful, poetic or descriptive title (maximum 6 words).
2. "tags": An array of 2 to 4 relevant single-word or two-word lowercase tags (e.g. ["gratitude", "career", "clarity"]).
Output ONLY valid raw JSON with keys "title" and "tags". No markdown wrappers, no backticks.`;

    const promptText = `Generate title and tags for this entry:\n"${content.slice(0, 1000)}"`;
    const result = await generateContentWithFallback(systemInstruction, promptText);

    let parsed = { title: 'Journal Reflection', tags: ['journal', 'reflection'] };
    try {
      const cleanJson = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      // fallback if JSON parsing is imperfect
      const lines = result.text.split('\n').filter(Boolean);
      if (lines.length > 0) {
        parsed.title = lines[0].replace(/["{}]/g, '').trim().slice(0, 40);
      }
    }

    return res.json({
      success: true,
      title: parsed.title || 'Journal Reflection',
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['reflection'],
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/summarize-title:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to summarize title',
      title: 'Journal Entry',
      tags: ['reflection'],
    });
  }
});

// Start Express Server with Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
