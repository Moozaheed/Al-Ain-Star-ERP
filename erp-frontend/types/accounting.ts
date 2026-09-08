export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export interface ChartOfAccount {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  subtype: string | null;
  is_system: boolean;
  is_active: boolean;
  parent_id: number | null;
}

export interface JournalLine {
  id: number;
  account_id: number;
  account_code?: string;
  account_name?: string;
  debit: number;
  credit: number;
  description: string | null;
}

export interface JournalEntry {
  id: number;
  branch_id: number | null;
  entry_number: string;
  entry_date: string;
  description: string;
  source_type: string;
  source_id: number | null;
  is_reversed: boolean;
  reversed_by_id: number | null;
  posted_by: number;
  lines: JournalLine[];
}

export interface AgingBucketSummary {
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_90_plus: number;
  total: number;
}

export interface AgingRow {
  id: number;
  number: string;
  party_id: number | null;
  party_name: string | null;
  due_date: string | null;
  amount_due: number;
  days_overdue: number;
  aging_bucket: string;
}

export interface AgingReport {
  summary: AgingBucketSummary;
  invoices: AgingRow[];
}

export interface GeneralLedgerLine {
  entry_id: number;
  entry_number: string;
  entry_date: string;
  description: string;
  source_type: string;
  source_id: number | null;
  is_reversed: boolean;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface GeneralLedgerReport {
  account: { id: number; code: string; name: string; type: AccountType };
  closing_balance: number;
  lines: GeneralLedgerLine[];
}

export interface ProfitAndLossReport {
  period: { from: string; to: string };
  branch_id: number | null;
  scope: "branch" | "consolidated";
  revenue: { code: string; name: string; amount: number }[];
  total_revenue: number;
  cost_of_goods_sold: { code: string; name: string; amount: number }[];
  total_cost_of_goods_sold: number;
  gross_profit: number;
  operating_expenses: { code: string; name: string; amount: number }[];
  total_operating_expenses: number;
  net_income: number;
}

export interface BalanceSheetReport {
  as_of: string;
  branch_id: number | null;
  scope: "branch" | "consolidated";
  assets: { code: string | null; name: string; amount: number }[];
  total_assets: number;
  liabilities: { code: string | null; name: string; amount: number }[];
  total_liabilities: number;
  equity: { code: string | null; name: string; amount: number }[];
  total_equity: number;
  total_liabilities_and_equity: number;
  balanced: boolean;
}

export interface VatReturnReport {
  period: { from: string; to: string };
  branch_id: number | null;
  standard_rated_supplies_vat: number;
  zero_rated_supplies_vat: number;
  exempt_supplies_vat: number;
  imports_vat: number;
  output_vat: number;
  input_vat_recoverable: number;
  net_vat_payable: number;
  note: string;
}

export type ChequeDirection = "received" | "issued";
export type ChequeStatus = "pending" | "cleared" | "bounced" | "cancelled";

export interface Cheque {
  id: number;
  branch_id: number;
  direction: ChequeDirection;
  cheque_number: string;
  bank_name: string | null;
  amount: number;
  due_date: string;
  status: ChequeStatus;
  linked_to_type: "invoice" | "purchase_invoice" | "expense" | null;
  linked_to_id: number | null;
  customer_id: number | null;
  customer_name: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface BankAccount {
  id: number;
  branch_id: number;
  account_name: string;
  bank_name: string;
  iban: string | null;
  currency: string;
  coa_account_id: number;
  coa_account_code?: string;
  coa_account_name?: string;
  is_active: boolean;
}

export type ReconciliationStatus = "in_progress" | "locked";

export interface BankStatementLine {
  id: number;
  transaction_date: string;
  description: string | null;
  reference: string | null;
  amount: number;
  is_matched: boolean;
  matched_journal_line_id: number | null;
}

export interface BankReconciliation {
  id: number;
  bank_account_id: number;
  bank_account_name?: string;
  period_start: string;
  period_end: string;
  statement_ending_balance: number;
  status: ReconciliationStatus;
  locked_by_name: string | null;
  locked_at: string | null;
  created_by_name: string | null;
  lines?: BankStatementLine[];
  unmatched_count?: number;
}
