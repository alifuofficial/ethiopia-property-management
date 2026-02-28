import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Get all properties (with access control)
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

    let properties;

    // System admin and owner can see all properties
    if (['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      properties = await db.property.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { units: true },
          },
        },
      });
    } else if (['PROPERTY_ADMIN', 'ACCOUNTANT'].includes(currentUser.role)) {
      // Property admin and accountant can only see assigned properties
      const assignments = await db.propertyAssignment.findMany({
        where: { userId: currentUser.id },
        select: { propertyId: true },
      });
      const propertyIds = assignments.map(a => a.propertyId);

      properties = await db.property.findMany({
        where: { id: { in: propertyIds } },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { units: true },
          },
        },
      });
    } else {
      // Tenants see properties where they have active contracts
      const tenant = await db.tenant.findUnique({ where: { userId: currentUser.id } });
      if (!tenant) {
        return NextResponse.json([]);
      }

      const contracts = await db.contract.findMany({
        where: { tenantId: tenant.id, status: 'ACTIVE' },
        select: { propertyId: true },
      });
      const propertyIds = [...new Set(contracts.map(c => c.propertyId))];

      properties = await db.property.findMany({
        where: { id: { in: propertyIds } },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { units: true },
          },
        },
      });
    }

    return NextResponse.json(properties);
  } catch (error) {
    console.error('Get properties error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create property
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({ where: { id: sessionId } });
    if (!currentUser || !['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized - Only System Admin or Owner can create properties' }, { status: 403 });
    }

    const body = await request.json();
    const { name, address, city, region, description } = body;

    if (!name || !address || !city || !region) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const property = await db.property.create({
      data: {
        name,
        address,
        city,
        region,
        description: description || null,
      },
    });

    return NextResponse.json(property);
  } catch (error) {
    console.error('Create property error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
