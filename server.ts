import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import type { GenerateContentParameters } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS = {
  PRIMARY: "gemini-4-hydrogen",
  FALLBACK: "gemini-3.1-flash-lite",
};

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("GEMINI_API_KEY is not configured."), { status: 400 });
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function getErrorStatus(error: any): number {
  if (typeof error?.status === "number") return error.status;
  const msg = String(error?.message || "").toLowerCase();
  if (msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("quota") || msg.includes("rate limit")) {
    return 429;
  }
  if (msg.includes("403") || msg.includes("permission_denied")) {
    return 403;
  }
  if (msg.includes("400") || msg.includes("api_key_invalid") || msg.includes("api key not valid")) {
    return 400;
  }
  if (msg.includes("404") || msg.includes("not_found")) {
    return 404;
  }
  return 500;
}

async function callWithRetry(params: Omit<GenerateContentParameters, "model">, maxRetries = 2): Promise<string> {
  const ai = getAiClient();
  let lastError: any;
  let currentModel = MODELS.PRIMARY;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model: currentModel,
      });
      return response.text || "";
    } catch (error: any) {
      lastError = error;
      const status = getErrorStatus(error);
      const errorMessage = String(error?.message || "").toLowerCase();

      // Immediately fall back from primary to flash-lite on quota, rate limit, or transient model error
      if (currentModel === MODELS.PRIMARY && (status === 429 || status === 404 || status >= 500)) {
        console.warn(`Model ${currentModel} error (${status}), falling back to ${MODELS.FALLBACK}`);
        currentModel = MODELS.FALLBACK;
        continue;
      }

      // Exponential backoff on quota/rate-limit or transient errors
      if (i < maxRetries && (status === 429 || status >= 500 || errorMessage.includes("network") || errorMessage.includes("fetch"))) {
        const waitTime = Math.pow(2, i) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      break;
    }
  }

  throw lastError || new Error("AI Generation failed");
}

function handleApiError(res: Response, error: any) {
  const status = getErrorStatus(error);
  const message = error?.message || "Failed to generate AI content.";
  console.error("Gemini API Error:", status, message);
  res.status(status).json({ error: message, status });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "2mb" }));

  app.post("/api/gemini/lesson", async (req: Request, res: Response) => {
    try {
      const { subject, grade, mode, topic, currentWeaknesses, goals } = req.body;
      if (!subject || !grade || !mode) {
        res.status(400).json({ error: "Missing required fields: subject, grade, mode" });
        return;
      }

      const prompt = `
      You are an expert human-like teacher. Teach a specific, deep-dive lesson for a ${grade} student.
      Subject: ${subject}
      Target Topic: ${topic || subject}
      Learning Mode Preference: ${mode}
      ${goals ? `Student Learning Goals: ${goals}` : ""}
      
      Critically: 
      1. If a specific TOPIC is provided ("${topic || ""}"), focus 100% on that topic. Do NOT just teach general ${subject}.
      2. Use a clear, simple, and straightforward teaching style. Do not overcomplicate.
      3. Learning Mode Adaptation (STRUCTURAL REQUIREMENT):
         - If mode is "text": Provide a highly structured reading with clear explanations, bullet points, and concise language. Keep paragraphs short and avoid complex jargon.
         - If mode is "voice": Format as a spoken word transcript. Use simple, conversational language, and clear "Notes for listener". Start with "Hello student, welcome to today's listen...".
         - If mode is "video": Format as a structured Cinematic Presentation. Organize content into explicit SCENES.
           Example format for each scene:
           ## SCENE 1: [Scene Title]
           **VISUAL**: [Detailed description of what should be shown on screen: diagrams, animations, or specific imagery]
           **AUDIO**: [The spoken narration for this scene]
           
           Ensure there are 5-8 distinct scenes for a complete lesson.
      4. Include 2-3 specific real-world examples that a ${grade} student would relate to.
      ${Array.isArray(currentWeaknesses) && currentWeaknesses.length ? `5. The student previously struggled with: ${currentWeaknesses.join(", ")}. Explain these specific concepts more simply.` : ""}
      
      Format the lesson in Markdown. For Video mode, strictly follow the SCENE/VISUAL/AUDIO structure within the markdown.
      
      Return the response as a JSON object with:
      - title: A specific title (not just the topic name)
      - modules: An array of modules. Each module must have:
        - type: "theory", "example", "analogy", "key-takeaway", or "socratic-question"
        - title: A short header for this module
        - content: The core content. You can use simple HTML tags (<b>, <i>, <ul>, <li>) or Markdown for formatting within the content.
      - content: (FOR LEGACY/COMPATIBILITY) A summarized text version of the entire lesson.
      - difficulty: "Easy", "Medium", or "Hard" based on the complexity for a ${grade} student.
    `;

      const text = await callWithRetry({
        contents: prompt,
        config: {
          systemInstruction:
            "You are an expert, truthful teacher. Adhere strictly to factual information. Never hallucinate facts, dates, or scientific concepts. Keep the lessons simple, concise, and do not introduce overly complex concepts unless absolutely necessary for the topic. Keep the output highly consistent for the same topics.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              modules: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      enum: ["theory", "example", "analogy", "key-takeaway", "socratic-question"],
                    },
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                  },
                  required: ["type", "title", "content"],
                },
              },
              content: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
            },
            required: ["title", "modules", "content", "difficulty"],
          },
        },
      });

      const data = JSON.parse(text || "{}");
      res.json({
        title: data.title,
        modules: data.modules,
        content: data.content,
        difficulty: data.difficulty,
        subject,
        grade,
        mode,
        status: "pending",
        date: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/gemini/quiz", async (req: Request, res: Response) => {
    try {
      const { lesson } = req.body;
      if (!lesson) {
        res.status(400).json({ error: "Missing required field: lesson" });
        return;
      }

      const prompt = `
      Based on the following lesson content, generate a 5-question multiple choice quiz for a ${lesson.grade} student.
      Subject: ${lesson.subject}
      Title: ${lesson.title}
      Content: ${lesson.content}
      
      Each question should test understanding of the concepts taught at a ${lesson.grade} level.
      Return as a JSON object with an array of questions.
    `;

      const text = await callWithRetry({
        contents: prompt,
        config: {
          systemInstruction:
            "You are an expert assessment creator. Only generate factually correct and accurate questions. Verify all correct answers against established facts. Keep the questions highly consistent and straightforward.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ["question", "options", "correctAnswer", "explanation"],
                },
              },
            },
            required: ["questions"],
          },
        },
      });

      const data = JSON.parse(text || "{}");
      res.json({
        lessonId: lesson.id,
        type: "lesson",
        questions: data.questions,
        completed: false,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/gemini/review-quiz", async (req: Request, res: Response) => {
    try {
      const { grade, recentTopics, type, goals } = req.body;
      if (!grade || !Array.isArray(recentTopics) || !type) {
        res.status(400).json({ error: "Missing required fields: grade, recentTopics, type" });
        return;
      }

      const topicsList = recentTopics.map((t: { subject: string; topic: string }) => `${t.topic} (${t.subject})`).join(", ");
      const prompt = `
      Generate a ${type === "daily" ? "5" : "10"}-question assessment for a ${grade} student.
      Student Learning Goals: ${goals || "General learning and mastery."}
      The assessment should cover a mix of the following recently studied topics: ${topicsList}.
      
      Requirements:
      1. Ensure questions are evenly distributed across the topics if possible.
      2. If multiple subjects are present, include at least one question from each subject.
      3. Focus on conceptual understanding and problem-solving appropriate for ${grade} level.
      
      Return as a JSON object with an array of questions.
    `;

      const text = await callWithRetry({
        contents: prompt,
        config: {
          systemInstruction:
            "You are an expert educational assessment creator. Evaluate based strictly on provided topics and facts. Provide verifiably correct information. Keep the questions consistent.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ["question", "options", "correctAnswer", "explanation"],
                },
              },
            },
            required: ["questions"],
          },
        },
      });

      const data = JSON.parse(text || "{}");
      res.json({
        type,
        questions: data.questions,
        completed: false,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/gemini/analyze-weaknesses", async (req: Request, res: Response) => {
    try {
      const { quiz, responses } = req.body;
      if (!quiz || !Array.isArray(responses)) {
        res.status(400).json({ error: "Missing required fields: quiz, responses" });
        return;
      }

      const performanceData = quiz.questions.map((q: any, i: number) => ({
        question: q.question,
        correct: q.correctAnswer === responses[i],
        explanation: q.explanation,
      }));

      const prompt = `
      Identify the conceptual weaknesses of a student based on their quiz performance.
      Performance: ${JSON.stringify(performanceData)}
      
      Return a simple array of strings of the specific topics or concepts the student failed to grasp or should focus on next time.
    `;

      const text = await callWithRetry({
        contents: prompt,
        config: {
          systemInstruction:
            "You are an expert educational analyst. Base your analysis solely on the provided performance data. Do not invent weaknesses.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              weakConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["weakConcepts"],
          },
        },
      });

      const data = JSON.parse(text || "{}");
      res.json({ weakConcepts: data.weakConcepts || [] });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/gemini/quick-relief", async (req: Request, res: Response) => {
    try {
      const { concept, subject, grade, goals } = req.body;
      if (!concept || !subject || !grade) {
        res.status(400).json({ error: "Missing required fields: concept, subject, grade" });
        return;
      }

      const prompt = `
      Explain the concept of "${concept}" in the context of ${subject} simply and concisely (max 3 short paragraphs). 
      The student is at a ${grade} academic level.
      ${goals ? `Student Learning Goals: ${goals}` : ""}
      Use an analogy that a student at this level would understand. Use Markdown for formatting.
    `;

      const text = await callWithRetry({
        contents: prompt,
        config: {
          systemInstruction:
            "You are a concise, factual tutor. Focus on strict realism and established facts. Do not narrate unrelated facts. Use analogies but keep them grounded.",
        },
      });

      res.json({ text });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/gemini/chat", async (req: Request, res: Response) => {
    try {
      const { concept, subject, message, history, grade, goals } = req.body;
      if (!concept || !subject || !message || !grade) {
        res.status(400).json({ error: "Missing required fields: concept, subject, message, grade" });
        return;
      }

      const prompt = `
      The student has a specific doubt about "${concept}" in the subject "${subject}".
      You are a mentor helping them clear this doubt.
      The student is at a ${grade} academic level.
      ${goals ? `Student Learning Goals: ${goals}` : ""}
      
      Conversation History:
      ${(Array.isArray(history) ? history : []).map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}
      
      New Student Message: "${message}"
      
      Provide a brief, clear, and supportive response that specifically answers their doubt at a ${grade} level. If they seem to understand, encourage them to mark the concept as resolved.
    `;

      const text = await callWithRetry({
        contents: prompt,
        config: {
          systemInstruction:
            "You are a factual, patient tutor resolving doubts. Provide verifiably accurate explanations. Do not make up concepts.",
        },
      });

      res.json({ text });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
