import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendSMS, testSMSConfiguration, sendInvoiceSMS, sendPaymentConfirmationSMS } from '@/lib/sms';

// Get SMS settings (masking the API key for security)
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

    const settings = await db.systemSettings.findFirst();
    
    if (!settings) {
      return NextResponse.json({
        smsNotificationEnabled: false,
        smsApiKey: null,
        smsSenderId: null,
        smsBaseUrl: 'https://smsethiopia.et/api/',
        hasApiKey: false,
      });
    }

    // Mask the API key for security (show only last 4 characters)
    const maskedApiKey = settings.smsApiKey 
      ? '****' + settings.smsApiKey.slice(-4) 
      : null;

    return NextResponse.json({
      smsNotificationEnabled: settings.smsNotificationEnabled,
      smsApiKey: maskedApiKey,
      smsSenderId: settings.smsSenderId,
      smsBaseUrl: settings.smsBaseUrl,
      hasApiKey: !!settings.smsApiKey,
    });
  } catch (error) {
    console.error('Get SMS settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Send SMS or test SMS
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({ where: { id: sessionId } });
    if (!currentUser || !['SYSTEM_ADMIN', 'OWNER', 'ACCOUNTANT', 'PROPERTY_ADMIN'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { action, phone, message, invoiceId, paymentId } = body;

    // Test SMS
    if (action === 'test') {
      if (!phone) {
        return NextResponse.json({ error: 'Phone number is required for test' }, { status: 400 });
      }
      
      const result = await testSMSConfiguration(phone);
      return NextResponse.json(result);
    }

    // Send invoice notification
    if (action === 'invoice' && invoiceId) {
      const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          contract: {
            include: {
              tenant: true,
            },
          },
        },
      });

      if (!invoice || !invoice.contract.tenant.phone) {
        return NextResponse.json({ error: 'Invoice or tenant phone not found' }, { status: 404 });
      }

      const result = await sendInvoiceSMS(
        invoice.contract.tenant.phone,
        invoice.contract.tenant.fullName,
        invoice.invoiceNumber,
        invoice.amount,
        invoice.dueDate
      );
      return NextResponse.json(result);
    }

    // Send payment confirmation
    if (action === 'payment' && paymentId) {
      const payment = await db.payment.findUnique({
        where: { id: paymentId },
        include: {
          contract: {
            include: {
              tenant: true,
            },
          },
        },
      });

      if (!payment || !payment.contract.tenant.phone) {
        return NextResponse.json({ error: 'Payment or tenant phone not found' }, { status: 404 });
      }

      const result = await sendPaymentConfirmationSMS(
        payment.contract.tenant.phone,
        payment.contract.tenant.fullName,
        payment.amount,
        payment.transactionId || payment.id.substring(0, 8)
      );
      return NextResponse.json(result);
    }

    // Custom SMS
    if (phone && message) {
      const result = await sendSMS({ to: phone, message });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
  } catch (error) {
    console.error('Send SMS error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
