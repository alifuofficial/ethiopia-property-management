import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PaymentStatus, PaymentType } from '@prisma/client';

// Get all payments
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
      whereClause.status = status as PaymentStatus;
    }

    let payments;

    if (['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      payments = await db.payment.findMany({
        where: whereClause,
        include: {
          contract: {
            include: {
              tenant: { include: { user: true } },
              property: true,
            },
          },
          invoice: true,
          approvedBy: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (currentUser.role === 'ACCOUNTANT') {
      const assignments = await db.propertyAssignment.findMany({
        where: { userId: currentUser.id },
        select: { propertyId: true },
      });
      const propertyIds = assignments.map(a => a.propertyId);

      payments = await db.payment.findMany({
        where: {
          ...whereClause,
          contract: { propertyId: { in: propertyIds } },
        },
        include: {
          contract: {
            include: {
              tenant: { include: { user: true } },
              property: true,
            },
          },
          invoice: true,
          approvedBy: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (currentUser.role === 'PROPERTY_ADMIN') {
      const assignments = await db.propertyAssignment.findMany({
        where: { userId: currentUser.id },
        select: { propertyId: true },
      });
      const propertyIds = assignments.map(a => a.propertyId);

      payments = await db.payment.findMany({
        where: {
          ...whereClause,
          contract: { propertyId: { in: propertyIds } },
        },
        include: {
          contract: {
            include: {
              tenant: { include: { user: true } },
              property: true,
            },
          },
          invoice: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Tenant can only see their own payments
      const tenant = await db.tenant.findUnique({ where: { userId: currentUser.id } });
      if (!tenant) {
        return NextResponse.json([]);
      }

      payments = await db.payment.findMany({
        where: {
          ...whereClause,
          contract: { tenantId: tenant.id },
        },
        include: {
          contract: {
            include: { property: true },
          },
          invoice: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Remove passwords
    const paymentsCleaned = payments.map(p => ({
      ...p,
      contract: p.contract ? {
        ...p.contract,
        tenant: p.contract.tenant ? {
          ...p.contract.tenant,
          user: p.contract.tenant.user ? (({ password: _, ...rest }) => rest)(p.contract.tenant.user) : null,
        } : null,
      } : null,
      approvedBy: p.approvedBy ? (({ password: _, ...rest }) => rest)(p.approvedBy) : null,
    }));

    return NextResponse.json(paymentsCleaned);
  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create payment
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({ where: { id: sessionId } });
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { contractId, invoiceId, amount, paymentType, paymentMethod, transactionId, receiptUrl, notes } = body;

    if (!contractId || !amount || !paymentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get contract
    const contract = await db.contract.findUnique({
      where: { id: contractId },
      include: { property: true },
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
      if (!tenant || contract.tenantId !== tenant.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Calculate max advance payment
    const contractMonths = Math.ceil(
      (new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    const maxAdvance = contract.monthlyRent * contractMonths;

    if (paymentType === 'ADVANCE' && parseFloat(amount) > maxAdvance) {
      return NextResponse.json({ error: `Maximum advance payment is ${maxAdvance} ETB` }, { status: 400 });
    }

    const payment = await db.payment.create({
      data: {
        contractId,
        invoiceId: invoiceId || null,
        amount: parseFloat(amount),
        paymentType: paymentType as PaymentType,
        status: 'PENDING',
        paymentMethod: paymentMethod || null,
        transactionId: transactionId || null,
        receiptUrl: receiptUrl || null,
        notes: notes || null,
      },
      include: {
        contract: {
          include: {
            tenant: { include: { user: true } },
            property: true,
          },
        },
        invoice: true,
      },
    });

    const cleanedPayment = {
      ...payment,
      contract: payment.contract ? {
        ...payment.contract,
        tenant: payment.contract.tenant ? {
          ...payment.contract.tenant,
          user: payment.contract.tenant.user ? (({ password: _, ...rest }) => rest)(payment.contract.tenant.user) : null,
        } : null,
      } : null,
    };

    return NextResponse.json(cleanedPayment);
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
