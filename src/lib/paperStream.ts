import { UPSC_OPTIONAL_SUBJECTS } from "./optionalSubjects";

export type PaperStream =
  | "GS"
  | "CSAT"
  | "GS1"
  | "GS2"
  | "GS3"
  | "GS4"
  | "Essay"
  | "English"
  | "Gujarati"
  | "Optional";

export const ALL_PAPER_STREAMS: PaperStream[] = [
  "GS",
  "CSAT",
  "GS1",
  "GS2",
  "GS3",
  "GS4",
  "Essay",
  "English",
  "Gujarati",
  "Optional",
];

export const PRELIMS_STREAMS: PaperStream[] = ["GS", "CSAT"];

export const MAINS_STREAMS: PaperStream[] = [
  "GS1",
  "GS2",
  "GS3",
  "GS4",
  "Essay",
  "English",
  "Gujarati",
  "Optional",
];

export interface PaperStreamClassification {
  paperStream: PaperStream;
  optionalName?: string;
}

const VALID_STREAM_SET = new Set<string>(ALL_PAPER_STREAMS);

export function normalizePaperStream(raw?: string | null): PaperStream | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (VALID_STREAM_SET.has(trimmed)) return trimmed as PaperStream;
  const upper = trimmed.toUpperCase().replace(/[\s_-]+/g, "");
  if (upper === "GS" || upper === "PRELIMSGS") return "GS";
  if (upper === "CSAT" || upper === "GS2PRELIMS" || upper === "PAPERII")
    return "CSAT";
  if (upper === "GS1" || upper === "GSI") return "GS1";
  if (upper === "GS2" || upper === "GSII") return "GS2";
  if (upper === "GS3" || upper === "GSIII") return "GS3";
  if (upper === "GS4" || upper === "GSIV") return "GS4";
  if (upper === "ESSAY") return "Essay";
  if (upper === "ENGLISH") return "English";
  if (upper === "GUJARATI") return "Gujarati";
  if (upper === "OPTIONAL") return "Optional";
  return null;
}

function detectOptionalName(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const subj of UPSC_OPTIONAL_SUBJECTS) {
    const clean = subj.toLowerCase();
    // Match full subject name or parenthesized abbreviation (e.g. PSIR)
    if (lower.includes(clean)) return subj;
    const paren = clean.match(/\(([^)]+)\)/);
    if (paren && lower.includes(paren[1])) return subj;
  }
  if (/\bsociology\b/i.test(text)) return "Sociology";
  if (/\bpsir\b/i.test(text))
    return "Political Science & International Relations (PSIR)";
  if (/\bpublic administration\b/i.test(text)) return "Public Administration";
  if (/\banthropology\b/i.test(text)) return "Anthropology";
  return undefined;
}

export function inferPaperStream(input: {
  paperStream?: string | null;
  optionalName?: string | null;
  examStage?: string | null;
  examType?: string | null;
  category?: string | null;
  paperType?: string | null;
  subject?: string | null;
  title?: string | null;
  label?: string | null;
  text?: string | null;
}): PaperStreamClassification {
  const explicit = normalizePaperStream(input.paperStream);
  if (explicit) {
    return {
      paperStream: explicit,
      optionalName:
        explicit === "Optional"
          ? input.optionalName ||
            detectOptionalName(
              `${input.subject || ""} ${input.title || ""} ${input.label || ""}`,
            )
          : undefined,
    };
  }

  const combined = [
    input.paperType,
    input.subject,
    input.title,
    input.label,
    input.optionalName,
  ]
    .filter(Boolean)
    .join(" ");
  const lower = combined.toLowerCase();
  const isMainsContext =
    input.category === "mains" ||
    input.examStage === "mains" ||
    input.examType === "subjective";

  // 1. Optional
  const detectedOpt = input.optionalName || detectOptionalName(combined);
  if (
    input.examStage === "optional" ||
    /\boptional\b/i.test(lower) ||
    Boolean(detectedOpt)
  ) {
    return {
      paperStream: "Optional",
      optionalName: detectedOpt || undefined,
    };
  }

  // 2. Language & Essay papers
  if (/\bgujarati\b/i.test(lower)) return { paperStream: "Gujarati" };
  if (
    /\benglish\b/i.test(lower) &&
    (isMainsContext || /\bcompulsory\b|\bpaper\b/i.test(lower))
  ) {
    return { paperStream: "English" };
  }
  if (/\bessay\b/i.test(lower)) return { paperStream: "Essay" };

  // 3. Mains GS-1..4
  if (/\bgs[\s-]*1\b|\bgs[\s-]*i\b/i.test(lower) && isMainsContext) {
    return { paperStream: "GS1" };
  }
  if (/\bgs[\s-]*2\b|\bgs[\s-]*ii\b/i.test(lower) && isMainsContext) {
    return { paperStream: "GS2" };
  }
  if (/\bgs[\s-]*3\b|\bgs[\s-]*iii\b/i.test(lower) && isMainsContext) {
    return { paperStream: "GS3" };
  }
  if (/\bgs[\s-]*4\b|\bgs[\s-]*iv\b|\bethics\b/i.test(lower)) {
    return { paperStream: "GS4" };
  }

  // Explicitly tagged GS1..GS4 strings even without category flag
  if (/\bgs[\s-]*4\b/i.test(lower)) return { paperStream: "GS4" };
  if (/\bgs[\s-]*3\b/i.test(lower)) return { paperStream: "GS3" };
  if (/\bgs[\s-]*2\b/i.test(lower) && !/\bcsat\b/i.test(lower)) {
    return { paperStream: "GS2" };
  }

  // 4. Prelims CSAT (Paper-II)
  const textSnippet = (input.text || "").slice(0, 400).toLowerCase();
  const isCsatByMeta =
    /\bcsat\b|\bgs[\s-]*(ii|2)\s*csat\b|\bpaper[\s-]*(ii|2)\b|\baptitude\b|\bnumeracy\b|\bpermutation\b|\bprobability\b|\bhcf\b|\blcm\b|\bnumber system\b|\blogical reasoning\b|\bdata interpretation\b|\breading comprehension\b/i.test(
      lower,
    );
  const isCsatByText =
    /\b(hcf|lcm|remainder when|trains?|speed of boat|pipes? and cistern|simple interest|compound interest|average of \d+ consecutive|how many ways can|probability that)\b/i.test(
      textSnippet,
    );

  if (isCsatByMeta || (!isMainsContext && isCsatByText)) {
    return { paperStream: "CSAT" };
  }

  if (isMainsContext) {
    return { paperStream: "GS1" };
  }

  return { paperStream: "GS" };
}

export function formatPaperStreamLabel(
  stream?: string | null,
  optionalName?: string | null,
): string {
  const norm = normalizePaperStream(stream);
  if (!norm) return "GS";
  if (norm === "Optional") {
    return optionalName ? `Optional (${optionalName})` : "Optional";
  }
  return norm;
}
