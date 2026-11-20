/**
 * Official UPSC CSE Mains Optional Subjects list
 */
export const UPSC_OPTIONAL_SUBJECTS = [
  "Agriculture",
  "Animal Husbandry and Veterinary Science",
  "Anthropology",
  "Botany",
  "Chemistry",
  "Civil Engineering",
  "Commerce and Accountancy",
  "Economics",
  "Electrical Engineering",
  "Geography",
  "Geology",
  "History",
  "Law",
  "Management",
  "Mathematics",
  "Mechanical Engineering",
  "Medical Science",
  "Philosophy",
  "Physics",
  "Political Science & International Relations (PSIR)",
  "Psychology",
  "Public Administration",
  "Sociology",
  "Statistics",
  "Zoology",
  // Literature Optional Subjects
  "Assamese Literature",
  "Bengali Literature",
  "Bodo Literature",
  "Dogri Literature",
  "English Literature",
  "Gujarati Literature",
  "Hindi Literature",
  "Kannada Literature",
  "Kashmiri Literature",
  "Konkani Literature",
  "Maithili Literature",
  "Malayalam Literature",
  "Manipuri Literature",
  "Marathi Literature",
  "Nepali Literature",
  "Odia Literature",
  "Punjabi Literature",
  "Sanskrit Literature",
  "Santhali Literature",
  "Sindhi Literature",
  "Tamil Literature",
  "Telugu Literature",
  "Urdu Literature",
] as const;

export type OptionalSubject = (typeof UPSC_OPTIONAL_SUBJECTS)[number];

export const OPTIONAL_SUBJECT_STORAGE_KEY = "upsc_optional_subject";

export function getStoredOptionalSubject(): string {
  if (typeof window === "undefined") return "Sociology";
  try {
    const val = localStorage.getItem(OPTIONAL_SUBJECT_STORAGE_KEY);
    return val && val.trim() ? val.trim() : "Sociology";
  } catch {
    return "Sociology";
  }
}

export function saveStoredOptionalSubject(subject: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OPTIONAL_SUBJECT_STORAGE_KEY, subject.trim());
    window.dispatchEvent(
      new CustomEvent("optional-subject-changed", { detail: subject.trim() }),
    );
  } catch {
    // Ignore storage errors in restricted contexts
  }
}
