import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';

// Simple password hashing
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({ where: { id: sessionId } });
    if (!currentUser || !['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const user = await db.user.findUnique({ where: { id } });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({ where: { id: sessionId } });
    if (!currentUser || !['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, password, phone, role, isActive } = body;

    // Check if user exists
    const existingUser = await db.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting the last system admin
    if (existingUser.role === 'SYSTEM_ADMIN' && role && role !== 'SYSTEM_ADMIN') {
      const adminCount = await db.user.count({ where: { role: 'SYSTEM_ADMIN' } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Cannot remove the last system admin' }, { status: 400 });
      }
    }

    // Check if email is taken by another user
    if (email && email !== existingUser.email) {
      const emailTaken = await db.user.findUnique({ where: { email } });
      if (emailTaken) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }
    }

    // Build update data
    const updateData: {
      name?: string;
      email?: string;
      password?: string;
      phone?: string | null;
      role?: UserRole;
      isActive?: boolean;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (role !== undefined) updateData.role = role as UserRole;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) {
      updateData.password = await hashPassword(password);
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
    });

    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({ where: { id: sessionId } });
    if (!currentUser || !['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent self-deletion
    if (id === sessionId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting the last system admin
    if (existingUser.role === 'SYSTEM_ADMIN') {
      const adminCount = await db.user.count({ where: { role: 'SYSTEM_ADMIN' } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Cannot delete the last system admin' }, { status: 400 });
      }
    }

    // Delete user (cascading will handle related records)
    await db.user.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
