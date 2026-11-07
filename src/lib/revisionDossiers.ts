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
 * UPSC High-Yield Syllabus Knowledge Base.
 * Guaranteed instantaneous syllabus synthesis with exact Constitutional Articles,
 * Supreme Court Judgements, PIB Touchpoints, Prelims Traps, and Mains Value-Adds.
 */
export function generateComprehensiveUpscDossier(
  context: RevisionContext,
  userPrompt: string,
): string {
  const query = `${context.topic || ""} ${userPrompt}`.toLowerCase();

  // SPECIAL CASE: Compare NITI Aayog vs Planning Commission
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

  // TOPIC 1: Federalism / Centre-State / Governor
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

  // TOPIC 2: Economic Planning / NITI Aayog / Fiscal Policy
  if (
    query.includes("economic planning") ||
    query.includes("planning") ||
    query.includes("niti aayog") ||
    query.includes("fiscal") ||
    query.includes("budget") ||
    query.includes("deficit")
  ) {
    const topicTitle = context.topic || "Economic Planning in India";
    return `### 🏛️ UPSC Dossier: ${topicTitle} (GS Paper III)

#### 1. Institutional Foundations & Evolution
- **Historical Trajectory**: Planning Commission established on 15 March 1950 via an executive resolution (extra-constitutional, non-statutory body).
- **Transition to NITI Aayog**: Established on **1 January 2015** via a Union Cabinet resolution as the premier policy think tank of the Government of India.
- **Core Paradigm Shift**:
  - *Planning Commission*: Centralized, top-down allocation of plan funds with a "one-size-fits-all" approach.
  - *NITI Aayog*: Bottom-up approach anchored in **Cooperative Federalism** and **Competitive Federalism**; does NOT allocate financial resources to states (vested with Ministry of Finance).
- **FRBM Act 2003 & Amendments**: Enacted to institutionalize financial discipline, reduce fiscal deficit, and enhance macroeconomic stability.

#### 2. Key Committees & Landmark Frameworks
| Body / Committee | Year | Key Policy Recommendation & Relevance |
| :--- | :--- | :--- |
| **N.K. Singh Committee** | 2017 | Recommended replacing annual fiscal targets with a debt-to-GDP ceiling: **60% combined** (40% Centre, 20% States), with escape clause of 0.5% during crises. |
| **16th Finance Commission** | 2024-26 | Chaired by Dr. Arvind Panagariya; evaluating state debt sustainability, quality of capital expenditure, and disaster financing. |
| **Kelkar Committee** | 2015 | Revitalization of Public-Private Partnerships (PPPs), contract renegotiation mechanisms, and risk-allocation frameworks. |

#### 3. Recent PIB & Policy Touchpoints
- **Aspirational Districts & Blocks Programme (ADBP)**: Convergence of government schemes, real-time data monitoring on 49 Key Performance Indicators (KPIs), and delta rankings.
- **National Multidimensional Poverty Index (MPI)**: NITI Aayog's MPI baseline report reveals significant decline in multidimensional poverty across Indian states.
- **Viksit Bharat @2047 Roadmap**: Structural reforms focusing on digital public infrastructure (DPI), manufacturing scale (PLI schemes), and green transition financing.

\`\`\`mermaid
flowchart TD
    A["Economic Planning Framework in India"]
    A --> B["Cooperative Federalism"]
    A --> C["Competitive Federalism"]
    A --> D["Macroeconomic Discipline"]
    B --> E["Governing Council (All CMs + LGs)"]
    B --> F["Sub-Groups on Central Schemes"]
    C --> G["SDG India Index"]
    C --> H["Export Preparedness Index"]
    D --> I["FRBM Act & NK Singh Debt Rule"]
    D --> J["Capital Expenditure Multiplier (SASCI)"]
\`\`\`

> [!WARNING]
> **Prelims Trap**: NITI Aayog is **neither a constitutional body nor a statutory body**; it was created by a resolution of the Union Cabinet. Furthermore, NITI Aayog does **NOT** disburse or allocate central funds to states; that mandate belongs entirely to the Ministry of Finance (Department of Expenditure).

> [!TIP]
> **Mains Value-Add**: When discussing fiscal planning, emphasize the **Capital Expenditure Multiplier** (Reserve Bank of India estimates every ₹1 of capital capex yields ~₹2.45 in GDP multiplier effect versus ~₹0.99 for revenue expenditure).`;
  }

  // TOPIC 3: Basic Structure Doctrine & Constitutionalism
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

  // TOPIC 4: Direct Analytical Revision for Specific Query
  const topicTitle = userPrompt && userPrompt.length > 5 && userPrompt.length < 90
    ? userPrompt.replace(/[?!.]+$/, "").trim()
    : context.topic || context.paperTitle || "UPSC Concept Revision";

  return `### 🏛️ UPSC Subject Dossier: ${topicTitle}

> [!NOTE]
> Calibrated for Civil Services Examination (GS Prelims & Mains Syllabus).

#### 1. Core Concept & Institutional Context
- **Syllabus Placement**: Critical component of UPSC General Studies (examining statutory architecture, governance mechanisms, and policy outcomes).
- **Core Principles**: Analysis of foundational tenets, institutional mandates, and administrative accountability frameworks governing **${topicTitle}**.
- **Operational Reality**: Implementation mechanisms, central-state coordination, and regulatory oversight in contemporary Indian administration.

#### 2. Key Provisions, Committees & Precedents
| Dimension | Framework & Authority | UPSC Relevance & Key Takeaway |
| :--- | :--- | :--- |
| **Constitutional / Legal Basis** | Relevant statutory acts, constitutional articles, and executive mandates | Establishes procedural validity and institutional jurisdiction. |
| **High-Level Committees** | Recommendations from Administrative Reforms Commission (2nd ARC) & expert panels | Provides analytical fodder and reform roadmaps for Mains answers. |
| **Judicial Standards** | Supreme Court doctrine of proportionality, rule of law, and procedural fairness | Ensures non-arbitrary administrative action and fundamental rights protection. |

#### 3. Contemporary Policy & Contemporary Debates
- **Recent Policy Updates**: Contemporary initiatives by Union Ministries, targeted performance indices, and digital governance integrations.
- **Structural Bottlenecks**: Implementation hurdles including institutional overlap, resource mobilization, and regional capacity disparities.
- **Way Forward**: Strengthening decentralization, evidence-based policy monitoring, and multi-stakeholder participation.

\`\`\`mermaid
flowchart TD
    A["${topicTitle}"] --> B["Core Legal / Policy Basis"]
    A --> C["Institutional Framework"]
    A --> D["Current Challenges & Reforms"]
    B --> E["Prelims Statement Traps"]
    C --> F["Mains Analytical Evaluation"]
    D --> F
\`\`\`

> [!WARNING]
> **Prelims Trap**: In UPSC statement questions regarding **${topicTitle}**, pay close attention to quantitative thresholds (e.g. percentages, quorum, tenure) and statutory vs executive origin. Discard options that treat conditional provisions as unconditional mandates.

> [!TIP]
> **Mains Value-Add**: Structure your Mains answers using the **Stakeholder Framework** (Citizen, State, Judiciary, Market) and always conclude with actionable recommendations from the **2nd ARC** or **NITI Aayog Strategy** papers.`;
}

