import { NextRequest, NextResponse } from "next/server";
import { uploadFile, readJsonStore, writeJsonStore } from "@/lib/cloudStorage";
import { INITIAL_PAPERS, parseAnswerKeyDetailed } from "@/lib/defaults";
import {
  parseQuestionnaireMarkdown,
  parseMarkdownHeader,
} from "@/lib/markdownPaperParser";
import {
  checkRateLimit,
  getOwnedCustomPaperFromSupabase,
  getAuthenticatedUser,
  rateLimitResponse,
  unauthorizedResponse,
  validateUploadFile,
} from "@/lib/apiSecurity";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorizedResponse();

    const rateLimit = checkRateLimit(req, "paper-attach", 20, 10 * 60_000);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const { id } = await params;
    const cleanId = id.toLowerCase();
    const formData = await req.formData();

    const answerKeyText = (formData.get("answerKeyText") as string) || "";
    const akFile = formData.get("akFile") as File | null;
    const exsFile = formData.get("exsFile") as File | null;
    const qpFile = formData.get("qpFile") as File | null;
    const markdownContent = (formData.get("markdownContent") as string) || "";
    const parsedQuestionsRaw =
      (formData.get("parsedQuestions") as string) || "";

    const uploadErrors = [
      validateUploadFile(qpFile, {
        label: "Question paper",
        maxBytes: 25 * 1024 * 1024,
        extensions: [".pdf"],
        mimeTypes: ["application/pdf"],
      }),
      validateUploadFile(akFile, {
        label: "Answer key",
        maxBytes: 2 * 1024 * 1024,
        extensions: [".txt", ".text"],
        mimeTypes: ["text/plain", "application/octet-stream"],
      }),
      validateUploadFile(exsFile, {
        label: "Solution",
        maxBytes: 25 * 1024 * 1024,
        extensions: [".pdf"],
        mimeTypes: ["application/pdf"],
      }),
    ].find(Boolean);
    if (uploadErrors) {
      return NextResponse.json(
        { ok: false, error: uploadErrors },
        { status: 413 },
      );
    }
    if (new TextEncoder().encode(markdownContent).length > 2 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: "Markdown content must be 2 MB or smaller." },
        { status: 413 },
      );
    }

    // Optional metadata updates
    const label = (formData.get("label") as string) || "";
    const subject = (formData.get("subject") as string) || "";
    const totalQuestionsStr = formData.get("totalQuestions") as string;
    const totalMarksStr = formData.get("totalMarks") as string;
    const correctMarksStr = formData.get("correctMarks") as string;
    const incorrectMarksStr = formData.get("incorrectMarks") as string;
    const timeMinutesStr = formData.get("timeMinutes") as string;

    const customMeta = await readJsonStore<Record<string, any>>(
      "papers.json",
      {},
    );
    // Find paper in customMeta or built-in INITIAL_PAPERS
    let currentPaper =
      customMeta[cleanId] ||
      (await getOwnedCustomPaperFromSupabase(cleanId, user.id)) ||
      INITIAL_PAPERS.find((p) => p.id.toLowerCase() === cleanId);
    if (!currentPaper) {
      return NextResponse.json(
        { ok: false, error: "Question paper not found" },
        { status: 404 },
      );
    }
    if (!currentPaper.userId || currentPaper.userId !== user.id) {
      return NextResponse.json(
        { ok: false, error: "You do not own this question paper." },
        { status: 403 },
      );
    }

    const hasCutoffUpdate = formData.has("cutoffEnabled");
    const cutoffEnabled = hasCutoffUpdate
      ? formData.get("cutoffEnabled") === "true"
      : Boolean(currentPaper.cutoffEnabled);
    const cutoffType =
      formData.get("cutoffType") === "marks"
        ? "marks"
        : formData.has("cutoffType")
          ? "percentage"
          : currentPaper.cutoffType || "percentage";
    const cutoffValueInput = parseFloat(
      (formData.get("cutoffValue") as string) || "",
    );
    const cutoffValue =
      cutoffEnabled &&
      Number.isFinite(cutoffValueInput) &&
      cutoffValueInput >= 0
        ? cutoffValueInput
        : hasCutoffUpdate
          ? undefined
          : currentPaper.cutoffValue;

    const year = currentPaper.year || "2026";
    const cat = currentPaper.category || "prelims";
    const cleanName = cleanId.replace(/^[0-9]+_/, "") || cleanId;

    // 1. Process Replacement Question Paper PDF if provided
    let qpUrl = currentPaper.qpUrl;
    if (qpFile && qpFile.size > 0) {
      const qpFileName = `papers/${year}/${cat}/${cleanName}.pdf`;
      const qpBuffer = Buffer.from(await qpFile.arrayBuffer());
      qpUrl = await uploadFile(qpFileName, qpBuffer, "application/pdf");
    }

    // 2. Process Answer Key if provided
    let akContent = answerKeyText;
    if (akFile && akFile.size > 0) {
      akContent = await akFile.text();
    }

    let akUrl = currentPaper.akUrl;
    let parsedKey: Record<number, string> = {
      ...(currentPaper.answerKey || {}),
    };
    let parsedExplanations: Record<number, string> = {
      ...(currentPaper.explanations || {}),
    };

    if (akContent && akContent.trim().length > 0) {
      const akFileName = `answer_keys/${year}/${cat}/${cleanName}.txt`;
      akUrl = await uploadFile(
        akFileName,
        akContent,
        "text/plain;charset=utf-8",
      );

      // Parse answers and explanations
      const detailed = parseAnswerKeyDetailed(akContent);
      if (Object.keys(detailed.answers).length > 0) {
        parsedKey = detailed.answers;
      }
      if (Object.keys(detailed.explanations).length > 0) {
        parsedExplanations = detailed.explanations;
      }
    }

    // 3. Process Solution PDF if provided
    let exsUrl = currentPaper.exsUrl;
    if (exsFile && exsFile.size > 0) {
      const exsFileName = `solutions/${year}/${cat}/${cleanName}.pdf`;
      const exsBuffer = Buffer.from(await exsFile.arrayBuffer());
      exsUrl = await uploadFile(exsFileName, exsBuffer, "application/pdf");
    }

    // 4. Process Markdown Content if provided
    let finalMarkdownContent = markdownContent || currentPaper.markdownContent;
    let finalParsedQuestions = currentPaper.parsedQuestions;
    let finalInstructions = currentPaper.instructions;

    if (markdownContent && markdownContent.trim().length > 0) {
      finalMarkdownContent = markdownContent;
      qpUrl = "local://interactive_markdown";
      if (parsedQuestionsRaw) {
        try {
          finalParsedQuestions = JSON.parse(parsedQuestionsRaw);
        } catch {
          finalParsedQuestions = parseQuestionnaireMarkdown(markdownContent);
        }
      } else {
        finalParsedQuestions = parseQuestionnaireMarkdown(markdownContent);
      }
      const hdr = parseMarkdownHeader(markdownContent);
      if (hdr.instructions && hdr.instructions.length > 0) {
        finalInstructions = hdr.instructions;
      }
    }

    const updated = {
      ...currentPaper,
      id: cleanId,
      qpUrl,
      akUrl,
      exsUrl,
      label: label || currentPaper.label,
      subject: subject || currentPaper.subject,
      totalQuestions: totalQuestionsStr
        ? parseInt(totalQuestionsStr)
        : finalParsedQuestions && finalParsedQuestions.length > 0
          ? finalParsedQuestions.length
          : currentPaper.totalQuestions,
      totalMarks: totalMarksStr
        ? parseFloat(totalMarksStr)
        : currentPaper.totalMarks,
      correctMarks: correctMarksStr
        ? parseFloat(correctMarksStr)
        : currentPaper.correctMarks,
      incorrectMarks: incorrectMarksStr
        ? parseFloat(incorrectMarksStr)
        : currentPaper.incorrectMarks,
      timeMinutes: timeMinutesStr
        ? parseInt(timeMinutesStr)
        : currentPaper.timeMinutes,
      answerKeyText: akContent || currentPaper.answerKeyText,
      answerKey:
        Object.keys(parsedKey).length > 0 ? parsedKey : currentPaper.answerKey,
      explanations:
        Object.keys(parsedExplanations).length > 0
          ? parsedExplanations
          : currentPaper.explanations,
      markdownContent: finalMarkdownContent || undefined,
      parsedQuestions: finalParsedQuestions || undefined,
      instructions: finalInstructions || undefined,
      cutoffEnabled,
      cutoffType,
      cutoffValue,
      updatedAt: new Date().toISOString(),
    };

    customMeta[cleanId] = updated;
    await writeJsonStore("papers.json", customMeta);

    // Sync to Supabase custom_papers if configured
    if (
      currentPaper.userId &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
        );
        await supabase.from("custom_papers").upsert({
          id: cleanId,
          user_id: currentPaper.userId,
          title: updated.label,
          year: parseInt(String(updated.year), 10) || new Date().getFullYear(),
          subject: updated.subject,
          stage: updated.category,
          exam_type: updated.examType,
          label: updated.label,
          total_questions: updated.totalQuestions,
          total_marks: updated.totalMarks,
          correct_marks: updated.correctMarks,
          incorrect_marks: updated.incorrectMarks,
          time_minutes: updated.timeMinutes,
          qp_url: updated.qpUrl,
          ak_url: updated.akUrl || null,
          exs_url: updated.exsUrl || null,
          answer_key: updated.answerKey,
          answer_key_text: updated.answerKeyText || null,
          markdown_content: updated.markdownContent || null,
          parsed_questions: updated.parsedQuestions || null,
          instructions: updated.instructions || [],
          explanations: updated.explanations || {},
          cutoff_enabled: updated.cutoffEnabled,
          cutoff_type: updated.cutoffType,
          cutoff_value: updated.cutoffValue ?? null,
          updated_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn("Failed syncing paper update to Supabase:", dbErr);
      }
    }

    return NextResponse.json({ ok: true, paper: updated });
  } catch (err: any) {
    console.error("Attach/Update paper error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 },
    );
  }
}
