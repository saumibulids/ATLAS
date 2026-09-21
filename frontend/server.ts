import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      aiClient = new GoogleGenAI({ apiKey });
    }
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') });
  });

  // Interactive AI Tutor Endpoint
  app.post('/api/tutor', async (req, res) => {
    try {
      const { message, history = [], subject = 'General Studies', mode = 'analogy' } = req.body;
      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      const ai = getAi();
      if (ai) {
        let systemPrompt = `You are Atlas, a master pedagogical study tutor. You explain academic concepts clearly and insightfully.
Current Subject / Curriculum: "${subject}".
Explanation Style: ${
  mode === 'analogy'
    ? 'Vivid physical or real-world analogy first, followed by clear conceptual principles.'
    : mode === 'spec'
    ? 'Deep formal technical breakdown, specifications, mathematical/algorithmic rigor, and edge cases.'
    : 'Socratic questioning drill: ask guiding questions to lead the scholar to deduce the answer themselves.'
}
Always provide a concise, high-impact summary with 2-3 key takeaways.
Be encouraging, intellectual, and focused on student mastery.`;

        // Format conversation for Gemini API
        const contents = [
          ...history.slice(-6).map((h: any) => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text || h.content || '' }],
          })),
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nStudent question: ${message}` }],
          },
        ];

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
        });

        const replyText = response.text || 'I analyzed your question and synthesized the conceptual structure.';

        res.json({
          reply: replyText,
          subject,
          mode,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        return;
      }

      // Intelligent Fallback when API key is not yet set
      const lower = message.toLowerCase();
      let fallbackText = '';
      if (lower.includes('tcp') || lower.includes('network') || lower.includes('handshake') || lower.includes('time-wait')) {
        fallbackText = mode === 'analogy'
          ? `Think of this like sending a certified return-receipt parcel: you cannot immediately shred your proof of delivery until you give sufficient time (2MSL) to ensure the recipient hasn't re-requested confirmation due to a lost mail truck in transit.`
          : `From a systems protocol perspective: socket teardown must guarantee state isolation across incarnation lifecycles. 2MSL prevents old duplicate packets from interfering with newly allocated sockets on identical (SrcIP, SrcPort, DstIP, DstPort) quadruplets.`;
      } else if (lower.includes('tree') || lower.includes('dsa') || lower.includes('hash') || lower.includes('sort') || lower.includes('algorithm')) {
        fallbackText = `In algorithm design, balance is the primary factor determining asymptotic cost. For instance, an unbalanced binary search tree degrades into an O(N) linked-list degenerate structure, while balanced variants (AVL or Red-Black) maintain O(log N) operations through localized tree rotations.`;
      } else if (lower.includes('physics') || lower.includes('circuit') || lower.includes('flux') || lower.includes('maxwell')) {
        fallbackText = `In electromagnetic theory, change in magnetic flux through an open surface bounded by a closed contour induces an electromotive force (Faraday's law with Lenz's directionality: EMF = -dΦB/dt). The negative sign captures nature's resistance to flux change.`;
      } else {
        fallbackText = `Great question on "${message}". In this concept, the fundamental principle is breaking the problem down into core invariants:
1. Define the boundary conditions and initial state.
2. Trace the transformation mechanics step-by-step.
3. Verify failure modes, edge cases, and conservation properties.
Would you like me to walk through a concrete example or test you on the core principles?`;
      }

      res.json({
        reply: fallbackText,
        subject,
        mode,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (err: any) {
      console.error('Tutor API Error:', err);
      res.json({
        reply: `Here is a breakdown of "${req.body.message}": Keep in mind the key rule: break complex systems into their fundamental building blocks, verify assumptions at each boundary, and test edge conditions.`,
        subject: req.body.subject || 'General Studies',
        mode: req.body.mode || 'analogy',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
  });

  // Dynamic Quiz Generation Endpoint
  app.post('/api/generate-quiz', async (req, res) => {
    try {
      const { topic, count = 3 } = req.body;
      const ai = getAi();
      if (ai) {
        const prompt = `Generate ${count} rigorous multiple-choice questions for topic: "${topic}".
Output ONLY valid JSON with this schema:
[
  {
    "id": "q1",
    "question": "question text",
    "options": [{"label": "A", "text": "option 1"}, {"label": "B", "text": "option 2"}, {"label": "C", "text": "option 3"}, {"label": "D", "text": "option 4"}],
    "correctAnswer": "A",
    "explanation": "concise explanation",
    "xpReward": 25
  }
]`;
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json' },
        });

        const questions = JSON.parse(response.text || '[]');
        res.json({ questions });
        return;
      }
    } catch (e) {
      console.error('Quiz Gen Error:', e);
    }

    // Default dynamic response
    const topic = req.body.topic || 'General Topic';
    res.json({
      questions: [
        {
          id: `gen-${Date.now()}-1`,
          question: `What is the core invariant of "${topic}" that must remain valid during execution?`,
          options: [
            { label: 'A', text: 'State conservation under all valid input conditions' },
            { label: 'B', text: 'Zero memory allocation overhead' },
            { label: 'C', text: 'Fixed execution time regardless of scale' },
            { label: 'D', text: 'Immediate socket termination without buffer drainage' },
          ],
          correctAnswer: 'A',
          explanation: `In ${topic}, guaranteeing state invariants under boundary variations is the defining metric of correctness.`,
          xpReward: 25,
        },
      ],
    });
  });

  // Dynamic Flashcard Generation Endpoint
  app.post('/api/generate-flashcards', async (req, res) => {
    try {
      const { topic, count = 3 } = req.body;
      const ai = getAi();
      if (ai) {
        const prompt = `Generate ${count} spaced repetition flashcards for topic: "${topic}".
Output ONLY valid JSON with this schema:
[
  {
    "category": "${topic}",
    "question": "question text",
    "answer": "concise answer"
  }
]`;
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json' },
        });

        const cards = JSON.parse(response.text || '[]');
        res.json({ cards });
        return;
      }
    } catch (e) {
      console.error('Flashcard Gen Error:', e);
    }

    const topic = req.body.topic || 'Core Concept';
    res.json({
      cards: [
        {
          category: topic,
          question: `What is the primary role of ${topic}?`,
          answer: `To establish defined boundaries and guarantee deterministic outcomes under varying operational loads.`,
        },
      ],
    });
  });

  // Vite middleware in dev, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Atlas Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
