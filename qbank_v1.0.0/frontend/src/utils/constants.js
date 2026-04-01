// src/utils/constants.js

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ACADEMIC_ADMIN: 'academic_admin',
  TEACHER: 'teacher',
  EXAM_CREATOR: 'exam_creator',
  STUDENT: 'student',
};

export const ROLE_LABELS = {
  super_admin: 'Quản trị hệ thống',
  academic_admin: 'Quản lý học thuật',
  teacher: 'Giáo viên',
  exam_creator: 'Xây dựng đề thi',
  student: 'Học sinh',
};

export const STATUS_LABELS = {
  draft: 'Nháp',
  pending_review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  archived: 'Lưu trữ',
};

export const STATUS_COLORS = {
  draft: 'default',
  pending_review: 'orange',
  approved: 'green',
  rejected: 'red',
  archived: 'purple',
};

export const CORRECT_OPTIONS = ['A', 'B', 'C', 'D'];

export const SESSION_STATUS_LABELS = {
  scheduled: 'Chưa bắt đầu',
  active: 'Đang diễn ra',
  ended: 'Đã kết thúc',
};

export const SESSION_STATUS_COLORS = {
  scheduled: 'blue',
  active: 'green',
  ended: 'default',
};

export const canManageQuestions = (role) =>
  [ROLES.SUPER_ADMIN, ROLES.ACADEMIC_ADMIN, ROLES.TEACHER].includes(role);

export const canReviewQuestions = (role) =>
  [ROLES.SUPER_ADMIN, ROLES.ACADEMIC_ADMIN].includes(role);

export const canManageExams = (role) =>
  [ROLES.SUPER_ADMIN, ROLES.ACADEMIC_ADMIN, ROLES.EXAM_CREATOR].includes(role);

export const canManageUsers = (role) => role === ROLES.SUPER_ADMIN;

export const canManageSettings = (role) =>
  [ROLES.SUPER_ADMIN, ROLES.ACADEMIC_ADMIN].includes(role);
