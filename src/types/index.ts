// Types for the Property Management System

export type UserRole = 'SYSTEM_ADMIN' | 'OWNER' | 'PROPERTY_ADMIN' | 'ACCOUNTANT' | 'TENANT';

export type ContractStatus = 'DRAFT' | 'UNDER_REVIEW' | 'ACTIVE' | 'PENDING_TERMINATION' | 'TERMINATED' | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type PaymentType = 'ADVANCE' | 'MONTHLY' | 'REFUND';

export type InvoiceStatus = 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';

export type TerminationStatus = 'PENDING' | 'ACCOUNTANT_APPROVED' | 'OWNER_APPROVED' | 'COMPLETED' | 'REJECTED';

export type TaxType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  totalUnits: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  floor?: number;
  bedrooms: number;
  bathrooms: number;
  area?: number;
  monthlyRent: number;
  status: string;
  description?: string;
  property?: Property;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  idType?: string;
  idNumber?: string;
  idDocumentUrl?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: string;
  tenantId: string;
  propertyId: string;
  createdById: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  advancePayment: number;
  remainingAdvance: number;
  status: ContractStatus;
  legalAgreementUrl?: string;
  notes?: string;
  terminationDate?: string;
  tenant?: Tenant;
  property?: Property;
  createdBy?: User;
  units?: ContractUnit[];
  invoices?: Invoice[];
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface ContractUnit {
  id: string;
  contractId: string;
  unitId: string;
  monthlyRent: number;
  unit?: Unit;
}

export interface Invoice {
  id: string;
  contractId: string;
  invoiceNumber: string;
  amount: number;
  taxAmount: number;
  taxRate: number;
  totalAmount: number;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  status: InvoiceStatus;
  paidAmount: number;
  notes?: string;
  sentVia?: string;
  sentAt?: string;
  paymentUrl?: string;
  contract?: Contract;
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  invoiceId?: string;
  contractId: string;
  amount: number;
  paymentType: PaymentType;
  status: PaymentStatus;
  paymentMethod?: string;
  transactionId?: string;
  receiptUrl?: string;
  paidAt?: string;
  approvedById?: string;
  approvedAt?: string;
  rejectionReason?: string;
  notes?: string;
  invoice?: Invoice;
  contract?: Contract;
  approvedBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface ContractTerminationRequest {
  id: string;
  contractId: string;
  requestedById: string;
  reason: string;
  refundAmount?: number;
  bankAccountNumber?: string;
  bankName?: string;
  accountHolderName?: string;
  status: TerminationStatus;
  receiptUrl?: string;
  rejectionReason?: string;
  contract?: Contract;
  requestedBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyAssignment {
  id: string;
  userId: string;
  propertyId: string;
  assignedAt: string;
  user?: User;
  property?: Property;
}

export interface SystemSettings {
  id: string;
  tenantSelfServiceEnabled: boolean;
  smsNotificationEnabled: boolean;
  emailNotificationEnabled: boolean;
  telegramNotificationEnabled: boolean;
  whatsappNotificationEnabled: boolean;
  advancePaymentMaxMonths: number;
  latePaymentPenaltyPercent: number;
  // Tax Configuration
  taxEnabled: boolean;
  taxName: string;
  taxType: TaxType;
  taxRate: number;
  taxFixedAmount: number;
  taxRegistrationNumber?: string;
  taxIncludeInPrice: boolean;
  applyTaxToInvoices: boolean;
  applyTaxToContracts: boolean;
  // Calendar Configuration
  defaultCalendar: 'gregorian' | 'ethiopian';
}

export interface DashboardStats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  availableUnits: number;
  totalTenants: number;
  activeContracts: number;
  pendingPayments: number;
  totalRevenue: number;
  pendingInvoices: number;
  overdueInvoices: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
