'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { 
  Building2, Users, FileText, DollarSign, Settings, LogOut, Menu, X, 
  Home, Plus, Edit, Trash2, Eye, Check, XCircle, Clock, AlertTriangle,
  TrendingUp, PieChart, BarChart3, Upload, Send, MessageSquare, Mail,
  Phone, MapPin, Calendar, CreditCard, Banknote, FileCheck, UserCheck,
  Building, DoorOpen, Receipt, Wallet, ArrowRightLeft, Bell,
  ArrowUpRight, ArrowDownRight, Activity, Target, Zap, Star, Crown
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar, ComposedChart
} from 'recharts';
import type { 
  User, Property, Unit, Tenant, Contract, Invoice, Payment, 
  ContractTerminationRequest, PropertyAssignment, SystemSettings, DashboardStats 
} from '@/types';

// API helper
async function api<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export default function PropertyManagementSystem() {
  const { user, setUser, isAuthenticated, logout } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Data states
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [terminations, setTerminations] = useState<ContractTerminationRequest[]>([]);
  const [assignments, setAssignments] = useState<PropertyAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const data = await api<{ user: User }>('/auth/me');
      setUser(data.user);
      await loadData();
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [settingsData, statsData] = await Promise.all([
        api<SystemSettings>('/settings'),
        api<DashboardStats>('/dashboard/stats'),
      ]);
      setSettings(settingsData);
      setStats(statsData);

      // Load role-specific data
      if (user?.role === 'SYSTEM_ADMIN' || user?.role === 'OWNER') {
        const [propsData, usersData, assignsData] = await Promise.all([
          api<Property[]>('/properties'),
          api<User[]>('/users'),
          api<PropertyAssignment[]>('/assignments'),
        ]);
        setProperties(propsData);
        setUsers(usersData);
        setAssignments(assignsData);
      }

      if (user?.role === 'PROPERTY_ADMIN' || user?.role === 'SYSTEM_ADMIN' || user?.role === 'OWNER') {
        const [unitsData, tenantsData, contractsData] = await Promise.all([
          api<Unit[]>('/units'),
          api<Tenant[]>('/tenants'),
          api<Contract[]>('/contracts'),
        ]);
        setUnits(unitsData);
        setTenants(tenantsData);
        setContracts(contractsData);
      }

      if (user?.role === 'ACCOUNTANT' || user?.role === 'SYSTEM_ADMIN' || user?.role === 'OWNER') {
        const [paymentsData, invoicesData, terminationsData] = await Promise.all([
          api<Payment[]>('/payments'),
          api<Invoice[]>('/invoices'),
          api<ContractTerminationRequest[]>('/terminations'),
        ]);
        setPayments(paymentsData);
        setInvoices(invoicesData);
        setTerminations(terminationsData);
      }

      if (user?.role === 'TENANT') {
        const [contractsData, invoicesData, paymentsData] = await Promise.all([
          api<Contract[]>('/contracts'),
          api<Invoice[]>('/invoices'),
          api<Payment[]>('/payments'),
        ]);
        setContracts(contractsData);
        setInvoices(invoicesData);
        setPayments(paymentsData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, [user?.role]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  const handleLogout = async () => {
    await api('/auth/logout', { method: 'POST' });
    logout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Building2 className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading Property Management System...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="flex h-16 items-center px-4 gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="hover:bg-primary/10">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-lg hidden sm:inline bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Ethiopia Property Management
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Badge variant="outline" className="hidden sm:flex border-primary/20 text-primary bg-primary/5">
              {user?.role.replace('_', ' ')}
            </Badge>
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/50">
              <Avatar className="h-8 w-8 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary font-medium">{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline">{user?.name}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 border-r border-border/50 bg-sidebar overflow-hidden`}>
          <ScrollArea className="h-full">
            <nav className="p-4 space-y-2">
              <SidebarItem icon={<Home />} label="Dashboard" view="dashboard" currentView={currentView} onClick={setCurrentView} />
              
              {(user?.role === 'SYSTEM_ADMIN' || user?.role === 'OWNER') && (
                <>
                  <SidebarSection title="Administration" />
                  <SidebarItem icon={<Users />} label="Users" view="users" currentView={currentView} onClick={setCurrentView} />
                  <SidebarItem icon={<Building2 />} label="Properties" view="properties" currentView={currentView} onClick={setCurrentView} />
                  <SidebarItem icon={<UserCheck />} label="Assignments" view="assignments" currentView={currentView} onClick={setCurrentView} />
                  <SidebarItem icon={<Settings />} label="Settings" view="settings" currentView={currentView} onClick={setCurrentView} />
                </>
              )}

              {(user?.role === 'PROPERTY_ADMIN' || user?.role === 'SYSTEM_ADMIN' || user?.role === 'OWNER') && (
                <>
                  <SidebarSection title="Property Management" />
                  <SidebarItem icon={<DoorOpen />} label="Units" view="units" currentView={currentView} onClick={setCurrentView} />
                  <SidebarItem icon={<Users />} label="Tenants" view="tenants" currentView={currentView} onClick={setCurrentView} />
                  <SidebarItem icon={<FileText />} label="Contracts" view="contracts" currentView={currentView} onClick={setCurrentView} />
                  <SidebarItem icon={<Receipt />} label="Invoices" view="invoices" currentView={currentView} onClick={setCurrentView} />
                </>
              )}

              {(user?.role === 'ACCOUNTANT' || user?.role === 'SYSTEM_ADMIN' || user?.role === 'OWNER') && (
                <>
                  <SidebarSection title="Finance" />
                  <SidebarItem icon={<Wallet />} label="Payments" view="payments" currentView={currentView} onClick={setCurrentView} />
                  <SidebarItem icon={<ArrowRightLeft />} label="Terminations" view="terminations" currentView={currentView} onClick={setCurrentView} />
                </>
              )}

              {user?.role === 'TENANT' && (
                <>
                  <SidebarSection title="My Account" />
                  <SidebarItem icon={<FileText />} label="My Contracts" view="contracts" currentView={currentView} onClick={setCurrentView} />
                  <SidebarItem icon={<Receipt />} label="My Invoices" view="invoices" currentView={currentView} onClick={setCurrentView} />
                  <SidebarItem icon={<Wallet />} label="My Payments" view="payments" currentView={currentView} onClick={setCurrentView} />
                </>
              )}
            </nav>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {currentView === 'dashboard' && <DashboardView stats={stats} user={user} />}
          {currentView === 'users' && <UsersView users={users} setUsers={setUsers} />}
          {currentView === 'properties' && <PropertiesView properties={properties} setProperties={setProperties} />}
          {currentView === 'assignments' && <AssignmentsView assignments={assignments} setAssignments={setAssignments} users={users} properties={properties} />}
          {currentView === 'units' && <UnitsView units={units} setUnits={setUnits} properties={properties} />}
          {currentView === 'tenants' && <TenantsView tenants={tenants} setTenants={setTenants} />}
          {currentView === 'contracts' && <ContractsView contracts={contracts} setContracts={setContracts} tenants={tenants} units={units} properties={properties} payments={payments} />}
          {currentView === 'invoices' && <InvoicesView invoices={invoices} setInvoices={setInvoices} contracts={contracts} />}
          {currentView === 'payments' && <PaymentsView payments={payments} setPayments={setPayments} user={user} />}
          {currentView === 'terminations' && <TerminationsView terminations={terminations} setTerminations={setTerminations} user={user} />}
          {currentView === 'settings' && <SettingsView settings={settings} setSettings={setSettings} />}
        </main>
      </div>
    </div>
  );
}

// Login Form Component
function LoginForm({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await api<{ user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onLogin(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
      const data = await api<{ message: string; admin: { email: string; password: string } }>('/seed', { method: 'POST' });
      toast({
        title: 'Database Seeded',
        description: `Admin: ${data.admin.email} / ${data.admin.password}`,
      });
    } catch (err) {
      console.error('Seed error:', err);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Secure branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/10 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/10 rounded-full" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Ethiopia Property</h1>
                <p className="text-white/70 text-sm">Management System</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Secure Access</h3>
                <p className="text-white/60 text-sm">End-to-end encrypted connection</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Protected Data</h3>
                <p className="text-white/60 text-sm">Your data is safe with us</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Role-Based Access</h3>
                <p className="text-white/60 text-sm">Controlled permissions for all users</p>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-white/10">
            <p className="text-white/50 text-sm">
              Trusted by property managers across Ethiopia
            </p>
            <div className="flex gap-4 mt-4">
              <div className="text-white/40 text-3xl font-bold">50+</div>
              <div className="text-white/40 text-sm">Properties<br />Managed</div>
              <div className="w-px bg-white/10 mx-2" />
              <div className="text-white/40 text-3xl font-bold">200+</div>
              <div className="text-white/40 text-sm">Active<br />Tenants</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background relative">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(oklch(0.55_0.15_145/0.03)_1px,transparent_1px)] [background-size:24px_24px]" />
        
        <div className="w-full max-w-md relative">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="p-3 rounded-xl bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">Ethiopia Property</h1>
              <p className="text-muted-foreground text-sm">Management System</p>
            </div>
          </div>
          
          <Card className="secure-card shadow-xl border-primary/10">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/10 secure-pulse">
                  <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">
                <span className="gradient-text">Secure Login</span>
              </CardTitle>
              <CardDescription>
                Enter your credentials to access the system
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 border-primary/20 focus:border-primary focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 border-primary/20 focus:border-primary focus:ring-primary/20 transition-all"
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {error}
                  </div>
                )}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg shadow-primary/20 transition-all" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Authenticating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Sign In Securely
                    </span>
                  )}
                </Button>
              </form>
              
              <div className="mt-6 pt-6 border-t border-border/50">
                <Button variant="outline" className="w-full h-11 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5" onClick={handleSeed}>
                  <Zap className="h-4 w-4 mr-2 text-primary" />
                  Initialize Demo Data
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  First time? Click to create demo admin account
                </p>
              </div>
              
              {/* Security badges */}
              <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-border/50">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  SSL Secured
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  256-bit Encryption
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Sidebar Components
function SidebarItem({ icon, label, view, currentView, onClick }: {
  icon: React.ReactNode;
  label: string;
  view: string;
  currentView: string;
  onClick: (view: string) => void;
}) {
  const isActive = currentView === view;
  return (
    <button
      onClick={() => onClick(view)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        isActive 
          ? 'bg-primary text-primary-foreground shadow-md' 
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
      }`}
    >
      <span className={`${isActive ? 'text-primary-foreground' : 'text-sidebar-foreground/50'}`}>
        {icon}
      </span>
      {label}
    </button>
  );
}

function SidebarSection({ title }: { title: string }) {
  return (
    <div className="pt-4 pb-2">
      <h3 className="px-3 text-xs font-bold text-sidebar-foreground/40 uppercase tracking-wider">
        {title}
      </h3>
    </div>
  );
}

// Dashboard View
function DashboardView({ stats, user }: { stats: DashboardStats | null; user: User | null }) {
  if (!stats) return <div>Loading...</div>;

  const occupancyRate = stats.totalUnits > 0 ? Math.round((stats.occupiedUnits / stats.totalUnits) * 100) : 0;
  const availableRate = stats.totalUnits > 0 ? Math.round((stats.availableUnits / stats.totalUnits) * 100) : 0;

  // Chart data - Green theme
  const occupancyData = [
    { name: 'Occupied', value: stats.occupiedUnits, fill: '#22c55e' },
    { name: 'Available', value: stats.availableUnits, fill: '#86efac' },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 45000, expenses: 12000 },
    { month: 'Feb', revenue: 52000, expenses: 15000 },
    { month: 'Mar', revenue: 48000, expenses: 13000 },
    { month: 'Apr', revenue: 61000, expenses: 14000 },
    { month: 'May', revenue: 55000, expenses: 16000 },
    { month: 'Jun', revenue: 67000, expenses: 15000 },
    { month: 'Jul', revenue: 72000, expenses: 17000 },
  ];

  const paymentStatusData = [
    { name: 'Approved', value: Math.max(1, stats.pendingPayments > 0 ? stats.pendingPayments * 3 : 5), fill: '#22c55e' },
    { name: 'Pending', value: stats.pendingPayments || 1, fill: '#f59e0b' },
    { name: 'Overdue', value: stats.overdueInvoices || 0, fill: '#ef4444' },
  ];

  const contractData = [
    { name: 'Active', value: stats.activeContracts, fill: '#22c55e' },
    { name: 'Pending', value: Math.max(0, stats.activeContracts > 2 ? 2 : 0), fill: '#14b8a6' },
    { name: 'Terminated', value: Math.max(0, stats.activeContracts > 3 ? 1 : 0), fill: '#6b7280' },
  ];

  const monthlyTrend = [
    { name: 'Week 1', collections: 85000, target: 80000 },
    { name: 'Week 2', collections: 92000, target: 85000 },
    { name: 'Week 3', collections: 78000, target: 90000 },
    { name: 'Week 4', collections: 105000, target: 95000 },
  ];

  return (
    <div className="space-y-6">
      {/* Header with gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-green-500/5 to-emerald-500/5 p-6 border border-primary/10">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your properties today.</p>
        </div>
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-green-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      {/* Stats Cards with Colors */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Total Properties" 
          value={stats.totalProperties} 
          icon={<Building2 className="h-5 w-5" />}
          trend="+2 this month"
          trendUp={true}
          color="green"
        />
        <StatsCard 
          title="Occupied Units" 
          value={`${stats.occupiedUnits}/${stats.totalUnits}`} 
          icon={<Home className="h-5 w-5" />}
          trend={`${occupancyRate}% occupancy`}
          trendUp={occupancyRate > 70}
          color="emerald"
        />
        <StatsCard 
          title="Active Contracts" 
          value={stats.activeContracts} 
          icon={<FileText className="h-5 w-5" />}
          trend="+3 this month"
          trendUp={true}
          color="teal"
        />
        <StatsCard 
          title="Total Revenue" 
          value={`${(stats.totalRevenue || 0).toLocaleString()} ETB`}
          icon={<DollarSign className="h-5 w-5" />}
          trend="+12% vs last month"
          trendUp={true}
          color="lime"
        />
      </div>

      {/* Second row of stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard 
          title="Total Tenants" 
          value={stats.totalTenants} 
          icon={<Users className="h-5 w-5" />}
          color="emerald"
        />
        <StatsCard 
          title="Pending Payments" 
          value={stats.pendingPayments} 
          icon={<Clock className="h-5 w-5" />}
          trend="Needs attention"
          trendUp={false}
          color="amber"
        />
        <StatsCard 
          title="Overdue Invoices" 
          value={stats.overdueInvoices} 
          icon={<AlertTriangle className="h-5 w-5" />}
          trend={stats.overdueInvoices > 0 ? "Action required" : "All good!"}
          trendUp={stats.overdueInvoices === 0}
          color="red"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Trend Chart */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue vs expenses</CardDescription>
            </div>
            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
              <TrendingUp className="h-3 w-3 mr-1" /> +18.5%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} ETB`, '']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="#14b8a6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorExpenses)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Occupancy Pie Chart */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Unit Status</CardTitle>
            <CardDescription>Current occupancy breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={occupancyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {occupancyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">Occupied ({stats.occupiedUnits})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-300" />
                <span className="text-sm text-muted-foreground">Available ({stats.availableUnits})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Payment Status */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Payment Status</CardTitle>
            <CardDescription>Payment distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Approved</span>
                </div>
                <span className="font-medium">{paymentStatusData[0].value}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground">Pending</span>
                </div>
                <span className="font-medium">{stats.pendingPayments}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">Overdue</span>
                </div>
                <span className="font-medium">{stats.overdueInvoices}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collections vs Target */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Collections vs Target</CardTitle>
              <CardDescription>Weekly collection performance</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Goal: 350,000 ETB</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} ETB`, '']}
                  />
                  <Bar dataKey="collections" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="target" stroke="#14b8a6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contract Status */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Contract Distribution</CardTitle>
            <CardDescription>Status breakdown of all contracts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contractData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" stroke="#6b7280" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={12} width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {contractData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Occupancy Gauge */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Occupancy Rate</CardTitle>
            <CardDescription>Current property utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="60%" 
                    outerRadius="100%" 
                    startAngle={180} 
                    endAngle={0}
                    data={[{ value: occupancyRate, fill: '#22c55e' }]}
                  >
                    <RadialBar
                      background={{ fill: '#e5e7eb' }}
                      dataKey="value"
                      cornerRadius={10}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">{occupancyRate}%</div>
                    <div className="text-sm text-muted-foreground">occupied</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              <div className="text-center">
                <div className="text-2xl font-semibold text-primary">{stats.occupiedUnits}</div>
                <div className="text-xs text-muted-foreground">Occupied</div>
              </div>
              <div className="w-px bg-border" />
              <div className="text-center">
                <div className="text-2xl font-semibold text-teal-500">{stats.availableUnits}</div>
                <div className="text-xs text-muted-foreground">Available</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-border/50 shadow-sm bg-gradient-to-br from-primary/5 to-emerald-500/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickActionButton icon={<Plus className="h-4 w-4" />} label="Add Property" color="teal" />
            <QuickActionButton icon={<Users className="h-4 w-4" />} label="Add Tenant" color="purple" />
            <QuickActionButton icon={<FileText className="h-4 w-4" />} label="New Contract" color="orange" />
            <QuickActionButton icon={<Receipt className="h-4 w-4" />} label="Create Invoice" color="green" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp, 
  color 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: 'green' | 'emerald' | 'teal' | 'lime' | 'red' | 'amber';
}) {
  const colorMap = {
    green: 'from-green-500/10 to-green-500/5 border-green-500/20 text-green-600 dark:text-green-400',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    teal: 'from-teal-500/10 to-teal-500/5 border-teal-500/20 text-teal-600 dark:text-teal-400',
    lime: 'from-lime-500/10 to-lime-500/5 border-lime-500/20 text-lime-600 dark:text-lime-400',
    red: 'from-red-500/10 to-red-500/5 border-red-500/20 text-red-600 dark:text-red-400',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400',
  };

  const iconBgMap = {
    green: 'bg-green-500/10 text-green-600',
    emerald: 'bg-emerald-500/10 text-emerald-600',
    teal: 'bg-teal-500/10 text-teal-600',
    lime: 'bg-lime-500/10 text-lime-600',
    red: 'bg-red-500/10 text-red-600',
    amber: 'bg-amber-500/10 text-amber-600',
  };

  return (
    <Card className={`bg-gradient-to-br ${colorMap[color || 'green']} border shadow-sm hover:shadow-md transition-shadow`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${iconBgMap[color || 'green']}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            {trendUp ? (
              <ArrowUpRight className="h-3 w-3 text-green-500" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-red-500" />
            )}
            <span className={`text-xs ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
              {trend}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActionButton({ icon, label, color }: { icon: React.ReactNode; label: string; color: 'green' | 'emerald' | 'teal' | 'lime' }) {
  const colorMap = {
    green: 'hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-600',
    emerald: 'hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600',
    teal: 'hover:bg-teal-500/10 hover:border-teal-500/30 hover:text-teal-600',
    lime: 'hover:bg-lime-500/10 hover:border-lime-500/30 hover:text-lime-600',
  };

  return (
    <button className={`flex items-center gap-2 p-3 rounded-lg border border-border/50 transition-all ${colorMap[color]}`}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// Users View
function UsersView({ users, setUsers }: { users: User[]; setUsers: React.Dispatch<React.SetStateAction<User[]>> }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'PROPERTY_ADMIN',
    isActive: true,
  });

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (user.phone && user.phone.includes(searchQuery));
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'active' && user.isActive) ||
                          (statusFilter === 'inactive' && !user.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Role stats
  const roleStats = {
    total: users.length,
    systemAdmin: users.filter(u => u.role === 'SYSTEM_ADMIN').length,
    owner: users.filter(u => u.role === 'OWNER').length,
    propertyAdmin: users.filter(u => u.role === 'PROPERTY_ADMIN').length,
    accountant: users.filter(u => u.role === 'ACCOUNTANT').length,
    tenant: users.filter(u => u.role === 'TENANT').length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updateData = { ...formData };
        if (!updateData.password) {
          delete (updateData as Record<string, unknown>).password;
        }
        const updated = await api<User>(`/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(updateData),
        });
        setUsers(users.map(u => u.id === updated.id ? updated : u));
        toast({ title: 'Success', description: 'User updated successfully' });
      } else {
        const newUser = await api<User>('/users', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        setUsers([...users, newUser]);
        toast({ title: 'Success', description: 'User created successfully' });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save user', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      await api(`/users/${deletingUser.id}`, { method: 'DELETE' });
      setUsers(users.filter(u => u.id !== deletingUser.id));
      toast({ title: 'Success', description: 'User deleted successfully' });
      setIsDeleteDialogOpen(false);
      setDeletingUser(null);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to delete user', variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const updated = await api<User>(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      setUsers(users.map(u => u.id === updated.id ? updated : u));
      toast({ title: 'Success', description: `User ${!user.isActive ? 'activated' : 'deactivated'}` });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to update user', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', phone: '', role: 'PROPERTY_ADMIN', isActive: true });
    setEditingUser(null);
  };

  const openEdit = (user: User) => {
    setFormData({ ...user, password: '' });
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const openDelete = (user: User) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  const getRoleBadge = (role: string) => {
    const roleStyles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      SYSTEM_ADMIN: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <Star className="h-3 w-3" /> },
      OWNER: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Crown className="h-3 w-3" /> },
      PROPERTY_ADMIN: { bg: 'bg-green-100', text: 'text-green-700', icon: <Building2 className="h-3 w-3" /> },
      ACCOUNTANT: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <DollarSign className="h-3 w-3" /> },
      TENANT: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <Users className="h-3 w-3" /> },
    };
    const style = roleStyles[role] || roleStyles.TENANT;
    return (
      <Badge className={`${style.bg} ${style.text} border-0 flex items-center gap-1`}>
        {style.icon}
        {role.replace('_', ' ')}
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage system users and their roles</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingUser ? <Edit className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                {editingUser ? 'Edit User' : 'Create New User'}
              </DialogTitle>
              <DialogDescription>
                {editingUser ? 'Update user information' : 'Add a new user to the system'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Full Name
                </Label>
                <Input 
                  id="name"
                  placeholder="John Doe" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Input 
                  id="email"
                  type="email" 
                  placeholder="john@example.com"
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Password {editingUser && <span className="text-xs text-muted-foreground">(leave blank to keep current)</span>}
                </Label>
                <Input 
                  id="password"
                  type="password" 
                  placeholder="••••••••"
                  value={formData.password} 
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                  required={!editingUser} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Phone Number
                </Label>
                <Input 
                  id="phone"
                  placeholder="0912345678"
                  value={formData.phone} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  Role
                </Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SYSTEM_ADMIN">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-purple-500" />
                        System Admin
                      </div>
                    </SelectItem>
                    <SelectItem value="OWNER">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500" />
                        Owner
                      </div>
                    </SelectItem>
                    <SelectItem value="PROPERTY_ADMIN">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-green-500" />
                        Property Admin
                      </div>
                    </SelectItem>
                    <SelectItem value="ACCOUNTANT">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-blue-500" />
                        Accountant
                      </div>
                    </SelectItem>
                    <SelectItem value="TENANT">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        Tenant
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Switch 
                    id="isActive" 
                    checked={formData.isActive} 
                    onCheckedChange={(v) => setFormData({ ...formData, isActive: v })} 
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">Active User</Label>
                </div>
                <Badge variant={formData.isActive ? 'default' : 'secondary'} className={formData.isActive ? 'bg-green-500' : ''}>
                  {formData.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-primary to-emerald-500">
                  {editingUser ? 'Update User' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-emerald-500/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-primary">{roleStats.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">System Admins</p>
                <p className="text-2xl font-bold text-purple-600">{roleStats.systemAdmin}</p>
              </div>
              <Star className="h-8 w-8 text-purple-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Owners</p>
                <p className="text-2xl font-bold text-amber-600">{roleStats.owner}</p>
              </div>
              <Crown className="h-8 w-8 text-amber-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Property Admins</p>
                <p className="text-2xl font-bold text-green-600">{roleStats.propertyAdmin}</p>
              </div>
              <Building2 className="h-8 w-8 text-green-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Accountants</p>
                <p className="text-2xl font-bold text-blue-600">{roleStats.accountant}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-emerald-600">{roleStats.active}</p>
              </div>
              <Check className="h-8 w-8 text-emerald-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="SYSTEM_ADMIN">System Admin</SelectItem>
                <SelectItem value="OWNER">Owner</SelectItem>
                <SelectItem value="PROPERTY_ADMIN">Property Admin</SelectItem>
                <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                <SelectItem value="TENANT">Tenant</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-primary text-primary-foreground' : ''}
              >
                <Building2 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={viewMode === 'table' ? 'bg-primary text-primary-foreground' : ''}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Display */}
      {viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <Card key={user.id} className={`group hover:shadow-lg transition-all duration-300 border-border/50 ${!user.isActive ? 'opacity-60' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className={`h-12 w-12 border-2 ${user.isActive ? 'border-primary/20' : 'border-gray-300'}`}>
                      <AvatarFallback className={`text-sm font-bold ${user.isActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {user.name}
                        {!user.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      </h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-500" onClick={() => handleToggleStatus(user)}>
                      {user.isActive ? <XCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => openDelete(user)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  {getRoleBadge(user.role)}
                  {user.phone && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {user.phone}
                    </span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                  Created {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredUsers.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No users found matching your criteria</p>
            </div>
          )}
        </div>
      ) : (
        <Card className="border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className={!user.isActive ? 'opacity-60' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={`text-xs font-bold ${user.isActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone || '-'}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'secondary'} className={user.isActive ? 'bg-green-500' : ''}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-500" onClick={() => handleToggleStatus(user)}>
                        {user.isActive ? <XCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => openDelete(user)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No users found matching your criteria</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingUser?.name}</strong>? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingUser(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Properties View
function PropertiesView({ properties, setProperties }: { properties: Property[]; setProperties: React.Dispatch<React.SetStateAction<Property[]>> }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    region: '',
    description: '',
    isActive: true,
  });

  // Filter properties
  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          property.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
                          (statusFilter === 'active' && property.isActive) ||
                          (statusFilter === 'inactive' && !property.isActive);
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: properties.length,
    active: properties.filter(p => p.isActive).length,
    inactive: properties.filter(p => !p.isActive).length,
    totalUnits: properties.reduce((sum, p) => sum + (p.totalUnits || 0), 0),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProperty) {
        const updated = await api<Property>(`/properties/${editingProperty.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        setProperties(properties.map(p => p.id === updated.id ? updated : p));
        toast({ title: 'Success', description: 'Property updated successfully' });
      } else {
        const newProperty = await api<Property>('/properties', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        setProperties([...properties, newProperty]);
        toast({ title: 'Success', description: 'Property created successfully' });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save property', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deletingProperty) return;
    try {
      await api(`/properties/${deletingProperty.id}`, { method: 'DELETE' });
      setProperties(properties.filter(p => p.id !== deletingProperty.id));
      toast({ title: 'Success', description: 'Property deleted successfully' });
      setIsDeleteDialogOpen(false);
      setDeletingProperty(null);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to delete property', variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (property: Property) => {
    try {
      const updated = await api<Property>(`/properties/${property.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !property.isActive }),
      });
      setProperties(properties.map(p => p.id === updated.id ? updated : p));
      toast({ title: 'Success', description: `Property ${!property.isActive ? 'activated' : 'deactivated'}` });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to update property', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', address: '', city: '', region: '', description: '', isActive: true });
    setEditingProperty(null);
  };

  const openEdit = (property: Property) => {
    setFormData({
      name: property.name,
      address: property.address,
      city: property.city,
      region: property.region,
      description: property.description || '',
      isActive: property.isActive,
    });
    setEditingProperty(property);
    setIsDialogOpen(true);
  };

  const openDelete = (property: Property) => {
    setDeletingProperty(property);
    setIsDeleteDialogOpen(true);
  };

  const openDetail = (property: Property) => {
    setSelectedProperty(property);
    setIsDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">Property Management</h1>
          <p className="text-muted-foreground mt-1">Manage your properties and buildings</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> Add Property
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingProperty ? <Edit className="h-5 w-5 text-primary" /> : <Building2 className="h-5 w-5 text-primary" />}
                {editingProperty ? 'Edit Property' : 'Add New Property'}
              </DialogTitle>
              <DialogDescription>
                {editingProperty ? 'Update property information' : 'Add a new property to your portfolio'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="propName" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Property Name
                </Label>
                <Input
                  id="propName"
                  placeholder="Sunset Apartments"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="propAddress" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Address
                </Label>
                <Input
                  id="propAddress"
                  placeholder="123 Main Street"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="propCity">City</Label>
                  <Input
                    id="propCity"
                    placeholder="Addis Ababa"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propRegion">Region</Label>
                  <Input
                    id="propRegion"
                    placeholder="Addis Ababa"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="propDesc">Description</Label>
                <Textarea
                  id="propDesc"
                  placeholder="Describe your property..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Switch
                    id="propActive"
                    checked={formData.isActive}
                    onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                  />
                  <Label htmlFor="propActive" className="cursor-pointer">Active Property</Label>
                </div>
                <Badge variant={formData.isActive ? 'default' : 'secondary'} className={formData.isActive ? 'bg-green-500' : ''}>
                  {formData.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-primary to-emerald-500">
                  {editingProperty ? 'Update Property' : 'Create Property'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-emerald-500/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Properties</p>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <Check className="h-8 w-8 text-green-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-amber-600">{stats.inactive}</p>
              </div>
              <XCircle className="h-8 w-8 text-amber-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Units</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalUnits}</p>
              </div>
              <DoorOpen className="h-8 w-8 text-blue-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Input
                placeholder="Search by name, address, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-primary text-primary-foreground' : ''}
              >
                <Building2 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={viewMode === 'table' ? 'bg-primary text-primary-foreground' : ''}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Properties Display */}
      {viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property) => (
            <Card 
              key={property.id} 
              className={`group hover:shadow-lg transition-all duration-300 border-border/50 cursor-pointer ${!property.isActive ? 'opacity-60' : ''}`}
              onClick={() => openDetail(property)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${property.isActive ? 'bg-primary/10' : 'bg-gray-100'}`}>
                      <Building2 className={`h-6 w-6 ${property.isActive ? 'text-primary' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {property.name}
                        {!property.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      </h3>
                      <p className="text-sm text-muted-foreground">{property.city}, {property.region}</p>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(property)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-500" onClick={() => handleToggleStatus(property)}>
                      {property.isActive ? <XCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => openDelete(property)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{property.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DoorOpen className="h-4 w-4 text-primary" />
                    <span>{property.totalUnits || 0} units</span>
                  </div>
                </div>
                {property.description && (
                  <p className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground line-clamp-2">
                    {property.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
          {filteredProperties.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No properties found matching your criteria</p>
            </div>
          )}
        </div>
      ) : (
        <Card className="border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Property</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProperties.map((property) => (
                <TableRow 
                  key={property.id} 
                  className={!property.isActive ? 'opacity-60 cursor-pointer' : 'cursor-pointer'}
                  onClick={() => openDetail(property)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded ${property.isActive ? 'bg-primary/10' : 'bg-gray-100'}`}>
                        <Building2 className={`h-4 w-4 ${property.isActive ? 'text-primary' : 'text-gray-400'}`} />
                      </div>
                      <span className="font-medium">{property.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{property.address}</TableCell>
                  <TableCell>{property.city}</TableCell>
                  <TableCell>{property.region}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-primary/20 text-primary">
                      {property.totalUnits || 0} units
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={property.isActive ? 'default' : 'secondary'} className={property.isActive ? 'bg-green-500' : ''}>
                      {property.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(property)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-500" onClick={() => handleToggleStatus(property)}>
                        {property.isActive ? <XCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => openDelete(property)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProperties.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No properties found matching your criteria</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Property
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingProperty?.name}</strong>? This will also delete all units and assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingProperty(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Property
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Property Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {selectedProperty?.name}
            </DialogTitle>
            <DialogDescription>
              Property details and overview
            </DialogDescription>
          </DialogHeader>
          {selectedProperty && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4" />
                    Address
                  </div>
                  <p className="font-medium">{selectedProperty.address}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Building className="h-4 w-4" />
                    City & Region
                  </div>
                  <p className="font-medium">{selectedProperty.city}, {selectedProperty.region}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
                  <p className="text-2xl font-bold text-primary">{selectedProperty.totalUnits || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Units</p>
                </div>
                <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20 text-center">
                  <Badge variant="default" className={selectedProperty.isActive ? 'bg-green-500' : 'bg-gray-400'}>
                    {selectedProperty.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">Status</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 text-center">
                  <p className="text-sm font-medium">{new Date(selectedProperty.createdAt).toLocaleDateString()}</p>
                  <p className="text-xs text-muted-foreground">Created</p>
                </div>
              </div>
              {selectedProperty.description && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{selectedProperty.description}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => { setIsDetailDialogOpen(false); openEdit(selectedProperty); }}>
                  <Edit className="h-4 w-4 mr-2" /> Edit Property
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Assignments View
function AssignmentsView({ assignments, setAssignments, users, properties }: {
  assignments: PropertyAssignment[];
  setAssignments: React.Dispatch<React.SetStateAction<PropertyAssignment[]>>;
  users: User[];
  properties: Property[];
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<'user-to-properties' | 'properties-to-user' | 'single'>('single');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'matrix' | 'table'>('cards');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    userId: '',
    propertyId: '',
    propertyIds: [] as string[],
    userIds: [] as string[],
  });

  const eligibleUsers = users.filter(u => ['PROPERTY_ADMIN', 'ACCOUNTANT'].includes(u.role) && u.isActive);
  const activeProperties = properties.filter(p => p.isActive);

  // Group assignments by user and property for visualization
  const assignmentsByUser = eligibleUsers.map(user => ({
    user,
    properties: assignments
      .filter(a => a.userId === user.id)
      .map(a => a.property)
      .filter(Boolean),
  }));

  const assignmentsByProperty = activeProperties.map(property => ({
    property,
    users: assignments
      .filter(a => a.propertyId === property.id)
      .map(a => a.user)
      .filter(Boolean),
  }));

  // Filter assignments
  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = 
      assignment.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.property?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || assignment.user?.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Stats with more details
  const stats = {
    total: assignments.length,
    propertyAdmins: assignments.filter(a => a.user?.role === 'PROPERTY_ADMIN').length,
    accountants: assignments.filter(a => a.user?.role === 'ACCOUNTANT').length,
    usersWithAssignments: new Set(assignments.map(a => a.userId)).size,
    propertiesWithAssignments: new Set(assignments.map(a => a.propertyId)).size,
    unassignedUsers: eligibleUsers.length - new Set(assignments.map(a => a.userId)).size,
    unassignedProperties: activeProperties.length - new Set(assignments.map(a => a.propertyId)).size,
  };

  // Assignment patterns analysis
  const multiPropertyUsers = assignmentsByUser.filter(a => a.properties.length > 1).length;
  const multiUserProperties = assignmentsByProperty.filter(p => p.users.length > 1).length;

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newAssignment = await api<PropertyAssignment>('/assignments', {
        method: 'POST',
        body: JSON.stringify({ userId: formData.userId, propertyId: formData.propertyId }),
      });
      setAssignments([...assignments, newAssignment]);
      setIsDialogOpen(false);
      resetForm();
      toast({ title: 'Success', description: 'Assignment created successfully' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create assignment', variant: 'destructive' });
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let body: Record<string, unknown> = {};
      
      if (assignmentMode === 'user-to-properties') {
        body = { userId: formData.userId, propertyIds: formData.propertyIds };
      } else if (assignmentMode === 'properties-to-user') {
        body = { propertyId: formData.propertyId, userIds: formData.userIds };
      }

      const result = await api<{ success: boolean; count: number; message: string }>('/assignments', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      // Refresh assignments
      const updated = await api<PropertyAssignment[]>('/assignments');
      setAssignments(updated);
      setIsBulkDialogOpen(false);
      resetForm();
      toast({ title: 'Success', description: result.message || `Created ${result.count} assignment(s)` });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create assignments', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api(`/assignments?id=${id}`, { method: 'DELETE' });
      setAssignments(assignments.filter(a => a.id !== id));
      toast({ title: 'Success', description: 'Assignment removed' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete assignment', variant: 'destructive' });
    }
  };

  const handleDeleteAllForUser = async (userId: string) => {
    try {
      await api(`/assignments?userId=${userId}`, { method: 'DELETE' });
      setAssignments(assignments.filter(a => a.userId !== userId));
      toast({ title: 'Success', description: 'All assignments removed for user' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete assignments', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      propertyId: '',
      propertyIds: [],
      userIds: [],
    });
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      PROPERTY_ADMIN: 'bg-green-100 text-green-700',
      ACCOUNTANT: 'bg-blue-100 text-blue-700',
    };
    return (
      <Badge className={`${styles[role] || 'bg-gray-100 text-gray-700'} border-0`}>
        {role.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-emerald-500/5 to-teal-500/5 p-6 border border-primary/10">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-emerald-500 to-teal-500 bg-clip-text text-transparent">Property Assignments</h1>
            <p className="text-muted-foreground mt-1">Manage user-property relationships with flexible assignment patterns</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={isBulkDialogOpen} onOpenChange={(open) => { setIsBulkDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/5 shadow-sm">
                  <ArrowRightLeft className="mr-2 h-4 w-4" /> Bulk Assign
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-primary" />
                  Bulk Property Assignment
                </DialogTitle>
                <DialogDescription>
                  Assign multiple properties to a user or multiple users to a property
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleBulkSubmit} className="space-y-4">
                {/* Assignment Mode Selection */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                  <Button
                    type="button"
                    variant={assignmentMode === 'user-to-properties' ? 'default' : 'ghost'}
                    className={assignmentMode === 'user-to-properties' ? 'bg-primary text-primary-foreground' : ''}
                    onClick={() => setAssignmentMode('user-to-properties')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    1 User → Many Properties
                  </Button>
                  <Button
                    type="button"
                    variant={assignmentMode === 'properties-to-user' ? 'default' : 'ghost'}
                    className={assignmentMode === 'properties-to-user' ? 'bg-primary text-primary-foreground' : ''}
                    onClick={() => setAssignmentMode('properties-to-user')}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    1 Property → Many Users
                  </Button>
                </div>

                {assignmentMode === 'user-to-properties' ? (
                  <>
                    {/* One User to Many Properties */}
                    <div className="space-y-2">
                      <Label>Select User</Label>
                      <Select value={formData.userId} onValueChange={(v) => setFormData({ ...formData, userId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {eligibleUsers.map(u => (
                            <SelectItem key={u.id} value={u.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">{u.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{u.name}</span>
                                <Badge variant="outline" className="text-xs">{u.role.replace('_', ' ')}</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Select Properties ({formData.propertyIds.length} selected)</Label>
                      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                        {activeProperties.map(p => {
                          const userAssignments = assignments.filter(a => a.userId === formData.userId && a.propertyId === p.id);
                          const alreadyAssigned = userAssignments.length > 0;
                          return (
                            <label key={p.id} className={`flex items-center gap-2 p-2 rounded ${alreadyAssigned ? 'opacity-50' : 'hover:bg-muted cursor-pointer'}`}>
                              <input
                                type="checkbox"
                                checked={formData.propertyIds.includes(p.id) || alreadyAssigned}
                                disabled={alreadyAssigned}
                                onChange={(e) => {
                                  if (alreadyAssigned) return;
                                  if (e.target.checked) {
                                    setFormData({ ...formData, propertyIds: [...formData.propertyIds, p.id] });
                                  } else {
                                    setFormData({ ...formData, propertyIds: formData.propertyIds.filter(id => id !== p.id) });
                                  }
                                }}
                                className="rounded"
                              />
                              <Building2 className="h-4 w-4 text-primary" />
                              <span className="text-sm">{p.name}</span>
                              {alreadyAssigned && <Badge variant="secondary" className="text-xs">Already assigned</Badge>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Many Users to One Property */}
                    <div className="space-y-2">
                      <Label>Select Property</Label>
                      <Select value={formData.propertyId} onValueChange={(v) => setFormData({ ...formData, propertyId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a property" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeProperties.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <span>{p.name}</span>
                                <span className="text-xs text-muted-foreground">({p.city})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Select Users ({formData.userIds.length} selected)</Label>
                      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                        {eligibleUsers.map(u => {
                          const alreadyAssigned = assignments.some(a => a.userId === u.id && a.propertyId === formData.propertyId);
                          return (
                            <label key={u.id} className={`flex items-center gap-2 p-2 rounded ${alreadyAssigned ? 'opacity-50' : 'hover:bg-muted cursor-pointer'}`}>
                              <input
                                type="checkbox"
                                checked={formData.userIds.includes(u.id) || alreadyAssigned}
                                disabled={alreadyAssigned}
                                onChange={(e) => {
                                  if (alreadyAssigned) return;
                                  if (e.target.checked) {
                                    setFormData({ ...formData, userIds: [...formData.userIds, u.id] });
                                  } else {
                                    setFormData({ ...formData, userIds: formData.userIds.filter(id => id !== u.id) });
                                  }
                                }}
                                className="rounded"
                              />
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">{u.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{u.name}</span>
                              {getRoleBadge(u.role)}
                              {alreadyAssigned && <Badge variant="secondary" className="text-xs ml-auto">Already assigned</Badge>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => { setIsBulkDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-primary to-emerald-500">
                    Create Assignments
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" /> Quick Assign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Quick Assignment
                </DialogTitle>
                <DialogDescription>
                  Assign one user to one property
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSingleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>User</Label>
                  <Select value={formData.userId} onValueChange={(v) => setFormData({ ...formData, userId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      {eligibleUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">{u.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {u.name}
                            <Badge variant="outline" className="text-xs">{u.role.replace('_', ' ')}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Property</Label>
                  <Select value={formData.propertyId} onValueChange={(v) => setFormData({ ...formData, propertyId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                    <SelectContent>
                      {activeProperties.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            {p.name}
                            <span className="text-xs text-muted-foreground">({p.city})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-primary to-emerald-500">
                    Create Assignment
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        </div>
      </div>

      {/* Stats Cards - Modern Design */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="group bg-gradient-to-br from-primary/10 to-emerald-500/5 border-primary/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <ArrowRightLeft className="h-4 w-4 text-primary" />
                </div>
                <Badge variant="outline" className="text-xs border-primary/20 text-primary bg-primary/5">
                  {multiPropertyUsers + multiUserProperties} multi
                </Badge>
              </div>
              <p className="text-2xl font-bold text-primary mt-2">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Assignments</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="group bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors w-fit">
                <Building2 className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600 mt-2">{stats.propertyAdmins}</p>
              <p className="text-xs text-muted-foreground">Property Admins</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="group bg-gradient-to-br from-teal-500/10 to-teal-500/5 border-teal-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <div className="p-2 rounded-lg bg-teal-500/10 group-hover:bg-teal-500/20 transition-colors w-fit">
                <DollarSign className="h-4 w-4 text-teal-600" />
              </div>
              <p className="text-2xl font-bold text-teal-600 mt-2">{stats.accountants}</p>
              <p className="text-xs text-muted-foreground">Accountants</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="group bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
                {stats.unassignedUsers > 0 && (
                  <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 bg-amber-50">
                    {stats.unassignedUsers} free
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-purple-600 mt-2">{stats.usersWithAssignments}</p>
              <p className="text-xs text-muted-foreground">Users Assigned</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="group bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                  <Building className="h-4 w-4 text-amber-600" />
                </div>
                {stats.unassignedProperties > 0 && (
                  <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 bg-amber-50">
                    {stats.unassignedProperties} free
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-amber-600 mt-2">{stats.propertiesWithAssignments}</p>
              <p className="text-xs text-muted-foreground">Properties Covered</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="group bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <div className="p-2 rounded-lg bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors w-fit">
                <UserCheck className="h-4 w-4 text-rose-600" />
              </div>
              <p className="text-2xl font-bold text-rose-600 mt-2">{multiPropertyUsers}</p>
              <p className="text-xs text-muted-foreground">Multi-Property Users</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="group bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <div className="p-2 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors w-fit">
                <Star className="h-4 w-4 text-cyan-600" />
              </div>
              <p className="text-2xl font-bold text-cyan-600 mt-2">{multiUserProperties}</p>
              <p className="text-xs text-muted-foreground">Multi-User Properties</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & View Toggle */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Input
                placeholder="Search by user or property name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-primary/20 focus:border-primary"
              />
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-44 border-primary/20">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="PROPERTY_ADMIN">Property Admin</SelectItem>
                <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className={viewMode === 'cards' ? 'bg-primary text-primary-foreground shadow-sm' : ''}
              >
                <Users className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'matrix' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('matrix')}
                className={viewMode === 'matrix' ? 'bg-primary text-primary-foreground shadow-sm' : ''}
              >
                <Target className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={viewMode === 'table' ? 'bg-primary text-primary-foreground shadow-sm' : ''}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Assignment Hints */}
      {assignments.length === 0 && (
        <Card className="border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-emerald-500/5">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <ArrowRightLeft className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">No Assignments Yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Start by assigning users to properties. You can create:
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">1 User → 1 Property</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
                  <Users className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-medium">1 User → Many Properties</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <Building2 className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Many Users → 1 Property</span>
                </div>
              </div>
              <Button className="mt-4 bg-gradient-to-r from-primary to-emerald-500 shadow-lg shadow-primary/20" onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create First Assignment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Display */}
      {viewMode === 'cards' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assignmentsByUser.filter(item => item.properties.length > 0).map(({ user, properties: userProperties }) => (
            <Card key={user.id} className="group hover:shadow-xl transition-all duration-300 border-border/50 bg-gradient-to-br from-card to-muted/20 overflow-hidden">
              {/* Card Header with user info */}
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-sm">
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-emerald-500/20 text-primary font-bold text-lg">{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {userProperties.length > 1 && (
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center font-medium shadow-sm">
                          {userProperties.length}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{user.name}</h3>
                      {getRoleBadge(user.role)}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove All Assignments?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove all {userProperties.length} property assignment(s) for {user.name}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteAllForUser(user.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Remove All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              
              {/* Properties List */}
              <div className="px-5 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground font-medium">Assigned Properties</p>
                  <Badge variant="outline" className="text-xs border-primary/20 text-primary">
                    {userProperties.length} {userProperties.length === 1 ? 'property' : 'properties'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {userProperties.slice(0, 3).map(prop => (
                    <div key={prop?.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors group/item">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-primary/10">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-medium">{prop?.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover/item:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                        onClick={() => {
                          const assignment = assignments.find(a => a.userId === user.id && a.propertyId === prop?.id);
                          if (assignment) handleDelete(assignment.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {userProperties.length > 3 && (
                    <div className="text-center py-2">
                      <Badge variant="secondary" className="text-xs">
                        +{userProperties.length - 3} more properties
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {assignmentsByUser.filter(item => item.properties.length > 0).length === 0 && assignments.length > 0 && (
            <div className="col-span-full text-center py-12">
              <ArrowRightLeft className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No assignments found matching your criteria</p>
            </div>
          )}
        </div>
      ) : viewMode === 'matrix' ? (
        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-3 text-left text-sm font-medium sticky left-0 bg-muted/50 z-10 min-w-32">
                      <Users className="h-4 w-4 inline mr-2 text-muted-foreground" />
                      Users
                    </th>
                    {activeProperties.slice(0, 8).map(prop => (
                      <th key={prop.id} className="p-3 text-center text-sm font-medium min-w-24">
                        <div className="flex flex-col items-center gap-1">
                          <Building2 className="h-4 w-4 text-primary" />
                          <span className="truncate max-w-20" title={prop.name}>{prop.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eligibleUsers.slice(0, 10).map(user => (
                    <tr key={user.id} className="border-t border-border/50 hover:bg-muted/30">
                      <td className="p-3 sticky left-0 bg-background z-10">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <Badge variant="outline" className="text-xs">{user.role.replace('_', ' ')}</Badge>
                          </div>
                        </div>
                      </td>
                      {activeProperties.slice(0, 8).map(prop => {
                        const assignment = assignments.find(a => a.userId === user.id && a.propertyId === prop.id);
                        return (
                          <td key={prop.id} className="p-3 text-center">
                            {assignment ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-full bg-green-500/10 hover:bg-red-500/20 group"
                                onClick={() => handleDelete(assignment.id)}
                              >
                                <Check className="h-4 w-4 text-green-500 group-hover:hidden" />
                                <X className="h-4 w-4 text-red-500 hidden group-hover:block" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-full hover:bg-primary/10"
                                onClick={async () => {
                                  try {
                                    await api('/assignments', {
                                      method: 'POST',
                                      body: JSON.stringify({ userId: user.id, propertyId: prop.id }),
                                    });
                                    const updated = await api<PropertyAssignment[]>('/assignments');
                                    setAssignments(updated);
                                    toast({ title: 'Success', description: 'Assignment created' });
                                  } catch (err) {
                                    toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
                                  }
                                }}
                              >
                                <Plus className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(activeProperties.length > 8 || eligibleUsers.length > 10) && (
              <div className="p-3 border-t border-border/50 text-center text-sm text-muted-foreground">
                Showing {Math.min(10, eligibleUsers.length)} of {eligibleUsers.length} users and {Math.min(8, activeProperties.length)} of {activeProperties.length} properties
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Assigned At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{assignment.user?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{assignment.user?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(assignment.user?.role || '')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      {assignment.property?.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {assignment.property?.city}, {assignment.property?.region}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(assignment.assignedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Assignment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {assignment.user?.name} from {assignment.property?.name}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(assignment.id)}>Remove</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
              {filteredAssignments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <ArrowRightLeft className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No assignments found matching your criteria</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// Units View
function UnitsView({ units, setUnits, properties }: {
  units: Unit[];
  setUnits: React.Dispatch<React.SetStateAction<Unit[]>>;
  properties: Property[];
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [formData, setFormData] = useState({
    propertyId: '',
    unitNumber: '',
    floor: '',
    bedrooms: '1',
    bathrooms: '1',
    area: '',
    monthlyRent: '',
    description: '',
    status: 'available',
  });

  const filteredUnits = selectedProperty === 'all' 
    ? units 
    : units.filter(u => u.propertyId === selectedProperty);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newUnit = await api<Unit>('/units', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          floor: formData.floor ? parseInt(formData.floor) : null,
          bedrooms: parseInt(formData.bedrooms),
          bathrooms: parseInt(formData.bathrooms),
          area: formData.area ? parseFloat(formData.area) : null,
          monthlyRent: parseFloat(formData.monthlyRent),
        }),
      });
      setUnits([...units, newUnit]);
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create unit', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      propertyId: '',
      unitNumber: '',
      floor: '',
      bedrooms: '1',
      bathrooms: '1',
      area: '',
      monthlyRent: '',
      description: '',
      status: 'available',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Units</h1>
        <div className="flex items-center gap-4">
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Unit</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Unit</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Property</Label>
                  <Select value={formData.propertyId} onValueChange={(v) => setFormData({ ...formData, propertyId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                    <SelectContent>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unit Number</Label>
                    <Input value={formData.unitNumber} onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Floor</Label>
                    <Input type="number" value={formData.floor} onChange={(e) => setFormData({ ...formData, floor: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bedrooms</Label>
                    <Input type="number" value={formData.bedrooms} onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bathrooms</Label>
                    <Input type="number" value={formData.bathrooms} onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Area (sqm)</Label>
                    <Input type="number" value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Rent (ETB)</Label>
                    <Input type="number" value={formData.monthlyRent} onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button type="submit">Create Unit</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Beds/Baths</TableHead>
              <TableHead>Rent (ETB)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUnits.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell className="font-medium">{unit.unitNumber}</TableCell>
                <TableCell>{unit.property?.name}</TableCell>
                <TableCell>{unit.bedrooms} / {unit.bathrooms}</TableCell>
                <TableCell>{unit.monthlyRent.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={unit.status === 'available' ? 'default' : unit.status === 'occupied' ? 'secondary' : 'destructive'}>
                    {unit.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// Tenants View
function TenantsView({ tenants, setTenants }: {
  tenants: Tenant[];
  setTenants: React.Dispatch<React.SetStateAction<Tenant[]>>;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    idType: '',
    idNumber: '',
    emergencyContact: '',
    emergencyPhone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newTenant = await api<Tenant>('/tenants', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setTenants([...tenants, newTenant]);
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create tenant', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      idType: '',
      idNumber: '',
      emergencyContact: '',
      emergencyPhone: '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tenants</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Tenant</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Tenant</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ID Type</Label>
                  <Select value={formData.idType} onValueChange={(v) => setFormData({ ...formData, idType: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="national_id">National ID</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="kebele_id">Kebele ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ID Number</Label>
                  <Input value={formData.idNumber} onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Emergency Contact</Label>
                  <Input value={formData.emergencyContact} onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Phone</Label>
                  <Input value={formData.emergencyPhone} onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Tenant</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-medium">{tenant.fullName}</TableCell>
                <TableCell>{tenant.phone}</TableCell>
                <TableCell>{tenant.email || tenant.user?.email}</TableCell>
                <TableCell>{tenant.idType}: {tenant.idNumber}</TableCell>
                <TableCell>{new Date(tenant.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// Contracts View
function ContractsView({ contracts, setContracts, tenants, units, properties, payments }: {
  contracts: Contract[];
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  tenants: Tenant[];
  units: Unit[];
  properties: Property[];
  payments: Payment[];
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTerminateOpen, setIsTerminateOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState({
    tenantId: '',
    propertyId: '',
    unitIds: [] as string[],
    startDate: '',
    endDate: '',
    monthlyRent: '',
    securityDeposit: '0',
    advancePayment: '0',
    notes: '',
    legalAgreementUrl: '',
  });
  const [terminateData, setTerminateData] = useState({
    reason: '',
    bankAccountNumber: '',
    bankName: '',
    accountHolderName: '',
  });

  const availableUnits = units.filter(u => u.propertyId === formData.propertyId && u.status === 'available');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newContract = await api<Contract>('/contracts', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          monthlyRent: parseFloat(formData.monthlyRent),
          securityDeposit: parseFloat(formData.securityDeposit),
          advancePayment: parseFloat(formData.advancePayment),
        }),
      });
      setContracts([...contracts, newContract]);
      setIsDialogOpen(false);
      resetForm();
      toast({ title: 'Success', description: 'Contract created successfully' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create contract', variant: 'destructive' });
    }
  };

  const handleTerminate = async () => {
    if (!selectedContract) return;
    try {
      await api(`/contracts/${selectedContract.id}/terminate`, {
        method: 'POST',
        body: JSON.stringify(terminateData),
      });
      const updated = await api<Contract[]>('/contracts');
      setContracts(updated);
      setIsTerminateOpen(false);
      setTerminateData({ reason: '', bankAccountNumber: '', bankName: '', accountHolderName: '' });
      toast({ title: 'Success', description: 'Termination request submitted' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to request termination', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      tenantId: '',
      propertyId: '',
      unitIds: [],
      startDate: '',
      endDate: '',
      monthlyRent: '',
      securityDeposit: '0',
      advancePayment: '0',
      notes: '',
      legalAgreementUrl: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      DRAFT: 'secondary',
      UNDER_REVIEW: 'outline',
      ACTIVE: 'default',
      PENDING_TERMINATION: 'destructive',
      TERMINATED: 'secondary',
      CANCELLED: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Contracts</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Contract</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Contract</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tenant</Label>
                <Select value={formData.tenantId} onValueChange={(v) => setFormData({ ...formData, tenantId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
                  <SelectContent>
                    {tenants.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Property</Label>
                <Select value={formData.propertyId} onValueChange={(v) => setFormData({ ...formData, propertyId: v, unitIds: [] })}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Units</Label>
                <div className="border rounded-lg p-2 max-h-32 overflow-y-auto">
                  {availableUnits.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No available units</p>
                  ) : (
                    availableUnits.map(u => (
                      <label key={u.id} className="flex items-center gap-2 p-1">
                        <input
                          type="checkbox"
                          checked={formData.unitIds.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, unitIds: [...formData.unitIds, u.id], monthlyRent: String(parseFloat(formData.monthlyRent || '0') + u.monthlyRent) });
                            } else {
                              setFormData({ ...formData, unitIds: formData.unitIds.filter(id => id !== u.id) });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{u.unitNumber} - {u.monthlyRent.toLocaleString()} ETB/mo</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Rent (ETB)</Label>
                  <Input type="number" value={formData.monthlyRent} onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Security Deposit (ETB)</Label>
                  <Input type="number" value={formData.securityDeposit} onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Advance Payment (ETB)</Label>
                <Input type="number" value={formData.advancePayment} onChange={(e) => setFormData({ ...formData, advancePayment: e.target.value })} />
                <p className="text-xs text-muted-foreground">Optional advance payment. Contract will be under review until payment is approved.</p>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="submit">Create Contract</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>Rent (ETB)</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id}>
                <TableCell className="font-medium">{contract.tenant?.fullName}</TableCell>
                <TableCell>{contract.property?.name}</TableCell>
                <TableCell>{contract.units?.map(u => u.unit?.unitNumber).join(', ')}</TableCell>
                <TableCell>{contract.monthlyRent.toLocaleString()}</TableCell>
                <TableCell>
                  {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}
                </TableCell>
                <TableCell>{getStatusBadge(contract.status)}</TableCell>
                <TableCell>
                  {contract.status === 'ACTIVE' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedContract(contract);
                        setIsTerminateOpen(true);
                      }}
                    >
                      Terminate
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Termination Dialog */}
      <Dialog open={isTerminateOpen} onOpenChange={setIsTerminateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Contract Termination</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={terminateData.reason} onChange={(e) => setTerminateData({ ...terminateData, reason: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Bank Account Number</Label>
              <Input value={terminateData.bankAccountNumber} onChange={(e) => setTerminateData({ ...terminateData, bankAccountNumber: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input value={terminateData.bankName} onChange={(e) => setTerminateData({ ...terminateData, bankName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Account Holder Name</Label>
                <Input value={terminateData.accountHolderName} onChange={(e) => setTerminateData({ ...terminateData, accountHolderName: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTerminateOpen(false)}>Cancel</Button>
              <Button onClick={handleTerminate}>Submit Request</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Invoices View
function InvoicesView({ invoices, setInvoices, contracts }: {
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  contracts: Contract[];
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sendingSmsId, setSendingSmsId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    contractId: '',
    amount: '',
    dueDate: '',
    periodStart: '',
    periodEnd: '',
    notes: '',
    sendSmsNotification: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newInvoice = await api<Invoice>('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });
      setInvoices([...invoices, newInvoice]);
      setIsDialogOpen(false);
      
      // Send SMS notification if enabled
      if (formData.sendSmsNotification && newInvoice.id) {
        try {
          await api('/sms', {
            method: 'POST',
            body: JSON.stringify({ action: 'invoice', invoiceId: newInvoice.id }),
          });
          toast({ title: 'Success', description: 'Invoice created and SMS notification sent' });
        } catch {
          toast({ title: 'Warning', description: 'Invoice created but SMS failed to send' });
        }
      } else {
        toast({ title: 'Success', description: 'Invoice created' });
      }
      
      resetForm();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create invoice', variant: 'destructive' });
    }
  };

  const handleSendSms = async (invoiceId: string) => {
    setSendingSmsId(invoiceId);
    try {
      const result = await api<{ success: boolean; message: string }>('/sms', {
        method: 'POST',
        body: JSON.stringify({ action: 'invoice', invoiceId }),
      });
      if (result.success) {
        toast({ title: 'Success', description: 'SMS notification sent' });
      } else {
        toast({ title: 'Failed', description: result.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to send SMS', variant: 'destructive' });
    } finally {
      setSendingSmsId(null);
    }
  };

  const resetForm = () => {
    setFormData({ contractId: '', amount: '', dueDate: '', periodStart: '', periodEnd: '', notes: '', sendSmsNotification: false });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PENDING: 'outline',
      PAID: 'default',
      PARTIALLY_PAID: 'secondary',
      OVERDUE: 'destructive',
      CANCELLED: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Create Invoice</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Contract</Label>
                <Select value={formData.contractId} onValueChange={(v) => setFormData({ ...formData, contractId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select contract" /></SelectTrigger>
                  <SelectContent>
                    {contracts.filter(c => c.status === 'ACTIVE').map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.tenant?.fullName} - {c.property?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (ETB)</Label>
                  <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Period Start</Label>
                  <Input type="date" value={formData.periodStart} onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Period End</Label>
                  <Input type="date" value={formData.periodEnd} onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <Switch
                  id="sendSms"
                  checked={formData.sendSmsNotification}
                  onCheckedChange={(v) => setFormData({ ...formData, sendSmsNotification: v })}
                />
                <Label htmlFor="sendSms" className="flex items-center gap-2 cursor-pointer">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Send SMS notification to tenant
                </Label>
              </div>
              <DialogFooter>
                <Button type="submit">Create Invoice</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                <TableCell>{invoice.contract?.tenant?.fullName}</TableCell>
                <TableCell>{invoice.amount.toLocaleString()} ETB</TableCell>
                <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                <TableCell>{invoice.paidAmount.toLocaleString()} ETB</TableCell>
                <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSendSms(invoice.id)}
                    disabled={sendingSmsId === invoice.id}
                    className="text-primary hover:bg-primary/10"
                  >
                    {sendingSmsId === invoice.id ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// Payments View
function PaymentsView({ payments, setPayments, user }: {
  payments: Payment[];
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  user: User | null;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    contractId: '',
    invoiceId: '',
    amount: '',
    paymentType: 'MONTHLY',
    paymentMethod: 'bank_transfer',
    transactionId: '',
    notes: '',
  });

  const canApprove = user?.role && ['SYSTEM_ADMIN', 'OWNER', 'ACCOUNTANT'].includes(user.role);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newPayment = await api<Payment>('/payments', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });
      setPayments([...payments, newPayment]);
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create payment', variant: 'destructive' });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api(`/payments/${id}/approve`, { method: 'POST' });
      const updated = await api<Payment[]>('/payments');
      setPayments(updated);
      
      // Send SMS notification for payment confirmation
      try {
        await api('/sms', {
          method: 'POST',
          body: JSON.stringify({ action: 'payment', paymentId: id }),
        });
        toast({ title: 'Success', description: 'Payment approved and SMS sent' });
      } catch {
        toast({ title: 'Success', description: 'Payment approved (SMS failed)' });
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to approve', variant: 'destructive' });
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await api(`/payments/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      const updated = await api<Payment[]>('/payments');
      setPayments(updated);
      toast({ title: 'Success', description: 'Payment rejected' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to reject', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      contractId: '',
      invoiceId: '',
      amount: '',
      paymentType: 'MONTHLY',
      paymentMethod: 'bank_transfer',
      transactionId: '',
      notes: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PENDING: 'outline',
      APPROVED: 'default',
      REJECTED: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Payments</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Record Payment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (ETB)</Label>
                  <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.paymentType} onValueChange={(v) => setFormData({ ...formData, paymentType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="ADVANCE">Advance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chapa">Chapa</SelectItem>
                      <SelectItem value="telebirr">Telebirr</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Transaction ID</Label>
                  <Input value={formData.transactionId} onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="submit">Record Payment</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              {canApprove && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.contract?.tenant?.fullName}</TableCell>
                <TableCell>{payment.amount.toLocaleString()} ETB</TableCell>
                <TableCell>{payment.paymentType}</TableCell>
                <TableCell>{payment.paymentMethod || '-'}</TableCell>
                <TableCell>{getStatusBadge(payment.status)}</TableCell>
                <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                {canApprove && (
                  <TableCell>
                    {payment.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprove(payment.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(payment.id)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// Terminations View
function TerminationsView({ terminations, setTerminations, user }: {
  terminations: ContractTerminationRequest[];
  setTerminations: React.Dispatch<React.SetStateAction<ContractTerminationRequest[]>>;
  user: User | null;
}) {
  const handleAccountantApprove = async (id: string) => {
    try {
      await api(`/terminations/${id}/accountant-approve`, { method: 'POST' });
      const updated = await api<ContractTerminationRequest[]>('/terminations');
      setTerminations(updated);
      toast({ title: 'Success', description: 'Approved by accountant' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to approve', variant: 'destructive' });
    }
  };

  const handleOwnerApprove = async (id: string) => {
    try {
      await api(`/terminations/${id}/owner-approve`, { method: 'POST' });
      const updated = await api<ContractTerminationRequest[]>('/terminations');
      setTerminations(updated);
      toast({ title: 'Success', description: 'Approved by owner' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to approve', variant: 'destructive' });
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await api(`/terminations/${id}/complete`, { method: 'POST', body: JSON.stringify({ receiptUrl: '' }) });
      const updated = await api<ContractTerminationRequest[]>('/terminations');
      setTerminations(updated);
      toast({ title: 'Success', description: 'Termination completed' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to complete', variant: 'destructive' });
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await api(`/terminations/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
      const updated = await api<ContractTerminationRequest[]>('/terminations');
      setTerminations(updated);
      toast({ title: 'Success', description: 'Request rejected' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to reject', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PENDING: 'outline',
      ACCOUNTANT_APPROVED: 'secondary',
      OWNER_APPROVED: 'default',
      COMPLETED: 'default',
      REJECTED: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status.replace('_', ' ')}</Badge>;
  };

  const isAccountant = user?.role === 'ACCOUNTANT' || user?.role === 'SYSTEM_ADMIN' || user?.role === 'OWNER';
  const isOwner = user?.role === 'OWNER' || user?.role === 'SYSTEM_ADMIN';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Contract Terminations</h1>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Refund</TableHead>
              <TableHead>Bank Info</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {terminations.map((term) => (
              <TableRow key={term.id}>
                <TableCell>{term.contract?.tenant?.fullName}</TableCell>
                <TableCell className="max-w-xs truncate">{term.reason}</TableCell>
                <TableCell>{term.refundAmount?.toLocaleString() || 0} ETB</TableCell>
                <TableCell>
                  {term.bankName && (
                    <span className="text-sm">{term.bankName} - {term.bankAccountNumber}</span>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(term.status)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {term.status === 'PENDING' && isAccountant && (
                      <>
                        <Button size="sm" onClick={() => handleAccountantApprove(term.id)}>
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(term.id)}>
                          Reject
                        </Button>
                      </>
                    )}
                    {term.status === 'ACCOUNTANT_APPROVED' && isOwner && (
                      <Button size="sm" onClick={() => handleOwnerApprove(term.id)}>
                        Owner Approve
                      </Button>
                    )}
                    {term.status === 'OWNER_APPROVED' && isAccountant && (
                      <Button size="sm" onClick={() => handleComplete(term.id)}>
                        Complete & Pay
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// Settings View
function SettingsView({ settings, setSettings }: {
  settings: SystemSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings | null>>;
}) {
  const [activeCategory, setActiveCategory] = useState<string>('notifications');
  const [formData, setFormData] = useState(() => ({
    tenantSelfServiceEnabled: settings?.tenantSelfServiceEnabled ?? false,
    smsNotificationEnabled: settings?.smsNotificationEnabled ?? false,
    emailNotificationEnabled: settings?.emailNotificationEnabled ?? true,
    telegramNotificationEnabled: settings?.telegramNotificationEnabled ?? false,
    whatsappNotificationEnabled: settings?.whatsappNotificationEnabled ?? false,
    advancePaymentMaxMonths: settings?.advancePaymentMaxMonths ?? 6,
    latePaymentPenaltyPercent: settings?.latePaymentPenaltyPercent ?? 5,
  }));

  // SMS Settings state
  const [smsSettings, setSmsSettings] = useState({
    smsApiKey: '',
    smsSenderId: '',
    smsBaseUrl: 'https://smsethiopia.et/api/',
    hasApiKey: false,
  });
  const [testPhone, setTestPhone] = useState('');
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [isSmsLoading, setIsSmsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sms: true,
    notifications: true,
    payments: false,
    portal: false,
    integrations: false,
  });

  // Load SMS settings on mount
  useEffect(() => {
    loadSmsSettings();
  }, []);

  const loadSmsSettings = async () => {
    try {
      const data = await api<{
        smsNotificationEnabled: boolean;
        smsApiKey: string | null;
        smsSenderId: string | null;
        smsBaseUrl: string;
        hasApiKey: boolean;
      }>('/sms');
      setSmsSettings({
        smsApiKey: data.smsApiKey || '',
        smsSenderId: data.smsSenderId || '',
        smsBaseUrl: data.smsBaseUrl || 'https://smsethiopia.et/api/',
        hasApiKey: data.hasApiKey,
      });
      setFormData(prev => ({ ...prev, smsNotificationEnabled: data.smsNotificationEnabled }));
    } catch (err) {
      console.error('Failed to load SMS settings:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api<SystemSettings>('/settings', {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      setSettings(updated);
      toast({ title: 'Success', description: 'Settings updated successfully' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to update settings', variant: 'destructive' });
    }
  };

  const handleSmsSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSmsLoading(true);
    try {
      const updated = await api<SystemSettings>('/sms/settings', {
        method: 'PUT',
        body: JSON.stringify({
          smsApiKey: smsSettings.smsApiKey,
          smsSenderId: smsSettings.smsSenderId,
          smsBaseUrl: smsSettings.smsBaseUrl,
          smsNotificationEnabled: formData.smsNotificationEnabled,
        }),
      });
      setSmsSettings(prev => ({ ...prev, hasApiKey: true }));
      toast({ title: 'Success', description: 'SMS settings saved successfully' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save SMS settings', variant: 'destructive' });
    } finally {
      setIsSmsLoading(false);
    }
  };

  const handleTestSms = async () => {
    if (!testPhone) {
      toast({ title: 'Error', description: 'Please enter a phone number', variant: 'destructive' });
      return;
    }
    setIsTestLoading(true);
    try {
      const result = await api<{ success: boolean; message: string }>('/sms', {
        method: 'POST',
        body: JSON.stringify({ action: 'test', phone: testPhone }),
      });
      if (result.success) {
        toast({ title: 'Success', description: 'Test SMS sent successfully!' });
      } else {
        toast({ title: 'Failed', description: result.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to send test SMS', variant: 'destructive' });
    } finally {
      setIsTestLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Settings categories configuration
  const settingCategories = [
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'primary' },
    { id: 'sms', label: 'SMS Settings', icon: MessageSquare, color: 'emerald' },
    { id: 'payments', label: 'Payments', icon: Wallet, color: 'amber' },
    { id: 'portal', label: 'Portal', icon: Building2, color: 'teal' },
    { id: 'integrations', label: 'Integrations', icon: Zap, color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-emerald-500/5 to-teal-500/5 p-6 border border-primary/10">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-emerald-500 to-teal-500 bg-clip-text text-transparent">System Settings</h1>
            <p className="text-muted-foreground mt-1">Configure your property management system</p>
          </div>
          <div className="flex items-center gap-3">
            {smsSettings.hasApiKey && (
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                <Check className="h-3 w-3 mr-1" /> SMS Configured
              </Badge>
            )}
            <Badge variant="outline" className="text-emerald-600 border-emerald-500/20 bg-emerald-50">
              <Activity className="h-3 w-3 mr-1" /> System Active
            </Badge>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* Quick Settings Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="group bg-gradient-to-br from-primary/10 to-emerald-500/5 border-primary/20 hover:shadow-lg transition-all cursor-pointer" onClick={() => toggleSection('notifications')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Notifications</p>
                <p className="text-xs text-muted-foreground">
                  {[formData.emailNotificationEnabled, formData.smsNotificationEnabled, formData.telegramNotificationEnabled, formData.whatsappNotificationEnabled].filter(Boolean).length} active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="group bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:shadow-lg transition-all cursor-pointer" onClick={() => toggleSection('sms')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium">SMS</p>
                <p className="text-xs text-muted-foreground">{smsSettings.hasApiKey ? 'Configured' : 'Setup needed'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="group bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:shadow-lg transition-all cursor-pointer" onClick={() => toggleSection('payments')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                <Wallet className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Payments</p>
                <p className="text-xs text-muted-foreground">{formData.advancePaymentMaxMonths}mo max</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="group bg-gradient-to-br from-teal-500/10 to-teal-500/5 border-teal-500/20 hover:shadow-lg transition-all cursor-pointer" onClick={() => toggleSection('portal')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-500/10 group-hover:bg-teal-500/20 transition-colors">
                <Building2 className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Portal</p>
                <p className="text-xs text-muted-foreground">{formData.tenantSelfServiceEnabled ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SMS Configuration Card */}
      <Card className="border-primary/20 shadow-sm overflow-hidden">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleSection('sms')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/10">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg">SMS Ethiopia Configuration</CardTitle>
              <CardDescription>Configure SMSEthiopia API for sending SMS notifications</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {smsSettings.hasApiKey && (
              <Badge variant="outline" className="text-emerald-600 border-emerald-500/20 bg-emerald-50">
                <Check className="h-3 w-3 mr-1" /> Active
              </Badge>
            )}
            <div className={`transition-transform duration-200 ${expandedSections.sms ? 'rotate-180' : ''}`}>
              <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        {expandedSections.sms && (
          <CardContent className="pt-4 border-t border-border/50">
            <form onSubmit={handleSmsSettingsSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    API Key
                  </Label>
                  <Input
                    type="password"
                    placeholder={smsSettings.hasApiKey ? '****' + (smsSettings.smsApiKey?.slice(-4) || '') : 'Enter your SMSEthiopia API Key'}
                    value={smsSettings.smsApiKey}
                    onChange={(e) => setSmsSettings({ ...smsSettings, smsApiKey: e.target.value })}
                    className="border-emerald-500/20 focus:border-emerald-500"
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your API key from <span className="text-emerald-600 font-medium">Console → API Keys</span> at smsethiopia.et
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sender ID (Optional)</Label>
                  <Input
                    placeholder="YourBrand"
                    value={smsSettings.smsSenderId || ''}
                    onChange={(e) => setSmsSettings({ ...smsSettings, smsSenderId: e.target.value })}
                    className="border-emerald-500/20 focus:border-emerald-500"
                  />
                  <p className="text-xs text-muted-foreground">
                    Custom sender name for your SMS messages
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">API Base URL</Label>
                <Input
                  value={smsSettings.smsBaseUrl}
                  onChange={(e) => setSmsSettings({ ...smsSettings, smsBaseUrl: e.target.value })}
                  className="border-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              
              {/* Test SMS Section */}
              <div className="pt-4 border-t border-border/50">
                <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                  <Send className="h-4 w-4 text-emerald-600" />
                  Test SMS Configuration
                </h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="0912345678 or 251912345678"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="flex-1 border-emerald-500/20 focus:border-emerald-500"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleTestSms}
                    disabled={isTestLoading || !smsSettings.hasApiKey}
                    className="border-emerald-500/20 text-emerald-600 hover:bg-emerald-50"
                  >
                    {isTestLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Test
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Enter an Ethiopian phone number to test your SMS configuration
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.smsNotificationEnabled}
                    onCheckedChange={(v) => setFormData({ ...formData, smsNotificationEnabled: v })}
                  />
                  <Label className="font-medium">Enable SMS Notifications</Label>
                </div>
                <Button type="submit" disabled={isSmsLoading} className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700">
                  {isSmsLoading ? 'Saving...' : 'Save SMS Settings'}
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* General Settings Card */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleSection('notifications')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Notification Settings</CardTitle>
              <CardDescription>Configure system-wide notification preferences</CardDescription>
            </div>
          </div>
          <div className={`transition-transform duration-200 ${expandedSections.notifications ? 'rotate-180' : ''}`}>
            <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {expandedSections.notifications && (
          <CardContent className="pt-4 border-t border-border/50">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Portal Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  TENANT PORTAL
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <Label className="font-medium">Tenant Self-Service Portal</Label>
                    <p className="text-sm text-muted-foreground">Allow tenants to access their portal</p>
                  </div>
                  <Switch
                    checked={formData.tenantSelfServiceEnabled}
                    onCheckedChange={(v) => setFormData({ ...formData, tenantSelfServiceEnabled: v })}
                  />
                </div>
              </div>

              <Separator />

              {/* Notification Channels */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Bell className="h-4 w-4" />
                  NOTIFICATION CHANNELS
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <Label className="font-medium">Email Notifications</Label>
                        <p className="text-xs text-muted-foreground">Send notifications via email</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.emailNotificationEnabled}
                      onCheckedChange={(v) => setFormData({ ...formData, emailNotificationEnabled: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-teal-500/10">
                        <MessageSquare className="h-4 w-4 text-teal-600" />
                      </div>
                      <div>
                        <Label className="font-medium">Telegram Notifications</Label>
                        <p className="text-xs text-muted-foreground">Send notifications via Telegram bot</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.telegramNotificationEnabled}
                      onCheckedChange={(v) => setFormData({ ...formData, telegramNotificationEnabled: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <MessageSquare className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <Label className="font-medium">WhatsApp Notifications</Label>
                        <p className="text-xs text-muted-foreground">Send notifications via WhatsApp</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.whatsappNotificationEnabled}
                      onCheckedChange={(v) => setFormData({ ...formData, whatsappNotificationEnabled: v })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Payment Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  PAYMENT SETTINGS
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-medium">Max Advance Payment Months</Label>
                    <Input
                      type="number"
                      value={formData.advancePaymentMaxMonths}
                      onChange={(e) => setFormData({ ...formData, advancePaymentMaxMonths: parseInt(e.target.value) })}
                      className="border-amber-500/20 focus:border-amber-500"
                    />
                    <p className="text-xs text-muted-foreground">Maximum months tenants can pay in advance</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium">Late Payment Penalty (%)</Label>
                    <Input
                      type="number"
                      value={formData.latePaymentPenaltyPercent}
                      onChange={(e) => setFormData({ ...formData, latePaymentPenaltyPercent: parseFloat(e.target.value) })}
                      className="border-amber-500/20 focus:border-amber-500"
                    />
                    <p className="text-xs text-muted-foreground">Percentage penalty for late payments</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/50">
                <Button type="submit" className="bg-gradient-to-r from-primary to-emerald-500 shadow-lg shadow-primary/20">
                  Save All Settings
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Future Settings Placeholder - Integrations */}
      <Card className="border-dashed border-2 border-border/50">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleSection('integrations')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/10">
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Integrations</CardTitle>
              <CardDescription>Connect third-party services (Coming Soon)</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-purple-600 border-purple-500/20 bg-purple-50">
            <Zap className="h-3 w-3 mr-1" /> Coming Soon
          </Badge>
        </div>
        
        {expandedSections.integrations && (
          <CardContent className="pt-4 border-t border-border/50">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { name: 'Chapa Payment', icon: CreditCard, desc: 'Online payment gateway' },
                { name: 'Telebirr', icon: Phone, desc: 'Mobile money integration' },
                { name: 'Google Maps', icon: MapPin, desc: 'Property location services' },
              ].map((integration) => (
                <div key={integration.name} className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/50 opacity-60">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <integration.icon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">{integration.name}</p>
                    <p className="text-xs text-muted-foreground">{integration.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
