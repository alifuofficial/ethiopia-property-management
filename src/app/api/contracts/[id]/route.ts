import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Get single contract
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

    const contract = await db.contract.findUnique({
      where: { id },
      include: {
        tenant: { include: { user: true } },
        property: true,
        createdBy: true,
        contractUnits: { include: { unit: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Check access
    if (['PROPERTY_ADMIN', 'ACCOUNTANT'].includes(currentUser.role)) {
      const assignment = await db.propertyAssignment.findFirst({
        where: { userId: currentUser.id, propertyId: contract.propertyId },
      });
      if (!assignment) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else if (currentUser.role === 'TENANT') {
      const tenant = await db.tenant.findUnique({ where: { userId: currentUser.id } });
      if (!tenant || tenant.id !== contract.tenantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const cleanedContract = {
      ...contract,
      tenant: contract.tenant ? {
        ...contract.tenant,
        user: contract.tenant.user ? (({ password: _, ...rest }) => rest)(contract.tenant.user) : null,
      } : null,
      createdBy: contract.createdBy ? (({ password: _, ...rest }) => rest)(contract.createdBy) : null,
    };

    return NextResponse.json(cleanedContract);
  } catch (error) {
    console.error('Get contract error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update contract
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

    const existingContract = await db.contract.findUnique({
      where: { id },
      include: { contractUnits: true },
    });

    if (!existingContract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Check access for property admin
    if (currentUser.role === 'PROPERTY_ADMIN') {
      const assignment = await db.propertyAssignment.findFirst({
        where: { userId: currentUser.id, propertyId: existingContract.propertyId },
      });
      if (!assignment) {
        return NextResponse.json({ error: 'Unauthorized - Not assigned to this property' }, { status: 403 });
      }
    }

    const {
      tenantId,
      propertyId,
      unitIds,
      startDate,
      endDate,
      monthlyRent,
      securityDeposit,
      advancePayment,
      legalAgreementUrl,
      notes,
      status,
    } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (tenantId !== undefined) updateData.tenantId = tenantId;
    if (propertyId !== undefined) updateData.propertyId = propertyId;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (monthlyRent !== undefined) updateData.monthlyRent = parseFloat(monthlyRent);
    if (securityDeposit !== undefined) updateData.securityDeposit = parseFloat(securityDeposit);
    if (advancePayment !== undefined) updateData.advancePayment = parseFloat(advancePayment);
    if (legalAgreementUrl !== undefined) updateData.legalAgreementUrl = legalAgreementUrl;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    // Update contract
    const updatedContract = await db.$transaction(async (tx) => {
      const contract = await tx.contract.update({
        where: { id },
        data: updateData,
      });

      // If unitIds provided, update contract units
      if (unitIds && Array.isArray(unitIds)) {
        // Remove existing contract units
        await tx.contractUnit.deleteMany({
          where: { contractId: id },
        });

        // Add new contract units
        for (const unitId of unitIds) {
          const unit = await tx.unit.findUnique({ where: { id: unitId } });
          await tx.contractUnit.create({
            data: {
              contractId: id,
              unitId,
              monthlyRent: unit?.monthlyRent || contract.monthlyRent,
            },
          });
        }
      }

      return contract;
    });

    const contract = await db.contract.findUnique({
      where: { id: updatedContract.id },
      include: {
        tenant: { include: { user: true } },
        property: true,
        createdBy: true,
        contractUnits: { include: { unit: true } },
      },
    });

    const cleanedContract = {
      ...contract,
      tenant: contract?.tenant ? {
        ...contract.tenant,
        user: contract.tenant.user ? (({ password: _, ...rest }) => rest)(contract.tenant.user) : null,
      } : null,
      createdBy: contract?.createdBy ? (({ password: _, ...rest }) => rest)(contract.createdBy) : null,
    };

    return NextResponse.json(cleanedContract);
  } catch (error) {
    console.error('Update contract error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete contract
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
      return NextResponse.json({ error: 'Unauthorized - Only System Admin or Owner can delete contracts' }, { status: 403 });
    }

    const { id } = await params;

    const contract = await db.contract.findUnique({
      where: { id },
      include: { contractUnits: true },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Only allow deleting contracts that are not active
    if (contract.status === 'ACTIVE') {
      return NextResponse.json({ error: 'Cannot delete active contracts. Terminate instead.' }, { status: 400 });
    }

    // Delete in transaction
    await db.$transaction(async (tx) => {
      // Delete contract units
      await tx.contractUnit.deleteMany({
        where: { contractId: id },
      });

      // Delete invoices
      await tx.invoice.deleteMany({
        where: { contractId: id },
      });

      // Delete payments
      await tx.payment.deleteMany({
        where: { contractId: id },
      });

      // Delete termination requests
      await tx.contractTerminationRequest.deleteMany({
        where: { contractId: id },
      });

      // Delete contract
      await tx.contract.delete({
        where: { id },
      });

      // Update unit status back to available
      for (const cu of contract.contractUnits) {
        await tx.unit.update({
          where: { id: cu.unitId },
          data: { status: 'available' },
        });
      }
    });

    return NextResponse.json({ success: true, message: 'Contract deleted successfully' });
  } catch (error) {
    console.error('Delete contract error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
