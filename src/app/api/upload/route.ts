import { NextRequest, NextResponse } from "next/server";
import { uploadFile, readJsonStore, writeJsonStore } from "@/lib/cloudStorage";
import { parseAnswerKeyDetailed } from "@/lib/defaults";
import { parseMarkdownHeader } from "@/lib/markdownPaperParser";
import {
  checkRateLimit,
  getAuthenticatedUser,
  rateLimitResponse,
  unauthorizedResponse,
  validateUploadFile,
} from "@/lib/apiSecurity";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorizedResponse();

    const rateLimit = checkRateLimit(req, "upload", 10, 10 * 60_000);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const formData = await req.formData();
    const year = (formData.get("year") as string) || "";
    const identifier = (formData.get("identifier") as string) || "";
    const examType = (formData.get("examType") as string) || "objective";
    const subject = (formData.get("subject") as string) || "GS I";
    const label = (formData.get("label") as string) || "";
    const titleInput = (formData.get("title") as string) || "";
    const totalQuestions =
      parseInt(formData.get("totalQuestions") as string) ||
      (examType === "objective" ? 100 : 20);
    const correctMarks =
      parseFloat(formData.get("correctMarks") as string) ||
      (examType === "objective" ? 2.0 : 0);
    const incorrectMarks =
      parseFloat(formData.get("incorrectMarks") as string) || 0;
    const timeMinutes =
      parseInt(formData.get("timeMinutes") as string) ||
      (examType === "objective" ? 120 : 180);
    const totalMarksInput = parseFloat(formData.get("totalMarks") as string);
    const totalMarks =
      !isNaN(totalMarksInput) && totalMarksInput > 0
        ? totalMarksInput
        : examType === "objective"
          ? totalQuestions * correctMarks
          : 250;
    const answerKeyTextInput = (formData.get("answerKeyText") as string) || "";
    const cutoffEnabled = formData.get("cutoffEnabled") === "true";
    const cutoffType =
      formData.get("cutoffType") === "marks" ? "marks" : "percentage";
    const cutoffValueInput = parseFloat(
      (formData.get("cutoffValue") as string) || "",
    );
    const cutoffValue =
      cutoffEnabled &&
      Number.isFinite(cutoffValueInput) &&
      cutoffValueInput >= 0
        ? cutoffValueInput
        : undefined;
    const userId = user.id;
    const isUserUpload = true;
    const isCustomUpload =
      formData.get("isCustom") === "true" ||
      isUserUpload ||
      subject === "Custom Practice" ||
      !formData.get("identifier");

    const cleanYear =
      year.replace(/[^0-9]/g, "") || String(new Date().getFullYear());

    // User-entered identifier/title resolution
    let paperTitle = "";
    if (
      label &&
      !label.match(/^\d{4}\s*–\s*(GS\s*I|GS\s*II\s*CSAT|Mains.*)$/i)
    ) {
      paperTitle = label.trim();
    } else if (
      titleInput &&
      !titleInput.match(/^\d{4}\s*–\s*(GS\s*I|GS\s*II\s*CSAT|Mains.*)$/i)
    ) {
      paperTitle = titleInput.trim();
    } else if (identifier && !identifier.startsWith("prelims_")) {
      paperTitle = identifier.trim();
    } else if (label) {
      paperTitle = label.trim();
    } else if (identifier) {
      paperTitle = identifier.trim();
    } else {
      paperTitle = `${cleanYear} – ${subject}`;
    }

    let cleanName = identifier
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    if (!cleanName && paperTitle) {
      cleanName = paperTitle
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 40);
    }
    if (!cleanName) {
      cleanName = `paper_${Date.now().toString(36)}`;
    }

    const catFolder = examType === "objective" ? "prelims" : "mains";
    const paperId = isUserUpload
      ? `custom_${userId.slice(0, 8)}_${cleanYear}_${cleanName}`
      : isCustomUpload
        ? `custom_${cleanYear}_${cleanName}_${Date.now().toString(36)}`
        : `${cleanYear}_${cleanName}`;

    // Isolated storage path: User papers reside under custom-papers/${userId}/...
    const qpFileName = isUserUpload
      ? `custom-papers/${userId}/${paperId}/paper.pdf`
      : `papers/${cleanYear}/${catFolder}/${cleanName}.pdf`;
    const akFileName = isUserUpload
      ? `custom-papers/${userId}/${paperId}/answer_key.txt`
      : `answer_keys/${cleanYear}/${catFolder}/${cleanName}.txt`;
    const exsFileName = isUserUpload
      ? `custom-papers/${userId}/${paperId}/solution.pdf`
      : `solutions/${cleanYear}/${catFolder}/${cleanName}.pdf`;

    // 1. Process Question Paper (.pdf or markdown content) -> prefix: qp
    let qpUrl = "";
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
      validateUploadFile(formData.get("akFile") as File | null, {
        label: "Answer key",
        maxBytes: 2 * 1024 * 1024,
        extensions: [".txt", ".text"],
        mimeTypes: ["text/plain", "application/octet-stream"],
      }),
      validateUploadFile(formData.get("exsFile") as File | null, {
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
    let parsedQuestions: any = undefined;
    if (parsedQuestionsRaw) {
      try {
        parsedQuestions = JSON.parse(parsedQuestionsRaw);
      } catch (e) {
        console.warn("Failed parsing parsedQuestions in upload API:", e);
      }
    }
    const markdownInstructions = markdownContent
      ? parseMarkdownHeader(markdownContent).instructions
      : [];

    if (qpFile) {
      const qpBuffer = Buffer.from(await qpFile.arrayBuffer());
      qpUrl = await uploadFile(qpFileName, qpBuffer, "application/pdf");
    } else if (markdownContent) {
      qpUrl = "local://interactive_markdown";
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: "Question Paper PDF or Markdown questions are required",
        },
        { status: 400 },
      );
    }

    // 2. Process Answer Key (.txt) -> prefix: ak
    let answerKeyContent = answerKeyTextInput;
    const akFile = formData.get("akFile") as File | null;
    if (akFile && akFile.size > 0) {
      answerKeyContent = await akFile.text();
    }
    let akUrl: string | undefined = undefined;
    if (answerKeyContent) {
      akUrl = await uploadFile(
        akFileName,
        answerKeyContent,
        "text/plain;charset=utf-8",
      );
    }

    // 3. Process Solution (.pdf) -> prefix: exs
    let exsUrl: string | undefined = undefined;
    const exsFile = formData.get("exsFile") as File | null;
    if (exsFile && exsFile.size > 0) {
      const exsBuffer = Buffer.from(await exsFile.arrayBuffer());
      exsUrl = await uploadFile(exsFileName, exsBuffer, "application/pdf");
    }

    // Parse Answer Key into structured object (supports 1. a """ explanation """)
    const { answers: parsedKey, explanations: parsedExplanations } =
      answerKeyContent
        ? parseAnswerKeyDetailed(answerKeyContent)
        : { answers: {}, explanations: {} };

    const paperObj = {
      id: paperId,
      userId: isUserUpload ? userId : undefined,
      year: cleanYear,
      category: examType === "objective" ? "prelims" : "mains",
      examType,
      subject: isCustomUpload || isUserUpload ? paperTitle : subject,
      label: paperTitle,
      title: paperTitle,
      totalQuestions,
      totalMarks,
      correctMarks,
      incorrectMarks,
      timeMinutes,
      qpUrl,
      akUrl,
      exsUrl,
      answerKeyText: answerKeyContent,
      answerKey: parsedKey,
      explanations: parsedExplanations,
      markdownContent: markdownContent || undefined,
      parsedQuestions: parsedQuestions || undefined,
      instructions:
        markdownInstructions.length > 0 ? markdownInstructions : undefined,
      cutoffEnabled,
      cutoffType,
      cutoffValue,
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };

    // 4. If user upload: Persist to Supabase custom_papers table
    if (
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
          id: paperId,
          user_id: userId,
          title: paperTitle,
          year: parseInt(cleanYear) || 2026,
          subject: paperTitle,
          stage: catFolder,
          exam_type: examType,
          label: paperTitle,
          total_questions: totalQuestions,
          total_marks: totalMarks,
          correct_marks: correctMarks,
          incorrect_marks: incorrectMarks,
          time_minutes: timeMinutes,
          qp_url: qpUrl,
          ak_url: akUrl || null,
          exs_url: exsUrl || null,
          answer_key: parsedKey,
          answer_key_text: answerKeyContent || null,
          markdown_content: markdownContent || null,
          parsed_questions: parsedQuestions || null,
          instructions: markdownInstructions,
          explanations: parsedExplanations,
          cutoff_enabled: cutoffEnabled,
          cutoff_type: cutoffType,
          cutoff_value: cutoffValue ?? null,
          updated_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn(
          "Failed saving custom paper to Supabase custom_papers table:",
          dbErr,
        );
      }
    } else {
      // Local fallback: retain ownership metadata for authenticated users.
      const papersMeta = await readJsonStore<Record<string, any>>(
        "papers.json",
        {},
      );
      papersMeta[paperId] = paperObj;
      await writeJsonStore("papers.json", papersMeta);
    }

    return NextResponse.json({ ok: true, paper: paperObj });
  } catch (err: any) {
    console.error("Upload API error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 },
    );
  }
}
