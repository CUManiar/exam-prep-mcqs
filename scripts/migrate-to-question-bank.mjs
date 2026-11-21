import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const isApply = process.argv.includes('--apply');

console.log('====================================================');
console.log('   UPSC PRELIMS & MAINS QUESTION BANK MIGRATION     ');
console.log(`   Mode: ${isApply ? 'APPLY (Writing to DB)' : 'DRY RUN (Preview only)'}`);
console.log('====================================================\n');

const migrationSqlPath = path.resolve('supabase/migrations/20261121_create_question_bank.sql');
let tableSql = '';
if (fs.existsSync(migrationSqlPath)) {
  tableSql = fs.readFileSync(migrationSqlPath, 'utf8');
}

const rawConnectionString =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

if (!rawConnectionString) {
  console.error('❌ No Postgres connection string found in environment.');
  process.exit(1);
}

const connectionString = rawConnectionString.split('?')[0];
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log('✓ Connected to Supabase PostgreSQL database.');

  if (isApply && tableSql) {
    console.log('Ensuring question_bank table and indexes exist...');
    await client.query(tableSql);
    console.log('✓ question_bank schema verified.\n');
  }

  // 1. Fetch all existing custom papers
  const papersRes = await client.query(`
    SELECT 
      id, user_id, title, year, subject, stage, exam_type, label,
      total_questions, total_marks, correct_marks, incorrect_marks,
      parsed_questions, answer_key, explanations, created_at
    FROM public.custom_papers;
  `);

  const papers = papersRes.rows;
  console.log(`Found ${papers.length} existing custom papers in database.`);

  let totalQuestionsCount = 0;
  let mcqCount = 0;
  let subjectiveCount = 0;
  let clozeCount = 0;
  let matchingCount = 0;

  const questionRows = [];

  for (const paper of papers) {
    const parsedQuestions = paper.parsed_questions || [];
    const answerKey = paper.answer_key || {};
    const explanations = paper.explanations || {};
    const paperTitle = paper.label || paper.title || `${paper.year} – ${paper.subject}`;
    const isSubjective = paper.exam_type === 'subjective';

    for (const q of parsedQuestions) {
      const qNo = q.questionNo || q.question_no;
      if (!qNo) continue;

      const sanitizedPaperId = paper.id.replace(/[^a-zA-Z0-9_-]/g, '');
      const questionId = `qb_${sanitizedPaperId}_q${qNo}`;

      const isMatching = Boolean(q.matchingItems && q.matchingItems.length > 0);
      const isCloze = !isSubjective && (!q.options || Object.keys(q.options).length === 0);

      const questionType = isSubjective
        ? 'subjective'
        : isMatching
          ? 'matching'
          : isCloze
            ? 'cloze'
            : 'mcq';

      if (questionType === 'mcq') mcqCount++;
      else if (questionType === 'subjective') subjectiveCount++;
      else if (questionType === 'cloze') clozeCount++;
      else if (questionType === 'matching') matchingCount++;

      totalQuestionsCount++;

      const correctAns = answerKey[String(qNo)] || answerKey[qNo] || null;
      const expl = explanations[String(qNo)] || explanations[qNo] || q.explanation || null;

      questionRows.push({
        id: questionId,
        user_id: paper.user_id,
        source_paper_id: paper.id,
        source_paper_title: paperTitle,
        source_paper_year: String(paper.year || ''),
        question_no: qNo,
        exam_stage: paper.stage || 'prelims',
        question_type: questionType,
        subject: q.subject || paper.subject || 'General Studies',
        topic: q.topic || null,
        subtopic: q.chapter || null,
        syllabus_node_ids: [],
        previous_years: q.previousYears || null,
        tags: [paper.subject, String(paper.year || '')].filter(Boolean),
        content_markdown: q.text || '',
        options: JSON.stringify(q.options || {}),
        matching_items: q.matchingItems ? JSON.stringify(q.matchingItems) : null,
        correct_answer: correctAns,
        explanation_markdown: expl,
        marks: paper.correct_marks || (isSubjective ? 10.0 : 2.0),
        negative_marks: paper.incorrect_marks || (isSubjective ? 0 : 0.667),
        word_limit: isSubjective ? 150 : null,
        created_at: paper.created_at || new Date().toISOString(),
      });
    }
  }

  console.log('\n--- Breakdown Analysis ---');
  console.log(`Total questions detected: ${totalQuestionsCount}`);
  console.log(`  • MCQs:       ${mcqCount}`);
  console.log(`  • Subjective: ${subjectiveCount}`);
  console.log(`  • Cloze:      ${clozeCount}`);
  console.log(`  • Matching:   ${matchingCount}`);

  if (!isApply) {
    console.log('\nℹ️  DRY RUN complete. Run with --apply to commit these questions to question_bank table.');
    await client.end();
    return;
  }

  console.log(`\nInserting ${questionRows.length} questions into public.question_bank in batches...`);
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < questionRows.length; i += batchSize) {
    const batch = questionRows.slice(i, i + batchSize);
    
    // Construct multi-row UPSERT
    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    for (const r of batch) {
      placeholders.push(`(
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}
      )`);

      values.push(
        r.id,
        r.user_id,
        r.source_paper_id,
        r.source_paper_title,
        r.source_paper_year,
        r.question_no,
        r.exam_stage,
        r.question_type,
        r.subject,
        r.topic,
        r.subtopic,
        r.syllabus_node_ids,
        r.previous_years,
        r.tags,
        r.content_markdown,
        r.options,
        r.matching_items,
        r.correct_answer,
        r.explanation_markdown,
        r.marks,
        r.negative_marks,
        r.word_limit,
        r.created_at
      );
    }

    const query = `
      INSERT INTO public.question_bank (
        id, user_id, source_paper_id, source_paper_title, source_paper_year,
        question_no, exam_stage, question_type, subject, topic,
        subtopic, syllabus_node_ids, previous_years, tags, content_markdown,
        options, matching_items, correct_answer, explanation_markdown, marks,
        negative_marks, word_limit, created_at
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (id) DO UPDATE SET
        content_markdown = EXCLUDED.content_markdown,
        options = EXCLUDED.options,
        correct_answer = EXCLUDED.correct_answer,
        explanation_markdown = EXCLUDED.explanation_markdown,
        updated_at = NOW();
    `;

    await client.query(query, values);
    inserted += batch.length;
    process.stdout.write(`  ✓ Migrated ${inserted}/${questionRows.length} questions...\r`);
  }

  console.log(`\n\n🎉 Successfully migrated ${inserted} questions into question_bank!`);
  await client.end();
}

run().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
