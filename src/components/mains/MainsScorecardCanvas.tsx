"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Image as ImageIcon, Sparkles, Check } from "lucide-react";
import { MainsEvaluationResult } from "@/lib/mainsEvaluation";

interface MainsScorecardCanvasProps {
  evaluation: MainsEvaluationResult;
}

export function MainsScorecardCanvas({ evaluation }: MainsScorecardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High DPI scaling (1200 x 800)
    const width = 1200;
    const height = 760;
    canvas.width = width;
    canvas.height = height;

    // 1. Background gradient (Rich modern dark navy / slate tone)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#0f172a"); // slate-900
    bgGrad.addColorStop(0.5, "#1e1b4b"); // indigo-950
    bgGrad.addColorStop(1, "#020617"); // slate-950
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative subtle grid / accent lines
    ctx.strokeStyle = "rgba(99, 102, 241, 0.12)";
    ctx.lineWidth = 1;
    for (let x = 40; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 40; y < height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Outer card border
    ctx.strokeStyle = "rgba(129, 140, 248, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // 2. Header Strip
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
    ctx.fillText("UPSC CSE MAINS • ANSWER EVALUATION DOSSIER", 50, 65);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    const dateStr = new Date(evaluation.evaluatedAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    ctx.fillText(
      `Paper: ${evaluation.paperType}${evaluation.optionalSubject ? ` (${evaluation.optionalSubject})` : ""} | Target: ${evaluation.maxMarks} Marks (${evaluation.targetWordCount} words) | Evaluated: ${dateStr}`,
      50,
      95
    );

    // 3. Question Card Box (Top center)
    ctx.fillStyle = "rgba(30, 41, 59, 0.7)";
    ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(50, 120, width - 100, 80, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#818cf8";
    ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
    ctx.fillText(`QUESTION [Directive: ${evaluation.directive.toUpperCase()}]`, 70, 145);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    const truncatedQ =
      evaluation.question.length > 140
        ? evaluation.question.slice(0, 137) + "..."
        : evaluation.question;
    ctx.fillText(truncatedQ, 70, 175);

    // 4. Score Hero Box (Left side: 320px wide)
    const scoreBoxGrad = ctx.createLinearGradient(50, 220, 360, 500);
    scoreBoxGrad.addColorStop(0, "rgba(79, 70, 229, 0.25)");
    scoreBoxGrad.addColorStop(1, "rgba(30, 27, 75, 0.6)");
    ctx.fillStyle = scoreBoxGrad;
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(50, 220, 310, 280, 12);
    ctx.fill();
    ctx.stroke();

    // Marks Awarded Display
    ctx.fillStyle = "#a5b4fc";
    ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
    ctx.fillText("TOTAL MARKS AWARDED", 75, 255);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 64px system-ui, -apple-system, sans-serif";
    ctx.fillText(`${evaluation.marksAwarded}`, 75, 325);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
    ctx.fillText(`/ ${evaluation.maxMarks}`, 220, 325);

    // Percentage & Target zone
    ctx.fillStyle = evaluation.percentage >= 50 ? "#34d399" : "#f59e0b";
    ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
    ctx.fillText(`${evaluation.percentage}% Score`, 75, 365);

    // Examiner Verdict Stamp
    const stampColor = evaluation.percentage >= 55 ? "#10b981" : evaluation.percentage >= 45 ? "#3b82f6" : "#f59e0b";
    ctx.fillStyle = stampColor;
    ctx.beginPath();
    ctx.roundRect(75, 395, 260, 34, 6);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(evaluation.verdict.toUpperCase(), 75 + 130, 417);
    ctx.textAlign = "left";

    // Directive adherence note
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px system-ui, -apple-system, sans-serif";
    const dirSnippet =
      evaluation.directiveAnalysis.length > 50
        ? evaluation.directiveAnalysis.slice(0, 48) + "..."
        : evaluation.directiveAnalysis;
    ctx.fillText(dirSnippet, 75, 465);

    // 5. Rubric Breakdown (Right side: 750px wide)
    const rubricItems = [
      {
        label: "1. Introduction & Context",
        score: evaluation.rubric.introduction.score,
        max: evaluation.rubric.introduction.max,
        comment: evaluation.rubric.introduction.comment,
      },
      {
        label: "2. Body Content & Dimensions",
        score: evaluation.rubric.bodyContent.score,
        max: evaluation.rubric.bodyContent.max,
        comment: evaluation.rubric.bodyContent.comment,
      },
      {
        label: "3. Structure & Presentation",
        score: evaluation.rubric.structurePresentation.score,
        max: evaluation.rubric.structurePresentation.max,
        comment: evaluation.rubric.structurePresentation.comment,
      },
      {
        label: "4. Value-Add (Articles/Cases/Reports)",
        score: evaluation.rubric.valueAddition.score,
        max: evaluation.rubric.valueAddition.max,
        comment: evaluation.rubric.valueAddition.comment,
      },
      {
        label: "5. Conclusion & Way Forward",
        score: evaluation.rubric.conclusion.score,
        max: evaluation.rubric.conclusion.max,
        comment: evaluation.rubric.conclusion.comment,
      },
    ];

    let startY = 220;
    rubricItems.forEach((item) => {
      ctx.fillStyle = "rgba(30, 41, 59, 0.5)";
      ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
      ctx.beginPath();
      ctx.roundRect(380, startY, width - 430, 48, 8);
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
      ctx.fillText(item.label, 395, startY + 22);

      // Score
      ctx.fillStyle = "#818cf8";
      ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
      ctx.fillText(`${item.score} / ${item.max}`, width - 130, startY + 22);

      // Comment
      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px system-ui, -apple-system, sans-serif";
      const truncatedComment =
        item.comment.length > 105 ? item.comment.slice(0, 102) + "..." : item.comment;
      ctx.fillText(truncatedComment, 395, startY + 39);

      // Mini Progress bar
      const barX = width - 130;
      const barY = startY + 30;
      const barW = 60;
      const barH = 5;
      ctx.fillStyle = "rgba(148, 163, 184, 0.3)";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = "#6366f1";
      const fillW = Math.min(barW, (item.score / item.max) * barW);
      ctx.fillRect(barX, barY, fillW, barH);

      startY += 58;
    });

    // 6. Actionable Improvements & Missing Dimensions (Bottom Strip)
    ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
    ctx.strokeStyle = "rgba(99, 102, 241, 0.3)";
    ctx.beginPath();
    ctx.roundRect(50, 520, width - 100, 190, 10);
    ctx.fill();
    ctx.stroke();

    // Strengths
    ctx.fillStyle = "#34d399";
    ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
    ctx.fillText("✓ KEY STRENGTHS:", 70, 548);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "12px system-ui, -apple-system, sans-serif";
    const s1 = evaluation.strengths[0] ? `• ${evaluation.strengths[0]}` : "• Clear structure observed";
    const s2 = evaluation.strengths[1] ? `• ${evaluation.strengths[1]}` : "";
    ctx.fillText(s1.slice(0, 75), 70, 572);
    if (s2) ctx.fillText(s2.slice(0, 75), 70, 592);

    // Missing Dimensions
    ctx.fillStyle = "#f87171";
    ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
    ctx.fillText("⚠️ MISSING DIMENSIONS & HIGH-VALUE CITES:", 550, 548);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "12px system-ui, -apple-system, sans-serif";
    const m1 = evaluation.missingDimensions[0] ? `• ${evaluation.missingDimensions[0]}` : "• Add relevant SC judgements / Law commission cite";
    const m2 = evaluation.missingDimensions[1] ? `• ${evaluation.missingDimensions[1]}` : "";
    ctx.fillText(m1.slice(0, 80), 550, 572);
    if (m2) ctx.fillText(m2.slice(0, 80), 550, 592);

    // Actionable Roadmap (+2 Marks leap)
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
    ctx.fillText("🚀 ACTIONABLE ROADMAP (+2.0 MARKS LEAP):", 70, 630);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "12px system-ui, -apple-system, sans-serif";
    const a1 = evaluation.actionableRoadmap[0] || "Ground the introduction in contemporary data or constitutional provision.";
    const a2 = evaluation.actionableRoadmap[1] || "Introduce a 3-box micro-diagram to break monotony.";
    ctx.fillText(`1. ${a1.slice(0, 140)}`, 70, 655);
    ctx.fillText(`2. ${a2.slice(0, 140)}`, 70, 678);

    // Update download URL
    try {
      const url = canvas.toDataURL("image/png");
      setDownloadUrl(url);
    } catch (e) {
      console.warn("Failed to generate canvas image url:", e);
    }
  }, [evaluation]);

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `UPSC_Mains_Evaluation_${evaluation.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (e) {
      console.warn("Clipboard copy image failed:", e);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Annotated Correction Scorecard (Official Evaluation Dossier)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyImage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>Copy Image</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!downloadUrl}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Scorecard (PNG)</span>
          </button>
        </div>
      </div>

      {/* Rendered Visual Canvas (Responsive container) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md bg-slate-950 flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto rounded-xl shadow-lg block"
          style={{ width: "100%", maxHeight: "550px", objectFit: "contain" }}
        />
      </div>
    </div>
  );
}
