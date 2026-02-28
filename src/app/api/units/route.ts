import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Get all units (with access control)
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

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');

    let whereClause: Record<string, unknown> = {};
    
    if (propertyId) {
      whereClause.propertyId = propertyId;
    }

    // Apply access control for non-admin roles
    if (['PROPERTY_ADMIN', 'ACCOUNTANT'].includes(currentUser.role)) {
      const assignments = await db.propertyAssignment.findMany({
        where: { userId: currentUser.id },
        select: { propertyId: true },
      });
      const propertyIds = assignments.map(a => a.propertyId);
      
      if (propertyId) {
        if (!propertyIds.includes(propertyId)) {
          return NextResponse.json({ error: 'Unauthorized access to this property' }, { status: 403 });
        }
      } else {
        whereClause.propertyId = { in: propertyIds };
      }
    }

    const units = await db.unit.findMany({
      where: whereClause,
      include: {
        property: true,
      },
      orderBy: [{ propertyId: 'asc' }, { unitNumber: 'asc' }],
    });

    return NextResponse.json(units);
  } catch (error) {
    console.error('Get units error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create unit
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({ where: { id: sessionId } });
    if (!currentUser || !['SYSTEM_ADMIN', 'OWNER', 'PROPERTY_ADMIN'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { propertyId, unitNumber, floor, bedrooms, bathrooms, area, monthlyRent, description, status } = body;

    if (!propertyId || !unitNumber || !monthlyRent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check access for property admin
    if (currentUser.role === 'PROPERTY_ADMIN') {
      const assignment = await db.propertyAssignment.findFirst({
        where: { userId: currentUser.id, propertyId },
      });
      if (!assignment) {
        return NextResponse.json({ error: 'Unauthorized - Not assigned to this property' }, { status: 403 });
      }
    }

    // Check if unit number already exists for this property
    const existingUnit = await db.unit.findFirst({
      where: { propertyId, unitNumber },
    });
    if (existingUnit) {
      return NextResponse.json({ error: 'Unit number already exists for this property' }, { status: 400 });
    }

    const unit = await db.unit.create({
      data: {
        propertyId,
        unitNumber,
        floor: floor || null,
        bedrooms: bedrooms || 1,
        bathrooms: bathrooms || 1,
        area: area || null,
        monthlyRent: parseFloat(monthlyRent),
        description: description || null,
        status: status || 'available',
      },
      include: {
        property: true,
      },
    });

    // Update property total units
    await db.property.update({
      where: { id: propertyId },
      data: { totalUnits: { increment: 1 } },
    });

    return NextResponse.json(unit);
  } catch (error) {
    console.error('Create unit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
