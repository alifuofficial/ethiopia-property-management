import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { InvoiceStatus } from '@prisma/client';

// Generate invoice number
function generateInvoiceNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `INV-${timestamp}-${random}`.toUpperCase();
}

// Get all invoices
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
      whereClause.status = status as InvoiceStatus;
    }

    let invoices;

    if (['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      invoices = await db.invoice.findMany({
        where: whereClause,
        include: {
          contract: {
            include: {
              tenant: { include: { user: true } },
              property: true,
            },
          },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (['ACCOUNTANT', 'PROPERTY_ADMIN'].includes(currentUser.role)) {
      const assignments = await db.propertyAssignment.findMany({
        where: { userId: currentUser.id },
        select: { propertyId: true },
      });
      const propertyIds = assignments.map(a => a.propertyId);

      invoices = await db.invoice.findMany({
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
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Tenant can only see their own invoices
      const tenant = await db.tenant.findUnique({ where: { userId: currentUser.id } });
      if (!tenant) {
        return NextResponse.json([]);
      }

      invoices = await db.invoice.findMany({
        where: {
          ...whereClause,
          contract: { tenantId: tenant.id },
        },
        include: {
          contract: {
            include: { property: true },
          },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Remove passwords
    const invoicesCleaned = invoices.map(inv => ({
      ...inv,
      contract: inv.contract ? {
        ...inv.contract,
        tenant: inv.contract.tenant ? {
          ...inv.contract.tenant,
          user: inv.contract.tenant.user ? (({ password: _, ...rest }) => rest)(inv.contract.tenant.user) : null,
        } : null,
      } : null,
    }));

    return NextResponse.json(invoicesCleaned);
  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create invoice
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
    const { contractId, amount, dueDate, periodStart, periodEnd, notes } = body;

    if (!contractId || !amount || !dueDate || !periodStart || !periodEnd) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get contract
    const contract = await db.contract.findUnique({
      where: { id: contractId },
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
    }

    const invoice = await db.invoice.create({
      data: {
        contractId,
        invoiceNumber: generateInvoiceNumber(),
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        notes: notes || null,
        status: 'PENDING',
        paymentUrl: `/pay/inv/${generateInvoiceNumber().toLowerCase()}`,
      },
      include: {
        contract: {
          include: {
            tenant: { include: { user: true } },
            property: true,
          },
        },
      },
    });

    const cleanedInvoice = {
      ...invoice,
      contract: invoice.contract ? {
        ...invoice.contract,
        tenant: invoice.contract.tenant ? {
          ...invoice.contract.tenant,
          user: invoice.contract.tenant.user ? (({ password: _, ...rest }) => rest)(invoice.contract.tenant.user) : null,
        } : null,
      } : null,
    };

    return NextResponse.json(cleanedInvoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
