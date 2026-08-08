import { type NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

interface CodeSuggestionRequest {
  fileContent: string;
  cursorLine: number;
  cursorColumn: number;
  suggestionType: string;
  fileName?: string;
}

interface CodeContext {
  language: string;
  framework: string;
  beforeContext: string;
  currentLine: string;
  afterContext: string;
  cursorPosition: {
    line: number;
    column: number;
  };
  isInFunction: boolean;
  isInClass: boolean;
  isAfterComment: boolean;
  incompletePatterns: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: CodeSuggestionRequest = await request.json();

    const { fileContent, cursorLine, cursorColumn, suggestionType, fileName } =
      body;

    if (!fileContent || cursorLine < 0 || cursorColumn < 0 || !suggestionType) {
      return NextResponse.json(
        { error: "Invalid input parameters" },
        { status: 400 },
      );
    }

    const context = analyzeCodeContext(
      fileContent,
      cursorLine,
      cursorColumn,
      fileName,
    );

    const prompt = buildPrompt(context, suggestionType);

    const suggestion = await generateSuggestion(prompt);

    return NextResponse.json({
      suggestion,
      context,
      metadata: {
        language: context.language,
        framework: context.framework,
        position: context.cursorPosition,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating code suggestion:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate code suggestion",
      },
      { status: 500 },
    );
  }
}

// =====================================================
// CODE CONTEXT ANALYSIS
// =====================================================

function analyzeCodeContext(
  content: string,
  line: number,
  column: number,
  fileName?: string,
): CodeContext {
  const lines = content.split("\n");

  const currentLine = lines[line] || "";

  // Get surrounding context
  const contextRadius = 3;

  const startLine = Math.max(0, line - contextRadius);
  const endLine = Math.min(lines.length, line + contextRadius + 1);

  const beforeContext = lines.slice(startLine, line).join("\n");

  const afterContext = lines.slice(line + 1, endLine).join("\n");

  // Detect language and framework
  const language = detectLanguage(content, fileName);
  const framework = detectFramework(content);

  // Analyze code patterns
  const isInFunction = detectInFunction(lines, line);
  const isInClass = detectInClass(lines, line);
  const isAfterComment = detectAfterComment(currentLine, column);
  const incompletePatterns = detectIncompletePatterns(currentLine, column);

  return {
    language,
    framework,
    beforeContext,
    currentLine,
    afterContext,
    cursorPosition: {
      line,
      column,
    },
    isInFunction,
    isInClass,
    isAfterComment,
    incompletePatterns,
  };
}

// =====================================================
// PROMPT
// =====================================================

function buildPrompt(context: CodeContext, suggestionType: string): string {
  const beforeCursor = context.currentLine.substring(
    0,
    context.cursorPosition.column,
  );

  const afterCursor = context.currentLine.substring(
    context.cursorPosition.column,
  );

  return `You are an expert code completion assistant.

Generate a ${suggestionType} code completion.

Language: ${context.language}
Framework: ${context.framework}

Code before cursor:
${context.beforeContext}

Current line:
${beforeCursor}|CURSOR|${afterCursor}

Code after cursor:
${context.afterContext}

Analysis:

- In Function: ${context.isInFunction}
- In Class: ${context.isInClass}
- After Comment: ${context.isAfterComment}
- Incomplete Patterns:
  ${context.incompletePatterns.join(", ") || "None"}

Instructions:

1. Return ONLY the code that should be inserted at the cursor.
2. Do NOT explain the code.
3. Do NOT use markdown.
4. Do NOT use code fences.
5. Maintain the existing indentation.
6. Follow ${context.language} best practices.
7. Keep the suggestion short and directly relevant.
8. Do not repeat code that already exists after the cursor.

Generate the completion now:`;
}

// =====================================================
// AI GENERATION
// LOCAL = OLLAMA
// VERCEL = GEMINI
// =====================================================

async function generateSuggestion(prompt: string): Promise<string> {
  const provider =
    process.env.AI_PROVIDER || (process.env.VERCEL ? "gemini" : "ollama");

  if (provider === "gemini") {
    return generateWithGemini(prompt);
  }

  if (provider === "ollama") {
    return generateWithOllama(prompt);
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

// =====================================================
// LOCAL: OLLAMA + CODELLAMA
// =====================================================

async function generateWithOllama(prompt: string): Promise<string> {
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
        temperature: 0.1,
        num_predict: 100,
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

  return cleanSuggestion(data.response);
}

// =====================================================
// PRODUCTION: GEMINI
// =====================================================

async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      maxOutputTokens: 100,
    },
  });

  if (!response.text) {
    throw new Error("No response from Gemini");
  }

  return cleanSuggestion(response.text);
}

// =====================================================
// CLEAN AI RESPONSE
// =====================================================

function cleanSuggestion(suggestion: string): string {
  let result = suggestion.trim();

  // Remove markdown code fences
  if (result.includes("```")) {
    const codeMatch = result.match(/```[\w+#.-]*\n?([\s\S]*?)```/);

    if (codeMatch) {
      result = codeMatch[1].trim();
    }
  }

  // Remove common unwanted prefixes
  result = result.replace(/^Suggestion:\s*/i, "");
  result = result.replace(/^Completion:\s*/i, "");

  return result.trim();
}

// =====================================================
// LANGUAGE DETECTION
// =====================================================

function detectLanguage(content: string, fileName?: string): string {
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();

    const extMap: Record<string, string> = {
      ts: "TypeScript",
      tsx: "TypeScript",
      js: "JavaScript",
      jsx: "JavaScript",
      py: "Python",
      java: "Java",
      go: "Go",
      rs: "Rust",
      php: "PHP",
      css: "CSS",
      html: "HTML",
      json: "JSON",
    };

    if (ext && extMap[ext]) {
      return extMap[ext];
    }
  }

  // Content-based detection
  if (
    content.includes("interface ") ||
    content.includes(": string") ||
    content.includes(": number")
  ) {
    return "TypeScript";
  }

  if (content.includes("def ") || content.includes("import ")) {
    return "Python";
  }

  if (content.includes("func ") || content.includes("package ")) {
    return "Go";
  }

  return "JavaScript";
}

// =====================================================
// FRAMEWORK DETECTION
// =====================================================

function detectFramework(content: string): string {
  if (
    content.includes("next/") ||
    content.includes("getServerSideProps") ||
    content.includes("useRouter")
  ) {
    return "Next.js";
  }

  if (
    content.includes("import React") ||
    content.includes("useState") ||
    content.includes("useEffect")
  ) {
    return "React";
  }

  if (
    content.includes("import Vue") ||
    content.includes("from 'vue'") ||
    content.includes('from "vue"')
  ) {
    return "Vue";
  }

  if (content.includes("@angular/") || content.includes("@Component")) {
    return "Angular";
  }

  return "None";
}

// =====================================================
// FUNCTION DETECTION
// =====================================================

function detectInFunction(lines: string[], currentLine: number): boolean {
  for (let i = currentLine - 1; i >= 0; i--) {
    const line = lines[i] || "";

    if (
      /^\s*(function\s+\w+|def\s+\w+|const\s+\w+\s*=\s*(async\s*)?\(?|let\s+\w+\s*=\s*(async\s*)?\(?)/.test(
        line,
      )
    ) {
      return true;
    }

    if (/^\s*}/.test(line)) {
      break;
    }
  }

  return false;
}

// =====================================================
// CLASS DETECTION
// =====================================================

function detectInClass(lines: string[], currentLine: number): boolean {
  for (let i = currentLine - 1; i >= 0; i--) {
    const line = lines[i] || "";

    if (/^\s*(class|interface)\s+\w+/.test(line)) {
      return true;
    }
  }

  return false;
}

// =====================================================
// COMMENT DETECTION
// =====================================================

function detectAfterComment(line: string, column: number): boolean {
  const beforeCursor = line.substring(0, column);

  return (
    /\/\/.*$/.test(beforeCursor) ||
    /#.*$/.test(beforeCursor) ||
    /\/\*.*$/.test(beforeCursor)
  );
}

// =====================================================
// INCOMPLETE PATTERN DETECTION
// =====================================================

function detectIncompletePatterns(line: string, column: number): string[] {
  const beforeCursor = line.substring(0, column);
  const trimmed = beforeCursor.trim();

  const patterns: string[] = [];

  if (/^(if|while|for)\s*\($/.test(trimmed)) {
    patterns.push("conditional");
  }

  if (/^(function|def)\s+\w*$/.test(trimmed)) {
    patterns.push("function");
  }

  if (/{\s*$/.test(beforeCursor)) {
    patterns.push("object");
  }

  if (/\[\s*$/.test(beforeCursor)) {
    patterns.push("array");
  }

  if (/=\s*$/.test(beforeCursor)) {
    patterns.push("assignment");
  }

  if (/\.\s*$/.test(beforeCursor)) {
    patterns.push("method-call");
  }

  return patterns;
}
