export type InvoiceStatus = 'draft' | 'confirmed' | 'paid' | 'partially_paid' | 'void';
export type PaymentMode  = 'cash' | 'card' | 'bank_transfer' | 'credit' | 'cheque';
export type SalesChannel = 'retail' | 'b2b' | 'online';
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

export interface Customer {
  id: number;
  type: SalesChannel;
  name: string;
  trade_name: string | null;
  phone: string | null;
  email: string | null;
  trn: string | null;
  address: string | null;
  is_active: boolean;
}

export interface InvoiceItem {
  id?: number;
  part_id: number;
  part_number?: string;
  description: string;
  qty: number;
  unit_price: number;
  discount_pct: number;
  vat_rate: number;
  line_subtotal: number;
  line_vat: number;
  line_total: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  lpo_number: string | null;
  ref_number: string | null;
  branch_id: number;
  customer_id: number | null;
  customer_name: string | null;
  customer_trn: string | null;
  channel: SalesChannel;
  payment_mode: PaymentMode;
  status: InvoiceStatus;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  discount_amount: number;
  vat_amount: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  notes: string | null;
  void_reason: string | null;
  created_by_name: string | null;
  items: InvoiceItem[];
}

export interface QuotationItem {
  id?: number;
  part_id: number;
  part_number?: string;
  description: string;
  qty: number;
  unit_price: number;
  discount_pct: number;
  line_total: number;
}

export interface Quotation {
  id: number;
  quotation_number: string;
  lpo_number: string | null;
  ref_number: string | null;
  branch_id: number;
  customer_id: number | null;
  customer_name: string | null;
  channel: SalesChannel;
  status: QuotationStatus;
  expires_at: string;
  subtotal: number;
  discount_amount: number;
  vat_amount: number;
  total: number;
  notes: string | null;
  created_at: string;
  items: QuotationItem[];
}

export interface InvoicePayment {
  id: number;
  invoice_id: number;
  invoice_number: string | null;
  amount: number;
  payment_mode: "cash" | "card" | "bank_transfer" | "cheque";
  payment_date: string;
  reference: string | null;
  received_by_name: string | null;
  notes: string | null;
  invoice_amount_due: number | null;
}

export interface LineItemDraft {
  part_id: number | null;
  part_number: string;
  description: string;
  qty: number;
  unit_price: number;
  discount_pct: number;
}
