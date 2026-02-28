import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Get all payment methods
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({ where: { id: sessionId } });
    if (!currentUser || !['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const paymentMethods = await db.paymentMethod.findMany({
      orderBy: [{ type: 'asc' }, { displayOrder: 'asc' }],
    });

    // Mask sensitive data for display
    const maskedMethods = paymentMethods.map(method => ({
      ...method,
      apiKey: method.apiKey ? '••••••••' + (method.apiKey.length > 8 ? method.apiKey.slice(-4) : '') : null,
      secretKey: method.secretKey ? '••••••••••••••••' : null,
    }));

    return NextResponse.json(maskedMethods);
  } catch (error) {
    console.error('Get payment methods error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create new payment method
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({ where: { id: sessionId } });
    if (!currentUser || !['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      type,
      provider,
      apiKey,
      secretKey,
      merchantId,
      callbackUrl,
      baseUrl,
      bankName,
      accountNumber,
      accountHolderName,
      instructions,
      isActive,
      displayOrder,
      feeType,
      feeAmount,
      feePercent,
    } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    if (!['ONLINE', 'OFFLINE'].includes(type)) {
      return NextResponse.json({ error: 'Type must be ONLINE or OFFLINE' }, { status: 400 });
    }

    const paymentMethod = await db.paymentMethod.create({
      data: {
        name,
        type,
        provider: provider || null,
        apiKey: apiKey || null,
        secretKey: secretKey || null,
        merchantId: merchantId || null,
        callbackUrl: callbackUrl || null,
        baseUrl: baseUrl || null,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        accountHolderName: accountHolderName || null,
        instructions: instructions || null,
        isActive: isActive ?? true,
        displayOrder: displayOrder || 0,
        feeType: feeType || 'NONE',
        feeAmount: feeAmount || 0,
        feePercent: feePercent || 0,
      },
    });

    return NextResponse.json(paymentMethod);
  } catch (error) {
    console.error('Create payment method error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update payment method
export async function PUT(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({ where: { id: sessionId } });
    if (!currentUser || !['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Payment method ID is required' }, { status: 400 });
    }

    // Check if we need to update sensitive fields
    const existing = await db.paymentMethod.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    // If apiKey/secretKey contain mask pattern, keep the existing value
    if (updateData.apiKey && updateData.apiKey.includes('•')) {
      delete updateData.apiKey;
    }
    if (updateData.secretKey && updateData.secretKey.includes('•')) {
      delete updateData.secretKey;
    }

    const paymentMethod = await db.paymentMethod.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(paymentMethod);
  } catch (error) {
    console.error('Update payment method error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete payment method
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({ where: { id: sessionId } });
    if (!currentUser || !['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Payment method ID is required' }, { status: 400 });
    }

    await db.paymentMethod.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Payment method deleted' });
  } catch (error) {
    console.error('Delete payment method error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
