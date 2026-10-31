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
- Each MCQ carries 2.0 marks; cloze questions accept a short free-text response.
- For each incorrect answer, 0.667 (1/3rd) marks will be deducted.
- Read each question statement thoroughly before choosing the answer.
- Practice active elimination techniques during the attempt.
---
[Subject: Economy | Topic: Monetary Policy]
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
[Subject: Polity | Topic: Fundamental Rights]
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
[Subject: Environment | Topic: Biodiversity Hotspots]
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
[Subject: Polity | Topic: Writs]
Fill in the blank: The writ issued by a court to produce a person who has been unlawfully detained is called __________.
---
[Subject: Polity | Topic: Basic Structure Doctrine]
In one or two lines, explain how the basic-structure doctrine limits Parliament's power to amend the Constitution of India.`;

export const ANSWER_KEY_TEMPLATE = `1. b """ Statement 1 and 2 are correct. Statement 3 is incorrect because the MPC has 6 members (3 from RBI, 3 appointed by Central Government) who hold office for a non-renewable period of 4 years. """
2. b """ Statement 1 and 2 are correct. Statement 3 is incorrect because the right to privacy under Article 21 is not absolute and is subject to the threefold test of legality, legitimate state aim, and proportionality. """
3. d """ All three statements are correct under Norman Myers / Conservation International criteria for global Biodiversity Hotspots. India encompasses parts of 4 hotspots. """
4. """ The writ is habeas corpus, which requires the authority detaining a person to produce that person before the court so the legality of the detention can be examined. """
5. """ The basic-structure doctrine prevents Parliament from using its Article 368 amendment power to destroy the Constitution's foundational features, even though Parliament may amend other provisions. """`;

export const AI_GENERATION_PROMPT = `Act as an expert UPSC Civil Services examination question setter. 
I need a practice test in a strictly structured markdown format so that an automated exam test engine can parse the paper, rules, questions, and answer key.

Please generate a test on the following topic / specifications:
[INSERT YOUR TOPIC / SUBJECT HERE, e.g. "Modern Indian History from 1857 to 1947" or "Current Affairs & Environment for UPSC Prelims 2026 - 15 questions"]

STRICT FORMAT RULES:

1. HEADER BLOCK (Must be above the very first "---"):
EXAM: <Title of the Exam, e.g. UPSC Prelims 2026 Mock Test>
SUBJECT: <Subject Name, e.g. Modern Indian History>
TOTAL QUESTIONS: <Total number of questions, e.g. 10>
TOTAL MARKS: <Total marks, e.g. 20>
TIME: <Duration in minutes, e.g. 20 Minutes>
NEGATIVE MARKING: <e.g. 0.667 marks deducted per wrong answer>
INSTRUCTIONS:
- Each MCQ carries 2 marks; cloze questions are short written responses.
- 1/3rd marks deducted for each wrong answer.
- Follow UPSC standard phrasing (e.g. "Which of the statements given above is/are correct?").
- Unless the user explicitly asks for an all-MCQ paper, include a mix of MCQs and at least two cloze/free-text questions in a paper with five or more questions.

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
- Do not add an MCQ option letter to a cloze answer-key entry; provide only the question number and the quoted reference explanation.
- You may use UPSC formats: "Consider the following statements...", "How many of the above pairs are correctly matched? (a) Only one pair (b) Only two pairs...", or statement-reason questions.

3. ANSWER KEY & DETAILED EXPLANATIONS (At the very bottom, in a clearly separated section):
Provide the answer key in one of these exact syntaxes:
<question_number>. <lowercase_option_letter> """ <detailed explanation text or HTML> """
<cloze_question_number>. """ <reference explanation text or HTML> """
(Rich HTML formatting like <b>, <i>, <ul>, <ol>, <li>, <table>, <code>, <blockquote> is fully supported inside the triple quotes and rendered in reviews.)

4. SUBJECT TAGGING & MIXED PAPERS:
- Single-Subject Paper: If the paper focuses strictly on one subject (e.g. SUBJECT: Indian Polity), all questions inherit that subject and mix-up is disallowed.
- Mixed / Revision / Daily Quizzes: If the paper is a multi-subject test (e.g. SUBJECT: Mixed Revision Quiz), tag each question with its individual subject bracket at the start:
  [Subject: Polity | Topic: Fundamental Rights]
  or [Subject: Economy]
  This allows the student's dashboard analytics to track individual subject mastery accurately.

Example:
1. b """ Statement 1 is correct because... Statement 2 is incorrect because... """
2. d """ Explanation for question 2... """
3. """ Reference explanation for the student's free-text cloze response... """

Please generate the complete test now with high quality UPSC Prelims standard questions.`;
