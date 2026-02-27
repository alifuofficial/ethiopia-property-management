import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Get single property with details
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
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    // Get property with units and assignments
    const property = await db.property.findUnique({
      where: { id },
      include: {
        units: {
          orderBy: [{ propertyId: 'asc' }, { unitNumber: 'asc' }],
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true, phone: true },
            },
          },
        },
        contracts: {
          where: { status: 'ACTIVE' },
          include: {
            tenant: true,
          },
        },
        _count: {
          select: { units: true, contracts: true },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Check access
    if (!['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      const assignment = await db.propertyAssignment.findFirst({
        where: { userId: currentUser.id, propertyId: id },
      });
      if (!assignment) {
        return NextResponse.json({ error: 'Access denied to this property' }, { status: 403 });
      }
    }

    // Calculate stats
    const totalUnits = property.units.length;
    const occupiedUnits = property.units.filter(u => u.status === 'occupied').length;
    const availableUnits = property.units.filter(u => u.status === 'available').length;
    const maintenanceUnits = property.units.filter(u => u.status === 'maintenance').length;

    return NextResponse.json({
      ...property,
      stats: {
        totalUnits,
        occupiedUnits,
        availableUnits,
        maintenanceUnits,
        occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Get property error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update property
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
    const { name, address, city, region, description, isActive } = body;

    // Check if property exists
    const existingProperty = await db.property.findUnique({ where: { id } });
    if (!existingProperty) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Build update data
    const updateData: {
      name?: string;
      address?: string;
      city?: string;
      region?: string;
      description?: string | null;
      isActive?: boolean;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (region !== undefined) updateData.region = region;
    if (description !== undefined) updateData.description = description || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const property = await db.property.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { units: true },
        },
      },
    });

    return NextResponse.json(property);
  } catch (error) {
    console.error('Update property error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete property
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

    // Check if property exists
    const existingProperty = await db.property.findUnique({
      where: { id },
      include: {
        _count: {
          select: { units: true, contracts: true },
        },
      },
    });

    if (!existingProperty) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Check if property has active contracts
    const activeContracts = await db.contract.count({
      where: { propertyId: id, status: 'ACTIVE' },
    });

    if (activeContracts > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete property with active contracts. Please terminate all contracts first.' 
      }, { status: 400 });
    }

    // Delete property (cascading will handle units, assignments, etc.)
    await db.property.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
