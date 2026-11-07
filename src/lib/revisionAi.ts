import {
  ParsedQuestion,
  QuestionAnswer,
  RevisionContext,
  RevisionMessage,
  RevisionProviderConfig,
} from "./types";

const REVISION_CONFIG_KEY = "upsc_revision_llm_config";
const REVISION_HISTORY_KEY = "upsc_revision_history";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export const AVAILABLE_MODELS = {
  gemini: [
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash (Recommended - Fastest & Free)",
    },
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash (Next-Gen High Speed)",
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
      const topic = ctx.topic || ctx.question?.topic || "this topic";
      return `Provide a comprehensive UPSC exam breakdown of all important Constitutional Articles, Schedules, and statutory provisions related to "${topic}". Include exact numbers, constitutional rationale, and a quick summary table.`;
    },
  },
  {
    id: "judgements",
    label: "Landmark & Recent Judgements",
    icon: "⚖️",
    description: "Supreme Court case laws, core ratios & bench decisions",
    generatePrompt: (ctx) => {
      const topic = ctx.topic || ctx.question?.topic || "this topic";
      return `List the landmark and recent Supreme Court judgements (including latest 2020-2026 rulings) relevant to "${topic}". For each case, state the Year, the Bench/Case Name, the Core Ratio Decidendi, and how to cite it in a Mains answer.`;
    },
  },
  {
    id: "pib_news",
    label: "Recent PIB & News",
    icon: "📰",
    description: "Contemporary government policies, schemes & editorial debates",
    generatePrompt: (ctx) => {
      const topic = ctx.topic || ctx.question?.topic || "this topic";
      return `What are the recent PIB releases, government schemes, committee recommendations (e.g. Finance Commission, Sarkaria/Punchhi, Law Commission), and contemporary debates surrounding "${topic}"? Provide sharp, factual points for Prelims and analytical fodder for Mains.`;
    },
  },
  {
    id: "infographic",
    label: "Infographic & Mindmap",
    icon: "📊",
    description: "Visual Mermaid diagram, conceptual flow & comparative matrix",
    generatePrompt: (ctx) => {
      const topic = ctx.topic || ctx.question?.topic || "this topic";
      return `Synthesize "${topic}" visually for in-depth understanding. Provide a Mermaid flowchart diagram (using \`\`\`mermaid) showing the structural flow or hierarchy, followed by a high-yield comparative markdown table.`;
    },
  },
  {
    id: "prelims_drill",
    label: "Prelims Elimination Drill",
    icon: "🎯",
    description: "5 high-yield MCQs testing tricky trap options & 50-50 logic",
    generatePrompt: (ctx) => {
      const topic = ctx.topic || ctx.question?.topic || "this topic";
      return `Generate 3 high-yield UPSC Prelims-standard MCQs on "${topic}". Include tricky statement-based formats ("How many of the above statements are correct?"), highlight common elimination traps, and provide exhaustive explanations with the correct answer key.`;
    },
  },
  {
    id: "mains_framework",
    label: "Mains 10M/15M Framework",
    icon: "✍️",
    description: "Structured model answer: Intro, multi-dimensional body, conclusion",
    generatePrompt: (ctx) => {
      const topic = ctx.topic || ctx.question?.topic || "this topic";
      return `Frame a probable 15-Mark (250 words) UPSC GS Mains question on "${topic}" and provide an exemplary model answer structure: punchy introduction with constitutional/data grounding, multi-dimensional body (Constitutional, Administrative, Fiscal, Contemporary challenges), and forward-looking conclusion with committee references.`;
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
      const activeModel = model || DEFAULT_GEMINI_MODEL;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey.trim()}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Ping. Respond with 'PONG'." }] }],
        }),
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
      error: err.message || "Failed to reach the API server.",
    };
  }
}

export async function sendRevisionQuery(
  messages: RevisionMessage[],
  context: RevisionContext,
  config?: RevisionProviderConfig | null,
): Promise<string> {
  // If no API key configured, return sample high-quality demo response
  if (!config || !config.apiKey || !config.apiKey.trim()) {
    return generateOfflineDemoResponse(
      messages[messages.length - 1]?.content || "",
      context,
    );
  }

  const systemInstruction = getUpscRevisionSystemPrompt(context);

  if (config.provider === "gemini") {
    const activeModel = config.model || DEFAULT_GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${config.apiKey.trim()}`;

    // Transform messages to Gemini format
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 3500,
        },
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const errorMsg =
        errJson.error?.message ||
        `Google Gemini API error (${response.status}: ${response.statusText})`;
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("No response generated by Gemini model.");
    }
    return text;
  } else {
    // Groq OpenAI-compatible format
    const activeModel = config.model || DEFAULT_GROQ_MODEL;
    const url = "https://api.groq.com/openai/v1/chat/completions";

    const groqMessages = [
      { role: "system", content: systemInstruction },
      ...messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role,
          content: m.content,
        })),
    ];

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: activeModel,
        messages: groqMessages,
        temperature: 0.35,
        max_tokens: 3500,
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const errorMsg =
        errJson.error?.message ||
        `Groq API error (${response.status}: ${response.statusText})`;
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("No response generated by Groq model.");
    }
    return text;
  }
}

/**
 * Offline / Demo fallback response generator.
 * Provides high-yield UPSC sample outputs so students can explore the UI immediately.
 */
export function generateOfflineDemoResponse(
  query: string,
  context: RevisionContext,
): string {
  const queryLower = query.toLowerCase();
  const topicName = context.topic || "Federal Structure";

  if (
    queryLower.includes("federal") ||
    topicName.toLowerCase().includes("federal")
  ) {
    return `# 🏛️ Topic Dossier: Federal Structure of India (UPSC GS-II)

### 1. Constitutional Foundations
- **Article 1(1)**: *"India, that is Bharat, shall be a Union of States."* Dr. B.R. Ambedkar emphasized that the Indian federation is not the result of an agreement among states, and no state has the right to secede.
- **Seventh Schedule (Article 246)**: Three-fold distribution of legislative subjects:
  - **Union List (List I)**: 100 subjects (originally 97) — Defence, Atomic Energy, External Affairs, Banking.
  - **State List (List II)**: 61 subjects (originally 66) — Public Order, Police, Public Health, Agriculture.
  - **Concurrent List (List III)**: 52 subjects (originally 47) — Criminal law, Marriage, Education, Forests (shifted via 42nd Amendment, 1976).
- **Residuary Powers (Article 248)**: Vested exclusively with the Union Parliament (contrast with US/Australia where residuary powers belong to states).

\`\`\`mermaid
flowchart TD
    A["Indian Federal Framework<br>(Quasi-Federal / Cooperative)"] --> B["Legislative Relations<br>(Articles 245–255)"]
    A --> C["Administrative Relations<br>(Articles 256–263)"]
    A --> D["Financial Relations<br>(Articles 268–293)"]

    B --> B1["7th Schedule Distribution<br>Union List • State List • Concurrent List"]
    B --> B2["Union Precedence (Art. 254)<br>Residuary Powers with Centre (Art. 248)"]

    C --> C1["Executive Directions to States (Art. 256/257)<br>All-India Services (Art. 312)"]
    C --> C2["Inter-State Council (Art. 263)<br>Full Faith & Credit (Art. 261)"]

    D --> D1["16th Finance Commission (Art. 280)<br>Vertical & Horizontal Devolution"]
    D --> D2["GST Council (Art. 279A)<br>Pooled Sovereignty in Indirect Taxation"]
\`\`\`

### 2. Landmark & Recent Supreme Court Judgements
| Case Law | Year | Core Ratio Decidendi & UPSC Relevance |
| :--- | :--- | :--- |
| **S.R. Bommai v. Union of India** | 1994 | **Federalism is an inviolable part of the Basic Structure**. Article 356 (President's Rule) is subject to judicial review; state governments cannot be dismissed arbitrarily. |
| **Kuldip Nayar v. Union of India** | 2006 | Reaffirmed India as a quasi-federal system; residence requirement for Rajya Sabha candidates held non-mandatory, reflecting India's asymmetric federal design. |
| **Govt. of NCT of Delhi v. UOI** | 2023 | Re-emphasized the principle of representative governance and federal balance regarding control over civil services in Delhi (Art. 239AA). |
| **State of Punjab v. Governor** | 2023 | SC held that a Governor cannot sit indefinitely on bills passed by the legislature under Article 200, protecting state legislative autonomy. |

### 3. Recent PIB Updates, Policy Friction & Contemporary Issues
- **16th Finance Commission (Chaired by Dr. Arvind Panagariya)**: Mandated to recommend tax devolution formula for 2026–2031, addressing vertical devolution demands from southern states.
- **Governor's Role & Article 200**: Ongoing debate on defining timelines for gubernatorial assent to state bills (Tamil Nadu, Kerala, Punjab petitions).
- **Fiscal Federalism & Off-Budget Borrowings**: Union Finance Ministry regulations bringing state Public Sector Undertakings (PSUs) debt under the state's net borrowing ceiling (Article 293(3)).
- **GST Council (Article 279A)**: Supreme Court in *Mohit Minerals (2022)* held that recommendations of the GST Council are not binding on states, reinforcing cooperative federalism.

### 4. Institutional Commissions & Recommendations
- **Sarkaria Commission (1988)**:
  - Article 356 must be used only as an *ultimum remedium* (last resort).
  - Permanent Inter-State Council under Article 263 should be revitalized.
- **Punchhi Commission (2010)**:
  - Doctrine of executive necessity should be bounded.
  - Governors should have fixed 5-year tenures and impeachment mechanisms similar to the President.

> [!WARNING] **Prelims Trap**:
> The word **"Federation" is NOT mentioned anywhere** in the text of the Constitution of India! Article 1 deliberately describes India as a *"Union of States"*.

> [!TIP] **Mains Value-Add (Granville Austin & K.C. Wheare)**:
> Quote K.C. Wheare: *"India is a quasi-federal state with strong centralizing tendencies."* Contrast with Granville Austin's characterization of Indian federalism as *"Cooperative Federalism"*.`;
  }

  if (context.mode === "paper" && context.question) {
    const q = context.question;
    return `# 📄 Question Dissection & Pedagogical Analysis

### Question #${q.questionNo} Review
**Prompt**: ${q.text}

${
  q.options
    ? Object.entries(q.options)
        .map(([k, v]) => `- **(${k})**: ${v}`)
        .join("\n")
    : ""
}

- **Official Answer**: Option **${q.answer || "N/A"}**
- **Your Selected Answer**: ${context.userAnswer?.selected || "Not attempted"} ${
      context.userAnswer?.isCorrect
        ? "✅ *(Correct!)*"
        : "❌ *(Incorrect / Trap Caught)*"
    }

---

### 1. Conceptual Breakdown & Elimination Logic
- **Core Theme**: ${q.subject || "General Studies"} ${
      q.topic ? `> ${q.topic}` : ""
    }
- **Why Option (${q.answer}) is Correct**:
  ${
    q.explanation ||
    "This option accurately reflects the constitutional mandate and statutory provisions."
  }

### 2. The Elimination Strategy (50-50 Trap Analysis)
In UPSC Prelims, questions frequently use extreme qualifiers (*"all"*, *"only"*, *"under no circumstances"*) or swap similar authorities (e.g. Finance Ministry vs RBI, President vs Parliament).
- Verify which options can be eliminated first by testing constitutional definitions.
- Always check if the question asks for *"Which of the above is/are **NOT** correct"*.

> [!TIP] **Revision Flashcard**:
> Save this explanation directly into your personal revision notes using the **"Save to Question Notes"** action below.`;
  }

  // Default General Topic response
  return `# 📚 High-Yield Revision: ${topicName}

### Core Exam Framework
1. **Definition & Significance**:
   - Essential conceptual building blocks for UPSC General Studies.
2. **Key Institutional & Legal Touchpoints**:
   - Constitutional/statutory basis, responsible nodal ministry, and regulatory framework.
3. **Contemporary Context (2024–2026)**:
   - Recent policy shifts, reports, and international/national indices.

> [!NOTE] **Connect Free AI Key**:
> You are currently viewing simulated high-yield notes. To unlock real-time live generation with up-to-date queries, paste your **free Google Gemini API Key** in the settings. It takes 30 seconds and requires no credit card.`;
}
