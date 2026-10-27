import { SyllabusItem } from "./types";

type ParsedLine = {
  title: string;
  depth: number;
  kind: "heading" | "bullet";
  dueDate?: string;
};

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function parseDueDate(title: string): { title: string; dueDate?: string } {
  const match = title.match(/\s+\[(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\]\s*$/);
  if (!match) return { title: title.trim() };
  const day = Number(match[1]);
  const month = MONTHS.findIndex(
    (name) =>
      name === match[2].toLowerCase() ||
      name.slice(0, 3) === match[2].toLowerCase(),
  );
  const year = Number(match[3]);
  if (month < 0 || day < 1 || day > 31) return { title: title.trim() };
  const date = new Date(Date.UTC(year, month, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return { title: title.trim() };
  }
  return {
    title: title.slice(0, match.index).trim(),
    dueDate: `${year.toString().padStart(4, "0")}-${(month + 1)
      .toString()
      .padStart(2, "0")}-${day.toString().padStart(2, "0")}`,
  };
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `syllabus_${(hash >>> 0).toString(36)}`;
}

export function getSyllabusTopicKey(item: SyllabusItem): string {
  return item.topicKey || item.title.trim().toLocaleLowerCase();
}

function parseLine(line: string): ParsedLine | null {
  const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
  if (heading) {
    const parsedTitle = parseDueDate(heading[2]);
    return {
      ...parsedTitle,
      depth: heading[1].length - 1,
      kind: "heading",
    };
  }

  const bullet = line.match(/^(\s*)(?:[-*+] |\d+[.)] )(.+?)\s*$/);
  if (!bullet) return null;
  const parsedTitle = parseDueDate(bullet[2]);
  return {
    ...parsedTitle,
    depth: Math.floor(bullet[1].replace(/\t/g, "  ").length / 2),
    kind: "bullet",
  };
}

export function parseSyllabusMarkdown(
  markdown: string,
  previousItems: SyllabusItem[] = [],
): SyllabusItem[] {
  const lines = markdown
    .split(/\r?\n/)
    .map(parseLine)
    .filter((line): line is ParsedLine => Boolean(line));
  const previousByKey = new Map(
    previousItems
      .filter((item) => item.sourceKey)
      .map((item) => [item.sourceKey as string, item]),
  );
  const stack: Array<{
    depth: number;
    id: string;
    path: string[];
    kind: "heading" | "bullet";
  }> = [];
  const siblingCounts = new Map<string, number>();
  const parsed: SyllabusItem[] = [];

  lines.forEach(({ title, depth: parsedDepth, kind, dueDate }, order) => {
    const heading = [...stack]
      .reverse()
      .find((entry) => entry.kind === "heading");
    const depth =
      kind === "bullet" && heading
        ? heading.depth + 1 + parsedDepth
        : parsedDepth;
    while (stack.length && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    const path = [...(parent?.path || []), title];
    const parentKey = parent?.path.join("/") || "root";
    const countKey = `${parentKey}/${title.toLowerCase()}`;
    const siblingIndex = siblingCounts.get(countKey) || 0;
    siblingCounts.set(countKey, siblingIndex + 1);
    const sourceKey = `${path.join("/").toLowerCase()}#${siblingIndex}`;
    const prior = previousByKey.get(sourceKey);
    const id = prior?.id || stableId(sourceKey);
    const now = new Date().toISOString();
    const item: SyllabusItem = {
      id,
      title,
      paperId: prior?.paperId,
      parentId: parent?.id || null,
      sourceKey,
      topicKey: title.trim().toLocaleLowerCase(),
      dueDate,
      completed: prior?.completed || false,
      notes: prior?.notes,
      order,
      createdAt: prior?.createdAt || now,
      updatedAt: now,
    };
    parsed.push(item);
    stack.push({ depth, id, path, kind });
  });

  return parsed;
}

export function getSyllabusCompletion(
  item: SyllabusItem,
  items: SyllabusItem[],
): boolean {
  const children = items.filter((candidate) => candidate.parentId === item.id);
  return children.length
    ? children.every((child) => getSyllabusCompletion(child, items))
    : item.completed ||
        items.some(
          (candidate) =>
            candidate.id !== item.id &&
            getSyllabusTopicKey(candidate) === getSyllabusTopicKey(item) &&
            candidate.completed,
        );
}

export function getSyllabusProgress(items: SyllabusItem[]): {
  completed: number;
  total: number;
  percentage: number;
} {
  const leaves = items.filter(
    (item) => !items.some((candidate) => candidate.parentId === item.id),
  );
  const uniqueLeaves = Array.from(
    new Map(leaves.map((item) => [getSyllabusTopicKey(item), item])).values(),
  );
  const completed = uniqueLeaves.filter((item) =>
    getSyllabusCompletion(item, items),
  ).length;
  return {
    completed,
    total: uniqueLeaves.length,
    percentage: uniqueLeaves.length
      ? Math.round((completed / uniqueLeaves.length) * 100)
      : 0,
  };
}

export type SyllabusPace = {
  status: "leading" | "on-track" | "lagging" | "no-date";
  datedTopics: number;
  overdueTopics: number;
  completedTopics: number;
};

function dateAtStartOfDay(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getEffectiveSyllabusDueDate(
  item: SyllabusItem,
  items: SyllabusItem[],
): string | undefined {
  if (item.dueDate) return item.dueDate;
  const parent = items.find((candidate) => candidate.id === item.parentId);
  return parent ? getEffectiveSyllabusDueDate(parent, items) : undefined;
}

export function getSyllabusItemDateStatus(
  item: SyllabusItem,
  items: SyllabusItem[],
  now = new Date(),
): SyllabusPace["status"] {
  const dueDate = dateAtStartOfDay(getEffectiveSyllabusDueDate(item, items));
  if (!dueDate) return "no-date";
  const completed = getSyllabusCompletion(item, items);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!completed && today.getTime() > dueDate.getTime()) {
    return "lagging";
  }
  if (completed && now.getTime() < dueDate.getTime()) return "leading";
  return "on-track";
}

export function getSyllabusPace(
  items: SyllabusItem[],
  now = new Date(),
): SyllabusPace {
  const leaves = items.filter(
    (item) => !items.some((candidate) => candidate.parentId === item.id),
  );
  const datedLeaves = leaves.filter((item) =>
    getEffectiveSyllabusDueDate(item, items),
  );
  const uniqueDatedLeaves = Array.from(
    new Map(
      datedLeaves.map((item) => [getSyllabusTopicKey(item), item]),
    ).values(),
  );
  const overdueTopics = uniqueDatedLeaves.filter(
    (item) => getSyllabusItemDateStatus(item, items, now) === "lagging",
  ).length;
  const completedTopics = uniqueDatedLeaves.filter((item) =>
    getSyllabusCompletion(item, items),
  ).length;
  const leadingTopics = uniqueDatedLeaves.filter(
    (item) => getSyllabusItemDateStatus(item, items, now) === "leading",
  ).length;
  return {
    status: !datedLeaves.length
      ? "no-date"
      : overdueTopics
        ? "lagging"
        : completedTopics === uniqueDatedLeaves.length && leadingTopics
          ? "leading"
          : "on-track",
    datedTopics: uniqueDatedLeaves.length,
    overdueTopics,
    completedTopics,
  };
}
