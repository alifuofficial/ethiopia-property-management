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
    if (!currentUser || !['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized - Only Owner or System Admin can approve' }, { status: 403 });
    }

    const { id } = await params;

    const terminationRequest = await db.contractTerminationRequest.findUnique({
      where: { id },
      include: { contract: true },
    });

    if (!terminationRequest) {
      return NextResponse.json({ error: 'Termination request not found' }, { status: 404 });
    }

    if (terminationRequest.status !== 'ACCOUNTANT_APPROVED') {
      return NextResponse.json({ error: 'Request must be approved by accountant first' }, { status: 400 });
    }

    const updatedRequest = await db.contractTerminationRequest.update({
      where: { id },
      data: { status: 'OWNER_APPROVED' },
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
      ...updatedRequest,
      contract: updatedRequest.contract ? {
        ...updatedRequest.contract,
        tenant: updatedRequest.contract.tenant ? {
          ...updatedRequest.contract.tenant,
          user: updatedRequest.contract.tenant.user ? (({ password: _, ...rest }) => rest)(updatedRequest.contract.tenant.user) : null,
        } : null,
      } : null,
      requestedBy: updatedRequest.requestedBy ? (({ password: _, ...rest }) => rest)(updatedRequest.requestedBy) : null,
    };

    return NextResponse.json(cleanedRequest);
  } catch (error) {
    console.error('Owner approve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
