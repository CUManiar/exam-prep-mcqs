import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_GEMINI_MODEL,
  getUpscRevisionSystemPrompt,
  cleanMarkdownContent,
} from "../../../../lib/revisionAi";
import { RevisionContext, RevisionMessage, RevisionProviderConfig } from "../../../../lib/types";
import {
  generateComprehensiveUpscDossier,
  generatePaperPerformanceReport,
  generateQuestionDissection,
} from "../../../../lib/revisionDossiers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages = [],
      context = { mode: "open" } as RevisionContext,
      providerConfig,
    }: {
      messages: RevisionMessage[];
      context: RevisionContext;
      providerConfig?: RevisionProviderConfig | null;
    } = body;

    if (!messages.length) {
      return NextResponse.json(
        { error: "No messages provided." },
        { status: 400 },
      );
    }

    const latestUserMsg = messages.filter((m) => m.role === "user").pop()?.content || "";
    let clearInvalidKey = false;
    let keyNotice: string | undefined = undefined;

    // SPECIALIZED ROUTING 1: Student Attempt / Score Query in Paper Mode
    const isScoreInquiry =
      context.mode === "paper" &&
      /\b(score|marks|result|how did i do|how much score|my performance|wrong questions|mistakes|accuracy|how many correct)\b/i.test(
        latestUserMsg,
      );

    if (isScoreInquiry) {
      const performanceText = generatePaperPerformanceReport(context);
      return NextResponse.json({
        text: cleanMarkdownContent(performanceText),
        clearInvalidKey,
        keyNotice,
      });
    }

    // SPECIALIZED ROUTING 2: Focused Question Dissection
    const isQuestionDissectionInquiry =
      Boolean(context.question) &&
      (/\b(dissect|explain|options?|why|breakdown|statement|analysis)\b/i.test(latestUserMsg) ||
        latestUserMsg.toLowerCase().includes(`q#${context.questionNo}`) ||
        latestUserMsg.toLowerCase().includes(`question ${context.questionNo}`));

    if (isQuestionDissectionInquiry && context.question) {
      const questionText = generateQuestionDissection(context);
      return NextResponse.json({
        text: cleanMarkdownContent(questionText),
        clearInvalidKey,
        keyNotice,
      });
    }

    const systemPrompt = getUpscRevisionSystemPrompt(context);

    // 1. Check for User or Server API Key
    const userApiKey = providerConfig?.apiKey?.trim();
    const serverGeminiKey = process.env.GEMINI_API_KEY?.trim();

    // BRANCH 1: Custom Groq Key
    if (userApiKey && providerConfig?.provider === "groq") {
      try {
        const model = providerConfig.model || "llama-3.3-70b-versatile";
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userApiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              ...messages.map((m) => ({
                role: m.role === "assistant" ? "assistant" : "user",
                content: m.content,
              })),
            ],
            temperature: 0.35,
            max_tokens: 3500,
          }),
          signal: AbortSignal.timeout(12000),
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          const rawText = data.choices?.[0]?.message?.content || "";
          if (rawText.trim()) {
            return NextResponse.json({ text: cleanMarkdownContent(rawText) });
          }
        } else if (groqRes.status === 401 || groqRes.status === 403) {
          clearInvalidKey = true;
          keyNotice = "Saved Groq API key was invalid. Automatically switched to Free AI.";
        }
      } catch (e) {
        console.warn("Groq key query failed, proceeding to fallback:", e);
      }
    }

    // BRANCH 2: Google Gemini Key (User Key or Server Key)
    const geminiKey = userApiKey || serverGeminiKey;
    if (geminiKey) {
      const candidateModels = [
        providerConfig?.model || DEFAULT_GEMINI_MODEL,
        "gemini-2.5-flash",
        "gemini-2.0-flash",
      ].filter((v, idx, arr) => arr.indexOf(v) === idx);

      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

      for (const model of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
          const geminiRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents,
              systemInstruction: { parts: [{ text: systemPrompt }] },
              generationConfig: {
                temperature: 0.35,
                maxOutputTokens: 3500,
              },
            }),
            signal: AbortSignal.timeout(12000),
          });

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (text.trim()) {
              return NextResponse.json({
                text: cleanMarkdownContent(text),
                clearInvalidKey: false,
              });
            }
          } else {
            const errData = await geminiRes.json().catch(() => ({}));
            const errMsg = errData.error?.message || "";
            // Check for invalid API key
            if (
              geminiRes.status === 400 &&
              (errMsg.toLowerCase().includes("api key not valid") ||
                errMsg.toLowerCase().includes("invalid_argument") ||
                errData.error?.status === "INVALID_ARGUMENT")
            ) {
              clearInvalidKey = true;
              keyNotice = "Saved Google AI Studio API key was invalid. Automatically switched to Free AI.";
              console.warn("Invalid Gemini key detected, purging key and falling to Free AI:", errMsg);
              break; // Don't keep hammering Gemini with an invalid key
            }
            if (geminiRes.status === 401 || geminiRes.status === 403) {
              clearInvalidKey = true;
              keyNotice = "Saved Google AI Studio API key was unauthorized. Automatically switched to Free AI.";
              break;
            }
          }
        } catch (e: any) {
          console.warn(`Gemini call with model ${model} timed out or failed:`, e?.message);
        }
      }
    }

    // BRANCH 3: Built-in Free Live AI Service (with strict fast timeout)
    const promptTopic = context.topic || context.paperTitle || latestUserMsg.slice(0, 80);
    const promptSummary = `UPSC CSE High-Yield Revision for "${promptTopic}". Provide Constitutional Articles, Landmark SC Judgements, Recent PIB Policies, Prelims Traps, and Mains Value-Add.`;

    try {
      const simpleUrl = `https://text.pollinations.ai/${encodeURIComponent(promptSummary)}?model=openai`;
      const simpleRes = await fetch(simpleUrl, {
        signal: AbortSignal.timeout(6000),
      });

      if (simpleRes.ok) {
        const raw = await simpleRes.text();
        if (raw && raw.trim() && !raw.startsWith("<!DOCTYPE") && raw.length > 80) {
          return NextResponse.json({
            text: cleanMarkdownContent(raw),
            clearInvalidKey,
            keyNotice,
          });
        }
      }
    } catch {
      // Proceed to instant guaranteed UPSC synthesis
    }

    // BRANCH 4: Instant Guaranteed UPSC Syllabus Knowledge Synthesis
    // Ensures zero 2-minute delays, zero 400 errors, zero downtime for student
    const failSafeText = generateComprehensiveUpscDossier(context, latestUserMsg);
    return NextResponse.json({
      text: cleanMarkdownContent(failSafeText),
      clearInvalidKey,
      keyNotice,
    });
  } catch (err: any) {
    console.error("Revision chat error:", err);
    try {
      const fallbackText = generateComprehensiveUpscDossier({ mode: "open" }, "UPSC Civil Services Revision");
      return NextResponse.json({
        text: cleanMarkdownContent(fallbackText),
        clearInvalidKey: true,
      });
    } catch {
      return NextResponse.json(
        {
          error: err.message || "Unable to complete revision query. Please try again.",
        },
        { status: 500 },
      );
    }
  }
}
