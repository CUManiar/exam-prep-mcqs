import { RevisionProviderConfig } from "./types";

export interface QuestionEvaluationParams {
  questionNo: number;
  questionText: string;
  options?: Record<string, string>;
  correctAnswer?: string | null;
  explanation?: string | null;
  selectedAnswer?: string | null;
  isCorrect?: boolean | null;
  scratchpadNote?: string | null;
  timeSpentSeconds?: number | null;
  confidence?: string | null;
}

export function buildQuestionEvaluationPrompt(params: {
  questionNo: number;
  questionText: string;
  options?: Record<string, string>;
  correctAnswer?: string | null;
  explanation?: string | null;
  selectedAnswer?: string | null;
  isCorrect?: boolean | null;
  scratchpadNote?: string | null;
  timeSpentSeconds?: number | null;
  confidence?: string | null;
}): string {
  const {
    questionNo,
    questionText,
    options,
    correctAnswer,
    explanation,
    selectedAnswer,
    isCorrect,
    scratchpadNote,
    timeSpentSeconds,
    confidence,
  } = params;

  let optionsFormatted = "None (Cloze / Open-ended question)";
  if (options && Object.keys(options).length > 0) {
    optionsFormatted = Object.entries(options)
      .map(([optKey, optVal]) => `  (${optKey.toLowerCase()}) ${optVal}`)
      .join("\n");
  }

  const outcomeStr =
    isCorrect === true
      ? "CORRECT"
      : isCorrect === false
        ? "INCORRECT"
        : selectedAnswer
          ? "ATTEMPTED (Self-Assessed)"
          : "UNATTEMPTED (Skipped)";

  const candidateAnswerStr = selectedAnswer
    ? selectedAnswer.length === 1 && selectedAnswer.match(/[a-zA-Z]/)
      ? `Option (${selectedAnswer.toUpperCase()})`
      : selectedAnswer
    : "None (Skipped)";

  return `You are a senior UPSC CSE evaluator and mentor analyzing a student's question attempt.
Your role is to examine the candidate's answer and critically inspect their scratchpad notes / rough calculations against the official solution.

=== QUESTION Q${questionNo} ===
Statement:
${questionText || `Question ${questionNo}`}

Options:
${optionsFormatted}

Official Key / Correct Answer: ${correctAnswer || "Refer to explanation"}
Official Explanation:
${explanation || "No official explanation provided."}

=== CANDIDATE ATTEMPT ===
Marked Answer: ${candidateAnswerStr}
Outcome: ${outcomeStr}
Confidence Tag: ${confidence || "Not tagged"}
Time Spent: ${timeSpentSeconds ? `${timeSpentSeconds} seconds` : "Not recorded"}
Scratchpad Notes / Rough Work:
"${scratchpadNote?.trim() || "(Candidate left no scratchpad notes for this question)"}"

=== CRITICAL EVALUATION RULES ===
1. RIGOROUS ATTEMPT & SCRATCHPAD SCRUTINY:
   - Carefully audit the student's scratchpad notes, formulas, arithmetic, and elimination thoughts:
   - Case A: Candidate is CORRECT, BUT scratchpad calculation or reasoning is WRONG or flawed:
     Explicitly point out the flaw or arithmetic blunder! State clearly that while the marked option happened to match the key, the scratchpad reasoning was flawed or reached by coincidence / compensatory error.
   - Case B: Candidate is CORRECT with sound scratchpad:
     Affirm their sound elimination / calculation methodology in 1-2 sharp sentences.
   - Case C: Candidate is INCORRECT:
     Pinpoint the exact step in their scratchpad calculation, misread constraint, or trap option where their logic collapsed.
   - Case D: Candidate SKIPPED or left no scratchpad:
     Evaluate whether skipping was prudent given the difficulty, and give a 1-sentence takeaway or elimination shortcut.
2. FORMAT & CONSTRAINTS:
   - Exactly 2 to 4 sentences (under 95 words).
   - Be incisive, mentor-like, constructive, and direct.
   - Do NOT include markdown headers, bullet points, greetings, or preambles. Output ONLY the evaluation comment.`;
}

async function discoverGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: "GET", signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data?.models) ? data.models : [];
    return list
      .map((m: any) => m?.name)
      .filter(
        (name: any): name is string =>
          typeof name === "string" && name.includes("gemini"),
      );
  } catch {
    return [];
  }
}

async function callGemini(
  apiKey: string,
  prompt: string,
  temperature: number = 0.3,
): Promise<string> {
  const discovered = await discoverGeminiModels(apiKey);
  const candidates = Array.from(
    new Set([
      ...discovered,
      "gemini-1.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-pro",
    ]),
  );

  let lastError = "";
  for (const rawModel of candidates.slice(0, 4)) {
    const cleanModel = rawModel.replace(/^models\//, "");
    const endpoints = [
      `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1/models/${cleanModel}:generateContent?key=${apiKey}`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: 600,
            },
          }),
          signal: AbortSignal.timeout(20000),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (text.trim()) return text.trim();
        } else {
          const errJson = await res.json().catch(() => ({}));
          lastError = errJson.error?.message || `HTTP ${res.status}`;
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
      }
    }
  }

  throw new Error(`Gemini evaluation failed: ${lastError || "Unknown error"}`);
}

async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  models: string[],
  prompt: string,
  temperature: number = 0.3,
): Promise<string> {
  let lastError = "";
  for (const model of models) {
    try {
      const res = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature,
          max_tokens: 600,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || "";
        if (text.trim()) return text.trim();
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson.error?.message || `HTTP ${res.status}`;
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
  }

  throw new Error(`Model evaluation failed: ${lastError || "Unknown error"}`);
}

async function callAnthropic(
  apiKey: string,
  models: string[],
  prompt: string,
  temperature: number = 0.3,
): Promise<string> {
  let lastError = "";
  for (const model of models) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature,
          max_tokens: 600,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text || "";
        if (text.trim()) return text.trim();
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson.error?.message || `HTTP ${res.status}`;
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
  }

  throw new Error(
    `Anthropic evaluation failed: ${lastError || "Unknown error"}`,
  );
}

export async function generateQuestionEvaluationComment(
  params: QuestionEvaluationParams,
  providerConfig?: RevisionProviderConfig | null,
): Promise<string> {
  const prompt = buildQuestionEvaluationPrompt(params);
  const userApiKey = providerConfig?.apiKey?.trim();
  const provider = providerConfig?.provider;

  // 1. User configured provider
  if (userApiKey && provider) {
    if (provider === "gemini") {
      return await callGemini(userApiKey, prompt);
    }
    if (provider === "groq") {
      const models = [
        providerConfig?.model,
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
      ].filter(Boolean) as string[];
      return await callOpenAICompatible(
        "https://api.groq.com/openai/v1",
        userApiKey,
        models,
        prompt,
      );
    }
    if (provider === "openai") {
      const models = [providerConfig?.model, "gpt-4o-mini", "gpt-4o"].filter(
        Boolean,
      ) as string[];
      return await callOpenAICompatible(
        "https://api.openai.com/v1",
        userApiKey,
        models,
        prompt,
      );
    }
    if (provider === "anthropic") {
      const models = [
        providerConfig?.model,
        "claude-3-5-haiku-latest",
        "claude-3-haiku-20240307",
      ].filter(Boolean) as string[];
      return await callAnthropic(userApiKey, models, prompt);
    }
  }

  // 2. Server Gemini Key
  const serverGeminiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GOOGLE_AI_KEY?.trim();
  if (serverGeminiKey) {
    return await callGemini(serverGeminiKey, prompt);
  }

  // 3. Fallback heuristic evaluation note if no API key is available
  if (params.isCorrect && params.scratchpadNote) {
    return `Answer marked correctly. Review your scratchpad calculation to ensure every numerical step and premise matched the official explanation rather than arriving at the option through compensatory errors.`;
  } else if (!params.isCorrect && params.selectedAnswer) {
    return `Candidate selected Option ${params.selectedAnswer}, which differs from the official answer (${params.correctAnswer || "Refer to explanation"}). Compare your elimination notes and scratchpad steps with the official solution to isolate the trap premise.`;
  } else if (!params.selectedAnswer) {
    return `Question unattempted. Review the official solution to check if a straightforward elimination technique or formula could have converted this into a scored question.`;
  }

  return `Evaluated attempt for Question ${params.questionNo}. Compare with the official explanation above to refine your conceptual clarity.`;
}
