# ExamPrep MCQs (UPSC Prelims & Competitive Exam Practice)

An exam practice and performance monitoring platform built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**, optimized for deployment on **Vercel** and local use on mobile and desktop.

---

## 🎯 Features

### 1. 📊 Executive Dashboard

- Real-time stats: Total Attempts, Accuracy %, Best Score, Cumulative Practice Time.
- Overview of recent tests and one-click quick start for Prelims GS I and CSAT papers.

### 2. ⏱️ Practice & Timed Mock Exam Engine

- **Pre-Exam Setup**: Configures Total Questions, Correct Marks (+), Incorrect Negative Marks (-), Skipped (0 marks), and Time (minutes).
- **Settings & Fast Start**: Set repetitive defaults once and toggle **Fast Start** to start immediately.
- **Continuous Running Timer**: Formatted as `HH:MM:SS`. When **10% of total time is remaining**, turns into a **pulsing RED alert**.
- **Live Counters**: Real-time counter of Attempted, Unattempted, and Flagged questions.
- **Split-Screen Workspace**: Side-by-side view with PDF Question Paper on the left and OMR Question response grid on the right.
- **Per-Question Notes**: Real-time note-taking drawer on each question saved alongside attempt details.
- **Live Practice Review**: Practice mode highlights correct/incorrect answers with instant solution references.

### 3. 📝 Attempt Review & Data Management

- Complete breakdown of every question with your answer, correct answer, status, and custom notes.
- **Zero Data Loss**: Persistent browser storage (LocalStorage / IndexedDB).
- **Edit Attempts**: Update notes, observations, or review past exams anytime.
- **Backup & Sync**: 1-click JSON export and import for seamless cross-device syncing.

### 4. 📤 Paper Upload (Standard 3-Section Format)

- Upload custom question papers with automated naming `{prefix}_{year}_{file_name}.{ext}`:
  - **Question Paper**: `.pdf` (`qp_`)
  - **Answer Key**: `.txt` (`ak_`)
  - **Explained Solution**: `.pdf` (`exs_`)

### 5. 🎓 AI Revision Mentor & "Chat with Papers" (100% Free Tier)

- **Syllabus-Centered Master Revision**:
  - Grounded in constitutional articles (exact numbers, parts, and schedules).
  - Landmark & recent Supreme Court judgements (ratios, bench decisions, and case names).
  - Contemporary PIB updates, policy releases, and commission recommendations (Sarkaria, Punchhi, 2nd ARC, Finance Commission).
  - Dynamic **Mermaid flowchart diagrams** and comparative tables for visual comprehension.
  - Alert callouts for **Prelims Traps** (extreme qualifiers, authority swaps) and **Mains Value Additions** (committee quotes, SDG links).
- **Chat with Papers & Elimination Tutor**:
  - Ingests complete parsed question papers, student answers, and official explanations.
  - Explains why the selected option was a trap and how to apply 50-50 elimination logic.
  - 1-click **Save to Notes** saves takeaways directly into the student's question scratchpad or syllabus topic notes.
- **$0 Expense Model**:
  - Zero server or database billing: uses client-side Bring-Your-Own-Key (BYOK) with **Google Gemini Flash** (Google AI Studio Free Tier) or **Groq Llama 3.3 70B**.
  - No credit card required. Works out-of-the-box with built-in high-yield demo dossiers.

---

## 🚀 Getting Started

### Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build for Production

```bash
npm run build
npm run start
```

### Deploying to Vercel

1. Import repository on [Vercel](https://vercel.com).
2. Framework Preset: **Next.js**.
3. Deploy! Zero configuration required.

## Connecting ChatGPT or Claude

The portal exposes a remote MCP server at `/mcp`. Students can connect an
MCP-compatible chatbot, sign in through the portal's OAuth screen, and then
ask the chatbot to read progress, search imported papers, inspect attempt
history, diagnose weak areas, grade answers, save paper imports, or record attempts.

### Available MCP Tools & Capabilities

- **`get_portal_overview`**: Student progress summary, accuracy metrics, and paper library counts.
- **`list_papers`**: Filter library papers by attempt status (`unattempted`, `attempted`, or `all`).
- **`get_topic_analytics`**: Cross-attempt weak-area diagnostic engine. Analyzes student accuracy across all past tests aggregated by 3-tier hierarchy (`Subject > Chapter > Topic`), highlighting critical weak topics (<50% accuracy) and mastered topics (>=70%).
- **`get_attempt_detail`**: Full per-question attempt inspector returning question prompt, word limits, options, candidate answer, answer key, notes, and handwritten booklet PDF URL (`userSubmissionPdfUrl`).
- **`grade_attempt_questions`**: Interactive grading for cloze/free-text and Mains subjective answers. Automatically recalculates score, percentage, and accuracy.
- **`update_question_notes`**: Attach or update scratchpad notes per question.
- **`attach_attempt_reflection`**: Post-exam strategy reflections attached directly to the attempt.
- **`search_papers`**: Full-text search across parsed questions and markdown content.
- **`create_paper`**, **`delete_paper`**, **`archive_paper`**: Complete paper lifecycle management.
- **`replace_syllabus_markdown`** & **`set_syllabus_item_completion`**: Track custom syllabus outlines with automatic parent-child due dates.
- **`get_revision_context`**: Pull unified revision context for any syllabus topic (articles, historical accuracy, matching test questions across the library) or target question with candidate attempt mistakes.
- **`save_revision_note`**: Save high-yield revision takeaways, case laws, or formulas directly to a syllabus topic or to a question attempt note.

### 3-Tier Topic Hierarchy & Question Tagging

Markdown papers support rich 3-tier tagging (`Subject > Chapter > Topic`):
- Multi-part bracket tags: `[Subject: History | Chapter: Modern India | Topic: 1857 Revolt]`
- Chevron/slash hierarchy: `[Topic: History > Modern India > 1857 Revolt]`
- Inline lines: `Subject: History`, `Chapter: Modern India`, `Topic: 1857 Revolt`

Mains subjective papers automatically extract word limits from prompt markings (e.g., `150 words`, `word limit: 250`, or UPSC marks conventions `10 Marks` → 150 words, `15 Marks` → 250 words) and expose booklet PDFs for evaluation.

Attempt history is returned newest-first. Queries such as “what was my average
score across my last 3 CSAT exams?” use the latest attempt from three distinct
papers by default, so repeated attempts on one paper are not counted as
separate exams. A client can request every retry explicitly when needed.

Markdown imports support both MCQs and cloze questions. Cloze questions omit
options and accept a short free-text response. Their answer-key line contains
only the question number and a quoted explanation, for example:

```text
1. """Reference explanation for the expected cloze response."""
```

The student-facing setup guide is available at `/help/mcp` and is also linked
from the navigation and account settings.

The following is one-time deployment/maintainer setup. Students do not run
these commands:

1. Set `NEXT_PUBLIC_SITE_URL` to the deployed HTTPS origin.
2. Keep the existing Supabase URL and service-role settings configured.
3. Run `npm run mcp:setup` once against the production Supabase database to
   create the OAuth client, code, and token tables.
4. Give students the deployed URL
   `https://upsc-practice.vercel.app/mcp`.

The MCP server uses `portal:read` and `portal:write` scopes. Write tools are
described as write actions so clients can request confirmation before changing
student data. OAuth tokens are stored as hashes in Supabase; the fallback
memory store is intended only for local development without Supabase.
