import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Upload ID document for tenant
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
    const { file, fileName, tenantId } = body;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const uniqueFileName = `id_${tenantId || timestamp}_${fileName || 'document'}.jpg`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    // Convert base64 to buffer and save
    const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    await writeFile(filePath, buffer);

    // Return the public URL (use serve API for reliable access)
    const publicUrl = `/api/serve?file=${uniqueFileName}`;

    // If tenantId provided, update tenant record
    if (tenantId) {
      await db.tenant.update({
        where: { id: tenantId },
        data: { idDocumentUrl: publicUrl },
      });
    }

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      message: 'Document uploaded successfully' 
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
