export interface DailySalesSummary {
  date: string;
  branch_id: number | null;
  invoice_count: number;
  total_ex_vat: number;
  total_vat: number;
  total_inc_vat: number;
  gross_profit: number;
  by_payment_mode: Record<string, number>;
  by_channel: Record<string, number>;
}

export interface SalesByPartRow {
  part_id: number;
  part_number: string;
  part_name: string;
  qty_sold: number;
  total_revenue_ex_vat: number;
  total_cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
}

export interface StockBalanceRow {
  part_id: number;
  part_number: string;
  part_name: string;
  category_name: string | null;
  branch_id: number;
  branch_name: string;
  qty: number;
  avg_cost: number;
  value: number;
  min_stock_qty: number;
  is_zero_stock: boolean;
  is_low_stock: boolean;
}

export interface StockBalanceReport {
  rows: StockBalanceRow[];
  total_value: number;
}

export type AgeBucket = "days_0_30" | "days_31_60" | "days_61_90" | "days_91_180" | "days_180_plus";

export interface StockAgeingRow {
  stock_entry_id: number;
  part_id: number;
  part_number: string;
  part_name: string;
  branch_id: number;
  branch_name: string;
  lot_date: string;
  age_days: number;
  age_bucket: AgeBucket;
  remaining_qty: number;
  cost_value: number;
}

export interface StockAgeingReport {
  rows: StockAgeingRow[];
  bucket_totals: Record<AgeBucket, number>;
}

export interface BranchPerformanceRow {
  branch_id: number;
  branch_name: string;
  invoice_count: number;
  revenue_ex_vat: number;
  gross_profit: number;
  ar_overdue: number;
  low_stock_count: number;
}
