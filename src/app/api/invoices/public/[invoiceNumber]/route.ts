import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceNumber: string }> }
) {
  try {
    const { invoiceNumber } = await params;
    
    const invoice = await db.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        contract: {
          include: {
            tenant: true,
            property: true,
            contractUnits: {
              include: {
                unit: true
              }
            }
          }
        },
        payments: {
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Calculate balance
    const totalAmount = invoice.totalAmount || invoice.amount + (invoice.taxAmount || 0);
    const paidAmount = invoice.paidAmount || 0;
    const balance = totalAmount - paidAmount;

    // Get system settings for payment info
    const settings = await db.systemSettings.findFirst();

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        taxAmount: invoice.taxAmount,
        taxRate: invoice.taxRate,
        totalAmount,
        paidAmount,
        balance,
        dueDate: invoice.dueDate,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        status: invoice.status,
        notes: invoice.notes,
        createdAt: invoice.createdAt,
      },
      tenant: invoice.contract?.tenant ? {
        fullName: invoice.contract.tenant.fullName,
        phone: invoice.contract.tenant.phone,
        email: invoice.contract.tenant.email,
        address: invoice.contract.tenant.address,
      } : null,
      property: invoice.contract?.property ? {
        name: invoice.contract.property.name,
        address: invoice.contract.property.address,
        city: invoice.contract.property.city,
      } : null,
      contract: invoice.contract ? {
        monthlyRent: invoice.contract.monthlyRent,
        startDate: invoice.contract.startDate,
        endDate: invoice.contract.endDate,
        units: invoice.contract.contractUnits.map(cu => ({
          unitNumber: cu.unit?.unitNumber,
          monthlyRent: cu.monthlyRent
        }))
      } : null,
      payments: invoice.payments.map(p => ({
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        paidAt: p.paidAt,
        transactionId: p.transactionId
      })),
      settings: settings ? {
        taxName: settings.taxName,
        taxRate: settings.taxRate,
        taxRegistrationNumber: settings.taxRegistrationNumber,
      } : null
    });
  } catch (error) {
    console.error('Get public invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
