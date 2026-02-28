import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

// Serve uploaded files
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const file = searchParams.get('file');
    
    if (!file) {
      return NextResponse.json({ error: 'No file specified' }, { status: 400 });
    }

    // Security: only allow files from uploads directory
    const sanitizedFile = file.replace(/\.\./g, '');
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'documents', sanitizedFile);
    
    // Check if file is within the allowed directory
    if (!filePath.startsWith(path.join(process.cwd(), 'public', 'uploads'))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const fileBuffer = await readFile(filePath);
    
    // Determine content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                        ext === '.png' ? 'image/png' :
                        ext === '.gif' ? 'image/gif' :
                        ext === '.pdf' ? 'application/pdf' :
                        'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Serve file error:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
