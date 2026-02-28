'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, Printer, Download, CreditCard, Phone, Building, 
  Banknote, Wallet, Clock, Check, AlertTriangle, Receipt,
  Mail, Phone as PhoneIcon, MapPin, Calendar
} from 'lucide-react';

interface PublicInvoiceData {
  invoice: {
    id: string;
    invoiceNumber: string;
    amount: number;
    taxAmount: number;
    taxRate: number;
    totalAmount: number;
    paidAmount: number;
    balance: number;
    dueDate: string;
    periodStart: string;
    periodEnd: string;
    status: string;
    notes: string | null;
    createdAt: string;
  };
  tenant: {
    fullName: string;
    phone: string;
    email: string | null;
    address: string | null;
  } | null;
  property: {
    name: string;
    address: string;
    city: string;
  } | null;
  contract: {
    monthlyRent: number;
    startDate: string;
    endDate: string;
    units: { unitNumber: string; monthlyRent: number }[];
  } | null;
  payments: { amount: number; paymentMethod: string; paidAt: string; transactionId: string | null }[];
  settings: { taxName: string; taxRate: number; taxRegistrationNumber: string | null } | null;
}

export default function PublicInvoicePage() {
  const params = useParams();
  const invoiceNumber = params.invoiceNumber as string;
  const [data, setData] = useState<PublicInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoice();
  }, [invoiceNumber]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/public/${invoiceNumber}`);
      if (!response.ok) {
        throw new Error('Invoice not found');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-amber-500',
      PAID: 'bg-green-500',
      PARTIALLY_PAID: 'bg-blue-500',
      OVERDUE: 'bg-red-500',
      CANCELLED: 'bg-gray-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700 border-amber-300',
      PAID: 'bg-green-100 text-green-700 border-green-300',
      PARTIALLY_PAID: 'bg-blue-100 text-blue-700 border-blue-300',
      OVERDUE: 'bg-red-100 text-red-700 border-red-300',
      CANCELLED: 'bg-gray-100 text-gray-500 border-gray-300',
    };
    return styles[status] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
            <p className="text-gray-600">{error || 'The invoice you are looking for does not exist.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { invoice, tenant, property, contract, payments, settings } = data;
  const qrData = JSON.stringify({
    invoiceNumber: invoice.invoiceNumber,
    amount: invoice.totalAmount,
    tenant: tenant?.fullName,
    dueDate: formatDate(invoice.dueDate),
    status: invoice.status,
  });

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Print/Download Actions - Hidden in print */}
      <div className="print:hidden bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-semibold text-gray-900">Ethiopia Property Management</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handlePrint}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="max-w-4xl mx-auto p-4 print:p-0">
        <div className="bg-white rounded-lg shadow-lg print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/70">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Ethiopia Property Management</h1>
                  <p className="text-gray-600">Professional Property Solutions</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-gray-900">INVOICE</h2>
                <p className="text-gray-600 font-mono">{invoice.invoiceNumber}</p>
                <Badge className={`mt-2 ${getStatusBadge(invoice.status)}`}>
                  {invoice.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Invoice Info & QR */}
          <div className="p-6 border-b bg-gray-50 print:bg-gray-100">
            <div className="flex items-start justify-between">
              <div className="grid grid-cols-2 gap-8">
                {/* Bill To */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Bill To:</h3>
                  <p className="font-medium text-lg">{tenant?.fullName}</p>
                  {tenant?.phone && (
                    <p className="text-gray-600 flex items-center gap-1">
                      <PhoneIcon className="h-3 w-3" /> {tenant.phone}
                    </p>
                  )}
                  {tenant?.email && (
                    <p className="text-gray-600 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {tenant.email}
                    </p>
                  )}
                  {tenant?.address && (
                    <p className="text-gray-600 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {tenant.address}
                    </p>
                  )}
                </div>
                {/* Property Info */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Property:</h3>
                  <p className="font-medium">{property?.name}</p>
                  <p className="text-gray-600">{property?.address}</p>
                  <p className="text-gray-600">{property?.city}</p>
                  {contract?.units && contract.units.length > 0 && (
                    <p className="text-gray-600 mt-1">
                      Unit(s): {contract.units.map(u => u.unitNumber).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              {/* QR Code */}
              <div className="print:hidden">
                <div className="p-2 bg-white rounded-lg shadow border">
                  <QRCodeSVG value={qrData} size={100} level="M" />
                </div>
                <p className="text-xs text-center text-gray-500 mt-1">Scan to verify</p>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="p-6 border-b grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Invoice Date</p>
              <p className="font-semibold">{formatDate(invoice.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Due Date</p>
              <p className="font-semibold flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(invoice.dueDate)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Billing Period</p>
              <p className="font-semibold">
                {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
              </p>
            </div>
          </div>

          {/* Line Items */}
          <div className="p-6">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 text-gray-600 font-semibold">Description</th>
                  <th className="text-right py-3 text-gray-600 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-4">
                    <p className="font-medium">Rent Payment</p>
                    <p className="text-sm text-gray-500">
                      Monthly rent for {property?.name}
                      {contract?.units && contract.units.length > 0 && 
                        ` - Unit(s): ${contract.units.map(u => u.unitNumber).join(', ')}`
                      }
                    </p>
                    <p className="text-xs text-gray-400">
                      Period: {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                    </p>
                  </td>
                  <td className="py-4 text-right font-medium">{invoice.amount.toLocaleString()} ETB</td>
                </tr>
                {invoice.taxAmount > 0 && (
                  <tr className="border-b bg-gray-50 print:bg-gray-100">
                    <td className="py-3">
                      <p className="font-medium">{settings?.taxName || 'VAT'}</p>
                      <p className="text-sm text-gray-500">
                        {invoice.taxRate}% tax rate
                        {settings?.taxRegistrationNumber && 
                          ` • Reg: ${settings.taxRegistrationNumber}`
                        }
                      </p>
                    </td>
                    <td className="py-3 text-right font-medium text-red-600">
                      {invoice.taxAmount.toLocaleString()} ETB
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 print:bg-gray-100">
                  <td className="py-3 px-4">
                    <p className="font-semibold">Subtotal</p>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">{invoice.amount.toLocaleString()} ETB</td>
                </tr>
                {invoice.taxAmount > 0 && (
                  <tr className="bg-gray-50 print:bg-gray-100">
                    <td className="py-2 px-4">
                      <p className="text-gray-600">Tax ({settings?.taxName || 'VAT'})</p>
                    </td>
                    <td className="py-2 px-4 text-right">{invoice.taxAmount.toLocaleString()} ETB</td>
                  </tr>
                )}
                <tr className="bg-primary text-white">
                  <td className="py-4 px-4">
                    <p className="text-lg font-bold">Total Amount</p>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className="text-lg font-bold">{invoice.totalAmount.toLocaleString()} ETB</p>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment Summary */}
          <div className="p-6 border-t bg-gray-50 print:bg-gray-100">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg border">
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-xl font-bold text-gray-900">{invoice.totalAmount.toLocaleString()} ETB</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-600">Amount Paid</p>
                <p className="text-xl font-bold text-green-700">{invoice.paidAmount.toLocaleString()} ETB</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-600">Balance Due</p>
                <p className="text-xl font-bold text-amber-700">{invoice.balance.toLocaleString()} ETB</p>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="p-6 border-t">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                Payment History
              </h3>
              <div className="space-y-2">
                {payments.map((payment, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{payment.amount.toLocaleString()} ETB</p>
                        <p className="text-sm text-gray-500">
                          {payment.paymentMethod?.replace('_', ' ')} 
                          {payment.transactionId && ` • TXN: ${payment.transactionId}`}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      {payment.paidAt ? formatDate(payment.paidAt) : '-'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Options - Hidden in print */}
          <div className="print:hidden p-6 border-t">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment Options
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary">
                <CardContent className="p-4 text-center">
                  <div className="p-3 bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="font-medium">Chapa</p>
                  <p className="text-xs text-gray-500">Pay with Chapa</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary">
                <CardContent className="p-4 text-center">
                  <div className="p-3 bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                    <Phone className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="font-medium">Telebirr</p>
                  <p className="text-xs text-gray-500">Mobile payment</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary">
                <CardContent className="p-4 text-center">
                  <div className="p-3 bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                    <Building className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="font-medium">Bank Transfer</p>
                  <p className="text-xs text-gray-500">Direct transfer</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary">
                <CardContent className="p-4 text-center">
                  <div className="p-3 bg-amber-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                    <Banknote className="h-6 w-6 text-amber-600" />
                  </div>
                  <p className="font-medium">Cash</p>
                  <p className="text-xs text-gray-500">Pay at office</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="p-6 border-t bg-gray-50 print:bg-gray-100">
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-gray-600">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="p-6 border-t text-center text-gray-500 text-sm">
            <p>Thank you for your business!</p>
            <p className="mt-1">
              For questions about this invoice, please contact our office.
            </p>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs">
              <span>Ethiopia Property Management</span>
              <span>•</span>
              <span>Addis Ababa, Ethiopia</span>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
