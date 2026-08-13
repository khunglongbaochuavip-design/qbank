import { requireAuth, success, unauthorized } from '@/lib/api-utils';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const result = await requireAuth(request);
    if (result instanceof NextResponse) return result;
    return success({ id: result.id, email: result.email, fullName: result.fullName, role: result.role });
  } catch {
    return unauthorized();
  }
}
