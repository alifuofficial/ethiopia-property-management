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
      return NextResponse.json({ error: 'Unauthorized - Only Accountant or Admin can reject payments' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

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

    const updatedPayment = await db.payment.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
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
    console.error('Reject payment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
