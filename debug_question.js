const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Find the specific question
  const q = await prisma.question.findFirst({
    where: { questionCode: 'QMSR6324COPO' },
    include: { difficultyLevel: true, cognitiveLevel: true, domain: true, topic: true, subject: true }
  });
  console.log('\n=== QUESTION QMSR6324COPO ===');
  if (!q) { console.log('NOT FOUND!'); return; }
  console.log('status:', q.status);
  console.log('estimatedDifficulty:', q.estimatedDifficulty);
  console.log('difficultyLevelId:', q.difficultyLevelId, '| name:', q.difficultyLevel?.name, '| minVal:', q.difficultyLevel?.minVal, '| maxVal:', q.difficultyLevel?.maxVal);
  console.log('cognitiveLevelId:', q.cognitiveLevelId, '| name:', q.cognitiveLevel?.name);
  console.log('domainId:', q.domainId, '| name:', q.domain?.name);
  console.log('topicId:', q.topicId, '| name:', q.topic?.name);

  // 2. Find matrix first item
  const matrix = await prisma.examMatrix.findFirst({
    where: { name: { contains: 'LÝ 11' } },
    include: { items: { include: { domain: true, topic: true, cognitiveLevel: true, difficultyLevel: true }, take: 5 } }
  });
  console.log('\n=== MATRIX ITEMS (first 5) ===');
  if (!matrix) { console.log('Matrix not found!'); } else {
    console.log('Matrix name:', matrix.name);
    matrix.items.forEach((item, i) => {
      console.log(`\nItem ${i+1}: need ${item.requiredCount} questions`);
      console.log('  domain:', item.domainId || 'ANY', '|', item.domain?.name || '—');
      console.log('  topic:', item.topicId || 'ANY', '|', item.topic?.name || '—');
      console.log('  cogLevel:', item.cognitiveLevelId || 'ANY', '|', item.cognitiveLevel?.name || '—');
      console.log('  diffLevel:', item.difficultyLevelId || 'ANY', '|', item.difficultyLevel?.name || '—', `| minVal:${item.difficultyLevel?.minVal} maxVal:${item.difficultyLevel?.maxVal}`);
    });
  }

  // 3. Check total approved questions
  const total = await prisma.question.count({ where: { status: 'approved' } });
  console.log('\n=== TOTAL APPROVED QUESTIONS ===', total);

  // 4. All difficulty levels
  const dls = await prisma.difficultyLevel.findMany({ orderBy: { minVal: 'asc' } });
  console.log('\n=== ALL DIFFICULTY LEVELS ===');
  dls.forEach(dl => console.log(`  ${dl.code} | ${dl.name} | min:${dl.minVal} max:${dl.maxVal}`));
}

main().catch(console.error).finally(() => { prisma.$disconnect(); pool.end(); });
