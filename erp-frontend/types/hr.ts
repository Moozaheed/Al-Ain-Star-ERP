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

export type ApprovalStatus = 'pending' | 'branch_approved' | 'approved' | 'rejected';

export interface ExpenseClaim {
  id: number;
  employee_id?: number;
  employee_name?: string;
  branch_id?: number;
  branch_name?: string;
  description: string;
  amount: number;
  claim_date: string;
  status: ApprovalStatus | 'paid';
  branch_approved_by_name?: string | null;
  approved_by_name?: string | null;
}

export interface LeaveRequest {
  id: number;
  employee_id?: number;
  employee_name?: string;
  branch_id?: number;
  branch_name?: string;
  leave_type: 'annual' | 'sick' | 'unpaid';
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: ApprovalStatus;
  branch_approved_by_name?: string | null;
  approved_by_name?: string | null;
}

export interface SalesTarget {
  id: number;
  period_month: number;
  period_year: number;
  target_amount: number;
  achieved_amount: number;
  achievement_pct: number;
}

export interface SalaryComponent {
  id: number;
  employee_id?: number;
  type: 'allowance' | 'deduction';
  name: string;
  amount: number;
  is_recurring: boolean;
  is_active: boolean;
  created_by_name?: string | null;
}

export interface PayslipLine {
  type: 'basic' | 'allowance' | 'deduction' | 'commission';
  label: string;
  amount: number;
}

export interface Payslip {
  id: number;
  pay_run_id: number;
  employee_id?: number;
  employee_name?: string;
  period_month: number;
  period_year: number;
  status: 'draft' | 'approved' | 'paid';
  basic_salary: number;
  total_allowances: number;
  total_deductions: number;
  commission_amount: number;
  gross_pay: number;
  net_pay: number;
  created_at: string;
  lines: PayslipLine[];
}

export interface PayRun {
  id: number;
  branch_id: number;
  branch_name: string | null;
  period_month: number;
  period_year: number;
  status: 'draft' | 'approved' | 'paid';
  total_net_pay: number;
  payslip_count: number;
  created_by_name: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  payslips?: Payslip[];
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
  bank_name: string | null;
  bank_iban: string | null;
  is_active: boolean;
  branch_name: string | null;
  documents: EmployeeDocument[];
  expense_claims: ExpenseClaim[];
  leave_requests: LeaveRequest[];
  sales_targets: SalesTarget[];
  salary_components: SalaryComponent[];
  payslips: Payslip[];
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
