export interface AdminBranch {
  id: number;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  branch_id: number | null;
  branch_name: string | null;
  role: string | null;
  permissions: string[];
  created_at: string;
  updated_at: string;
}
