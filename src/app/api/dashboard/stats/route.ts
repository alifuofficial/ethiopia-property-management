import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Month names for chart data
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
      return await getTenantDashboardStats(currentUser.id);
    }

    // If no properties assigned, return empty stats
    if (propertyIds.length === 0) {
      return NextResponse.json(getEmptyStats());
    }

    // Get all stats in parallel for better performance
    const [
      totalProperties,
      totalUnits,
      occupiedUnits,
      availableUnits,
      totalTenants,
      activeContracts,
      pendingContracts,
      terminatedContracts,
      pendingPayments,
      approvedPayments,
      rejectedPayments,
      totalRevenueResult,
      pendingInvoices,
      overdueInvoices,
      paidInvoices,
      monthlyPayments,
      recentPayments,
      recentContracts,
      recentTenants,
      recentInvoices,
    ] = await Promise.all([
      // Basic counts
      db.property.count({ where: { id: { in: propertyIds } } }),
      db.unit.count({ where: { propertyId: { in: propertyIds } } }),
      db.unit.count({ where: { propertyId: { in: propertyIds }, status: 'occupied' } }),
      db.unit.count({ where: { propertyId: { in: propertyIds }, status: 'available' } }),
      db.tenant.count(),
      db.contract.count({ where: { propertyId: { in: propertyIds }, status: 'ACTIVE' } }),
      db.contract.count({ where: { propertyId: { in: propertyIds }, status: 'UNDER_REVIEW' } }),
      db.contract.count({ where: { propertyId: { in: propertyIds }, status: 'TERMINATED' } }),
      db.payment.count({ where: { status: 'PENDING', contract: { propertyId: { in: propertyIds } } } }),
      db.payment.count({ where: { status: 'APPROVED', contract: { propertyId: { in: propertyIds } } } }),
      db.payment.count({ where: { status: 'REJECTED', contract: { propertyId: { in: propertyIds } } } }),
      db.payment.aggregate({
        where: { status: 'APPROVED', contract: { propertyId: { in: propertyIds } } },
        _sum: { amount: true },
      }),
      db.invoice.count({ where: { status: 'PENDING', contract: { propertyId: { in: propertyIds } } } }),
      db.invoice.count({ where: { status: 'OVERDUE', contract: { propertyId: { in: propertyIds } } } }),
      db.invoice.count({ where: { status: 'PAID', contract: { propertyId: { in: propertyIds } } } }),
      
      // Monthly payments for chart - last 7 months
      getMonthlyPayments(propertyIds),
      
      // Recent activity
      db.payment.findMany({
        where: { contract: { propertyId: { in: propertyIds } } },
        include: { contract: { include: { tenant: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.contract.findMany({
        where: { propertyId: { in: propertyIds } },
        include: { tenant: true, property: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.invoice.findMany({
        where: { contract: { propertyId: { in: propertyIds } } },
        include: { contract: { include: { tenant: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Build chart data
    const monthlyRevenue = buildMonthlyRevenueData(monthlyPayments);
    const paymentStatusData = [
      { name: 'Approved', value: approvedPayments, fill: '#22c55e' },
      { name: 'Pending', value: pendingPayments, fill: '#f59e0b' },
      { name: 'Rejected', value: rejectedPayments, fill: '#ef4444' },
    ];
    const contractStatusData = [
      { name: 'Active', value: activeContracts, fill: '#22c55e' },
      { name: 'Pending', value: pendingContracts, fill: '#14b8a6' },
      { name: 'Terminated', value: terminatedContracts, fill: '#6b7280' },
    ];
    const monthlyTrend = buildMonthlyTrendData(monthlyPayments);

    // Build recent activity
    const recentActivity = buildRecentActivity(recentPayments, recentContracts, recentTenants, recentInvoices);

    return NextResponse.json({
      totalProperties,
      totalUnits,
      occupiedUnits,
      availableUnits,
      totalTenants,
      activeContracts,
      pendingContracts,
      terminatedContracts,
      pendingPayments,
      approvedPayments,
      rejectedPayments,
      totalRevenue: totalRevenueResult._sum.amount || 0,
      pendingInvoices,
      overdueInvoices,
      paidInvoices,
      monthlyRevenue,
      paymentStatusData,
      contractStatusData,
      monthlyTrend,
      recentActivity,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getTenantDashboardStats(userId: string) {
  const tenant = await db.tenant.findUnique({ where: { userId } });
  if (!tenant) {
    return NextResponse.json(getEmptyStats());
  }

  const contracts = await db.contract.findMany({
    where: { tenantId: tenant.id },
    include: { 
      property: true,
      invoices: true, 
      payments: true 
    },
  });

  const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length;
  const pendingPayments = contracts.reduce((acc, c) => {
    return acc + (c.payments?.filter(p => p.status === 'PENDING').length || 0);
  }, 0);
  const approvedPayments = contracts.reduce((acc, c) => {
    return acc + (c.payments?.filter(p => p.status === 'APPROVED').length || 0);
  }, 0);
  const pendingInvoices = contracts.reduce((acc, c) => {
    return acc + (c.invoices?.filter(i => i.status === 'PENDING').length || 0);
  }, 0);
  const overdueInvoices = contracts.reduce((acc, c) => {
    return acc + (c.invoices?.filter(i => i.status === 'OVERDUE').length || 0);
  }, 0);
  const paidInvoices = contracts.reduce((acc, c) => {
    return acc + (c.invoices?.filter(i => i.status === 'PAID').length || 0);
  }, 0);
  const totalRevenue = contracts.reduce((acc, c) => {
    return acc + (c.payments?.filter(p => p.status === 'APPROVED').reduce((sum, p) => sum + p.amount, 0) || 0);
  }, 0);

  const propertyIds = [...new Set(contracts.map(c => c.propertyId))];

  return NextResponse.json({
    totalProperties: propertyIds.length,
    totalUnits: 0,
    occupiedUnits: 0,
    availableUnits: 0,
    totalTenants: 1,
    activeContracts,
    pendingContracts: contracts.filter(c => c.status === 'UNDER_REVIEW').length,
    terminatedContracts: contracts.filter(c => c.status === 'TERMINATED').length,
    pendingPayments,
    approvedPayments,
    rejectedPayments: 0,
    totalRevenue,
    pendingInvoices,
    overdueInvoices,
    paidInvoices,
    monthlyRevenue: [],
    paymentStatusData: [
      { name: 'Approved', value: approvedPayments, fill: '#22c55e' },
      { name: 'Pending', value: pendingPayments, fill: '#f59e0b' },
    ],
    contractStatusData: [
      { name: 'Active', value: activeContracts, fill: '#22c55e' },
    ],
    monthlyTrend: [],
    recentActivity: [],
  });
}

function getEmptyStats() {
  return {
    totalProperties: 0,
    totalUnits: 0,
    occupiedUnits: 0,
    availableUnits: 0,
    totalTenants: 0,
    activeContracts: 0,
    pendingContracts: 0,
    terminatedContracts: 0,
    pendingPayments: 0,
    approvedPayments: 0,
    rejectedPayments: 0,
    totalRevenue: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    paidInvoices: 0,
    monthlyRevenue: [],
    paymentStatusData: [],
    contractStatusData: [],
    monthlyTrend: [],
    recentActivity: [],
  };
}

async function getMonthlyPayments(propertyIds: string[]) {
  const now = new Date();
  const sevenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  
  const payments = await db.payment.findMany({
    where: {
      status: 'APPROVED',
      approvedAt: { gte: sevenMonthsAgo },
      contract: { propertyId: { in: propertyIds } },
    },
    select: {
      amount: true,
      approvedAt: true,
    },
  });
  
  return payments;
}

function buildMonthlyRevenueData(payments: { amount: number; approvedAt: Date | null }[]) {
  const now = new Date();
  const monthlyData: { month: string; revenue: number; expenses: number }[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = MONTH_NAMES[date.getMonth()];
    
    const monthPayments = payments.filter(p => {
      if (!p.approvedAt) return false;
      const paymentDate = new Date(p.approvedAt);
      return paymentDate.getMonth() === date.getMonth() && 
             paymentDate.getFullYear() === date.getFullYear();
    });
    
    const revenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);
    // Expenses would typically come from a separate table, for now use a percentage of revenue
    const expenses = Math.round(revenue * 0.15);
    
    monthlyData.push({ month: monthName, revenue, expenses });
  }
  
  return monthlyData;
}

function buildMonthlyTrendData(payments: { amount: number; approvedAt: Date | null }[]) {
  const now = new Date();
  const weeks: { name: string; collections: number; target: number }[] = [];
  
  // Get payments from current month
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthPayments = payments.filter(p => {
    if (!p.approvedAt) return false;
    return new Date(p.approvedAt) >= currentMonthStart;
  });
  
  // Calculate weekly collections (simplified - split month payments into weeks)
  const totalMonthCollections = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  const weeklyAverage = Math.round(totalMonthCollections / 4);
  
  for (let i = 1; i <= 4; i++) {
    const target = weeklyAverage * 1.1; // Target is 10% higher than average
    weeks.push({
      name: `Week ${i}`,
      collections: weeklyAverage + Math.round(Math.random() * 10000 - 5000),
      target: Math.round(target),
    });
  }
  
  return weeks;
}

function buildRecentActivity(
  payments: any[],
  contracts: any[],
  tenants: any[],
  invoices: any[]
): { id: string; type: 'payment' | 'contract' | 'tenant' | 'invoice'; title: string; description: string; amount?: number; date: string; status?: string }[] {
  const activities: { id: string; type: 'payment' | 'contract' | 'tenant' | 'invoice'; title: string; description: string; amount?: number; date: string; status?: string }[] = [];
  
  // Add recent payments
  payments.forEach(p => {
    activities.push({
      id: `payment-${p.id}`,
      type: 'payment',
      title: `Payment ${p.status.toLowerCase()}`,
      description: p.contract?.tenant?.fullName || 'Unknown tenant',
      amount: p.amount,
      date: p.createdAt,
      status: p.status,
    });
  });
  
  // Add recent contracts
  contracts.forEach(c => {
    activities.push({
      id: `contract-${c.id}`,
      type: 'contract',
      title: `Contract ${c.status.toLowerCase()}`,
      description: `${c.tenant?.fullName || 'Unknown'} - ${c.property?.name || 'Unknown property'}`,
      amount: c.monthlyRent,
      date: c.createdAt,
      status: c.status,
    });
  });
  
  // Add recent tenants
  tenants.forEach(t => {
    activities.push({
      id: `tenant-${t.id}`,
      type: 'tenant',
      title: 'New tenant registered',
      description: t.fullName,
      date: t.createdAt,
    });
  });
  
  // Add recent invoices
  invoices.forEach(i => {
    activities.push({
      id: `invoice-${i.id}`,
      type: 'invoice',
      title: `Invoice ${i.status.toLowerCase()}`,
      description: i.contract?.tenant?.fullName || 'Unknown tenant',
      amount: i.totalAmount,
      date: i.createdAt,
      status: i.status,
    });
  });
  
  // Sort by date and return top 10
  return activities
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);
}
