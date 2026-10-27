/**
 * Markdown Paper Formatting Specifications, Sample Templates, and AI Generation Prompts.
 * Used by UploadView to assist aspirants in formatting custom .md papers and answer keys,
 * or asking LLMs (Claude, ChatGPT, Gemini) to generate compliant mock tests in one prompt.
 */

export const MARKDOWN_PAPER_TEMPLATE = `EXAM: UPSC Prelims 2026 Test Series - Full Mock 01
SUBJECT: General Studies Paper - I
TOTAL QUESTIONS: 5
TOTAL MARKS: 10
TIME: 15 Minutes
NEGATIVE MARKING: 0.667 marks deducted per wrong answer
INSTRUCTIONS:
- Each question carries 2.0 marks with four alternatives.
- For each incorrect answer, 0.667 (1/3rd) marks will be deducted.
- Read each question statement thoroughly before choosing the answer.
- Practice active elimination techniques during the attempt.
---
With reference to the **Monetary Policy Committee (MPC)** of the Reserve Bank of India, consider the following statements:
1. It determines the policy repo rate required to achieve the inflation target.
2. The Governor of the RBI is the ex-officio Chairperson of the Committee and has a casting vote.
3. The central government appoints four of its six members for a term of five years.

Which of the statements given above is/are correct?
(a) 1 only
(b) 1 and 2 only
(c) 2 and 3 only
(d) 1, 2 and 3
---
Consider the following statements regarding **Article 21** and the right to privacy under the Indian Constitution:
1. The Right to Privacy was affirmed as a fundamental right by a 9-judge Constitution Bench in the *K.S. Puttaswamy* (2017) judgment.
2. The right to be forgotten is recognized as an integral part of personal informational privacy.
3. Like all fundamental rights, the right to privacy is absolute and cannot be restricted by state legislation.

Which of the statements given above is/are correct?
(a) 1 only
(b) 1 and 2 only
(c) 2 and 3 only
(d) 1, 2 and 3
---
With reference to global **Biodiversity Hotspots**, consider the following statements:
1. A region must contain at least 1,500 species of vascular plants as endemics.
2. It must have lost at least 70% of its original natural habitat.
3. India features four global hotspots: Himalaya, Indo-Burma, Western Ghats & Sri Lanka, and Sundaland.

Which of the statements given above are correct?
(a) 1 and 2 only
(b) 2 and 3 only
(c) 1 and 3 only
(d) 1, 2 and 3
---
Consider the following historical pairs of Bhakti saints and their philosophical schools:
1. Ramanujacharya — Vishishtadvaita
2. Madhvacharya — Shuddhadvaita
3. Adi Shankaracharya — Advaita
4. Vallabhacharya — Dvaita

How many of the pairs given above are correctly matched?
(a) Only one pair
(b) Only two pairs
(c) Only three pairs
(d) All four pairs
---
Which of the following best describes the term **"Quantum Supremacy"** frequently mentioned in scientific news?
(a) A theoretical point where quantum computers can crack all existing cryptographic algorithms simultaneously
(b) The demonstration that a programmable quantum device can solve a problem that no classical supercomputer can solve in any feasible time
(c) The permanent replacement of classical silicon microprocessors by superconducting qubit processors in data centers
(d) The attainment of absolute zero temperature (-273.15°C) inside a scalable quantum computing laboratory`;

export const ANSWER_KEY_TEMPLATE = `1. b """ Statement 1 and 2 are correct. Statement 3 is incorrect because the MPC has 6 members (3 from RBI, 3 appointed by Central Government) who hold office for a non-renewable period of 4 years. """
2. b """ Statement 1 and 2 are correct. Statement 3 is incorrect because the right to privacy under Article 21 is not absolute and is subject to the threefold test of legality, legitimate state aim, and proportionality. """
3. d """ All three statements are correct under Norman Myers / Conservation International criteria for global Biodiversity Hotspots. India encompasses parts of 4 hotspots. """
4. b """ Exactly two pairs (1 and 3) are correctly matched. Madhvacharya propounded Dvaita (Dualism), while Vallabhacharya propounded Shuddhadvaita (Pure Non-Dualism). """
5. b """ Quantum Supremacy refers to a programmable quantum device performing a task that is practically impossible for any classical supercomputer. """`;

export const AI_GENERATION_PROMPT = `Act as an expert UPSC Civil Services examination question setter. 
I need a practice test in a strictly structured markdown format so that an automated exam test engine can parse the paper, rules, questions, and answer key.

Please generate a test on the following topic / specifications:
[INSERT YOUR TOPIC / SUBJECT HERE, e.g. "Modern Indian History from 1857 to 1947" or "Current Affairs & Environment for UPSC Prelims 2026 - 15 MCQs"]

STRICT FORMAT RULES:

1. HEADER BLOCK (Must be above the very first "---"):
EXAM: <Title of the Exam, e.g. UPSC Prelims 2026 Mock Test>
SUBJECT: <Subject Name, e.g. Modern Indian History>
TOTAL QUESTIONS: <Total number of questions, e.g. 10>
TOTAL MARKS: <Total marks, e.g. 20>
TIME: <Duration in minutes, e.g. 20 Minutes>
NEGATIVE MARKING: <e.g. 0.667 marks deducted per wrong answer>
INSTRUCTIONS:
- Each question carries 2 marks.
- 1/3rd marks deducted for each wrong answer.
- Follow UPSC standard phrasing (e.g. "Which of the statements given above is/are correct?").

2. QUESTIONS SECTION:
- Start with a "---" line immediately after the header.
- Separate every question with a line containing only "---".
- Do NOT prefix questions with "Q1." or "Question 1:"; write the question text directly.
- For MCQs, provide exactly 4 options labeled with lowercase letters in parentheses:
  (a) Option A text
  (b) Option B text
  (c) Option C text
  (d) Option D text
- Cloze questions are also supported: omit all options and write a one- or two-line prompt that the student answers in free text.
- You may use UPSC formats: "Consider the following statements...", "How many of the above pairs are correctly matched? (a) Only one pair (b) Only two pairs...", or statement-reason questions.

3. ANSWER KEY & DETAILED EXPLANATIONS (At the very bottom, in a clearly separated section):
Provide the answer key in one of these exact syntaxes:
<question_number>. <lowercase_option_letter> """ <detailed explanation text> """
<cloze_question_number>. """ <reference explanation text> """

Example:
1. b """ Statement 1 is correct because... Statement 2 is incorrect because... """
2. d """ Explanation for question 2... """
3. """ Reference explanation for the student's free-text cloze response... """

Please generate the complete test now with high quality UPSC Prelims standard questions.`;
