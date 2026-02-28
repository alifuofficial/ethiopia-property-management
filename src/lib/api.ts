// API utility functions

const API_BASE = '/api';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

export async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api<{ user: import('@/types').User }>('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => api<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  me: () => api<{ user: import('@/types').User }>('/auth/me'),
};

// Users API
export const usersApi = {
  list: () => api<import('@/types').User[]>('/users'),
  create: (data: Partial<import('@/types').User> & { password: string }) =>
    api<import('@/types').User>('/users', { method: 'POST', body: data }),
  update: (id: string, data: Partial<import('@/types').User>) =>
    api<import('@/types').User>(`/users/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => api<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' }),
};

// Properties API
export const propertiesApi = {
  list: () => api<import('@/types').Property[]>('/properties'),
  get: (id: string) => api<import('@/types').Property>(`/properties/${id}`),
  create: (data: Partial<import('@/types').Property>) =>
    api<import('@/types').Property>('/properties', { method: 'POST', body: data }),
  update: (id: string, data: Partial<import('@/types').Property>) =>
    api<import('@/types').Property>(`/properties/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => api<{ success: boolean }>(`/properties/${id}`, { method: 'DELETE' }),
};

// Units API
export const unitsApi = {
  list: (propertyId?: string) => api<import('@/types').Unit[]>(`/units${propertyId ? `?propertyId=${propertyId}` : ''}`),
  create: (data: Partial<import('@/types').Unit>) =>
    api<import('@/types').Unit>('/units', { method: 'POST', body: data }),
  update: (id: string, data: Partial<import('@/types').Unit>) =>
    api<import('@/types').Unit>(`/units/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => api<{ success: boolean }>(`/units/${id}`, { method: 'DELETE' }),
};

// Tenants API
export const tenantsApi = {
  list: () => api<import('@/types').Tenant[]>('/tenants'),
  create: (data: Partial<import('@/types').Tenant> & { email: string; password: string }) =>
    api<import('@/types').Tenant>('/tenants', { method: 'POST', body: data }),
  update: (id: string, data: Partial<import('@/types').Tenant>) =>
    api<import('@/types').Tenant>(`/tenants/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => api<{ success: boolean }>(`/tenants/${id}`, { method: 'DELETE' }),
};

// Contracts API
export const contractsApi = {
  list: (status?: string) => api<import('@/types').Contract[]>(`/contracts${status ? `?status=${status}` : ''}`),
  get: (id: string) => api<import('@/types').Contract>(`/contracts/${id}`),
  create: (data: Partial<import('@/types').Contract> & { unitIds: string[] }) =>
    api<import('@/types').Contract>('/contracts', { method: 'POST', body: data }),
  update: (id: string, data: Partial<import('@/types').Contract>) =>
    api<import('@/types').Contract>(`/contracts/${id}`, { method: 'PUT', body: data }),
  terminate: (id: string, data: { reason: string; bankAccountNumber: string; bankName: string; accountHolderName: string }) =>
    api<import('@/types').ContractTerminationRequest>(`/contracts/${id}/terminate`, { method: 'POST', body: data }),
};

// Invoices API
export const invoicesApi = {
  list: (status?: string) => api<import('@/types').Invoice[]>(`/invoices${status ? `?status=${status}` : ''}`),
  get: (id: string) => api<import('@/types').Invoice>(`/invoices/${id}`),
  create: (contractId: string, data: Partial<import('@/types').Invoice>) =>
    api<import('@/types').Invoice>(`/invoices`, { method: 'POST', body: { contractId, ...data } }),
  send: (id: string, method: string) =>
    api<{ success: boolean }>(`/invoices/${id}/send`, { method: 'POST', body: { method } }),
};

// Payments API
export const paymentsApi = {
  list: (status?: string) => api<import('@/types').Payment[]>(`/payments${status ? `?status=${status}` : ''}`),
  create: (data: Partial<import('@/types').Payment>) =>
    api<import('@/types').Payment>('/payments', { method: 'POST', body: data }),
  approve: (id: string) => api<import('@/types').Payment>(`/payments/${id}/approve`, { method: 'POST' }),
  reject: (id: string, reason: string) =>
    api<import('@/types').Payment>(`/payments/${id}/reject`, { method: 'POST', body: { reason } }),
};

// Termination Requests API
export const terminationApi = {
  list: () => api<import('@/types').ContractTerminationRequest[]>('/terminations'),
  approveByAccountant: (id: string) =>
    api<import('@/types').ContractTerminationRequest>(`/terminations/${id}/accountant-approve`, { method: 'POST' }),
  approveByOwner: (id: string) =>
    api<import('@/types').ContractTerminationRequest>(`/terminations/${id}/owner-approve`, { method: 'POST' }),
  complete: (id: string, receiptUrl: string) =>
    api<import('@/types').ContractTerminationRequest>(`/terminations/${id}/complete`, { method: 'POST', body: { receiptUrl } }),
  reject: (id: string, reason: string) =>
    api<import('@/types').ContractTerminationRequest>(`/terminations/${id}/reject`, { method: 'POST', body: { reason } }),
};

// Property Assignments API
export const assignmentsApi = {
  list: () => api<import('@/types').PropertyAssignment[]>('/assignments'),
  create: (userId: string, propertyId: string) =>
    api<import('@/types').PropertyAssignment>('/assignments', { method: 'POST', body: { userId, propertyId } }),
  delete: (id: string) => api<{ success: boolean }>(`/assignments/${id}`, { method: 'DELETE' }),
};

// Settings API
export const settingsApi = {
  get: () => api<import('@/types').SystemSettings>('/settings'),
  update: (data: Partial<import('@/types').SystemSettings>) =>
    api<import('@/types').SystemSettings>('/settings', { method: 'PUT', body: data }),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => api<import('@/types').DashboardStats>('/dashboard/stats'),
};
