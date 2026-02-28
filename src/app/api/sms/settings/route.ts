import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Update SMS settings
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
    const { smsApiKey, smsSenderId, smsNotificationEnabled, smsBaseUrl } = body;

    let settings = await db.systemSettings.findFirst();

    const updateData: Record<string, unknown> = {};
    
    // Only update API key if provided (not masked version)
    if (smsApiKey && !smsApiKey.startsWith('****')) {
      updateData.smsApiKey = smsApiKey;
    }
    
    if (smsSenderId !== undefined) {
      updateData.smsSenderId = smsSenderId;
    }
    
    if (smsNotificationEnabled !== undefined) {
      updateData.smsNotificationEnabled = smsNotificationEnabled;
    }
    
    if (smsBaseUrl !== undefined) {
      updateData.smsBaseUrl = smsBaseUrl;
    }

    if (!settings) {
      settings = await db.systemSettings.create({
        data: updateData,
      });
    } else {
      settings = await db.systemSettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    }

    // Return masked API key
    const maskedApiKey = settings.smsApiKey 
      ? '****' + settings.smsApiKey.slice(-4) 
      : null;

    return NextResponse.json({
      ...settings,
      smsApiKey: maskedApiKey,
      hasApiKey: !!settings.smsApiKey,
    });
  } catch (error) {
    console.error('Update SMS settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
