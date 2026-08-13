import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Bắt đầu seed dữ liệu...');

  // 1. Roles & Default Users
  console.log('Tạo người dùng mặc định...');
  const defaultPassword = await bcrypt.hash('password123', 10);

  const users = [
    { email: 'superadmin@qbank.edu.vn', fullName: 'Super Admin', role: 'super_admin' as const },
    { email: 'admin@qbank.edu.vn', fullName: 'Quản trị viên', role: 'admin' as const },
    { email: 'khao.thi@qbank.edu.vn', fullName: 'Phòng Khảo thí', role: 'exam_officer' as const },
    { email: 'giaovien1@qbank.edu.vn', fullName: 'Giáo viên Toán', role: 'teacher' as const },
    { email: 'hocsinh1@qbank.edu.vn', fullName: 'Học sinh Nguyễn Văn A', role: 'student' as const },
    { email: 'hocsinh2@qbank.edu.vn', fullName: 'Học sinh Trần Thị B', role: 'student' as const },
  ];

  const createdUsers = [];
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: defaultPassword },
    });
    createdUsers.push(user);
  }

  const teacher = createdUsers.find(u => u.role === 'teacher')!;
  const admin = createdUsers.find(u => u.role === 'admin')!;

  // 2. Reference Data
  console.log('Tạo dữ liệu danh mục...');
  
  // Khối lớp
  const grade10 = await prisma.gradeLevel.upsert({
    where: { code: 'G10' }, update: {}, create: { code: 'G10', name: 'Lớp 10', sortOrder: 10 }
  });

  // Mức nhận thức
  const cog1 = await prisma.cognitiveLevel.upsert({
    where: { code: 'NB' }, update: {}, create: { code: 'NB', name: 'Nhận biết', sortOrder: 1 }
  });
  const cog2 = await prisma.cognitiveLevel.upsert({
    where: { code: 'TH' }, update: {}, create: { code: 'TH', name: 'Thông hiểu', sortOrder: 2 }
  });
  const cog3 = await prisma.cognitiveLevel.upsert({
    where: { code: 'VD' }, update: {}, create: { code: 'VD', name: 'Vận dụng', sortOrder: 3 }
  });

  // Độ khó
  await prisma.difficultyLevel.upsert({
    where: { code: 'EASY' }, update: {}, create: { code: 'EASY', name: 'Dễ (0.0 - 0.4)', minVal: 0, maxVal: 0.4 }
  });
  const diffMed = await prisma.difficultyLevel.upsert({
    where: { code: 'MEDIUM' }, update: {}, create: { code: 'MEDIUM', name: 'Vừa (0.4 - 0.7)', minVal: 0.4, maxVal: 0.7 }
  });

  // 3. Môn học & Chủ đề
  console.log('Tạo môn học và chủ đề...');
  const subjectToan = await prisma.subject.upsert({
    where: { code: 'MATH' },
    update: {},
    create: { code: 'MATH', name: 'Toán học' }
  });

  await prisma.teacherSubject.upsert({
    where: { userId_subjectId: { userId: teacher.id, subjectId: subjectToan.id } },
    update: {}, create: { userId: teacher.id, subjectId: subjectToan.id }
  });

  const domainDaiSo = await prisma.domain.upsert({
    where: { code: 'MATH_DS' }, update: {}, create: { code: 'MATH_DS', name: 'Đại số', subjectId: subjectToan.id }
  });

  const topicHamSo = await prisma.topic.upsert({
    where: { code: 'MATH_DS_HS' }, update: {}, create: { code: 'MATH_DS_HS', name: 'Hàm số', domainId: domainDaiSo.id }
  });

  // 4. Ngân hàng câu hỏi
  console.log('Tạo ngân hàng câu hỏi...');
  const q1 = await prisma.question.upsert({
    where: { questionCode: 'MATH10_001' },
    update: {},
    create: {
      questionCode: 'MATH10_001',
      subjectId: subjectToan.id,
      domainId: domainDaiSo.id,
      topicId: topicHamSo.id,
      gradeLevelId: grade10.id,
      cognitiveLevelId: cog1.id,
      questionText: 'Tập xác định của hàm số y = (x-1)/(x-2) là:',
      optionA: 'R \\ {2}',
      optionB: 'R \\ {1}',
      optionC: '(2; +∞)',
      optionD: 'R',
      correctOption: 'A',
      explanation: 'Mẫu số x-2 khác 0 => x khác 2',
      createdById: teacher.id,
      status: 'approved',
      reviewerId: admin.id,
      approvedAt: new Date(),
    }
  });

  const q2 = await prisma.question.upsert({
    where: { questionCode: 'MATH10_002' },
    update: {},
    create: {
      questionCode: 'MATH10_002',
      subjectId: subjectToan.id,
      domainId: domainDaiSo.id,
      topicId: topicHamSo.id,
      gradeLevelId: grade10.id,
      cognitiveLevelId: cog2.id,
      questionText: 'Hàm số y = -2x + 3 đồng biến hay nghịch biến trên R?',
      optionA: 'Đồng biến',
      optionB: 'Nghịch biến',
      optionC: 'Không đổi',
      optionD: 'Không xác định',
      correctOption: 'B',
      explanation: 'Hệ số a = -2 < 0 nên hàm số nghịch biến trên R',
      createdById: teacher.id,
      status: 'approved',
      reviewerId: admin.id,
      approvedAt: new Date(),
    }
  });

  const q3 = await prisma.question.upsert({
    where: { questionCode: 'MATH10_003' },
    update: {},
    create: {
      questionCode: 'MATH10_003',
      subjectId: subjectToan.id,
      domainId: domainDaiSo.id,
      topicId: topicHamSo.id,
      gradeLevelId: grade10.id,
      cognitiveLevelId: cog3.id,
      estimatedDifficulty: 0.6,
      questionText: 'Đồ thị hàm số y = ax + b đi qua điểm A(1; 2) và B(2; 5). Giá trị của a và b là:',
      optionA: 'a=3, b=-1',
      optionB: 'a=2, b=0',
      optionC: 'a=3, b=1',
      optionD: 'a=-3, b=5',
      correctOption: 'A',
      explanation: 'Giải hệ: a+b=2 và 2a+b=5 => a=3, b=-1',
      createdById: teacher.id,
      status: 'approved',
      reviewerId: admin.id,
      approvedAt: new Date(),
    }
  });

  // 5. Cài đặt hệ thống
  console.log('Cài đặt hệ thống...');
  await prisma.systemSetting.upsert({
    where: { key: 'app_name' }, update: {}, create: { key: 'app_name', value: 'QBank Vercel Edition' }
  });
  await prisma.systemSetting.upsert({
    where: { key: 'school_name' }, update: {}, create: { key: 'school_name', value: 'Trường THPT Chuyên DEMO' }
  });

  // 6. Ma trận & Đề thi mẫu
  console.log('Tạo đề thi mẫu...');
  const matrix = await prisma.examMatrix.create({
    data: {
      name: 'Kiểm tra 15p - Hàm số',
      subjectId: subjectToan.id,
      createdById: admin.id,
      items: {
        create: [
          { domainId: domainDaiSo.id, cognitiveLevelId: cog1.id, requiredCount: 1 },
          { domainId: domainDaiSo.id, cognitiveLevelId: cog2.id, requiredCount: 1 },
          { domainId: domainDaiSo.id, cognitiveLevelId: cog3.id, requiredCount: 1 },
        ]
      }
    }
  });

  const exam = await prisma.exam.create({
    data: {
      name: 'Đề kiểm tra 15p - Toán 10 (Demo)',
      code: 'EXAM_DEMO_01',
      matrixId: matrix.id,
      createdById: admin.id,
      status: 'finalized',
      finalizedAt: new Date(),
      examQuestions: {
        create: [
          { questionId: q1.id, displayOrder: 1 },
          { questionId: q2.id, displayOrder: 2 },
          { questionId: q3.id, displayOrder: 3 },
        ]
      }
    }
  });

  console.log('Seed hoàn tất! ✔️');
  console.log('Dùng admin@qbank.edu.vn / password123 để đăng nhập.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
