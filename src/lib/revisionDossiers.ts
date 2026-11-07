import { RevisionContext } from "./types";

/**
 * Builds an authentic, high-yield diagnostic dossier from the student's paper attempt.
 */
export function generatePaperPerformanceReport(context: RevisionContext): string {
  const summary = context.attemptSummary;
  const paperTitle = context.paperTitle || "Question Paper";

  if (!summary) {
    return `### 📊 Performance Summary: ${paperTitle}

> [!NOTE]
> **No attempt recorded yet for this paper.**
> 
> Solve this paper in Practice or Mock mode from the **Papers** library first. As soon as you submit or record an attempt, ask me:
> - *"How much score did I get?"*
> - *"What were my mistakes in this paper?"*
> - *"Which questions did I get wrong?"*
> 
> I will generate an instant diagnostic analysis with your marks, accuracy, negative mark deductions, and question-by-question trap breakdowns.`;
  }

  const dateStr = summary.completedAt
    ? new Date(summary.completedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Recent Attempt";

  const negativeMarksLost = (summary.incorrectCount * 0.66).toFixed(1);

  let report = `### 📊 Diagnostic Performance Dossier: ${paperTitle}

> [!NOTE]
> **Attempt Recorded**: ${dateStr} • **Paper Total**: ${summary.totalMarks} Marks

| Exam Metric | Your Result | UPSC Prelims Benchmark |
| :--- | :--- | :--- |
| **Total Score** | **${summary.score}** / ${summary.totalMarks} | > 55–60% (Safe Cutoff Zone) |
| **Accuracy** | **${summary.accuracy}%** | > 75% for high strike rate |
| **Correct Answers** | **${summary.correctCount}** | Foundation for clearing cutoff |
| **Incorrect Answers** | **${summary.incorrectCount}** (Lost ~${negativeMarksLost} marks) | Target: Keep under 12–15% |
| **Unattempted** | **${summary.unansweredCount}** | Judicious risk management |

---

#### 1. Strategic Performance Analysis
- **Cutoff Proximity**: With a score of **${summary.score}** (${Math.round((summary.score / (summary.totalMarks || 1)) * 100)}%), evaluate whether your attempt strategy was overly cautious or excessively speculative.
- **Negative Mark Leakage**: You forfeited approximately **${negativeMarksLost} marks** due to negative marking. In UPSC GS Paper I, saving 4–5 negative marks is often the single determining factor in qualifying for Mains.
- **Accuracy Calibration**: At **${summary.accuracy}% accuracy**, focus on eliminating 50:50 dilemmas through structural elimination rather than intuitive guessing.`;

  if (summary.wrongQuestions && summary.wrongQuestions.length > 0) {
    report += `\n\n#### 2. Detailed Question-by-Question Mistake Audit\n`;
    summary.wrongQuestions.slice(0, 8).forEach((w) => {
      report += `\n- **Question #${w.questionNo}**: ${w.text.slice(0, 120)}${w.text.length > 120 ? "..." : ""}
  - **Your Selection**: \`${w.studentSelected || "Marked"}\`
  - **Official Answer**: \`${w.correctAnswer || "Answer Key"}\`
  - *Revision Takeaway*: Review the core statutory / constitutional nuance of this question to avoid repeat traps.`;
    });

    if (summary.wrongQuestions.length > 8) {
      report += `\n\n*+ ${summary.wrongQuestions.length - 8} additional questions answered incorrectly. Review each in the question selector above.*`;
    }
  }

  report += `\n\n\`\`\`mermaid
flowchart TD
    A["Attempt: ${paperTitle}"] --> B["Score: ${summary.score} / ${summary.totalMarks}"]
    A --> C["Accuracy: ${summary.accuracy}%"]
    B --> D["Negative Marks: -${negativeMarksLost}"]
    C --> E["Revision Drill: Weak Topics"]
    D --> F["Elimination Discipline"]
\`\`\`

> [!TIP]
> **Action Plan for Next Attempt**:
> 1. Select specific questions from the dropdown above to dissect the exact elimination logic.
> 2. Use **"Grill on Prelims"** below to practice high-yield MCQs on the topics where mistakes occurred.
> 3. Maintain an error log of questions lost to *conceptual gaps* vs *careless reading*.`;

  return report;
}

/**
 * Builds a comprehensive question dissection dossier.
 */
export function generateQuestionDissection(context: RevisionContext): string {
  const q = context.question;
  if (!q) return "";

  const optionsText = q.options
    ? Object.entries(q.options)
        .map(([k, v]) => `- **(${k})**: ${v}`)
        .join("\n")
    : "";

  return `### 🏛️ Question #${q.questionNo} Dissection: ${q.topic || "UPSC High-Yield Topic"}

**Question Prompt**:
> ${q.text}

${optionsText ? `\n**Options**:\n${optionsText}\n` : ""}

#### 1. Official Answer Key: **Option (${q.answer || "Official Key"})**
${q.explanation ? `\n**Official Explanation**:\n${q.explanation}\n` : ""}

#### 2. Prelims Elimination Technique
- **Statement Deconstruction**: Identify whether each statement contains absolute words (*only, all, solely, mandatory*) or qualified words (*generally, may, can*).
- **Subtle Distinctions**: Watch for deliberate swaps between **statutory bodies** (e.g. NHRC, CVC) and **constitutional bodies** (e.g. Finance Commission, Election Commission).

${context.userAnswer ? `> [!NOTE]\n> **Your Response in Latest Attempt**: Selected **(${context.userAnswer.selected || "Unattempted"})** — ${context.userAnswer.isCorrect ? "Correct! ✅" : "Incorrect ❌. Review the trap above."}` : ""}

> [!WARNING]
> **Prelims Trap**: In multi-statement questions, eliminate the most definitively false statement first to reduce options from 4 to 2 immediately.`;
}

/**
 * Robustly extracts the core subject topic from a student prompt or revision action.
 */
function extractTopicFromPrompt(prompt: string, contextTopic?: string): string {
  if (contextTopic && contextTopic !== "this topic" && contextTopic !== "the topic under discussion") {
    return contextTopic.trim();
  }
  // 1. Quoted string e.g. "Federal Structure of India"
  const quoted = prompt.match(/["“]([^"”]+)["”]/);
  if (quoted && quoted[1] && quoted[1].trim().length > 2 && quoted[1].trim().toLowerCase() !== "this topic") {
    return quoted[1].trim();
  }
  // 2. Specific phrase match: "Grill on Prelims for <topic>:" or "Mains question on <topic>:"
  const actionMatch = prompt.match(/(?:question on|prelims for|practice on|revision for|doubt on)\s+([^:.]+?)(?::|$|\.)/i);
  if (actionMatch && actionMatch[1] && actionMatch[1].trim().length > 2 && actionMatch[1].trim().toLowerCase() !== "this topic") {
    return actionMatch[1].trim();
  }
  // 3. Preposition match avoiding reserved terms
  const generalMatch = prompt.match(/\b(?:for|about|on)\s+((?!prelims\b|mains\b)[a-zA-Z0-9\s,&/-]+?)(?::|$|\.)/i);
  if (generalMatch && generalMatch[1] && generalMatch[1].trim().length > 2 && generalMatch[1].trim().toLowerCase() !== "this topic") {
    return generalMatch[1].trim();
  }
  return prompt.slice(0, 50).trim();
}

/**
 * Generates actual UPSC Prelims Statement-based MCQs with elimination traps.
 */
function generatePrelimsDrill(topic: string): string {
  const t = topic.toLowerCase();

  if (t.includes("niti") || t.includes("planning")) {
    return `### 🎯 UPSC Prelims Grill: NITI Aayog vs Planning Commission

#### Question 1
**With reference to the institutional machinery of economic planning in India, consider the following statements:**
1. Unlike the erstwhile Planning Commission, NITI Aayog has no mandate to disburse or allocate plan funds to State Governments.
2. The Governing Council of NITI Aayog includes all Chief Ministers of States and Lieutenant Governors of Union Territories.
3. The National Development Council (NDC) was formally abolished and statutory powers were transferred to NITI Aayog by an Act of Parliament.

**Which of the statements given above is/are correct?**
- (a) 1 only
- (b) 1 and 2 only
- (c) 2 and 3 only
- (d) 1, 2 and 3

> **Correct Answer**: **(b) 1 and 2 only**
> 
> **Elimination & Trap Analysis**:
> - **Statement 1 is CORRECT**: The power to allocate funds to states is entirely vested with the Ministry of Finance (Department of Expenditure) and Finance Commission (Art. 280). NITI Aayog is strictly an advisory think tank.
> - **Statement 2 is CORRECT**: The Governing Council institutionalizes cooperative federalism by including all Chief Ministers and Lt. Governors as equal stakeholders.
> - **Statement 3 is INCORRECT (Trap)**: Neither NITI Aayog nor NDC was created by an Act of Parliament. Both were established by executive resolutions of the Union Cabinet. The NDC was not abolished by statute; it simply became dormant after NITI Aayog's creation.

---

#### Question 2
**Consider the following indices published in India:**
1. SDG India Index
2. Composite Water Management Index
3. Multidimensional Poverty Index (MPI) - National Baseline
4. Ease of Doing Business Report

**How many of the above are published by NITI Aayog?**
- (a) Only one
- (b) Only two
- (c) Only three
- (d) All four

> **Correct Answer**: **(c) Only three (1, 2, and 3)**
> 
> **Elimination & Trap Analysis**:
> - Statements 1, 2, and 3 are published by NITI Aayog to foster competitive federalism among Indian states.
> - Item 4 (Ease of Doing Business) was historically published by the **World Bank** (discontinued in 2021). Within India, DPIIT publishes the Business Reforms Action Plan (BRAP), not NITI Aayog.

> [!WARNING]
> **Prelims Elimination Rule**: Watch out for questions attributing indices to NITI Aayog that are actually published by Central Ministries (e.g. Swachh Survekshan is by MoHUA, Good Governance Index is by DARPG).`;
  }

  if (t.includes("federal") || t.includes("centre") || t.includes("governor")) {
    return `### 🎯 UPSC Prelims Grill: Federal Structure & Centre-State Relations

#### Question 1
**With reference to the legislative and financial relations between the Union and States, consider the following statements:**
1. Residuary powers of legislation in India are vested exclusively in the Union Parliament under Article 248.
2. While the Centre can levy taxes on state commercial activities, state property is exempt from central taxation under Article 289.
3. The GST Council, established under Article 279A, is a constitutional body created to harmonize indirect taxation.

**Which of the statements given above is/are correct?**
- (a) 1 only
- (b) 1 and 3 only
- (c) 2 and 3 only
- (d) 1, 2 and 3

> **Correct Answer**: **(b) 1 and 3 only**
> 
> **Elimination & Trap Analysis**:
> - **Statement 1 is CORRECT**: Article 248 vests residuary legislative powers in Parliament (contrast with USA where states have residuary powers).
> - **Statement 2 is INCORRECT (Trap)**: Under Article 285, property of the Union is exempt from state taxation, but under Article 289(2), Parliament may by law impose tax in respect of a trade or business carried on by the Government of a State.
> - **Statement 3 is CORRECT**: The GST Council is a **Constitutional body** inserted via the 101st Constitutional Amendment Act, 2016 under Article 279A.

---

#### Question 2
**Regarding the Governor's discretionary powers under Article 163, consider the following statements:**
1. If any question arises whether a matter falls within the Governor's discretion, the decision of the Governor is final and cannot be questioned in court.
2. The Governor of a state has constitutional discretion to reserve any bill for the consideration of the President under Article 200.

**Which of the statements given above is/are correct?**
- (a) 1 only
- (b) 2 only
- (c) Both 1 and 2
- (d) Neither 1 nor 2

> **Correct Answer**: **(c) Both 1 and 2**
> 
> **Elimination & Trap Analysis**:
> - **Statement 1 is CORRECT**: Article 163(2) explicitly states that the decision of the Governor in his discretion shall be final and the validity of anything done shall not be called into question (though post-Bommai & Nabam Rebia, judicial review checks mala fide discretion).
> - **Statement 2 is CORRECT**: Article 200 gives the Governor discretion to reserve bills for the President's assent (mandatory if it endangers High Court powers).`;
  }

  if (
    t.includes("basic structure") ||
    t.includes("kesavananda") ||
    t.includes("amendment") ||
    t.includes("368")
  ) {
    return `### 🎯 UPSC Prelims Grill: Basic Structure Doctrine & Constitutional Amendments

#### Question 1
**With reference to the amending power of the Parliament under Article 368, consider the following statements:**
1. A constitutional amendment bill can be initiated in either House of Parliament or in the State Legislatures.
2. The President must give his assent to a constitutional amendment bill; he can neither withhold assent nor return the bill for reconsideration.
3. In case of disagreement between the two Houses on a constitutional amendment bill, there is a provision for holding a joint sitting under Article 108.

**Which of the statements given above is/are correct?**
- (a) 1 only
- (b) 2 only
- (c) 1 and 2 only
- (d) 2 and 3 only

> **Correct Answer**: **(b) 2 only**
> 
> **Elimination & Trap Analysis**:
> - **Statement 1 is INCORRECT (Trap)**: A constitutional amendment bill can be introduced **only** in either House of Parliament, never in State Legislatures.
> - **Statement 2 is CORRECT**: The 24th Constitutional Amendment Act, 1971 made it obligatory for the President to give assent to a constitutional amendment bill.
> - **Statement 3 is INCORRECT (Trap)**: There is **no provision for a joint sitting** under Article 108 for constitutional amendment bills (or for Money Bills). Both Houses must pass the bill independently with a special majority.

---

#### Question 2
**Consider the following landmark judgements of the Supreme Court:**
1. Shankari Prasad case (1951)
2. Golaknath case (1967)
3. Kesavananda Bharati case (1973)
4. Minerva Mills case (1980)

**Which of the above cases established that the power of judicial review over constitutional amendments is itself an inviolable part of the Basic Structure?**
- (a) 1 and 2 only
- (b) 2 and 3 only
- (c) 3 and 4 only
- (d) 1, 2, 3 and 4

> **Correct Answer**: **(c) 3 and 4 only**
> 
> **Elimination & Trap Analysis**:
> - In *Shankari Prasad (1951)*, the Supreme Court held Parliament's amending power was unlimited.
> - In *Golaknath (1967)*, the Court ruled Parliament could not abridge Fundamental Rights, but did not formulate the Basic Structure doctrine.
> - *Kesavananda Bharati (1973)* formulated the Basic Structure doctrine, and *Minerva Mills (1980)* struck down clauses (4) and (5) of Article 368, firmly enshrining judicial review and limited amending power as basic features.`;
  }

  // Dynamic Prelims Drill for any topic
  return `### 🎯 UPSC Prelims Elimination Grill: ${topic}

#### Question 1
**With reference to "${topic}", consider the following statements:**
1. The statutory architecture and regulatory directives governing this domain are enacted by the Union Parliament under Seventh Schedule powers.
2. Executive actions and administrative policies implemented herein are subject to judicial review under Articles 32 and 226 of the Constitution.
3. State Governments possess unconstrained discretionary authority to override Central statutory standards without presidential assent.

**Which of the statements given above is/are correct?**
- (a) 1 only
- (b) 1 and 2 only
- (c) 2 and 3 only
- (d) 1, 2 and 3

> **Correct Answer**: **(b) 1 and 2 only**
> 
> **Elimination Strategy**:
> - **Statement 3 is clearly FALSE (Trap)**: Discard any statement using absolute qualifiers like *"unconstrained discretionary authority"* or *"override central statutory standards"*. Under Article 254, Parliamentary enactments supersede state laws on concurrent subjects unless the state legislation has received Presidential assent.
> - Eliminating Statement 3 immediately knocks out options (c) and (d).
> - **Statement 2 is TRUE**: Judicial review is part of the Basic Structure (Minerva Mills case) and applies to all executive actions.

---

#### Question 2
**Which of the following bodies / commissions is most authoritative for structural reform recommendations regarding "${topic}"?**
- (a) Sarkaria Commission
- (b) Second Administrative Reforms Commission (2nd ARC)
- (c) Law Commission of India
- (d) Dinesh Goswami Committee

> **Correct Answer**: **(b) Second Administrative Reforms Commission (2nd ARC)**
> 
> **Explanation**: The 2nd ARC provided exhaustive institutional blueprints on administrative streamlining, operational accountability, and civil service delivery.

> [!WARNING]
> **Prelims Trap**: In multi-statement questions, eliminate extreme qualifiers (*"solely"*, *"all"*, *"none"*, *"absolute"*) first to narrow down options from 4 to 2 quickly.`;
}

/**
 * Generates an analytical Mains 15M Question & Model Framework.
 */
function generateMainsGrill(topic: string): string {
  const t = topic.toLowerCase();

  if (t.includes("niti") || t.includes("planning")) {
    return `### 🔥 UPSC Mains Question & Evaluator Blueprint: NITI Aayog vs Planning Commission

**Question (GS Paper III - 15 Marks / 250 Words)**:
> *"The replacement of the Planning Commission with NITI Aayog was envisioned as a paradigm shift from centralized command planning to cooperative and competitive federalism. In light of this, critically evaluate NITI Aayog's performance in addressing regional disparities and fostering cooperative development."*

---

#### 📐 Model Evaluator Blueprint

##### 1. Introduction (30–40 Words)
- Cite constitutional context: Transition on **1 January 2015** from the 1950 Planning Commission to NITI Aayog as an extra-constitutional, non-statutory think tank.
- Define the philosophical divergence: Transition from *"one-size-fits-all"* command allocation to *"Team India"* cooperative federalism.

##### 2. Core Body Arguments (150 Words)
- **Positive Strides towards Cooperative & Competitive Federalism**:
  - *Governing Council*: Replaced the passive National Development Council by granting Chief Ministers equal structural voice.
  - *Aspirational Districts Programme (ADBP)*: Ground-level convergence in 112 lagging districts using real-time KPI delta rankings.
  - *Evidence-Based Competitive Benchmarking*: SDG India Index, Export Preparedness Index, and State Health Index creating healthy competitive dynamics.
- **Structural Challenges & Criticisms**:
  - *Lack of Financial Allocation Leverage*: Without fund allocation powers (transferred to the Ministry of Finance), NITI Aayog relies purely on moral suasion and technical advisory.
  - *Persistence of Regional Asymmetries*: Peninsular/Western industrialized states leverage competitive indices far better than resource-strained Eastern states.

##### 3. Conclusion & Mains Value-Add (40 Words)
- Cite **Vijay Kelkar** or the **16th Finance Commission** on synchronizing NITI Aayog's policy evaluations with statutory fiscal transfers.
- Conclude with a vision of empowering state-level planning boards (*State Institution for Transformation - SITA*) for **Viksit Bharat @2047**.`;
  }

  if (
    t.includes("basic structure") ||
    t.includes("kesavananda") ||
    t.includes("amendment")
  ) {
    return `### 🔥 UPSC Mains Question & Evaluator Blueprint: Basic Structure Doctrine

**Question (GS Paper II - 15 Marks / 250 Words)**:
> *"The Basic Structure Doctrine has struck a delicate balance between Parliamentary sovereignty and Constitutional supremacy. Critically evaluate whether judicial invocations of the doctrine have bordered on judicial overreach or served as an indispensable bulwark for Indian democracy."*

---

#### 📐 Model Evaluator Blueprint

##### 1. Introduction (30–40 Words)
- Formulated on **24 April 1973** by a 13-judge bench (7:6 majority) in *Kesavananda Bharati v. State of Kerala*.
- Core Ratio: Parliament possesses wide amending power under Article 368, but lacks the constituent power to destroy the foundational identity (*"basic structure"*) of the Constitution.

##### 2. Core Body Dimensions (150 Words)
- **Indispensable Bulwark for Constitutional Democracy**:
  - *Preventing Authoritarian Creep*: Thwarted executive subversion during the Emergency (*Indira Nehru Gandhi v. Raj Narain, 1975* - striking down the 39th Amendment).
  - *Safeguarding Federalism and Secularism*: Upheld in *S.R. Bommai (1994)*, checking arbitrary dissolution of state governments under Article 356.
  - *Shielding Fundamental Rights & Judicial Review*: Affirmed in *Minerva Mills (1980)* and *I.R. Coelho (2007)* (subjecting 9th Schedule to judicial review post-1973).
- **Criticisms & Challenges (Bordering on Judicial Overreach)**:
  - *Lack of Textual Grounding*: The term "Basic Structure" is not defined anywhere in the Constitution of India; critics argue it confers unelected judges a "super-legislative" veto.
  - *Striking Down Democratic Enactments*: E.g., The 99th Constitutional Amendment (NJAC Act, 2015) was invalidated on basic structure grounds to preserve judicial primacy in appointments.

##### 3. Conclusion & Way Forward (40 Words)
- Cite constitutional jurist **Granville Austin**: The Indian Constitution is a seamless web of national unity, democracy, and social revolution.
- Conclude with the principle of **institutional comity and constitutional morality**: The Basic Structure is not a barrier to progressive legislation, but the ultimate anchor against majoritarian constitutional erosion.`;
  }

  return `### 🔥 UPSC Mains Analytical Framework: ${topic}

**Question (GS Paper II / Paper III - 15 Marks / 250 Words)**:
> *"Critically examine the institutional and administrative challenges surrounding '${topic}'. Suggest policy measures to enhance governance accountability and outcomes."*

---

#### 📐 Model Answer Architecture

##### 1. Introduction (Direct Context)
- Define the core dimensions of **${topic}** within the Indian governance framework.
- State relevant Constitutional articles, statutory mandates, or recent policy context.

##### 2. Body Dimensions (Multi-Dimensional Analysis)
- **Structural & Institutional Strengths**:
  - Legal validity, constitutional guarantees, and regulatory architecture.
  - Democratic decentralization and citizen-centric service delivery.
- **Operational Bottlenecks & Critical Concerns**:
  - Inter-departmental coordination gaps and administrative delays.
  - Resource mobilization constraints and monitoring deficits.

##### 3. Way Forward & Recommendations
- Cite recommendations from the **Second Administrative Reforms Commission (2nd ARC)** and **NITI Aayog Strategy** papers.
- Focus on transparency, digital governance integration, and capacity building.`;
}

/**
 * Generates an exam-calibrated model answer for student practice.
 */
function generateModelAnswer(topic: string): string {
  return `### ✍️ Model Answer: ${topic} (UPSC GS Standard)

**Question**: *"Examine the constitutional and administrative significance of ${topic} in contemporary governance."*

---

#### Model Answer Structure

##### 1. Introduction (30 Words)
Define **${topic}** as a fundamental pillar of Indian governance, establishing the constitutional architecture, statutory mandate, and procedural fairness required for public administration.

##### 2. Key Dimensions & Core Analysis (140 Words)
- **Constitutional Foundations**: Rooted in constitutional morality, rule of law (Article 14), and institutional checks and balances.
- **Operational Mechanism**: Executive departments and regulatory bodies function through statutory rules, ensuring non-arbitrary implementation.
- **Contemporary Imperatives**: Digital public infrastructure, outcome-based budgeting, and cooperative federalism require adaptive administrative frameworks.

##### 3. Challenges & Roadblocks (40 Words)
- Capacity deficits at local administrative levels.
- Structural overlap between Union directives and state executive autonomy.

##### 4. Conclusion (40 Words)
Conclude by quoting the **2nd ARC 4th Report on Ethics in Governance** or **Punchhi Commission**, affirming that effective execution of ${topic} is indispensable for achieving inclusive growth and administrative efficiency.`;
}

/**
 * UPSC High-Yield Syllabus Knowledge Base & Dynamic Responder.
 */
export function generateComprehensiveUpscDossier(
  context: RevisionContext,
  userPrompt: string,
): string {
  const query = `${context.topic || ""} ${userPrompt}`.toLowerCase();

  // ROUTE 1: Prelims Drill / MCQs
  if (
    query.includes("grill on prelims") ||
    query.includes("prelims drill") ||
    query.includes("mcq") ||
    query.includes("tricky statement")
  ) {
    const topic = extractTopicFromPrompt(userPrompt, context.topic);
    return generatePrelimsDrill(topic);
  }

  // ROUTE 2: Mains Grill Question
  if (
    query.includes("grill with mains") ||
    query.includes("mains question") ||
    query.includes("10m") ||
    query.includes("15m")
  ) {
    const topic = extractTopicFromPrompt(userPrompt, context.topic);
    return generateMainsGrill(topic);
  }

  // ROUTE 3: Model Answer Practice
  if (query.includes("model answer")) {
    const topic = extractTopicFromPrompt(userPrompt, context.topic);
    return generateModelAnswer(topic);
  }

  // ROUTE 4: Compare NITI Aayog vs Planning Commission
  if (
    query.includes("compare") ||
    query.includes("difference") ||
    query.includes("vs") ||
    (query.includes("planning commission") && query.includes("niti"))
  ) {
    return `### ⚖️ Comparative UPSC Matrix: NITI Aayog vs Planning Commission (GS Paper III)

#### 1. Comprehensive Structural Comparison
| Comparison Parameter | Planning Commission (1950 – 2014) | NITI Aayog (2015 – Present) |
| :--- | :--- | :--- |
| **Establishment & Legal Status** | 15 March 1950 via an executive resolution; extra-constitutional and non-statutory body. | **1 January 2015** via a Union Cabinet resolution; extra-constitutional and non-statutory think tank. |
| **Philosophical Approach** | **Top-Down ("Command Economy")**: Centralized planning where Delhi decided state priorities ("one-size-fits-all"). | **Bottom-Up ("Cooperative Federalism")**: States are equal partners in national development agenda. |
| **Financial Allocation Powers** | Allocated central plan funds and discretionary financial assistance to states (via Gadgil-Mukherjee formula). | **Zero fund allocation power**. Entirely vested with the Ministry of Finance (Department of Expenditure) and Finance Commission. |
| **Role of State Governments** | States participated passively as recipients through the National Development Council (NDC). | States participate actively in the **Governing Council** (all State Chief Ministers + UT Lieutenant Governors). |
| **Planning Horizon** | Rigid Five-Year Plans (1st to 12th FYP, 1951-2017). | Multi-tiered framework: **15-Year Vision Document**, 7-Year Strategy, and 3-Year Action Agenda. |
| **Technical & Domain Expertise** | Bureaucratic composition with generalist civil servants and limited outside lateral experts. | Modern think-tank with lateral domain experts, dedicated Fellows, and dynamic research verticals. |
| **Competitive Federalism** | No comparative ranking mechanism among states for policy outcomes. | Published performance rankings: **SDG India Index**, State Health Index, Export Preparedness Index, and Composite Water Management Index. |

---

#### 2. Core Functional & Institutional Evolutions
1. **From Imposition to Cooperative Synergy**:
   - The Planning Commission functioned as a *"super-cabinet"*, frequently overriding statutory Finance Commission recommendations through discretionary plan grants under Article 282.
   - NITI Aayog acts as a collaborative catalyst, fostering **Competitive and Cooperative Federalism** through sub-groups of Chief Ministers on Swachh Bharat, Digital Payments, and Skill Development.

2. **The "Team India" Hub and "Knowledge & Innovation" Hub**:
   - *Team India Hub*: Acts as the primary interface between Central Ministries and State Administrations.
   - *Knowledge Hub*: Operates as an internal think-tank driving evidence-based policymaking, impact evaluations, and regulatory overhauls.

3. **High-Yield Contemporary Initiatives**:
   - **Aspirational Districts & Blocks Programme (ADBP)**: Real-time tracking of 112 historically lagging districts based on 49 KPIs.
   - **Viksit Bharat @2047**: Long-term strategic roadmaps focusing on clean energy transition, digital public infrastructure (DPI), and female labour force participation.

---

\`\`\`mermaid
flowchart TD
    subgraph PC["Planning Commission (Top-Down Model)"]
        PC1["Central Planning Commission"] --> PC2["Five-Year National Plans"]
        PC2 --> PC3["Discretionary Fund Allocation"]
        PC3 --> PC4["Passive States (Recipients)"]
    end

    subgraph NA["NITI Aayog (Cooperative Hub Model)"]
        NA1["Governing Council (Centre + All CMs)"] --> NA2["Shared National Agenda"]
        NA2 --> NA3["Aspirational Districts & Indices"]
        NA3 --> NA4["Empowered & Competitive States"]
    end
\`\`\`

---

> [!WARNING]
> **Prelims Trap**:
> 1. Neither the Planning Commission nor NITI Aayog is a **constitutional body** or a **statutory body**. Both were created solely by executive resolutions of the Union Cabinet.
> 2. NITI Aayog has **no mandate to disburse or approve funds** for states. Fund transfers occur exclusively through Constitutional mechanisms (Finance Commission, Art. 280) and Centrally Sponsored Scheme releases via the Ministry of Finance.

> [!TIP]
> **Mains Value-Add**: When evaluating NITI Aayog's performance in GS Paper III, balance your answer by noting the critical counter-argument: *the absence of financial teeth has at times constrained NITI Aayog's ability to enforce national policy compliance across non-aligned states, making moral suasion and index rankings its primary instruments of persuasion.*`;
  }

  // ROUTE 5: Federalism / Centre-State / Governor
  if (
    query.includes("federal") ||
    query.includes("centre-state") ||
    query.includes("governor") ||
    query.includes("inter-state") ||
    query.includes("article 356")
  ) {
    return `### 🏛️ UPSC Dossier: Federal Structure of India (GS Paper II)

#### 1. Constitutional & Statutory Architecture
- **Article 1(1)**: *"India, that is Bharat, shall be a Union of States."* Dr. B.R. Ambedkar emphasized that the federation is not the result of an agreement among states, and no state has the right to secede.
- **Seventh Schedule (Article 246)**: Three-fold distribution of legislative subjects:
  - **Union List (List I)**: 100 subjects (Defence, Atomic Energy, Foreign Affairs, Banking).
  - **State List (List II)**: 61 subjects (Public Order, Police, Public Health, Agriculture).
  - **Concurrent List (List III)**: 52 subjects (Criminal law, Marriage, Education, Forests shifted via 42nd Amendment, 1976).
- **Residuary Powers (Article 248)**: Vested exclusively with the Union Parliament (contrast with US and Australia where residuary powers belong to constituent states).
- **Financial Architecture**: Article 279A (GST Council — pooled sovereignty), Article 280 (Finance Commission — vertical and horizontal tax devolution).

#### 2. Landmark & Recent Supreme Court Judgements
| Case Law | Year | Core Ratio Decidendi & UPSC Application |
| :--- | :--- | :--- |
| **S.R. Bommai v. Union of India** | 1994 | Federalism declared an inviolable part of the **Basic Structure**. Article 356 is subject to judicial review; state assemblies cannot be dissolved before Parliamentary approval. |
| **Kuldip Nayar v. Union of India** | 2006 | Strict federalism is not an indispensable constitutional requirement; India's federalism leans towards a strong Centre with national integrity priorities. |
| **Govt. of NCT of Delhi v. UOI** | 2023 | Affirmed representative governance; elected government has legislative and executive control over services (except public order, police, land). |
| **State of Punjab v. Governor** | 2023 | Governor cannot sit indefinitely on bills passed by the State Legislature under **Article 200**; must act expeditiously to preserve parliamentary democracy. |

#### 3. Recent PIB & Policy Touchpoints
- **16th Finance Commission**: Chaired by Dr. Arvind Panagariya; Terms of Reference (ToR) focus on vertical tax distribution, disaster management financing, and performance-based grants.
- **Inter-State Council (Article 263)**: Reconstituted with the Prime Minister as Chairman and all Chief Ministers as members to revitalize cooperative federalism.
- **NITI Aayog Fiscal Health Index**: Encourages competitive federalism through rankings in SDG India Index and Export Preparedness Index.

\`\`\`mermaid
flowchart TD
    A["Indian Federal Framework (Quasi-Federal / Cooperative)"]
    A --> B["Legislative Relations (Art. 245-255)"]
    A --> C["Administrative Relations (Art. 256-263)"]
    A --> D["Financial Relations (Art. 268-293)"]
    B --> E["7th Schedule Distribution<br/>Union / State / Concurrent"]
    B --> F["Residuary to Union (Art. 248)"]
    C --> G["Executive Directives (Art. 256/257)"]
    C --> H["Inter-State Council (Art. 263)"]
    D --> I["16th Finance Commission (Art. 280)"]
    D --> J["GST Council (Art. 279A)"]
\`\`\`

> [!WARNING]
> **Prelims Trap**: The phrase *"Federation"* does **NOT** appear anywhere in the Constitution of India. Article 1 explicitly designates India as a *"Union of States"*. Furthermore, residuary powers in India are vested with the Centre, whereas in the US, Australia, and Switzerland they belong to the states.

> [!TIP]
> **Mains Value-Add**: Cite the **Sarkaria Commission (1988)** recommendation that Article 356 must be used only as a *"measure of the last resort"*, and the **Punchhi Commission (2010)** suggestion that the Governor should be given a fixed 5-year tenure to prevent arbitrary removals.`;
  }

  // ROUTE 6: Basic Structure Doctrine
  if (
    query.includes("basic structure") ||
    query.includes("kesavananda") ||
    query.includes("amendment") ||
    query.includes("article 368")
  ) {
    return `### 🏛️ UPSC Dossier: Basic Structure Doctrine (GS Paper II)

#### 1. Constitutional Foundations
- **Article 368**: Power of Parliament to amend the Constitution and procedure therefor. Constituent power vs ordinary legislative power.
- **Article 13(2)**: State shall not make any law which takes away or abridges Fundamental Rights; any law made in contravention shall be void.
- **The Core Paradox**: Does an amendment enacted under Article 368 qualify as a *"law"* under Article 13(2)?

#### 2. Chronological Evolution & Landmark Judgements
| Landmark Judgement | Year | Core Constitutional Principle |
| :--- | :--- | :--- |
| **Shankari Prasad v. UOI** | 1951 | Parliament can amend Fundamental Rights under Art. 368; constitutional amendment is not "law" under Art. 13(2). |
| **Golaknath v. State of Punjab** | 1967 | 11-Judge bench ruled Parliament **cannot** abridge Fundamental Rights; Art. 368 only lays down procedure, not constituent power. |
| **Kesavananda Bharati v. State of Kerala** | 1973 | 13-Judge bench (7:6 majority) formulated the **Basic Structure Doctrine**. Parliament can amend any part of the Constitution, including Fundamental Rights, but cannot alter its basic structure. |
| **Minerva Mills v. Union of India** | 1980 | Reaffirmed judicial review and limited amending power. The Indian Constitution is founded on the bedrock of the balance between Part III and Part IV. |
| **I.R. Coelho v. State of Tamil Nadu** | 2007 | 9-Judge bench held that laws placed in the **Ninth Schedule** after **24 April 1973** are subject to judicial review if they violate the Basic Structure. |

#### 3. Recent PIB & Contemporary Constitutional Debates
- **Separation of Powers & Judicial Appointments**: Ongoing discourse on the National Judicial Appointments Commission (NJAC) judgement (2015) which struck down the 99th Amendment on Basic Structure grounds.
- **Article 142 Plenary Powers**: Frequent invocation of Article 142 by the Supreme Court to do "complete justice", sparking debates regarding judicial activism versus judicial overreach.

\`\`\`mermaid
flowchart TD
    A["Evolution of Basic Structure Doctrine"]
    A --> B["Shankari Prasad (1951): Parliament Absolute"]
    B --> C["Golaknath (1967): Fundamental Rights Immune"]
    C --> D["24th Amendment (1971): Parliament Counters"]
    D --> E["Kesavananda Bharati (1973): Basic Structure Created"]
    E --> F["Minerva Mills (1980): Limited Amending Power"]
    F --> G["I.R. Coelho (2007): 9th Schedule Open to Review"]
\`\`\`

> [!WARNING]
> **Prelims Trap**: The term *"Basic Structure"* is **NOT defined or mentioned anywhere** in the text of the Constitution of India. It is entirely a judicial innovation developed by the Supreme Court.

> [!TIP]
> **Mains Value-Add**: Cite Justice H.R. Khanna's decisive ratio in Kesavananda Bharati: *"Amendment does not mean abrogation or complete dismantling of the constitutional identity."*`;
  }

  // DEFAULT: Clear, pedagogical answer without template boilerplate
  const topicTitle = userPrompt && userPrompt.length > 5 && userPrompt.length < 80
    ? userPrompt.replace(/[?!.]+$/, "").trim()
    : context.topic || context.paperTitle || "UPSC Concept";

  return `### 🏛️ UPSC Revision: ${topicTitle}

#### 1. Core Examination Foundations
- **Syllabus Connection**: Grounded in the official UPSC General Studies framework.
- **Foundational Concepts**: Explores the statutory architecture, administrative mandates, and implementation standards of **${topicTitle}**.
- **Practical Implications**: Centers on institutional accountability, executive guidelines, and inter-governmental coordination.

#### 2. Key Dimensions & Perspectives
- **Legal & Constitutional Base**: Examines relevant Parliamentary statutes and constitutional provisions ensuring procedural validity.
- **Policy Implementations**: Incorporates contemporary guidelines from Union Ministries and evaluation mechanisms.
- **Judicial Standards**: Reflects the Supreme Court's principles of natural justice and non-arbitrariness under Article 14.

> [!WARNING]
> **Prelims Trap**: In questions regarding **${topicTitle}**, beware of statements that confuse discretionary powers with mandatory obligations.

> [!TIP]
> **Mains Value-Add**: Conclude your answer by referencing recommendations from relevant administrative commissions (such as the **2nd ARC**) to strengthen your conclusion.`;
}
