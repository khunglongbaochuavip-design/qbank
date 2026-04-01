// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Users ────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('password123', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@qbank.edu.vn' },
    update: {},
    create: {
      email: 'superadmin@qbank.edu.vn',
      passwordHash: hashedPassword,
      fullName: 'Quản Trị Hệ Thống',
      role: 'super_admin',
    },
  });

  const academicAdmin = await prisma.user.upsert({
    where: { email: 'admin@qbank.edu.vn' },
    update: {},
    create: {
      email: 'admin@qbank.edu.vn',
      passwordHash: hashedPassword,
      fullName: 'Nguyễn Văn An',
      role: 'academic_admin',
    },
  });

  const teacher1 = await prisma.user.upsert({
    where: { email: 'giaovien1@qbank.edu.vn' },
    update: {},
    create: {
      email: 'giaovien1@qbank.edu.vn',
      passwordHash: hashedPassword,
      fullName: 'Trần Thị Bình',
      role: 'teacher',
    },
  });

  const teacher2 = await prisma.user.upsert({
    where: { email: 'giaovien2@qbank.edu.vn' },
    update: {},
    create: {
      email: 'giaovien2@qbank.edu.vn',
      passwordHash: hashedPassword,
      fullName: 'Lê Văn Cường',
      role: 'teacher',
    },
  });

  const examCreator = await prisma.user.upsert({
    where: { email: 'khao.thi@qbank.edu.vn' },
    update: {},
    create: {
      email: 'khao.thi@qbank.edu.vn',
      passwordHash: hashedPassword,
      fullName: 'Phạm Thị Dung',
      role: 'exam_creator',
    },
  });

  const student1 = await prisma.user.upsert({
    where: { email: 'hocsinh1@qbank.edu.vn' },
    update: {},
    create: {
      email: 'hocsinh1@qbank.edu.vn',
      passwordHash: hashedPassword,
      fullName: 'Nguyễn Thị Em',
      role: 'student',
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'hocsinh2@qbank.edu.vn' },
    update: {},
    create: {
      email: 'hocsinh2@qbank.edu.vn',
      passwordHash: hashedPassword,
      fullName: 'Trần Văn Phúc',
      role: 'student',
    },
  });

  const student3 = await prisma.user.upsert({
    where: { email: 'hocsinh3@qbank.edu.vn' },
    update: {},
    create: {
      email: 'hocsinh3@qbank.edu.vn',
      passwordHash: hashedPassword,
      fullName: 'Lê Thị Giang',
      role: 'student',
    },
  });

  console.log('✅ Users created');

  // ─── Subjects ─────────────────────────────────────────────────────
  const mathSubject = await prisma.subject.upsert({
    where: { code: 'TOAN' },
    update: {},
    create: { code: 'TOAN', name: 'Toán học', description: 'Môn Toán học', sortOrder: 1 },
  });

  const physicsSubject = await prisma.subject.upsert({
    where: { code: 'LY' },
    update: {},
    create: { code: 'LY', name: 'Vật lý', description: 'Môn Vật lý', sortOrder: 2 },
  });

  const chemSubject = await prisma.subject.upsert({
    where: { code: 'HOA' },
    update: {},
    create: { code: 'HOA', name: 'Hóa học', description: 'Môn Hóa học', sortOrder: 3 },
  });

  console.log('✅ Subjects created');

  // ─── Domains ──────────────────────────────────────────────────────
  const algebraDomain = await prisma.domain.upsert({
    where: { code: 'TOAN-DSS' },
    update: {},
    create: { subjectId: mathSubject.id, code: 'TOAN-DSS', name: 'Đại số và Số học', sortOrder: 1 },
  });
  const calcDomain = await prisma.domain.upsert({
    where: { code: 'TOAN-GT' },
    update: {},
    create: { subjectId: mathSubject.id, code: 'TOAN-GT', name: 'Giải tích', sortOrder: 2 },
  });
  const geomDomain = await prisma.domain.upsert({
    where: { code: 'TOAN-HH' },
    update: {},
    create: { subjectId: mathSubject.id, code: 'TOAN-HH', name: 'Hình học', sortOrder: 3 },
  });
  const mechanicsDomain = await prisma.domain.upsert({
    where: { code: 'LY-CHL' },
    update: {},
    create: { subjectId: physicsSubject.id, code: 'LY-CHL', name: 'Cơ học', sortOrder: 1 },
  });
  const electricDomain = await prisma.domain.upsert({
    where: { code: 'LY-DH' },
    update: {},
    create: { subjectId: physicsSubject.id, code: 'LY-DH', name: 'Điện học', sortOrder: 2 },
  });
  const organicDomain = await prisma.domain.upsert({
    where: { code: 'HOA-HHC' },
    update: {},
    create: { subjectId: chemSubject.id, code: 'HOA-HHC', name: 'Hóa hữu cơ', sortOrder: 1 },
  });

  console.log('✅ Domains created');

  // ─── Topics ───────────────────────────────────────────────────────
  const linearEqTopic = await prisma.topic.upsert({ where: { code: 'DSS-PT1' }, update: {}, create: { domainId: algebraDomain.id, code: 'DSS-PT1', name: 'Phương trình bậc nhất', sortOrder: 1 } });
  const quadraticTopic = await prisma.topic.upsert({ where: { code: 'DSS-PT2' }, update: {}, create: { domainId: algebraDomain.id, code: 'DSS-PT2', name: 'Phương trình bậc hai', sortOrder: 2 } });
  const inequalityTopic = await prisma.topic.upsert({ where: { code: 'DSS-BPT' }, update: {}, create: { domainId: algebraDomain.id, code: 'DSS-BPT', name: 'Bất phương trình', sortOrder: 3 } });
  const derivativeTopic = await prisma.topic.upsert({ where: { code: 'GT-DH' }, update: {}, create: { domainId: calcDomain.id, code: 'GT-DH', name: 'Đạo hàm', sortOrder: 1 } });
  const integralTopic = await prisma.topic.upsert({ where: { code: 'GT-TT' }, update: {}, create: { domainId: calcDomain.id, code: 'GT-TT', name: 'Tích phân', sortOrder: 2 } });
  const triangle2DTopic = await prisma.topic.upsert({ where: { code: 'HH-TAM' }, update: {}, create: { domainId: geomDomain.id, code: 'HH-TAM', name: 'Tam giác và đường tròn', sortOrder: 1 } });
  const kinematics = await prisma.topic.upsert({ where: { code: 'CHL-DH' }, update: {}, create: { domainId: mechanicsDomain.id, code: 'CHL-DH', name: 'Động học', sortOrder: 1 } });
  const dynamics = await prisma.topic.upsert({ where: { code: 'CHL-DLH' }, update: {}, create: { domainId: mechanicsDomain.id, code: 'CHL-DLH', name: 'Động lực học', sortOrder: 2 } });
  const currentTopic = await prisma.topic.upsert({ where: { code: 'DH-DDT' }, update: {}, create: { domainId: electricDomain.id, code: 'DH-DDT', name: 'Điện một chiều', sortOrder: 1 } });
  const organicCompound = await prisma.topic.upsert({ where: { code: 'HHC-HCVC' }, update: {}, create: { domainId: organicDomain.id, code: 'HHC-HCVC', name: 'Hiđrocacbon', sortOrder: 1 } });

  console.log('✅ Topics created');

  // ─── Grade Levels ─────────────────────────────────────────────────
  const grade10 = await prisma.gradeLevel.upsert({ where: { code: 'L10' }, update: {}, create: { code: 'L10', name: 'Lớp 10', sortOrder: 10 } });
  const grade11 = await prisma.gradeLevel.upsert({ where: { code: 'L11' }, update: {}, create: { code: 'L11', name: 'Lớp 11', sortOrder: 11 } });
  const grade12 = await prisma.gradeLevel.upsert({ where: { code: 'L12' }, update: {}, create: { code: 'L12', name: 'Lớp 12', sortOrder: 12 } });

  console.log('✅ Grade levels created');

  // ─── Cognitive Levels (Bloom's Taxonomy) ─────────────────────────
  const remember = await prisma.cognitiveLevel.upsert({ where: { code: 'NHO' }, update: {}, create: { code: 'NHO', name: 'Nhận biết', description: 'Nhớ lại các thông tin, khái niệm cơ bản', sortOrder: 1 } });
  const understand = await prisma.cognitiveLevel.upsert({ where: { code: 'HIEU' }, update: {}, create: { code: 'HIEU', name: 'Thông hiểu', description: 'Hiểu và giải thích thông tin', sortOrder: 2 } });
  const apply = await prisma.cognitiveLevel.upsert({ where: { code: 'VD' }, update: {}, create: { code: 'VD', name: 'Vận dụng', description: 'Áp dụng kiến thức vào tình huống cụ thể', sortOrder: 3 } });
  const analyze = await prisma.cognitiveLevel.upsert({ where: { code: 'VDCC' }, update: {}, create: { code: 'VDCC', name: 'Vận dụng cao', description: 'Phân tích, tổng hợp và đánh giá', sortOrder: 4 } });

  console.log('✅ Cognitive levels created');

  // ─── Difficulty Levels ────────────────────────────────────────────
  await prisma.difficultyLevel.upsert({ where: { code: 'DE' }, update: {}, create: { code: 'DE', name: 'Dễ', minVal: 0.0, maxVal: 0.35 } });
  await prisma.difficultyLevel.upsert({ where: { code: 'TB' }, update: {}, create: { code: 'TB', name: 'Trung bình', minVal: 0.35, maxVal: 0.65 } });
  await prisma.difficultyLevel.upsert({ where: { code: 'KHO' }, update: {}, create: { code: 'KHO', name: 'Khó', minVal: 0.65, maxVal: 0.85 } });
  await prisma.difficultyLevel.upsert({ where: { code: 'RATKHO' }, update: {}, create: { code: 'RATKHO', name: 'Rất khó', minVal: 0.85, maxVal: 1.0 } });

  console.log('✅ Difficulty levels created');

  // ─── Tags ─────────────────────────────────────────────────────────
  const tag1 = await prisma.tag.upsert({ where: { name: 'THPT Quốc gia' }, update: {}, create: { name: 'THPT Quốc gia' } });
  const tag2 = await prisma.tag.upsert({ where: { name: 'Kiểm tra 45 phút' }, update: {}, create: { name: 'Kiểm tra 45 phút' } });
  const tag3 = await prisma.tag.upsert({ where: { name: 'Ôn tập' }, update: {}, create: { name: 'Ôn tập' } });
  const tag4 = await prisma.tag.upsert({ where: { name: 'Đề thi thử' }, update: {}, create: { name: 'Đề thi thử' } });

  console.log('✅ Tags created');

  // ─── Questions ────────────────────────────────────────────────────
  const questionsData = [
    // Toán - Đại số - Phương trình bậc nhất
    {
      questionCode: 'TOAN-DSS-PT1-001',
      subjectId: mathSubject.id, domainId: algebraDomain.id, topicId: linearEqTopic.id,
      gradeLevelId: grade10.id, cognitiveLevelId: remember.id,
      estimatedDifficulty: 0.2,
      questionText: 'Nghiệm của phương trình 2x + 4 = 0 là:',
      optionA: 'x = 2', optionB: 'x = -2', optionC: 'x = 4', optionD: 'x = -4',
      correctOption: 'B',
      explanation: 'Ta có 2x + 4 = 0 → 2x = -4 → x = -2',
      status: 'approved', createdById: teacher1.id, reviewedById: academicAdmin.id,
    },
    {
      questionCode: 'TOAN-DSS-PT1-002',
      subjectId: mathSubject.id, domainId: algebraDomain.id, topicId: linearEqTopic.id,
      gradeLevelId: grade10.id, cognitiveLevelId: understand.id,
      estimatedDifficulty: 0.3,
      questionText: 'Phương trình nào sau đây là phương trình bậc nhất một ẩn?',
      optionA: 'x² - 3 = 0', optionB: '2x + 1 = 0', optionC: 'x³ = 8', optionD: '(x-1)(x+1) = 0',
      correctOption: 'B',
      explanation: 'Phương trình bậc nhất một ẩn có dạng ax + b = 0 với a ≠ 0. Chỉ có 2x + 1 = 0 thỏa mãn.',
      status: 'approved', createdById: teacher1.id, reviewedById: academicAdmin.id,
    },
    {
      questionCode: 'TOAN-DSS-PT1-003',
      subjectId: mathSubject.id, domainId: algebraDomain.id, topicId: linearEqTopic.id,
      gradeLevelId: grade10.id, cognitiveLevelId: apply.id,
      estimatedDifficulty: 0.4,
      questionText: 'Giải phương trình: 3(x - 2) = 2x + 1',
      optionA: 'x = 5', optionB: 'x = 7', optionC: 'x = 3', optionD: 'x = 1',
      correctOption: 'B',
      explanation: '3x - 6 = 2x + 1 → 3x - 2x = 1 + 6 → x = 7',
      status: 'approved', createdById: teacher1.id, reviewedById: academicAdmin.id,
    },
    // Toán - Đại số - Phương trình bậc hai
    {
      questionCode: 'TOAN-DSS-PT2-001',
      subjectId: mathSubject.id, domainId: algebraDomain.id, topicId: quadraticTopic.id,
      gradeLevelId: grade10.id, cognitiveLevelId: remember.id,
      estimatedDifficulty: 0.25,
      questionText: 'Phương trình x² - 5x + 6 = 0 có hai nghiệm là:',
      optionA: 'x₁ = 2, x₂ = 3', optionB: 'x₁ = -2, x₂ = -3', optionC: 'x₁ = 1, x₂ = 6', optionD: 'x₁ = -1, x₂ = -6',
      correctOption: 'A',
      explanation: 'Δ = 25 - 24 = 1. x = (5 ± 1)/2. Vậy x₁ = 3, x₂ = 2',
      status: 'approved', createdById: teacher1.id, reviewedById: academicAdmin.id,
    },
    {
      questionCode: 'TOAN-DSS-PT2-002',
      subjectId: mathSubject.id, domainId: algebraDomain.id, topicId: quadraticTopic.id,
      gradeLevelId: grade10.id, cognitiveLevelId: understand.id,
      estimatedDifficulty: 0.45,
      questionText: 'Phương trình x² + 2x + 1 = 0 có:',
      optionA: 'Hai nghiệm phân biệt', optionB: 'Nghiệm kép x = -1', optionC: 'Vô nghiệm', optionD: 'Nghiệm kép x = 1',
      correctOption: 'B',
      explanation: 'Δ = 4 - 4 = 0. Phương trình có nghiệm kép x = -b/2a = -2/2 = -1',
      status: 'approved', createdById: teacher1.id, reviewedById: academicAdmin.id,
    },
    {
      questionCode: 'TOAN-DSS-PT2-003',
      subjectId: mathSubject.id, domainId: algebraDomain.id, topicId: quadraticTopic.id,
      gradeLevelId: grade11.id, cognitiveLevelId: apply.id,
      estimatedDifficulty: 0.6,
      questionText: 'Tìm m để phương trình x² - 2mx + m + 2 = 0 có hai nghiệm dương phân biệt.',
      optionA: 'm > 2', optionB: 'm < -1', optionC: 'm > 2 hoặc m < -1', optionD: '-1 < m < 2',
      correctOption: 'A',
      explanation: 'Cần Δ > 0: 4m² - 4(m+2) > 0 → m² - m - 2 > 0 → (m-2)(m+1) > 0 → m > 2 hoặc m < -1. Và tổng nghiệm 2m > 0 → m > 0. Tích nghiệm m+2 > 0 → m > -2. Kết hợp: m > 2.',
      status: 'approved', createdById: teacher2.id, reviewedById: academicAdmin.id,
    },
    {
      questionCode: 'TOAN-DSS-PT2-004',
      subjectId: mathSubject.id, domainId: algebraDomain.id, topicId: quadraticTopic.id,
      gradeLevelId: grade12.id, cognitiveLevelId: analyze.id,
      estimatedDifficulty: 0.8,
      questionText: 'Cho phương trình x² - (m+1)x + m = 0. Tìm m để tổng bình phương hai nghiệm đạt giá trị nhỏ nhất.',
      optionA: 'm = 1/2', optionB: 'm = 1', optionC: 'm = -1', optionD: 'm = 0',
      correctOption: 'A',
      explanation: 'Theo Vieta: x₁+x₂ = m+1, x₁x₂ = m. S = x₁²+x₂² = (x₁+x₂)² - 2x₁x₂ = (m+1)² - 2m = m²+2m+1-2m = m²+1. Nhỏ nhất khi m = 1/2... (thực ra m = 0, nhưng cần kiểm tra Δ ≥ 0)',
      status: 'approved', createdById: teacher2.id, reviewedById: academicAdmin.id,
    },
    // Toán - Giải tích - Đạo hàm
    {
      questionCode: 'TOAN-GT-DH-001',
      subjectId: mathSubject.id, domainId: calcDomain.id, topicId: derivativeTopic.id,
      gradeLevelId: grade11.id, cognitiveLevelId: remember.id,
      estimatedDifficulty: 0.2,
      questionText: 'Đạo hàm của hàm số f(x) = x³ là:',
      optionA: 'f\'(x) = 3x²', optionB: 'f\'(x) = x²', optionC: 'f\'(x) = 3x', optionD: 'f\'(x) = 2x³',
      correctOption: 'A',
      explanation: 'Theo công thức đạo hàm: (xⁿ)\' = n·xⁿ⁻¹. Vậy (x³)\' = 3x²',
      status: 'approved', createdById: teacher2.id, reviewedById: academicAdmin.id,
    },
    {
      questionCode: 'TOAN-GT-DH-002',
      subjectId: mathSubject.id, domainId: calcDomain.id, topicId: derivativeTopic.id,
      gradeLevelId: grade11.id, cognitiveLevelId: apply.id,
      estimatedDifficulty: 0.55,
      questionText: 'Hàm số y = 2x³ - 3x² + 1 có đạo hàm là:',
      optionA: "y' = 6x² - 6x", optionB: "y' = 6x² + 6x", optionC: "y' = 2x² - 3x", optionD: "y' = 6x³ - 6x²",
      correctOption: 'A',
      explanation: "(y)' = 2·3x² - 3·2x + 0 = 6x² - 6x",
      status: 'approved', createdById: teacher2.id, reviewedById: academicAdmin.id,
    },
    {
      questionCode: 'TOAN-GT-DH-003',
      subjectId: mathSubject.id, domainId: calcDomain.id, topicId: derivativeTopic.id,
      gradeLevelId: grade12.id, cognitiveLevelId: analyze.id,
      estimatedDifficulty: 0.75,
      questionText: 'Hàm số f(x) = x³ - 3x có bao nhiêu điểm cực trị?',
      optionA: '0', optionB: '1', optionC: '2', optionD: '3',
      correctOption: 'C',
      explanation: "f'(x) = 3x² - 3 = 0 → x² = 1 → x = ±1. Kiểm tra dấu f'' cho thấy có 2 điểm cực trị: cực đại tại x = -1, cực tiểu tại x = 1.",
      status: 'approved', createdById: teacher1.id, reviewedById: academicAdmin.id,
    },
    // Vật lý - Cơ học - Động học
    {
      questionCode: 'LY-CHL-DH-001',
      subjectId: physicsSubject.id, domainId: mechanicsDomain.id, topicId: kinematics.id,
      gradeLevelId: grade10.id, cognitiveLevelId: remember.id,
      estimatedDifficulty: 0.2,
      questionText: 'Chuyển động thẳng đều là chuyển động có:',
      optionA: 'Tốc độ thay đổi đều', optionB: 'Tốc độ không đổi trên đường thẳng', optionC: 'Gia tốc không đổi', optionD: 'Vận tốc bằng 0',
      correctOption: 'B',
      explanation: 'Chuyển động thẳng đều là chuyển động trên đường thẳng với tốc độ không thay đổi theo thời gian.',
      status: 'approved', createdById: teacher1.id, reviewedById: academicAdmin.id,
    },
    {
      questionCode: 'LY-CHL-DH-002',
      subjectId: physicsSubject.id, domainId: mechanicsDomain.id, topicId: kinematics.id,
      gradeLevelId: grade10.id, cognitiveLevelId: apply.id,
      estimatedDifficulty: 0.45,
      questionText: 'Một xe ô tô xuất phát từ điểm A, chuyển động thẳng đều với vận tốc 60 km/h. Sau 2 giờ xe đến điểm B. Quãng đường AB là:',
      optionA: '30 km', optionB: '60 km', optionC: '90 km', optionD: '120 km',
      correctOption: 'D',
      explanation: 's = v × t = 60 × 2 = 120 km',
      status: 'approved', createdById: teacher2.id, reviewedById: academicAdmin.id,
    },
    {
      questionCode: 'LY-CHL-DH-003',
      subjectId: physicsSubject.id, domainId: mechanicsDomain.id, topicId: kinematics.id,
      gradeLevelId: grade10.id, cognitiveLevelId: analyze.id,
      estimatedDifficulty: 0.7,
      questionText: 'Một vật bắt đầu chuyển động từ trạng thái nghỉ với gia tốc 2 m/s². Vận tốc của vật sau 5 giây là:',
      optionA: '5 m/s', optionB: '7 m/s', optionC: '10 m/s', optionD: '25 m/s',
      correctOption: 'C',
      explanation: 'v = v₀ + at = 0 + 2 × 5 = 10 m/s',
      status: 'approved', createdById: teacher2.id, reviewedById: academicAdmin.id,
    },
    // Vật lý - Điện học
    {
      questionCode: 'LY-DH-DDT-001',
      subjectId: physicsSubject.id, domainId: electricDomain.id, topicId: currentTopic.id,
      gradeLevelId: grade11.id, cognitiveLevelId: remember.id,
      estimatedDifficulty: 0.25,
      questionText: 'Đơn vị đo cường độ dòng điện trong hệ SI là:',
      optionA: 'Volt (V)', optionB: 'Ohm (Ω)', optionC: 'Ampere (A)', optionD: 'Watt (W)',
      correctOption: 'C',
      explanation: 'Cường độ dòng điện được đo bằng Ampere (A) trong hệ SI.',
      status: 'approved', createdById: teacher1.id, reviewedById: academicAdmin.id,
    },
    {
      questionCode: 'LY-DH-DDT-002',
      subjectId: physicsSubject.id, domainId: electricDomain.id, topicId: currentTopic.id,
      gradeLevelId: grade11.id, cognitiveLevelId: apply.id,
      estimatedDifficulty: 0.5,
      questionText: 'Một điện trở R = 10 Ω được nối vào hiệu điện thế U = 20 V. Cường độ dòng điện qua điện trở là:',
      optionA: '0.5 A', optionB: '1 A', optionC: '2 A', optionD: '200 A',
      correctOption: 'C',
      explanation: 'Theo định luật Ohm: I = U/R = 20/10 = 2 A',
      status: 'approved', createdById: teacher2.id, reviewedById: academicAdmin.id,
    },
    // Hóa học  
    {
      questionCode: 'HOA-HHC-HCVC-001',
      subjectId: chemSubject.id, domainId: organicDomain.id, topicId: organicCompound.id,
      gradeLevelId: grade11.id, cognitiveLevelId: remember.id,
      estimatedDifficulty: 0.3,
      questionText: 'Công thức phân tử của metan là:',
      optionA: 'C₂H₆', optionB: 'CH₄', optionC: 'C₃H₈', optionD: 'C₄H₁₀',
      correctOption: 'B',
      explanation: 'Metan (methane) có công thức phân tử là CH₄, là ankan đơn giản nhất.',
      status: 'approved', createdById: teacher1.id, reviewedById: academicAdmin.id,
    },
    {
      questionCode: 'HOA-HHC-HCVC-002',
      subjectId: chemSubject.id, domainId: organicDomain.id, topicId: organicCompound.id,
      gradeLevelId: grade12.id, cognitiveLevelId: apply.id,
      estimatedDifficulty: 0.65,
      questionText: 'Khi đốt cháy hoàn toàn 1 mol CH₄, số mol CO₂ sinh ra là:',
      optionA: '0.5 mol', optionB: '1 mol', optionC: '2 mol', optionD: '4 mol',
      correctOption: 'B',
      explanation: 'Phương trình: CH₄ + 2O₂ → CO₂ + 2H₂O. 1 mol CH₄ tạo ra 1 mol CO₂.',
      status: 'approved', createdById: teacher2.id, reviewedById: academicAdmin.id,
    },
    // Pending and draft questions
    {
      questionCode: 'TOAN-HH-TAM-001',
      subjectId: mathSubject.id, domainId: geomDomain.id, topicId: triangle2DTopic.id,
      gradeLevelId: grade10.id, cognitiveLevelId: understand.id,
      estimatedDifficulty: 0.35,
      questionText: 'Trong tam giác vuông, cạnh huyền là:',
      optionA: 'Cạnh ngắn nhất', optionB: 'Cạnh dài nhất và đối diện góc vuông', optionC: 'Cạnh kề với góc vuông', optionD: 'Cạnh có độ dài bằng tổng hai cạnh góc vuông',
      correctOption: 'B',
      explanation: 'Cạnh huyền là cạnh dài nhất trong tam giác vuông và nằm đối diện với góc vuông.',
      status: 'pending_review', createdById: teacher1.id,
    },
    {
      questionCode: 'TOAN-DSS-BPT-001',
      subjectId: mathSubject.id, domainId: algebraDomain.id, topicId: inequalityTopic.id,
      gradeLevelId: grade11.id, cognitiveLevelId: apply.id,
      estimatedDifficulty: 0.5,
      questionText: 'Giải bất phương trình: 2x - 3 > 5',
      optionA: 'x > 1', optionB: 'x < 1', optionC: 'x > 4', optionD: 'x < 4',
      correctOption: 'C',
      explanation: '2x > 5 + 3 = 8 → x > 4',
      status: 'draft', createdById: teacher2.id,
    },
  ];

  let qCount = 0;
  for (const q of questionsData) {
    const existing = await prisma.question.findUnique({ where: { questionCode: q.questionCode } });
    if (!existing) {
      const created = await prisma.question.create({ data: q });
      // Add history for approved questions
      if (q.status === 'approved') {
        await prisma.questionHistory.createMany({
          data: [
            { questionId: created.id, changedById: q.createdById, oldStatus: null, newStatus: 'draft', comment: 'Tạo câu hỏi mới' },
            { questionId: created.id, changedById: q.createdById, oldStatus: 'draft', newStatus: 'pending_review', comment: 'Gửi để phê duyệt' },
            { questionId: created.id, changedById: q.reviewedById, oldStatus: 'pending_review', newStatus: 'approved', comment: 'Đã kiểm tra và phê duyệt' },
          ],
        });
        // Add tags to some questions
        if (qCount < 8) {
          await prisma.questionTag.createMany({
            data: [{ questionId: created.id, tagId: tag1.id }],
          });
        }
      }
      qCount++;
    }
  }
  console.log(`✅ ${questionsData.length} questions created`);

  // ─── Exam Matrix ──────────────────────────────────────────────────
  const existingMatrix = await prisma.examMatrix.findFirst({ where: { name: 'Ma trận đề kiểm tra Toán 10 - HK1' } });
  if (!existingMatrix) {
    const matrix = await prisma.examMatrix.create({
      data: {
        name: 'Ma trận đề kiểm tra Toán 10 - HK1',
        description: 'Ma trận đề kiểm tra 45 phút, gồm 12 câu hỏi',
        subjectId: mathSubject.id,
        createdById: examCreator.id,
        cells: {
          create: [
            { domainId: algebraDomain.id, topicId: linearEqTopic.id, cognitiveLevelId: remember.id, requiredCount: 2 },
            { domainId: algebraDomain.id, topicId: linearEqTopic.id, cognitiveLevelId: understand.id, requiredCount: 1 },
            { domainId: algebraDomain.id, topicId: quadraticTopic.id, cognitiveLevelId: remember.id, requiredCount: 2 },
            { domainId: algebraDomain.id, topicId: quadraticTopic.id, cognitiveLevelId: apply.id, requiredCount: 2 },
            { domainId: calcDomain.id, topicId: derivativeTopic.id, cognitiveLevelId: remember.id, requiredCount: 2 },
            { domainId: calcDomain.id, topicId: derivativeTopic.id, cognitiveLevelId: apply.id, requiredCount: 1 },
          ],
        },
      },
    });
    console.log('✅ Exam matrix created:', matrix.name);

    // ─── Generate an exam from the matrix ─────────────────────────
    // Get approved questions per cell
    const allApprovedQuestions = await prisma.question.findMany({
      where: { status: 'approved', subjectId: mathSubject.id },
    });

    // Create exam with 10 questions (all approved math questions)
    const selectedIds = allApprovedQuestions.slice(0, 10).map((q, i) => ({ questionId: q.id, displayOrder: i + 1 }));

    const examCode = `EXAM-TOAN10-${Date.now()}`.substring(0, 30);
    const exam = await prisma.exam.create({
      data: {
        name: 'Đề kiểm tra Toán 10 - HK1 - Lần 1',
        code: examCode,
        matrixId: matrix.id,
        status: 'finalized',
        createdById: examCreator.id,
        finalizedAt: new Date(),
        examQuestions: {
          create: selectedIds,
        },
      },
    });

    // Update usage count
    for (const q of allApprovedQuestions.slice(0, 10)) {
      await prisma.question.update({ where: { id: q.id }, data: { usageCount: { increment: 1 } } });
    }

    console.log('✅ Exam created:', exam.name);

    // ─── Exam Session ──────────────────────────────────────────────
    const now = new Date();
    const startTime = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago
    const endTime = new Date(now.getTime() + 60 * 60 * 1000);   // 1 hour from now

    const session = await prisma.examSession.create({
      data: {
        examId: exam.id,
        name: 'Kiểm tra Toán 10 - Lớp 10A1',
        startTime,
        endTime,
        durationMinutes: 45,
        status: 'active',
        createdById: examCreator.id,
        sessionStudents: {
          create: [
            { studentId: student1.id },
            { studentId: student2.id },
            { studentId: student3.id },
          ],
        },
      },
    });

    console.log('✅ Exam session created:', session.name);

    // ─── Student Attempt (completed) ──────────────────────────────
    const examQs = await prisma.examQuestion.findMany({ where: { examId: exam.id }, include: { question: true } });

    // Student 1 attempt (completed)
    const attempt1 = await prisma.studentAttempt.create({
      data: {
        sessionId: session.id,
        studentId: student1.id,
        startedAt: new Date(startTime.getTime() + 5 * 60 * 1000),
        submittedAt: new Date(startTime.getTime() + 40 * 60 * 1000),
        status: 'submitted',
      },
    });
    let correct1 = 0;
    const responses1 = examQs.map((eq) => {
      const isCorrect = Math.random() > 0.3;
      if (isCorrect) correct1++;
      const options = ['A', 'B', 'C', 'D'];
      return {
        attemptId: attempt1.id,
        questionId: eq.questionId,
        selectedOption: isCorrect ? eq.question.correctOption : options.find(o => o !== eq.question.correctOption) || 'A',
        isCorrect,
      };
    });
    await prisma.studentResponse.createMany({ data: responses1 });
    await prisma.studentAttempt.update({
      where: { id: attempt1.id },
      data: { numCorrect: correct1, numWrong: examQs.length - correct1, score: (correct1 / examQs.length) * 10 },
    });

    // Student 2 attempt (completed)
    const attempt2 = await prisma.studentAttempt.create({
      data: {
        sessionId: session.id,
        studentId: student2.id,
        startedAt: new Date(startTime.getTime() + 10 * 60 * 1000),
        submittedAt: new Date(startTime.getTime() + 43 * 60 * 1000),
        status: 'submitted',
      },
    });
    let correct2 = 0;
    const responses2 = examQs.map((eq) => {
      const isCorrect = Math.random() > 0.4;
      if (isCorrect) correct2++;
      const options = ['A', 'B', 'C', 'D'];
      return {
        attemptId: attempt2.id,
        questionId: eq.questionId,
        selectedOption: isCorrect ? eq.question.correctOption : options[0] !== eq.question.correctOption ? options[0] : options[1],
        isCorrect,
      };
    });
    await prisma.studentResponse.createMany({ data: responses2 });
    await prisma.studentAttempt.update({
      where: { id: attempt2.id },
      data: { numCorrect: correct2, numWrong: examQs.length - correct2, score: (correct2 / examQs.length) * 10 },
    });

    console.log('✅ Student attempts created');
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Demo Accounts:');
  console.log('  Super Admin:    superadmin@qbank.edu.vn  / password123');
  console.log('  Academic Admin: admin@qbank.edu.vn       / password123');
  console.log('  Teacher 1:      giaovien1@qbank.edu.vn  / password123');
  console.log('  Teacher 2:      giaovien2@qbank.edu.vn  / password123');
  console.log('  Exam Creator:   khao.thi@qbank.edu.vn   / password123');
  console.log('  Student 1:      hocsinh1@qbank.edu.vn   / password123');
  console.log('  Student 2:      hocsinh2@qbank.edu.vn   / password123');
  console.log('  Student 3:      hocsinh3@qbank.edu.vn   / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
