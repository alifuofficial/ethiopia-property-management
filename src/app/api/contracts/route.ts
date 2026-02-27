import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ContractStatus } from '@prisma/client';

// Generate invoice number
function generateInvoiceNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `INV-${timestamp}-${random}`.toUpperCase();
}

// Get all contracts
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
    const status = searchParams.get('status');

    let whereClause: Record<string, unknown> = {};
    if (status) {
      whereClause.status = status as ContractStatus;
    }

    let contracts;

    if (['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      contracts = await db.contract.findMany({
        where: whereClause,
        include: {
          tenant: { include: { user: true } },
          property: true,
          createdBy: true,
          contractUnits: { include: { unit: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (['PROPERTY_ADMIN', 'ACCOUNTANT'].includes(currentUser.role)) {
      const assignments = await db.propertyAssignment.findMany({
        where: { userId: currentUser.id },
        select: { propertyId: true },
      });
      const propertyIds = assignments.map(a => a.propertyId);
      whereClause.propertyId = { in: propertyIds };

      contracts = await db.contract.findMany({
        where: whereClause,
        include: {
          tenant: { include: { user: true } },
          property: true,
          createdBy: true,
          contractUnits: { include: { unit: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Tenant can only see their own contracts
      const tenant = await db.tenant.findUnique({ where: { userId: currentUser.id } });
      if (!tenant) {
        return NextResponse.json([]);
      }
      whereClause.tenantId = tenant.id;

      contracts = await db.contract.findMany({
        where: whereClause,
        include: {
          property: true,
          contractUnits: { include: { unit: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Remove passwords
    const contractsCleaned = contracts.map(c => ({
      ...c,
      tenant: c.tenant ? {
        ...c.tenant,
        user: c.tenant.user ? (({ password: _, ...rest }) => rest)(c.tenant.user) : null,
      } : null,
      createdBy: c.createdBy ? (({ password: _, ...rest }) => rest)(c.createdBy) : null,
    }));

    return NextResponse.json(contractsCleaned);
  } catch (error) {
    console.error('Get contracts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create contract
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
    const { tenantId, propertyId, unitIds, startDate, endDate, monthlyRent, securityDeposit, advancePayment, legalAgreementUrl, notes } = body;

    if (!tenantId || !propertyId || !unitIds || unitIds.length === 0 || !startDate || !endDate || !monthlyRent) {
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

    // Check if units are available
    const units = await db.unit.findMany({
      where: { id: { in: unitIds } },
    });

    for (const unit of units) {
      if (unit.status === 'occupied') {
        return NextResponse.json({ error: `Unit ${unit.unitNumber} is already occupied` }, { status: 400 });
      }
    }

    // Create contract
    const result = await db.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: {
          tenantId,
          propertyId,
          createdById: currentUser.id,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          monthlyRent: parseFloat(monthlyRent),
          securityDeposit: parseFloat(securityDeposit || 0),
          advancePayment: parseFloat(advancePayment || 0),
          remainingAdvance: parseFloat(advancePayment || 0),
          legalAgreementUrl: legalAgreementUrl || null,
          notes: notes || null,
          status: advancePayment > 0 ? 'UNDER_REVIEW' : 'DRAFT',
        },
      });

      // Create contract units
      for (const unitId of unitIds) {
        const unit = units.find(u => u.id === unitId);
        await tx.contractUnit.create({
          data: {
            contractId: contract.id,
            unitId,
            monthlyRent: unit?.monthlyRent || parseFloat(monthlyRent),
          },
        });

        // Update unit status
        await tx.unit.update({
          where: { id: unitId },
          data: { status: 'occupied' },
        });
      }

      // If advance payment, create a payment record
      if (advancePayment && parseFloat(advancePayment) > 0) {
        await tx.payment.create({
          data: {
            contractId: contract.id,
            amount: parseFloat(advancePayment),
            paymentType: 'ADVANCE',
            status: 'PENDING',
            notes: 'Advance payment upon contract creation',
          },
        });
      }

      return contract;
    });

    const contract = await db.contract.findUnique({
      where: { id: result.id },
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
    console.error('Create contract error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
