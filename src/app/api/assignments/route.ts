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
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Property Admin can only see their own assignments
    if (currentUser.role === 'PROPERTY_ADMIN' || currentUser.role === 'ACCOUNTANT') {
      const assignments = await db.propertyAssignment.findMany({
        where: { userId: currentUser.id },
        include: {
          property: true,
        },
        orderBy: { assignedAt: 'desc' },
      });

      return NextResponse.json(assignments);
    }

    // System Admin and Owner can see all assignments
    if (!['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
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

// Create assignment(s) - supports single and bulk operations
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
    const { userId, propertyId, userIds, propertyIds } = body;

    // Bulk assignment: one user to multiple properties
    if (userId && propertyIds && Array.isArray(propertyIds)) {
      // Validate user
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user || !['PROPERTY_ADMIN', 'ACCOUNTANT'].includes(user.role)) {
        return NextResponse.json({ error: 'User must be a Property Admin or Accountant' }, { status: 400 });
      }

      // Filter out existing assignments
      const existingAssignments = await db.propertyAssignment.findMany({
        where: { userId, propertyId: { in: propertyIds } },
        select: { propertyId: true },
      });
      const existingPropertyIds = existingAssignments.map(a => a.propertyId);
      const newPropertyIds = propertyIds.filter((id: string) => !existingPropertyIds.includes(id));

      if (newPropertyIds.length === 0) {
        return NextResponse.json({ error: 'All assignments already exist' }, { status: 400 });
      }

      // Create bulk assignments
      const assignments = await db.propertyAssignment.createMany({
        data: newPropertyIds.map((pid: string) => ({ userId, propertyId: pid })),
      });

      return NextResponse.json({ 
        success: true, 
        count: assignments.count,
        message: `Created ${assignments.count} assignment(s)` 
      });
    }

    // Bulk assignment: multiple users to one property
    if (propertyId && userIds && Array.isArray(userIds)) {
      // Validate property
      const property = await db.property.findUnique({ where: { id: propertyId } });
      if (!property) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 });
      }

      // Validate users
      const users = await db.user.findMany({ where: { id: { in: userIds } } });
      const invalidUsers = users.filter(u => !['PROPERTY_ADMIN', 'ACCOUNTANT'].includes(u.role));
      if (invalidUsers.length > 0) {
        return NextResponse.json({ error: 'All users must be Property Admin or Accountant' }, { status: 400 });
      }

      // Filter out existing assignments
      const existingAssignments = await db.propertyAssignment.findMany({
        where: { propertyId, userId: { in: userIds } },
        select: { userId: true },
      });
      const existingUserIds = existingAssignments.map(a => a.userId);
      const newUserIds = userIds.filter((id: string) => !existingUserIds.includes(id));

      if (newUserIds.length === 0) {
        return NextResponse.json({ error: 'All assignments already exist' }, { status: 400 });
      }

      // Create bulk assignments
      const assignments = await db.propertyAssignment.createMany({
        data: newUserIds.map((uid: string) => ({ userId: uid, propertyId })),
      });

      return NextResponse.json({ 
        success: true, 
        count: assignments.count,
        message: `Created ${assignments.count} assignment(s)` 
      });
    }

    // Single assignment
    if (userId && propertyId) {
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
    }

    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
  } catch (error) {
    console.error('Create assignment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete assignment(s) - supports single and bulk operations
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
    const ids = searchParams.get('ids');
    const userId = searchParams.get('userId');
    const propertyId = searchParams.get('propertyId');

    // Bulk delete by IDs
    if (ids) {
      const idArray = ids.split(',');
      const result = await db.propertyAssignment.deleteMany({
        where: { id: { in: idArray } },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    // Delete all assignments for a user
    if (userId && !propertyId) {
      const result = await db.propertyAssignment.deleteMany({
        where: { userId },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    // Delete all assignments for a property
    if (propertyId && !userId) {
      const result = await db.propertyAssignment.deleteMany({
        where: { propertyId },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    // Delete specific assignment
    if (id) {
      await db.propertyAssignment.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Assignment ID or filters required' }, { status: 400 });
  } catch (error) {
    console.error('Delete assignment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
