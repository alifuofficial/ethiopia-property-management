import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';

// Simple password hashing
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get all tenants
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

    let tenants;

    if (['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      tenants = await db.tenant.findMany({
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (['PROPERTY_ADMIN', 'ACCOUNTANT'].includes(currentUser.role)) {
      // Get tenants from contracts on assigned properties
      const assignments = await db.propertyAssignment.findMany({
        where: { userId: currentUser.id },
        select: { propertyId: true },
      });
      const propertyIds = assignments.map(a => a.propertyId);

      const contracts = await db.contract.findMany({
        where: { propertyId: { in: propertyIds } },
        select: { tenantId: true },
      });
      const tenantIds = [...new Set(contracts.map(c => c.tenantId))];

      tenants = await db.tenant.findMany({
        where: { id: { in: tenantIds } },
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Tenant can only see themselves
      const tenant = await db.tenant.findUnique({
        where: { userId: currentUser.id },
        include: { user: true },
      });
      tenants = tenant ? [tenant] : [];
    }

    // Remove passwords from user objects
    const tenantsWithoutPasswords = tenants.map(t => ({
      ...t,
      user: t.user ? (({ password: _, ...rest }) => rest)(t.user) : null,
    }));

    return NextResponse.json(tenantsWithoutPasswords);
  } catch (error) {
    console.error('Get tenants error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create tenant
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
    const { email, password, fullName, phone, address, idType, idNumber, idDocumentUrl, emergencyContact, emergencyPhone } = body;

    if (!email || !password || !fullName || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    // Create user and tenant in transaction
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: fullName,
          phone,
          role: 'TENANT' as UserRole,
          isActive: true,
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          userId: user.id,
          fullName,
          phone,
          address: address || null,
          idType: idType || null,
          idNumber: idNumber || null,
          idDocumentUrl: idDocumentUrl || null,
          emergencyContact: emergencyContact || null,
          emergencyPhone: emergencyPhone || null,
        },
        include: {
          user: true,
        },
      });

      return tenant;
    });

    const { user: { password: _, ...userWithoutPassword }, ...tenantWithoutUserPassword } = { 
      ...result, 
      user: result.user 
    };

    return NextResponse.json({ ...tenantWithoutUserPassword, user: userWithoutPassword });
  } catch (error) {
    console.error('Create tenant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
