export interface Category {
  id: number;
  name: string;
  is_active: boolean;
}

export interface Brand {
  id: number;
  name: string;
  is_active: boolean;
}

export interface Unit {
  id: number;
  name: string;
  abbreviation: string | null;
  is_active: boolean;
}

export interface Part {
  id: number;
  part_number: string;
  description: string;
  barcode: string | null;
  image_url: string | null;
  category_id: number | null;
  category_name: string | null;
  brand_id: number | null;
  brand_name: string | null;
  unit_id: number | null;
  unit_name: string | null;
  unit_abbreviation: string | null;
  min_stock_qty: number;
  is_active: boolean;
  is_flagged: boolean;
  flag_reason: string | null;
  total_stock: number;
  is_low_stock: boolean;
  stock_by_branch: { branch_id: number; branch_name: string; qty_on_hand: number }[];
  created_at: string;
}

export interface PartFormData {
  part_number: string;
  description: string;
  barcode: string;
  category_id: number | null;
  brand_id: number | null;
  unit_id: number | null;
  min_stock_qty: number;
  is_active: boolean;
}
