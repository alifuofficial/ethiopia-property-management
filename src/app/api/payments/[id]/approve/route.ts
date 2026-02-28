import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({ where: { id: sessionId } });
    if (!currentUser || !['SYSTEM_ADMIN', 'OWNER', 'ACCOUNTANT'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized - Only Accountant or Admin can approve payments' }, { status: 403 });
    }

    const { id } = await params;

    const payment = await db.payment.findUnique({
      where: { id },
      include: { contract: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json({ error: 'Payment is not pending' }, { status: 400 });
    }

    // Check access for accountant
    if (currentUser.role === 'ACCOUNTANT') {
      const assignment = await db.propertyAssignment.findFirst({
        where: { userId: currentUser.id, propertyId: payment.contract.propertyId },
      });
      if (!assignment) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Update payment
    const updatedPayment = await db.payment.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: currentUser.id,
        approvedAt: new Date(),
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

    // If advance payment, update contract
    if (payment.paymentType === 'ADVANCE') {
      await db.contract.update({
        where: { id: payment.contractId },
        data: {
          remainingAdvance: { increment: payment.amount },
          status: 'ACTIVE',
        },
      });
    }

    // If invoice payment, update invoice
    if (payment.invoiceId) {
      const invoice = await db.invoice.findUnique({
        where: { id: payment.invoiceId },
      });

      if (invoice) {
        const newPaidAmount = invoice.paidAmount + payment.amount;
        const newStatus = newPaidAmount >= invoice.amount ? 'PAID' : 'PARTIALLY_PAID';

        await db.invoice.update({
          where: { id: payment.invoiceId },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
          },
        });
      }
    }

    const cleanedPayment = {
      ...updatedPayment,
      contract: updatedPayment.contract ? {
        ...updatedPayment.contract,
        tenant: updatedPayment.contract.tenant ? {
          ...updatedPayment.contract.tenant,
          user: updatedPayment.contract.tenant.user ? (({ password: _, ...rest }) => rest)(updatedPayment.contract.tenant.user) : null,
        } : null,
      } : null,
    };

    return NextResponse.json(cleanedPayment);
  } catch (error) {
    console.error('Approve payment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
