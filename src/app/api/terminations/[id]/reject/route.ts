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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    const terminationRequest = await db.contractTerminationRequest.findUnique({
      where: { id },
      include: { contract: true },
    });

    if (!terminationRequest) {
      return NextResponse.json({ error: 'Termination request not found' }, { status: 404 });
    }

    if (terminationRequest.status === 'COMPLETED' || terminationRequest.status === 'REJECTED') {
      return NextResponse.json({ error: 'Request is already completed or rejected' }, { status: 400 });
    }

    // Update termination request and contract
    const result = await db.$transaction(async (tx) => {
      const updatedRequest = await tx.contractTerminationRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: reason,
        },
      });

      // Reset contract status if it was pending termination
      if (terminationRequest.contract.status === 'PENDING_TERMINATION') {
        await tx.contract.update({
          where: { id: terminationRequest.contractId },
          data: { status: 'ACTIVE' },
        });
      }

      return updatedRequest;
    });

    const fullRequest = await db.contractTerminationRequest.findUnique({
      where: { id },
      include: {
        contract: {
          include: {
            tenant: { include: { user: true } },
            property: true,
          },
        },
        requestedBy: true,
      },
    });

    const cleanedRequest = {
      ...fullRequest,
      contract: fullRequest?.contract ? {
        ...fullRequest.contract,
        tenant: fullRequest.contract.tenant ? {
          ...fullRequest.contract.tenant,
          user: fullRequest.contract.tenant.user ? (({ password: _, ...rest }) => rest)(fullRequest.contract.tenant.user) : null,
        } : null,
      } : null,
      requestedBy: fullRequest?.requestedBy ? (({ password: _, ...rest }) => rest)(fullRequest.requestedBy) : null,
    };

    return NextResponse.json(cleanedRequest);
  } catch (error) {
    console.error('Reject termination error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
