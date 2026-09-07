export interface HrUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  role: string | null;
  branch_id: number | null;
  branch_name: string | null;
  employee_id: number | null;
  designation: string | null;
  join_date: string | null;
  invoice_count: number;
  total_sales: number;
}

export interface EmployeeDocument {
  id: number;
  doc_type: string;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string;
  expiry_status: 'valid' | 'expiring_soon' | 'expired';
  days_until_expiry: number;
  is_active: boolean;
}

export interface ExpenseClaim {
  id: number;
  description: string;
  amount: number;
  claim_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
}

export interface SalesTarget {
  id: number;
  period_month: number;
  period_year: number;
  target_amount: number;
  achieved_amount: number;
  achievement_pct: number;
}

export interface EmployeeProfile {
  id: number;
  employee_number: string | null;
  name: string;
  designation: string | null;
  phone: string | null;
  email: string | null;
  nationality: string | null;
  join_date: string | null;
  end_date: string | null;
  basic_salary: number;
  is_active: boolean;
  branch_name: string | null;
  documents: EmployeeDocument[];
  expense_claims: ExpenseClaim[];
  sales_targets: SalesTarget[];
}

export interface RecentInvoice {
  id: number;
  invoice_number: string;
  customer_name: string | null;
  total: number;
  status: string;
  invoice_date: string;
  payment_mode: string;
  channel: string;
}

export interface MonthlyStats {
  month: number;
  invoices: number;
  sales: number;
}

export interface InvoiceStats {
  total_invoices: number;
  total_sales: number;
  last_sale_date: string | null;
}

export interface UserDetail {
  user: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    is_active: boolean;
    role: string | null;
    permissions: string[];
    branch_id: number | null;
    branch_name: string | null;
    created_at: string;
  };
  employee: EmployeeProfile | null;
  invoice_stats: InvoiceStats | null;
  recent_invoices: RecentInvoice[];
  monthly_stats: MonthlyStats[];
}
