import { NextResponse } from 'next/server';
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

export async function POST() {
  try {
    // Check if already seeded
    const existingAdmin = await db.user.findFirst({
      where: { role: 'SYSTEM_ADMIN' },
    });

    if (existingAdmin) {
      return NextResponse.json({ message: 'Database already seeded', admin: { email: 'admin@example.com', password: 'admin123' } });
    }

    const hashedPassword = await hashPassword('admin123');

    // Create system admin
    const admin = await db.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'System Admin',
        phone: '+251911000000',
        role: 'SYSTEM_ADMIN' as UserRole,
        isActive: true,
      },
    });

    // Create owner
    const ownerPassword = await hashPassword('owner123');
    const owner = await db.user.create({
      data: {
        email: 'owner@example.com',
        password: ownerPassword,
        name: 'Property Owner',
        phone: '+251911000001',
        role: 'OWNER' as UserRole,
        isActive: true,
      },
    });

    // Create a sample property
    const property = await db.property.create({
      data: {
        name: 'Bole Plaza Apartments',
        address: 'Bole Road, Near Atlas Hotel',
        city: 'Addis Ababa',
        region: 'Addis Ababa',
        description: 'Modern apartment complex in the heart of Bole',
      },
    });

    // Create sample units
    for (let i = 1; i <= 5; i++) {
      await db.unit.create({
        data: {
          propertyId: property.id,
          unitNumber: `A${i.toString().padStart(3, '0')}`,
          floor: 1,
          bedrooms: 2,
          bathrooms: 1,
          area: 85.5,
          monthlyRent: 15000,
          status: 'available',
        },
      });
    }

    // Create system settings
    await db.systemSettings.create({
      data: {
        tenantSelfServiceEnabled: true,
        smsNotificationEnabled: false,
        emailNotificationEnabled: true,
        telegramNotificationEnabled: false,
        whatsappNotificationEnabled: false,
        advancePaymentMaxMonths: 6,
        latePaymentPenaltyPercent: 5.0,
      },
    });

    const { password: _, ...adminWithoutPassword } = admin;

    return NextResponse.json({
      message: 'Database seeded successfully',
      admin: { email: 'admin@example.com', password: 'admin123' },
      owner: { email: 'owner@example.com', password: 'owner123' },
      property: property.name,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
