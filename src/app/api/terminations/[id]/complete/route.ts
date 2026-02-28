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
      return NextResponse.json({ error: 'Unauthorized - Only Accountant or Admin can complete' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { receiptUrl } = body;

    const terminationRequest = await db.contractTerminationRequest.findUnique({
      where: { id },
      include: { contract: { include: { contractUnits: true } } },
    });

    if (!terminationRequest) {
      return NextResponse.json({ error: 'Termination request not found' }, { status: 404 });
    }

    if (terminationRequest.status !== 'OWNER_APPROVED') {
      return NextResponse.json({ error: 'Request must be approved by owner first' }, { status: 400 });
    }

    // Update termination request and contract
    const result = await db.$transaction(async (tx) => {
      const updatedRequest = await tx.contractTerminationRequest.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          receiptUrl: receiptUrl || null,
        },
      });

      // Update contract status
      await tx.contract.update({
        where: { id: terminationRequest.contractId },
        data: {
          status: 'TERMINATED',
          terminationDate: new Date(),
        },
      });

      // Release units
      for (const cu of terminationRequest.contract.contractUnits) {
        await tx.unit.update({
          where: { id: cu.unitId },
          data: { status: 'available' },
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
    console.error('Complete termination error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
