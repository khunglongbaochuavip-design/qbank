import { NextResponse } from 'next/server';
import { verifyToken, getTokenFromRequest, JWTPayload } from './auth';
import prisma from './prisma';
import { hasMinRole, hasRole } from './constants';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
  tokenPayload: JWTPayload;
}

// Get authenticated user from request
export async function getAuthUser(request: Request): Promise<AuthenticatedUser | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, fullName: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) return null;
  return user as AuthenticatedUser;
}

// Error responses
export function unauthorized(message = 'Chưa xác thực. Vui lòng đăng nhập.') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = 'Bạn không có quyền thực hiện thao tác này.') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message: string) {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function success(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

// Require authentication
export async function requireAuth(request: Request): Promise<AuthenticatedUser | NextResponse> {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();
  return user;
}

// Require specific roles
export async function requireRole(request: Request, ...roles: string[]): Promise<AuthenticatedUser | NextResponse> {
  const result = await requireAuth(request);
  if (result instanceof NextResponse) return result;
  if (!hasRole(result.role, roles)) return forbidden();
  return result;
}

// Require minimum role level
export async function requireMinRole(request: Request, minRole: string): Promise<AuthenticatedUser | NextResponse> {
  const result = await requireAuth(request);
  if (result instanceof NextResponse) return result;
  if (!hasMinRole(result.role, minRole)) return forbidden();
  return result;
}

// Audit logging helper
export async function logAction(params: {
  userId?: string;
  action: string;
  module: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        module: params.module,
        targetId: params.targetId || null,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (err) {
    console.error('Failed to log action:', err);
  }
}

// Get client IP from request
export function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') || 'unknown';
}
