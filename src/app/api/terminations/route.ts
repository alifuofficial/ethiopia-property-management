import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TerminationStatus } from '@prisma/client';

// Get all termination requests
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

    let terminations;

    if (['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      terminations = await db.contractTerminationRequest.findMany({
        include: {
          contract: {
            include: {
              tenant: { include: { user: true } },
              property: true,
            },
          },
          requestedBy: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (currentUser.role === 'ACCOUNTANT') {
      const assignments = await db.propertyAssignment.findMany({
        where: { userId: currentUser.id },
        select: { propertyId: true },
      });
      const propertyIds = assignments.map(a => a.propertyId);

      terminations = await db.contractTerminationRequest.findMany({
        where: {
          contract: { propertyId: { in: propertyIds } },
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
        orderBy: { createdAt: 'desc' },
      });
    } else if (currentUser.role === 'PROPERTY_ADMIN') {
      const assignments = await db.propertyAssignment.findMany({
        where: { userId: currentUser.id },
        select: { propertyId: true },
      });
      const propertyIds = assignments.map(a => a.propertyId);

      terminations = await db.contractTerminationRequest.findMany({
        where: {
          contract: { propertyId: { in: propertyIds } },
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
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Tenant can only see their own termination requests
      const tenant = await db.tenant.findUnique({ where: { userId: currentUser.id } });
      if (!tenant) {
        return NextResponse.json([]);
      }

      terminations = await db.contractTerminationRequest.findMany({
        where: {
          contract: { tenantId: tenant.id },
        },
        include: {
          contract: {
            include: { property: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Remove passwords
    const terminationsCleaned = terminations.map(t => ({
      ...t,
      contract: t.contract ? {
        ...t.contract,
        tenant: t.contract.tenant ? {
          ...t.contract.tenant,
          user: t.contract.tenant.user ? (({ password: _, ...rest }) => rest)(t.contract.tenant.user) : null,
        } : null,
      } : null,
      requestedBy: t.requestedBy ? (({ password: _, ...rest }) => rest)(t.requestedBy) : null,
    }));

    return NextResponse.json(terminationsCleaned);
  } catch (error) {
    console.error('Get terminations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
