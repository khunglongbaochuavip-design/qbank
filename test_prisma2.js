const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  try {
    const res = await prisma.subject.create({
      data: { code: 'TEST_004', name: 'Môn Test 4' }
    });
    console.log('SUCCESS:', res);
  } catch (e) {
    console.error('DB ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
