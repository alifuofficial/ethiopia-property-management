import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Get single unit
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
    const unit = await db.unit.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    // Check access for property admin
    if (['PROPERTY_ADMIN', 'ACCOUNTANT'].includes(currentUser.role)) {
      const assignment = await db.propertyAssignment.findFirst({
        where: { userId: currentUser.id, propertyId: unit.propertyId },
      });
      if (!assignment) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    return NextResponse.json(unit);
  } catch (error) {
    console.error('Get unit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update unit
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
    if (!currentUser || !['SYSTEM_ADMIN', 'OWNER', 'PROPERTY_ADMIN'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { propertyId, unitNumber, floor, bedrooms, bathrooms, area, monthlyRent, description, status } = body;

    // Check if unit exists
    const existingUnit = await db.unit.findUnique({ where: { id } });
    if (!existingUnit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    // Check access for property admin
    if (currentUser.role === 'PROPERTY_ADMIN') {
      const assignment = await db.propertyAssignment.findFirst({
        where: { userId: currentUser.id, propertyId: existingUnit.propertyId },
      });
      if (!assignment) {
        return NextResponse.json({ error: 'Unauthorized - Not assigned to this property' }, { status: 403 });
      }
    }

    // If changing property, check access to new property
    if (propertyId && propertyId !== existingUnit.propertyId) {
      if (currentUser.role === 'PROPERTY_ADMIN') {
        const assignment = await db.propertyAssignment.findFirst({
          where: { userId: currentUser.id, propertyId },
        });
        if (!assignment) {
          return NextResponse.json({ error: 'Unauthorized - Not assigned to new property' }, { status: 403 });
        }
      }
    }

    // Check if new unit number conflicts
    if (unitNumber && unitNumber !== existingUnit.unitNumber) {
      const conflict = await db.unit.findFirst({
        where: { propertyId: propertyId || existingUnit.propertyId, unitNumber },
      });
      if (conflict) {
        return NextResponse.json({ error: 'Unit number already exists for this property' }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (propertyId !== undefined) updateData.propertyId = propertyId;
    if (unitNumber !== undefined) updateData.unitNumber = unitNumber;
    if (floor !== undefined) updateData.floor = floor || null;
    if (bedrooms !== undefined) updateData.bedrooms = parseInt(bedrooms);
    if (bathrooms !== undefined) updateData.bathrooms = parseInt(bathrooms);
    if (area !== undefined) updateData.area = area ? parseFloat(area) : null;
    if (monthlyRent !== undefined) updateData.monthlyRent = parseFloat(monthlyRent);
    if (description !== undefined) updateData.description = description || null;
    if (status !== undefined) updateData.status = status;

    const unit = await db.unit.update({
      where: { id },
      data: updateData,
      include: { property: true },
    });

    // Update property total units if property changed
    if (propertyId && propertyId !== existingUnit.propertyId) {
      await db.property.update({
        where: { id: existingUnit.propertyId },
        data: { totalUnits: { decrement: 1 } },
      });
      await db.property.update({
        where: { id: propertyId },
        data: { totalUnits: { increment: 1 } },
      });
    }

    return NextResponse.json(unit);
  } catch (error) {
    console.error('Update unit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete unit
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
      return NextResponse.json({ error: 'Unauthorized - Only admins can delete units' }, { status: 403 });
    }

    const { id } = await params;
    const unit = await db.unit.findUnique({ where: { id } });
    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    // Check if unit has active contracts
    const activeContract = await db.contract.findFirst({
      where: { 
        propertyId: unit.propertyId,
        status: 'ACTIVE',
      },
    });

    if (activeContract) {
      return NextResponse.json({ error: 'Cannot delete unit with active contracts' }, { status: 400 });
    }

    await db.unit.delete({ where: { id } });

    // Update property total units
    await db.property.update({
      where: { id: unit.propertyId },
      data: { totalUnits: { decrement: 1 } },
    });

    return NextResponse.json({ success: true, message: 'Unit deleted successfully' });
  } catch (error) {
    console.error('Delete unit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
