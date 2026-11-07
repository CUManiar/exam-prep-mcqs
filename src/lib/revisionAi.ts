import {
  ParsedQuestion,
  QuestionAnswer,
  RevisionContext,
  RevisionMessage,
  RevisionProviderConfig,
} from "./types";

export type { RevisionProviderConfig };

const REVISION_CONFIG_KEY = "upsc_revision_llm_config";
const REVISION_HISTORY_KEY = "upsc_revision_history";

export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export const AVAILABLE_MODELS = {
  gemini: [
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash (Recommended - Fastest & Free)",
    },
    {
      id: "gemini-1.5-flash",
      name: "Gemini 1.5 Flash (Standard Free Tier)",
    },
    {
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro (Deep Reasoning)",
    },
  ],
  groq: [
    {
      id: "llama-3.3-70b-versatile",
      name: "Llama 3.3 70B Versatile (Free & Ultra Fast)",
    },
    {
      id: "llama-3.1-8b-instant",
      name: "Llama 3.1 8B Instant (Lightweight)",
    },
  ],
} as const;

export interface PresetAction {
  id: string;
  label: string;
  icon: string;
  description: string;
  generatePrompt: (context: RevisionContext) => string;
}

export const PRESET_ACTIONS: PresetAction[] = [
  {
    id: "articles",
    label: "Articles & Provisions",
    icon: "🏛️",
    description: "Important Constitutional articles, schedules & amendments",
    generatePrompt: (ctx) => {
      const topic = ctx.topic || ctx.question?.topic;
      if (topic) {
        return `Provide a comprehensive UPSC exam breakdown of all important Constitutional Articles, Schedules, and statutory provisions related to "${topic}". Include exact numbers, constitutional rationale, and a quick summary table.`;
      }
      return `Provide a comprehensive UPSC exam breakdown of the important Constitutional Articles, Schedules, and statutory provisions relevant to the topic under discussion. Include exact numbers, constitutional rationale, and an exam-ready reference table.`;
    },
  },
  {
    id: "judgements",
    label: "Landmark & Recent Judgements",
    icon: "⚖️",
    description: "Supreme Court case laws, core ratios & bench decisions",
    generatePrompt: (ctx) => {
      const topic = ctx.topic || ctx.question?.topic;
      if (topic) {
        return `List the landmark and recent Supreme Court judgements (including latest 2020-2026 rulings) relevant to "${topic}". For each case, state the Year, the Bench/Case Name, the Core Ratio Decidendi, and how to cite it in a Mains answer.`;
      }
      return `List the landmark and recent Supreme Court judgements (including latest rulings) relevant to the topic under discussion. For each case, state the Year, the Bench/Case Name, the Core Ratio Decidendi, and how to cite it in a Mains answer.`;
    },
  },
  {
    id: "pib_news",
    label: "Recent PIB & News",
    icon: "📰",
    description: "Contemporary government policies, schemes & editorial debates",
    generatePrompt: (ctx) => {
      const topic = ctx.topic || ctx.question?.topic;
      if (topic) {
        return `What are the recent PIB releases, government schemes, committee recommendations (e.g. Finance Commission, Sarkaria/Punchhi, Law Commission), and contemporary debates surrounding "${topic}"? Provide sharp, factual points for Prelims and analytical fodder for Mains.`;
      }
      return `What are the recent PIB releases, government schemes, committee recommendations, and contemporary debates surrounding the topic under discussion? Provide sharp, factual points for Prelims and analytical fodder for Mains.`;
    },
  },
  {
    id: "infographic",
    label: "Infographic & Mindmap",
    icon: "📊",
    description: "Visual Mermaid diagram, conceptual flow & comparative matrix",
    generatePrompt: (ctx) => {
      const topic = ctx.topic || ctx.question?.topic;
      if (topic) {
        return `Synthesize "${topic}" visually for in-depth understanding. Provide a Mermaid flowchart diagram (using \`\`\`mermaid) showing the structural flow or hierarchy, followed by a high-yield comparative markdown table.`;
      }
      return `Synthesize the topic discussed above visually for in-depth understanding. Provide a Mermaid flowchart diagram (using \`\`\`mermaid) showing the structural flow or hierarchy, followed by a high-yield comparative markdown table.`;
    },
  },
  {
    id: "prelims_drill",
    label: "Prelims Elimination Drill",
    icon: "🎯",
    description: "5 high-yield MCQs testing tricky trap options & 50-50 logic",
    generatePrompt: (ctx) => {
      const topic = ctx.topic || ctx.question?.topic;
      if (topic) {
        return `Generate 3 high-yield UPSC Prelims-standard MCQs on "${topic}". Include tricky statement-based formats ("How many of the above statements are correct?"), highlight common elimination traps, and provide exhaustive explanations with the correct answer key.`;
      }
      return `Generate 3 high-yield UPSC Prelims-standard MCQs on this topic. Include tricky statement-based formats ("How many of the above statements are correct?"), highlight common elimination traps, and provide exhaustive explanations with the correct answer key.`;
    },
  },
  {
    id: "mains_framework",
    label: "Mains 10M/15M Framework",
    icon: "✍️",
    description: "Structured model answer: Intro, multi-dimensional body, conclusion",
    generatePrompt: (ctx) => {
      const topic = ctx.topic || ctx.question?.topic;
      if (topic) {
        return `Frame a probable 15-Mark (250 words) UPSC GS Mains question on "${topic}" and provide an exemplary model answer structure: punchy introduction with constitutional/data grounding, multi-dimensional body (Constitutional, Administrative, Fiscal, Contemporary challenges), and forward-looking conclusion with committee references.`;
      }
      return `Frame a probable 15-Mark (250 words) UPSC GS Mains question on the topic discussed and provide an exemplary model answer structure: punchy introduction with constitutional/data grounding, multi-dimensional body, and forward-looking conclusion with committee references.`;
    },
  },
];

export function getRevisionConfig(): RevisionProviderConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REVISION_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveRevisionConfig(config: RevisionProviderConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REVISION_CONFIG_KEY, JSON.stringify(config));
}

export function clearRevisionConfig(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REVISION_CONFIG_KEY);
}

export function getUpscRevisionSystemPrompt(context?: RevisionContext): string {
  let prompt = `You are a Senior UPSC Civil Services Examination (CSE) Mentor and Subject Specialist, helping an aspirant revise deeply and score high in Prelims and Mains.

YOUR MANDATE & TONE:
1. Ground every answer in official UPSC terminology, the Constitution of India, statutes, and authentic government sources.
2. Structure responses cleanly with clear headings, bold key terms, and bullet points.
3. When discussing Polity or Governance, ALWAYS cite exact Articles, Parts, Schedules, and Landmark/Recent Supreme Court Judgements.
4. When discussing Economics or Environment, cite authentic metrics, reports, economic survey insights, and recent government schemes.
5. Highlight "Prelims Traps" (words like 'only', 'solely', 'statutory vs constitutional', subtle misattributions) using the alert format:
> [!WARNING] **Prelims Trap**: ...
6. Highlight "Mains Value Additions" (quotes from Sarkaria/Punchhi Commissions, 2nd ARC, Law Commission, SDGs, NITI Aayog) using:
> [!TIP] **Mains Value-Add**: ...
7. When appropriate, provide visual conceptual diagrams using Mermaid syntax (\`\`\`mermaid ... \`\`\`), such as flowcharts or mindmaps, and clean Markdown tables.
8. Maintain an encouraging, precise, and high-yield pedagogical tone. Do not write filler.`;

  if (context) {
    prompt += `\n\n--- ACTIVE REVISION CONTEXT ---`;
    if (context.mode === "topic" && context.topic) {
      prompt += `\nFocus Topic: "${context.topic}"`;
      if (context.subject) prompt += ` (Subject: ${context.subject})`;
      if (context.chapter) prompt += ` (Chapter: ${context.chapter})`;
    } else if (context.mode === "paper") {
      prompt += `\nMode: Question Paper Revision`;
      if (context.paperTitle) prompt += `\nPaper: ${context.paperTitle}`;
      if (context.questionNo && context.question) {
        prompt += `\nFocus Question #${context.questionNo}:`;
        prompt += `\nPrompt: ${context.question.text}`;
        if (context.question.options) {
          prompt += `\nOptions:\n${Object.entries(context.question.options)
            .map(([k, v]) => `  ${k}: ${v}`)
            .join("\n")}`;
        }
        if (context.question.answer) {
          prompt += `\nOfficial Answer Key: ${context.question.answer}`;
        }
        if (context.question.explanation) {
          prompt += `\nOfficial Explanation: ${context.question.explanation}`;
        }
        if (context.userAnswer) {
          prompt += `\nStudent's Answer: ${context.userAnswer.selected || "Unattempted"}`;
          prompt += `\nStudent Correct: ${context.userAnswer.isCorrect ? "YES" : "NO"}`;
          if (context.userAnswer.confidence) {
            prompt += `\nConfidence: ${context.userAnswer.confidence}`;
          }
          if (context.userAnswer.note) {
            prompt += `\nStudent Notes: ${context.userAnswer.note}`;
          }
        }
      }
    }
    prompt += `\nTailor your insights directly around this context.`;
  }

  return prompt;
}

export async function validateApiKey(
  provider: "gemini" | "groq",
  apiKey: string,
  model?: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!apiKey || !apiKey.trim()) {
      return { valid: false, error: "API key cannot be empty." };
    }

    if (provider === "gemini") {
      let activeModel = model || DEFAULT_GEMINI_MODEL;
      if (activeModel.includes("2.5")) {
        activeModel = DEFAULT_GEMINI_MODEL;
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey.trim()}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Ping. Respond with 'PONG'." }] }],
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const msg =
          errorData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        return { valid: false, error: msg };
      }
      return { valid: true };
    } else {
      const activeModel = model || DEFAULT_GROQ_MODEL;
      const url = "https://api.groq.com/openai/v1/chat/completions";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: activeModel,
          messages: [{ role: "user", content: "Ping. Respond with 'PONG'." }],
          max_tokens: 10,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const msg =
          errorData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        return { valid: false, error: msg };
      }
      return { valid: true };
    }
  } catch (err: any) {
    return {
      valid: false,
      error: err.name === "TimeoutError" ? "Validation request timed out." : err.message || "Failed to reach the API server.",
    };
  }
}

export interface RevisionApiError extends Error {
  needsApiKey?: boolean;
}

export async function sendRevisionQuery(
  messages: RevisionMessage[],
  context: RevisionContext,
  config?: RevisionProviderConfig | null,
): Promise<string> {
  const res = await fetch("/api/revision/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      context,
      providerConfig: config,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const err: RevisionApiError = new Error(
      errData.error || `Revision API returned error ${res.status}: ${res.statusText}`,
    );
    err.needsApiKey = Boolean(errData.needsApiKey);
    throw err;
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }

  if (!data.text || !data.text.trim()) {
    throw new Error("No response generated. Please retry.");
  }

  return data.text;
}
