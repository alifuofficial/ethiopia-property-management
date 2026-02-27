import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Simple password hashing
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get single tenant
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({ where: { id: sessionId } });
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Remove password from user object
    const { user: { password: _, ...userWithoutPassword }, ...tenantWithoutUserPassword } = {
      ...tenant,
      user: tenant.user,
    };

    return NextResponse.json({ ...tenantWithoutUserPassword, user: userWithoutPassword });
  } catch (error) {
    console.error('Get tenant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update tenant
export async function PUT(
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
    const { email, password, fullName, phone, address, idType, idNumber, idDocumentUrl, emergencyContact, emergencyPhone } = body;

    console.log('Update tenant request body:', body);
    console.log('idDocumentUrl received:', idDocumentUrl);

    // Check if tenant exists
    const existingTenant = await db.tenant.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingTenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Check if email is being changed and if it conflicts with another user
    if (email && email !== existingTenant.user?.email) {
      const emailConflict = await db.user.findUnique({ where: { email } });
      if (emailConflict && emailConflict.id !== existingTenant.userId) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }
    }

    // Update user and tenant in transaction
    const result = await db.$transaction(async (tx) => {
      // Update user
      const userData: { email?: string; name?: string; phone?: string; password?: string } = {};
      if (email) userData.email = email;
      if (fullName) userData.name = fullName;
      if (phone) userData.phone = phone;
      if (password) userData.password = await hashPassword(password);

      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: existingTenant.userId },
          data: userData,
        });
      }

      // Build tenant update data
      const tenantUpdateData: {
        fullName?: string;
        phone?: string;
        email?: string;
        address?: string | null;
        idType?: string | null;
        idNumber?: string | null;
        idDocumentUrl?: string | null;
        emergencyContact?: string | null;
        emergencyPhone?: string | null;
      } = {};

      if (fullName) tenantUpdateData.fullName = fullName;
      if (phone) tenantUpdateData.phone = phone;
      if (email) tenantUpdateData.email = email;
      if (address !== undefined) tenantUpdateData.address = address || null;
      if (idType !== undefined) tenantUpdateData.idType = idType || null;
      if (idNumber !== undefined) tenantUpdateData.idNumber = idNumber || null;
      if (idDocumentUrl !== undefined) tenantUpdateData.idDocumentUrl = idDocumentUrl || null;
      if (emergencyContact !== undefined) tenantUpdateData.emergencyContact = emergencyContact || null;
      if (emergencyPhone !== undefined) tenantUpdateData.emergencyPhone = emergencyPhone || null;

      console.log('Tenant update data:', tenantUpdateData);

      // Update tenant
      const tenant = await tx.tenant.update({
        where: { id },
        data: tenantUpdateData,
        include: {
          user: true,
        },
      });

      console.log('Updated tenant:', tenant);

      return tenant;
    });

    // Remove password from response
    const { user: { password: _, ...userWithoutPassword }, ...tenantWithoutUserPassword } = {
      ...result,
      user: result.user,
    };

    return NextResponse.json({ ...tenantWithoutUserPassword, user: userWithoutPassword });
  } catch (error) {
    console.error('Update tenant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete tenant
export async function DELETE(
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    // Check if tenant exists
    const existingTenant = await db.tenant.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingTenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Check if tenant has active contracts
    const activeContracts = await db.contract.count({
      where: {
        tenantId: id,
        status: 'ACTIVE',
      },
    });

    if (activeContracts > 0) {
      return NextResponse.json({
        error: 'Cannot delete tenant with active contracts. Please terminate contracts first.',
      }, { status: 400 });
    }

    // Delete tenant and user in transaction
    await db.$transaction(async (tx) => {
      // Delete tenant
      await tx.tenant.delete({ where: { id } });

      // Delete associated user
      if (existingTenant.userId) {
        await tx.user.delete({ where: { id: existingTenant.userId } });
      }
    });

    return NextResponse.json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Delete tenant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
