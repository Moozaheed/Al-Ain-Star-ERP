export interface Branch {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  role_slug: string;
  branch: Branch | null;
  permissions: string[];
}

export interface LoginResponse {
  data: {
    token: string;
    user: AuthUser;
  };
}
