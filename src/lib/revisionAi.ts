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

/** Provider display metadata for the settings UI */
export const PROVIDER_INFO: Record<string, {
  label: string;
  description: string;
  icon: string;
  keyPlaceholder: string;
  keyGetUrl: string;
  keyGetLabel: string;
}> = {
  gemini: {
    label: "Google Gemini",
    description: "Free tier available. High-yield syllabus analysis & case laws.",
    icon: "✦",
    keyPlaceholder: "Paste AIzaSy... here",
    keyGetUrl: "https://aistudio.google.com/app/apikey",
    keyGetLabel: "Google AI Studio",
  },
  groq: {
    label: "Groq Cloud",
    description: "Free tier available. Blazing fast inference (300+ tok/s).",
    icon: "⚡",
    keyPlaceholder: "Paste gsk_... here",
    keyGetUrl: "https://console.groq.com/keys",
    keyGetLabel: "Groq Console",
  },
  openai: {
    label: "OpenAI (ChatGPT)",
    description: "Deep reasoning & multi-dimensional conceptual analysis.",
    icon: "◎",
    keyPlaceholder: "Paste sk-... here",
    keyGetUrl: "https://platform.openai.com/api-keys",
    keyGetLabel: "OpenAI Platform",
  },
  anthropic: {
    label: "Anthropic (Claude)",
    description: "Nuanced, articulate long-form UPSC answer frameworks.",
    icon: "◈",
    keyPlaceholder: "Paste sk-ant-... here",
    keyGetUrl: "https://console.anthropic.com/settings/keys",
    keyGetLabel: "Anthropic Console",
  },
};

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

const STORAGE_VAULT_SALT = "upsc_candidate_priv_vault_v1";

/** Obfuscates API key and provider configuration so it is not stored as plain text */
function obfuscateConfig(config: RevisionProviderConfig): string {
  try {
    const raw = JSON.stringify(config);
    let str = "";
    for (let i = 0; i < raw.length; i++) {
      str += String.fromCharCode(raw.charCodeAt(i) ^ STORAGE_VAULT_SALT.charCodeAt(i % STORAGE_VAULT_SALT.length));
    }
    return "sec_v1:" + btoa(encodeURIComponent(str));
  } catch {
    return btoa(JSON.stringify(config));
  }
}

/** Decodes obfuscated configuration from local storage */
function deobfuscateConfig(data: string): RevisionProviderConfig | null {
  try {
    if (data.startsWith("sec_v1:")) {
      const b64 = data.slice(7);
      const str = decodeURIComponent(atob(b64));
      let raw = "";
      for (let i = 0; i < str.length; i++) {
        raw += String.fromCharCode(str.charCodeAt(i) ^ STORAGE_VAULT_SALT.charCodeAt(i % STORAGE_VAULT_SALT.length));
      }
      return JSON.parse(raw);
    }
    // Backward compatibility for previously saved unencoded JSON
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function getRevisionConfig(): RevisionProviderConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REVISION_CONFIG_KEY);
    if (!raw) return null;
    return deobfuscateConfig(raw);
  } catch {
    return null;
  }
}

export function saveRevisionConfig(config: RevisionProviderConfig): void {
  if (typeof window === "undefined") return;
  try {
    const secured = obfuscateConfig(config);
    localStorage.setItem(REVISION_CONFIG_KEY, secured);
  } catch (e) {
    console.warn("Failed to securely store revision config:", e);
  }
}

export function clearRevisionConfig(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REVISION_CONFIG_KEY);
}

export function getUpscRevisionSystemPrompt(context?: RevisionContext): string {
  let prompt = `You are an expert UPSC Civil Services Examination (CSE) Mentor and Senior Subject Evaluator.

YOUR MANDATE:
1. Direct Relevance: Answer the student's specific question directly, thoroughly, and contextually. Do not produce rigid boilerplate or generic repetitive templates.
2. If asked for Prelims Grill / MCQs: Generate authentic UPSC statement-based questions testing subtle traps, elimination techniques, and deep concept distinctions, complete with step-by-step trap dissection.
3. If asked for Mains Grill / Practice: Frame a 10M (150 words) or 15M (250 words) analytical question followed by a model evaluator blueprint (intro, multi-dimensional body arguments, committee/judgement citations, forward-looking conclusion).
4. If asked to COMPARE (e.g. NITI Aayog vs Planning Commission, Fundamental Rights vs DPSP, Parliamentary vs Presidential), provide a clear, structured Markdown comparison table followed by analytical depth (origins, legal basis, structural mechanics, operational impact).
5. If asked about a Constitutional or Polity topic, cite exact Articles, Schedules, and Landmark Supreme Court cases where relevant.
6. If asked about Economics, Governance, or Schemes, cite authentic data, committees (e.g. Kelkar, NK Singh, Finance Commission), and policy nuances.
7. If revising an exam paper or question, dissect the options, identify the elimination trap, and reference the student's performance data.
8. Formatting: Use clean Markdown with headers, bold key terms, comparison tables, and Mermaid flowcharts (\`\`\`mermaid ... \`\`\`) where conceptual visualization aids memory.
9. Include high-yield Prelims Traps (> [!WARNING] **Prelims Trap**: ...) and Mains Value-Add points (> [!TIP] **Mains Value-Add**: ...) tailored specifically to the topic discussed.
10. If revising CSAT (Paper II) Quantitative Aptitude, Logical Reasoning, or Math: Format all formulas with standard LaTeX notation ($...$ for inline, $$...$$ for block equations). Use authentic notation like $^nP_r = \\frac{n!}{(n-r)!}$, $^nC_r = \\frac{n!}{r!(n-r)!}$, and $\\times$ for multiplication. Always provide quick-solve shortcut methods, elimination tips, and step-by-step worked examples.
11. Maintain an encouraging, precise, and high-yield pedagogical tone. Do not write generic filler.`;

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
      if (context.attemptSummary) {
        prompt += `\nStudent Performance in this Paper Attempt:`;
        prompt += `\n- Score: ${context.attemptSummary.score} / ${context.attemptSummary.totalMarks} marks`;
        prompt += `\n- Accuracy: ${context.attemptSummary.accuracy}%`;
        prompt += `\n- Correct Answers: ${context.attemptSummary.correctCount}`;
        prompt += `\n- Incorrect Answers: ${context.attemptSummary.incorrectCount}`;
        prompt += `\n- Unanswered: ${context.attemptSummary.unansweredCount}`;
        if (context.attemptSummary.wrongQuestions && context.attemptSummary.wrongQuestions.length > 0) {
          prompt += `\n- Questions Answered Incorrectly:`;
          context.attemptSummary.wrongQuestions.forEach((w) => {
            prompt += `\n  * Q#${w.questionNo}: ${w.text.slice(0, 100)}... (Student selected: ${w.studentSelected || "None"}, Correct: ${w.correctAnswer || "Key"})`;
          });
        }
      }
    }
    prompt += `\nTailor your insights directly around this context.`;
  }

  return prompt;
}

export async function validateApiKey(
  provider: "gemini" | "openai" | "anthropic" | "groq",
  apiKey: string,
): Promise<{ valid: boolean; error?: string; model?: string }> {
  try {
    if (!apiKey || !apiKey.trim()) {
      return { valid: false, error: "API key cannot be empty." };
    }

    const res = await fetch("/api/revision/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        apiKey: apiKey.trim(),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.valid) {
      return {
        valid: false,
        error: data.error || `Validation failed with status ${res.status}.`,
      };
    }

    return {
      valid: true,
      model: data.model,
    };
  } catch (err: any) {
    return {
      valid: false,
      error:
        err.name === "TimeoutError"
          ? "Validation request timed out."
          : err.message || "Failed to reach the validation server.",
    };
  }
}

export interface RevisionApiError extends Error {
  needsApiKey?: boolean;
}

export interface RevisionQueryResponse {
  text: string;
  clearInvalidKey?: boolean;
  keyNotice?: string;
}

/**
 * Unescapes literal backslash sequences often returned by LLM APIs
 * (\n, \r\n, \", \t) into real whitespace and formatting.
 */
export function cleanMarkdownContent(raw: string): string {
  if (!raw) return "";
  let text = raw;

  // Unescape backslash sequences often returned by LLM APIs
  if (text.includes("\\n")) {
    text = text.replace(/\\\\n/g, "\n").replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
  }
  if (text.includes("\\r")) {
    text = text.replace(/\\r/g, "\n");
  }

  // CRITICAL: DO NOT replace \t if followed by a letter (\times, \theta, \tau, \text, \to, \tan, etc.)
  // Only replace \t followed by whitespace or at line ends
  text = text.replace(/\\t(?=[\s\t,;.)\]}]|$)/g, "  ");

  // Fix escaped quotes
  if (text.includes('\\"')) {
    text = text.replace(/\\"/g, '"');
  }

  // Ensure markdown headings have a space after '#' (e.g. "###Heading" -> "### Heading")
  text = text.replace(/^(#{1,4})([^\s#])/gm, "$1 $2");

  return text;
}

export async function sendRevisionQuery(
  messages: RevisionMessage[],
  context: RevisionContext,
  config?: RevisionProviderConfig | null,
): Promise<RevisionQueryResponse> {
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

  return {
    text: data.text,
    clearInvalidKey: Boolean(data.clearInvalidKey),
    keyNotice: data.keyNotice,
  };
}
