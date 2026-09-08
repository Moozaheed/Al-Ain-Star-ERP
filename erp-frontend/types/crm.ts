export interface CreditLimit {
  id: number;
  customer_id: number;
  branch_id: number;
  branch_name: string | null;
  credit_limit: number;
  credit_used: number;
  credit_available: number;
  set_by_name: string | null;
}

export interface CustomerNote {
  id: number;
  customer_id: number;
  note: string;
  created_by_name: string | null;
  created_at: string;
}

export interface CustomerStatementEntry {
  type: "invoice" | "payment" | "return";
  date: string;
  reference: string;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface CustomerStatement {
  customer_id: number;
  customer_name: string;
  from: string;
  to: string;
  entries: CustomerStatementEntry[];
  closing_balance: number;
}
