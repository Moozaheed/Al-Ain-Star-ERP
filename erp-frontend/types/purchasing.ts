export type PurchasePaymentMode = "cash" | "bank_transfer" | "credit" | "cheque";
export type PurchaseInvoiceStatus = "draft" | "received" | "paid" | "partially_paid";

export interface Supplier {
  id: number;
  name: string;
  trade_name: string | null;
  phone: string | null;
  email: string | null;
  trn: string | null;
  address: string | null;
  payment_terms_days: number;
  is_active: boolean;
}

export interface PurchaseInvoiceItem {
  id?: number;
  part_id: number;
  part_number?: string;
  description: string;
  qty: number;
  unit_cost: number;
  vat_rate: number;
  line_subtotal: number;
  line_vat: number;
  line_total: number;
}

export interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  supplier_invoice_ref: string | null;
  branch_id: number;
  supplier_id: number;
  supplier_name: string | null;
  payment_mode: PurchasePaymentMode;
  status: PurchaseInvoiceStatus;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  vat_amount: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  notes: string | null;
  created_by_name: string | null;
  items: PurchaseInvoiceItem[];
}

export interface PurchaseLineItemDraft {
  part_id: number;
  part_number: string;
  description: string;
  qty: number;
  unit_cost: number;
}

export interface PurchaseReturnItem {
  id: number;
  purchase_invoice_item_id: number;
  part_id: number;
  part_number: string | null;
  description: string | null;
  qty: number;
  unit_cost: number;
  line_subtotal: number;
  line_vat: number;
  line_total: number;
}

export interface PurchaseReturn {
  id: number;
  debit_note_number: string;
  branch_id: number;
  purchase_invoice_id: number;
  purchase_invoice_number: string | null;
  supplier_id: number;
  supplier_name: string | null;
  return_date: string;
  reason: string | null;
  subtotal: number;
  vat_amount: number;
  total: number;
  status: "pending" | "approved" | "settled";
  created_by_name: string | null;
  items: PurchaseReturnItem[];
}
