import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    // Get stats based on role
    let propertyIds: string[] = [];

    if (['SYSTEM_ADMIN', 'OWNER'].includes(currentUser.role)) {
      const properties = await db.property.findMany({ select: { id: true } });
      propertyIds = properties.map(p => p.id);
    } else if (['PROPERTY_ADMIN', 'ACCOUNTANT'].includes(currentUser.role)) {
      const assignments = await db.propertyAssignment.findMany({
        where: { userId: currentUser.id },
        select: { propertyId: true },
      });
      propertyIds = assignments.map(a => a.propertyId);
    } else {
      // Tenant dashboard
      const tenant = await db.tenant.findUnique({ where: { userId: currentUser.id } });
      if (!tenant) {
        return NextResponse.json({
          totalProperties: 0,
          totalUnits: 0,
          occupiedUnits: 0,
          availableUnits: 0,
          totalTenants: 0,
          activeContracts: 0,
          pendingPayments: 0,
          totalRevenue: 0,
          pendingInvoices: 0,
          overdueInvoices: 0,
        });
      }

      const contracts = await db.contract.findMany({
        where: { tenantId: tenant.id },
        include: { invoices: true, payments: true },
      });

      const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length;
      const pendingPayments = contracts.reduce((acc, c) => {
        return acc + (c.payments?.filter(p => p.status === 'PENDING').length || 0);
      }, 0);
      const pendingInvoices = contracts.reduce((acc, c) => {
        return acc + (c.invoices?.filter(i => i.status === 'PENDING').length || 0);
      }, 0);
      const overdueInvoices = contracts.reduce((acc, c) => {
        return acc + (c.invoices?.filter(i => i.status === 'OVERDUE').length || 0);
      }, 0);

      return NextResponse.json({
        totalProperties: [...new Set(contracts.map(c => c.propertyId))].length,
        totalUnits: 0,
        occupiedUnits: 0,
        availableUnits: 0,
        totalTenants: 1,
        activeContracts,
        pendingPayments,
        totalRevenue: 0,
        pendingInvoices,
        overdueInvoices,
      });
    }

    // Get stats for admin/owner/property_admin/accountant
    const [totalProperties, totalUnits, occupiedUnits, availableUnits, totalTenants, activeContracts, pendingPayments, totalRevenue, pendingInvoices, overdueInvoices] = await Promise.all([
      db.property.count({ where: { id: { in: propertyIds } } }),
      db.unit.count({ where: { propertyId: { in: propertyIds } } }),
      db.unit.count({ where: { propertyId: { in: propertyIds }, status: 'occupied' } }),
      db.unit.count({ where: { propertyId: { in: propertyIds }, status: 'available' } }),
      db.tenant.count(),
      db.contract.count({ where: { propertyId: { in: propertyIds }, status: 'ACTIVE' } }),
      db.payment.count({ where: { status: 'PENDING', contract: { propertyId: { in: propertyIds } } } }),
      db.payment.aggregate({
        where: { status: 'APPROVED', contract: { propertyId: { in: propertyIds } } },
        _sum: { amount: true },
      }),
      db.invoice.count({ where: { status: 'PENDING', contract: { propertyId: { in: propertyIds } } } }),
      db.invoice.count({ where: { status: 'OVERDUE', contract: { propertyId: { in: propertyIds } } } }),
    ]);

    return NextResponse.json({
      totalProperties,
      totalUnits,
      occupiedUnits,
      availableUnits,
      totalTenants,
      activeContracts,
      pendingPayments,
      totalRevenue: totalRevenue._sum.amount || 0,
      pendingInvoices,
      overdueInvoices,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
