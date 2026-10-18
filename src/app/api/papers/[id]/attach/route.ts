import { NextRequest, NextResponse } from "next/server";
import { uploadFile, readJsonStore, writeJsonStore } from "@/lib/cloudStorage";
import { INITIAL_PAPERS, parseAnswerKeyDetailed } from "@/lib/defaults";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cleanId = id.toLowerCase();
    const formData = await req.formData();

    const answerKeyText = (formData.get("answerKeyText") as string) || "";
    const akFile = formData.get("akFile") as File | null;
    const exsFile = formData.get("exsFile") as File | null;
    const qpFile = formData.get("qpFile") as File | null;

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
      INITIAL_PAPERS.find((p) => p.id.toLowerCase() === cleanId);
    if (!currentPaper) {
      return NextResponse.json(
        { ok: false, error: "Question paper not found" },
        { status: 404 },
      );
    }

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
      updatedAt: new Date().toISOString(),
    };

    customMeta[cleanId] = updated;
    await writeJsonStore("papers.json", customMeta);

    return NextResponse.json({ ok: true, paper: updated });
  } catch (err: any) {
    console.error("Attach/Update paper error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 },
    );
  }
}
