import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Get all property assignments
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({ where: { id: sessionId } });
    if (!currentUser || !['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const assignments = await db.propertyAssignment.findMany({
      include: {
        user: true,
        property: true,
      },
      orderBy: { assignedAt: 'desc' },
    });

    // Remove passwords
    const assignmentsCleaned = assignments.map(a => ({
      ...a,
      user: a.user ? (({ password: _, ...rest }) => rest)(a.user) : null,
    }));

    return NextResponse.json(assignmentsCleaned);
  } catch (error) {
    console.error('Get assignments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create assignment
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({ where: { id: sessionId } });
    if (!currentUser || !['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized - Only System Admin or Owner can assign properties' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, propertyId } = body;

    if (!userId || !propertyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user exists and is property admin or accountant
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !['PROPERTY_ADMIN', 'ACCOUNTANT'].includes(user.role)) {
      return NextResponse.json({ error: 'User must be a Property Admin or Accountant' }, { status: 400 });
    }

    // Check if assignment already exists
    const existingAssignment = await db.propertyAssignment.findFirst({
      where: { userId, propertyId },
    });
    if (existingAssignment) {
      return NextResponse.json({ error: 'Assignment already exists' }, { status: 400 });
    }

    const assignment = await db.propertyAssignment.create({
      data: { userId, propertyId },
      include: {
        user: true,
        property: true,
      },
    });

    const { user: { password: _, ...userWithoutPassword }, ...assignmentCleaned } = assignment;

    return NextResponse.json({ ...assignmentCleaned, user: userWithoutPassword });
  } catch (error) {
    console.error('Create assignment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete assignment
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({ where: { id: sessionId } });
    if (!currentUser || !['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    await db.propertyAssignment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete assignment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
