import { parseMarkdownPaper } from "../lib/markdownPaperParser";
import { QuestionPaper } from "../lib/types";

export const SAMPLE_MARKDOWN_TEXT = `---
title: 2026 – UPSC Prelims High-Yield Mock (Interactive Markdown)
subject: GS Paper I (High-Yield Core)
category: prelims
examType: objective
year: "2026"
timeMinutes: 15
totalQuestions: 6
correctMarks: 2.0
incorrectMarks: 0.667
totalMarks: 12.0
instructions:
  - This is an interactive high-yield test of 6 conceptual UPSC Prelims questions.
  - Each question has four alternatives (A, B, C, D).
  - For each correct answer: +2.00 marks.
  - For each wrong answer: -0.667 marks (one-third penalty).
  - In Practice Mode: Immediate instant feedback with in-depth official explanations will be revealed upon answering.
  - In Mock Mode: You simulate authentic exam conditions under strict continuous timer.
---

### Q1
With reference to the **Monetary Policy Committee (MPC)** of the Reserve Bank of India, consider the following statements:

1. It determines the policy repo rate required to achieve the inflation target.
2. The Governor of the RBI is the ex-officio Chairman of the Committee and has a second or casting vote in case of a tie.
3. The central government appoints four of its six members for a term of five years.

Which of the statements given above is/are correct?
(a) 1 only
(b) 1 and 2 only
(c) 2 and 3 only
(d) 1, 2 and 3

Answer: (b)
Explanation: 
- **Statement 1 is correct:** Under Section 45ZB of the amended RBI Act, 1934, the MPC determines the policy interest rate required to achieve the inflation target (4% +/- 2%).
- **Statement 2 is correct:** The Governor of RBI acts as the ex-officio Chairperson of the MPC. Each member has one vote, but in case of an equality of votes, the Governor possesses a casting vote.
- **Statement 3 is incorrect:** The MPC consists of **6 members**: 3 from RBI (including Governor and Deputy Governor) and 3 external members nominated by the Central Government. Furthermore, the external members hold office for a period of **four years** (not five years) and are not eligible for re-appointment.

---

### Q2
Consider the following statements regarding **Article 21** and the right to privacy under the Indian Constitution:

1. The Right to Privacy was declared a fundamental right under Article 21 by a 9-judge Constitution Bench in the *K.S. Puttaswamy v. Union of India* (2017) judgment.
2. The right to be forgotten is recognized as an intrinsic part of the right to privacy under Indian jurisprudence.
3. Like all fundamental rights under Part III, the right to privacy is absolute and cannot be restricted by any state legislation.

Which of the statements given above is/are correct?
(a) 1 only
(b) 1 and 2 only
(c) 2 and 3 only
(d) 1, 2 and 3

Answer: (b)
Explanation:
- **Statement 1 is correct:** In the landmark *Justice K.S. Puttaswamy (Retd.) v. Union of India (2017)* case, a unanimous 9-judge bench declared the Right to Privacy an intrinsic part of the Right to Life and Personal Liberty guaranteed under Article 21.
- **Statement 2 is correct:** The Puttaswamy judgment observed that the right to privacy includes the informational privacy and the right to control the dissemination of one's personal information, encompassing the "right to be forgotten".
- **Statement 3 is incorrect:** The right to privacy is **not absolute**. Any state interference is permissible if it satisfies the threefold proportionality test: (i) Legality (backed by valid law), (ii) Need/Legitimate State Aim, and (iii) Proportionality (least restrictive means).

---

### Q3
With reference to **Biodiversity Hotspots**, consider the following statements:

1. To qualify as a biodiversity hotspot, a region must contain at least 1,500 species of vascular plants as endemics.
2. It must have lost at least 70 percent of its primary native vegetation.
3. India hosts parts of four global biodiversity hotspots: Himalaya, Indo-Burma, Western Ghats & Sri Lanka, and Sundaland.

Which of the statements given above are correct?
(a) 1 and 2 only
(b) 2 and 3 only
(c) 1 and 3 only
(d) 1, 2 and 3

Answer: (d)
Explanation:
- **Statement 1 and 2 are correct:** According to Conservation International (Norman Myers framework), a region must meet two strict criteria to be identified as a Biodiversity Hotspot:
  1. *Species Endemism:* It must contain at least **1,500 species of vascular plants** (> 0.5% of the world’s total) as endemics.
  2. *Degree of Threat:* It has to have lost at least **70% of its original primary habitat** (i.e., it must have 30% or less of its original natural vegetation).
- **Statement 3 is correct:** India is extraordinarily rich in biodiversity and shares four global hotspots: **Himalaya**, **Indo-Burma** (North-East India), **Western Ghats**, and **Sundaland** (includes Nicobar Islands).

---

### Q4
Consider the following historical pairs of Bhakti saints and their associated traditions:

1. Ramanuja — Vishishtadvaita (Qualified Monism)
2. Madhvacharya — Shuddhadvaita (Pure Non-Dualism)
3. Shankaracharya — Advaita (Non-Dualism)
4. Vallabhacharya — Dvaita (Dualism)

How many of the pairs given above are correctly matched?
(a) Only one pair
(b) Only two pairs
(c) Only three pairs
(d) All four pairs

Answer: (b)
Explanation:
- **Pair 1 is correctly matched:** Ramanujacharya propounded **Vishishtadvaita** philosophy (Qualified Monism), emphasizing devotion (Bhakti) to Vishnu as the supreme reality.
- **Pair 2 is incorrectly matched:** Madhvacharya propounded **Dvaita** (Dualism), emphasizing the complete and eternal distinction between the individual soul (Jiva) and God (Brahman).
- **Pair 3 is correctly matched:** Adi Shankaracharya propounded **Advaita Vedanta** (Absolute Non-Dualism), stating *Brahman Satyam, Jagan Mithya* (Brahman alone is real, the world is illusion).
- **Pair 4 is incorrectly matched:** Vallabhacharya propounded **Shuddhadvaita** (Pure Non-Dualism) and founded the Pushtimarg tradition of Krishna devotion.
Therefore, exactly **two pairs (1 and 3)** are correctly matched.

---

### Q5
Which of the following best describes the term **"Quantum Supremacy"** frequently mentioned in scientific news?

(a) A theoretical point where quantum computers can crack all existing cryptographic algorithms simultaneously
(b) The demonstration that a programmable quantum device can solve a specific problem that no classical supercomputer can solve in any feasible amount of time
(c) The permanent replacement of classical silicon microprocessors by superconducting qubit processors in data centers
(d) The attainment of absolute zero temperature (-273.15°C) inside a scalable quantum computing laboratory

Answer: (b)
Explanation:
- **Option (b) is correct:** **Quantum Supremacy** (or Quantum Advantage) is a technical milestone in quantum computing achieved when a programmable quantum computer performs a mathematically well-defined task that is practically impossible for the world's most powerful classical supercomputers to calculate within any feasible duration. Google's *Sycamore* (2019) and China's *Jiuzhang* photonic system demonstrated this milestone.

---

### Q6
In the context of the Indian economy, which of the following measures is/are likely to **reduce the Current Account Deficit (CAD)**?

1. Depreciation of the domestic currency (Rupee).
2. Tightening monetary policy by hiking domestic benchmark interest rates.
3. Imposing higher import tariffs on non-essential goods like gold and electronics.
4. Encouraging foreign outward remittances by domestic residents.

Select the correct answer using the code given below:
(a) 1 and 3 only
(b) 2 and 4 only
(c) 1, 2 and 3 only
(d) 1, 2, 3 and 4

Answer: (c)
Explanation:
- **1 is correct:** Depreciation of the rupee makes domestic exports cheaper and competitive in international markets while making imports more expensive, thereby boosting exports, curbing imports, and narrowing CAD.
- **2 is correct:** Hiking benchmark policy rates curbs domestic aggregate demand (slowing down imported consumption) and attracts capital inflows, which strengthens the currency and tempers the trade deficit.
- **3 is correct:** Higher import duties directly discourage import of luxury/non-essential goods (like gold, which is India's second largest import item), reducing foreign exchange outflow.
- **4 is incorrect:** Remittances sent *outward* from India represent a debit item in the Current Account and will worsen or widen the CAD (inward remittances improve CAD).
Thus, items 1, 2, and 3 help reduce CAD.
`;

const parsed = parseMarkdownPaper(SAMPLE_MARKDOWN_TEXT, {
  id: "2026_prelims_interactive_markdown_sample",
  year: "2026",
  category: "prelims",
  examType: "objective",
  subject: "GS I (Interactive Mock)",
  label: "2026 – High-Yield Mock (Markdown Interactive)",
  title: "2026 – UPSC Prelims High-Yield Mock (Interactive Markdown)",
  qpUrl: "local://interactive_markdown",
  markdownContent: SAMPLE_MARKDOWN_TEXT,
});

export const SAMPLE_MARKDOWN_PAPER: QuestionPaper = {
  id: "2026_prelims_interactive_markdown_sample",
  year: "2026",
  category: "prelims",
  examType: "objective",
  subject: "GS I (Interactive Mock)",
  label: "2026 – High-Yield Mock (Markdown Interactive)",
  title: "2026 – UPSC Prelims High-Yield Mock (Interactive Markdown)",
  totalQuestions: parsed.parsedQuestions.length,
  totalMarks: parsed.paperMetadata.totalMarks || 12,
  correctMarks: 2.0,
  incorrectMarks: 0.667,
  timeMinutes: 15,
  qpUrl: "local://interactive_markdown",
  answerKey: parsed.answerKey,
  explanations: parsed.explanations,
  parsedQuestions: parsed.parsedQuestions,
  instructions: parsed.paperMetadata.instructions,
  markdownContent: SAMPLE_MARKDOWN_TEXT,
};
