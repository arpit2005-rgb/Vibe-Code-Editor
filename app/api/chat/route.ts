import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

const systemPrompt = `You are a helpful AI coding assistant. You help developers with:

- Code explanations and debugging
- Best practices and architecture advice
- Writing clean, efficient code
- Troubleshooting errors
- Code reviews and optimizations

Always provide clear, practical answers.
Use proper code formatting when showing examples.
Be concise but provide enough explanation to solve the developer's problem.`;

function buildPrompt(messages: ChatMessage[]): string {
  return [
    systemPrompt,
    ...messages.map((msg) => `${msg.role}: ${msg.content}`),
  ].join("\n\n");
}

// =========================
// LOCAL: Ollama + CodeLlama
// =========================

async function generateWithOllama(messages: ChatMessage[]): Promise<string> {
  const prompt = buildPrompt(messages);

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "codellama:latest",
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 1000,
        top_p: 0.9,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const data = await response.json();

  if (!data.response) {
    throw new Error("No response from CodeLlama");
  }

  return data.response.trim();
}

// =========================
// PRODUCTION: Gemini
// =========================

async function generateWithGemini(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  const prompt = buildPrompt(messages);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    },
  });

  if (!response.text) {
    throw new Error("No response from Gemini");
  }

  return response.text.trim();
}

// =========================
// API ROUTE
// =========================

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();

    const { message, history = [] } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        {
          error: "Message is required and must be a string",
        },
        { status: 400 },
      );
    }

    // Validate history
    const validHistory: ChatMessage[] = Array.isArray(history)
      ? history.filter(
          (msg): msg is ChatMessage =>
            !!msg &&
            typeof msg === "object" &&
            (msg.role === "assistant" || msg.role === "user") &&
            typeof msg.content === "string",
        )
      : [];

    // Keep only the latest 10 messages
    const recentHistory = validHistory.slice(-10);

    const messages: ChatMessage[] = [
      ...recentHistory,
      {
        role: "user",
        content: message,
      },
    ];

    // =========================
    // Provider selection
    // =========================

    const provider =
      process.env.AI_PROVIDER || (process.env.VERCEL ? "gemini" : "ollama");

    let aiResponse: string;
    let model: string;

    if (provider === "gemini") {
      aiResponse = await generateWithGemini(messages);
      model = "gemini-2.5-flash";
    } else if (provider === "ollama") {
      aiResponse = await generateWithOllama(messages);
      model = "codellama:latest";
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }

    return NextResponse.json({
      response: aiResponse,
      model,
      timeStamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chat API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate AI response",
      },
      { status: 500 },
    );
  }
}
