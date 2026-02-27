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
    if (!currentUser || !['SYSTEM_ADMIN', 'OWNER', 'PROPERTY_ADMIN'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { reason, bankAccountNumber, bankName, accountHolderName } = body;

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    const contract = await db.contract.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    if (contract.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Only active contracts can be terminated' }, { status: 400 });
    }

    // Check access for property admin
    if (currentUser.role === 'PROPERTY_ADMIN') {
      const assignment = await db.propertyAssignment.findFirst({
        where: { userId: currentUser.id, propertyId: contract.propertyId },
      });
      if (!assignment) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Check if termination request already exists
    const existingRequest = await db.contractTerminationRequest.findUnique({
      where: { contractId: id },
    });
    if (existingRequest) {
      return NextResponse.json({ error: 'Termination request already exists' }, { status: 400 });
    }

    // Calculate refund amount (remaining advance)
    const refundAmount = contract.remainingAdvance;

    // Create termination request
    const terminationRequest = await db.contractTerminationRequest.create({
      data: {
        contractId: id,
        requestedById: currentUser.id,
        reason,
        refundAmount,
        bankAccountNumber: bankAccountNumber || null,
        bankName: bankName || null,
        accountHolderName: accountHolderName || null,
        status: 'PENDING',
      },
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

    // Update contract status
    await db.contract.update({
      where: { id },
      data: { status: 'PENDING_TERMINATION' },
    });

    const cleanedRequest = {
      ...terminationRequest,
      contract: terminationRequest.contract ? {
        ...terminationRequest.contract,
        tenant: terminationRequest.contract.tenant ? {
          ...terminationRequest.contract.tenant,
          user: terminationRequest.contract.tenant.user ? (({ password: _, ...rest }) => rest)(terminationRequest.contract.tenant.user) : null,
        } : null,
      } : null,
      requestedBy: terminationRequest.requestedBy ? (({ password: _, ...rest }) => rest)(terminationRequest.requestedBy) : null,
    };

    return NextResponse.json(cleanedRequest);
  } catch (error) {
    console.error('Terminate contract error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
