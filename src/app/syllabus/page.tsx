"use client";

import { AccountRequired } from "../../components/AccountRequired";
import { SyllabusView } from "../../components/SyllabusView";

export default function SyllabusPage() {
  return (
    <AccountRequired
      title="Custom syllabus tracker"
      description="Sign in to build a personal syllabus across your papers and track what you have completed."
    >
      <SyllabusView />
    </AccountRequired>
  );
}
