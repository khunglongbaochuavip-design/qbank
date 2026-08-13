import { Role } from '@prisma/client';

// ─── Role Labels (Vietnamese) ──────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Quản trị hệ thống',
  admin: 'Quản trị viên',
  exam_officer: 'Khảo thí',
  teacher: 'Giáo viên',
  student: 'Học sinh',
};

export const ROLE_COLORS: Record<string, string> = {
  super_admin: '#ef4444',
  admin: '#3b82f6',
  exam_officer: '#f59e0b',
  teacher: '#22c55e',
  student: '#8b5cf6',
};

// ─── Status Labels (Vietnamese) ────────────────────────────────────

export const QUESTION_STATUS_LABELS: Record<string, string> = {
  draft: 'Nháp',
  pending_review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  archived: 'Lưu trữ',
};

export const QUESTION_STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  pending_review: 'orange',
  approved: 'green',
  rejected: 'red',
  archived: 'purple',
};

export const EXAM_STATUS_LABELS: Record<string, string> = {
  draft: 'Nháp',
  published: 'Đã xuất bản',
  finalized: 'Đã chốt',
  archived: 'Lưu trữ',
};

export const SESSION_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Chưa bắt đầu',
  active: 'Đang diễn ra',
  ended: 'Đã kết thúc',
};

export const SESSION_STATUS_COLORS: Record<string, string> = {
  scheduled: 'blue',
  active: 'green',
  ended: 'default',
};

// ─── Role Hierarchy ────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 5,
  admin: 4,
  exam_officer: 3,
  teacher: 2,
  student: 1,
};

export function hasMinRole(userRole: string, minRole: string): boolean {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[minRole] || 99);
}

export function hasRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

// ─── Permission Helpers ────────────────────────────────────────────

export function canManageUsers(role: string): boolean {
  return hasRole(role, ['super_admin', 'admin']);
}

export function canManageQuestions(role: string): boolean {
  return hasRole(role, ['super_admin', 'admin', 'exam_officer', 'teacher']);
}

export function canReviewQuestions(role: string): boolean {
  return hasRole(role, ['super_admin', 'admin', 'exam_officer']);
}

export function canManageExams(role: string): boolean {
  return hasRole(role, ['super_admin', 'admin', 'exam_officer']);
}

export function canImportQuestions(role: string): boolean {
  return hasRole(role, ['super_admin', 'admin']);
}

export function canExportResults(role: string): boolean {
  return hasRole(role, ['super_admin', 'admin', 'exam_officer']);
}

export function canManageSettings(role: string): boolean {
  return hasRole(role, ['super_admin', 'admin']);
}

export const CORRECT_OPTIONS = ['A', 'B', 'C', 'D'] as const;
