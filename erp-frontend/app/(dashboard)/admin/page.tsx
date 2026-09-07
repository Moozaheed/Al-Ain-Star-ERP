"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Users, Plus, Pencil, Trash2, Power, PowerOff,
  Search, X, Eye, EyeOff, Shield, ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import type { AdminBranch, AdminUser } from "@/types/admin";

// ─── Constants ─────────────────────────────────────────────────────────────────

const ROLES: { value: string; label: string }[] = [
  { value: "super_admin",     label: "Super Admin" },
  { value: "manager",         label: "Manager" },
  { value: "branch_manager",  label: "Branch Manager" },
  { value: "sales_staff",     label: "Sales Staff" },
  { value: "warehouse_staff", label: "Warehouse Staff" },
  { value: "accountant",      label: "Accountant" },
  { value: "viewer",          label: "Viewer" },
];

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLES.map((r) => [r.value, r.label])
);
const ROLE_VARIANT: Record<string, "default" | "success" | "warning" | "neutral"> = {
  super_admin:     "default",
  manager:         "default",
  branch_manager:  "success",
  sales_staff:     "neutral",
  warehouse_staff: "neutral",
  accountant:      "warning",
  viewer:          "neutral",
};

const MODULE_PERMISSIONS: [string, string[]][] = [
  ["admin",         ["read", "create", "update", "delete"]],
  ["branches",      ["read", "create", "update", "delete", "activate"]],
  ["users",         ["read", "create", "update", "delete", "assign_role"]],
  ["audit_logs",    ["read"]],
  ["inventory",     ["read", "create", "update", "delete", "adjust", "transfer"]],
  ["sales",         ["read", "create", "update", "delete", "approve", "override_price", "refund"]],
  ["purchasing",    ["read", "create", "update", "delete", "approve"]],
  ["accounting",    ["read", "create", "update", "delete", "approve", "post_journal", "reverse_journal"]],
  ["crm",           ["read", "create", "update", "delete"]],
  ["hr",            ["read", "create", "update", "delete", "approve"]],
  ["reporting",     ["read", "export"]],
  ["notifications", ["read", "create", "update", "delete"]],
  ["ecommerce_api", ["read", "create", "update", "delete"]],
];

interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; total: number };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState<"branches" | "users">("branches");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Admin</h1>
        <p className="mt-0.5 text-sm text-gray-500">Branches, users, roles, and permissions</p>
      </div>

      <div className="flex w-fit gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        <TabBtn active={tab === "branches"} onClick={() => setTab("branches")} icon={Building2} label="Branches" />
        <TabBtn active={tab === "users"} onClick={() => setTab("users")} icon={Users} label="Users" />
      </div>

      {tab === "branches" ? <BranchesTab /> : <UsersTab />}
    </div>
  );
}

// ─── Branches Tab ──────────────────────────────────────────────────────────────

function BranchesTab() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; branch: AdminBranch | null }>({
    open: false,
    branch: null,
  });
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<Paginated<AdminBranch>>({
    queryKey: ["admin-branches"],
    queryFn: async () => (await api.get("/branches?per_page=100")).data,
  });

  const branches = data?.data ?? [];

  const filtered = useMemo(() => {
    if (!search) return branches;
    const q = search.toLowerCase();
    return branches.filter(
      (b) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)
    );
  }, [branches, search]);

  const active = branches.filter((b) => b.is_active).length;

  const toggle = useMutation({
    mutationFn: (b: AdminBranch) =>
      api.post(`/branches/${b.id}/${b.is_active ? "deactivate" : "activate"}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-branches"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/branches/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-branches"] }),
  });

  const openCreate = () => setModal({ open: true, branch: null });
  const openEdit = (b: AdminBranch) => setModal({ open: true, branch: b });
  const closeModal = () => setModal({ open: false, branch: null });
  const onSaved = () => {
    closeModal();
    qc.invalidateQueries({ queryKey: ["admin-branches"] });
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Total Branches" value={branches.length} color="brand" />
        <KpiCard label="Active"   value={active}                    color="green" />
        <KpiCard label="Inactive" value={branches.length - active}  color="red"   />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code..."
            className={cn(inputCls, "pl-9")}
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch("")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[#95271D] px-4 py-2 text-sm font-medium text-white hover:bg-[#7a1f16]"
        >
          <Plus className="h-4 w-4" /> New Branch
        </button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <Th>Name</Th>
                <Th>Code</Th>
                <Th>Phone</Th>
                <Th>Address</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                    No branches found.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.code}</td>
                    <td className="px-4 py-3 text-gray-600">{b.phone ?? "—"}</td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-gray-500">
                      {b.address ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={b.is_active ? "success" : "danger"}>
                        {b.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <ActionBtn onClick={() => openEdit(b)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </ActionBtn>
                        <ActionBtn
                          onClick={() => toggle.mutate(b)}
                          title={b.is_active ? "Deactivate" : "Activate"}
                          variant={b.is_active ? "warn" : "ok"}
                        >
                          {b.is_active ? (
                            <PowerOff className="h-3.5 w-3.5" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                        </ActionBtn>
                        <ActionBtn
                          onClick={() => {
                            if (window.confirm(`Delete branch "${b.name}"?`))
                              remove.mutate(b.id);
                          }}
                          title="Delete"
                          variant="danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {modal.open && (
        <BranchModal branch={modal.branch} onClose={closeModal} onSaved={onSaved} />
      )}
    </>
  );
}

// ─── Users Tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; user: AdminUser | null }>({
    open: false,
    user: null,
  });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const { data: usersData, isLoading } = useQuery<Paginated<AdminUser>>({
    queryKey: ["admin-users"],
    queryFn: async () => (await api.get("/users?per_page=100")).data,
  });

  const { data: branchesData } = useQuery<Paginated<AdminBranch>>({
    queryKey: ["admin-branches"],
    queryFn: async () => (await api.get("/branches?per_page=100")).data,
  });

  const users = usersData?.data ?? [];
  const branches = branchesData?.data ?? [];

  const filtered = useMemo(() => {
    let list = users;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    if (roleFilter) list = list.filter((u) => u.role === roleFilter);
    return list;
  }, [users, search, roleFilter]);

  const active = users.filter((u) => u.is_active).length;

  const toggleActive = useMutation({
    mutationFn: (u: AdminUser) =>
      api.put(`/users/${u.id}`, {
        name: u.name,
        email: u.email,
        is_active: !u.is_active,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const openCreate = () => setModal({ open: true, user: null });
  const openEdit = (u: AdminUser) => setModal({ open: true, user: u });
  const closeModal = () => setModal({ open: false, user: null });
  const onSaved = () => {
    closeModal();
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Total Users" value={users.length} color="brand" />
        <KpiCard label="Active"   value={active}               color="green" />
        <KpiCard label="Inactive" value={users.length - active} color="red"  />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className={cn(inputCls, "pl-9")}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        {(search || roleFilter) && (
          <button
            onClick={() => { setSearch(""); setRoleFilter(""); }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[#95271D] px-4 py-2 text-sm font-medium text-white hover:bg-[#7a1f16]"
        >
          <Plus className="h-4 w-4" /> New User
        </button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Branch</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                            u.is_active
                              ? "bg-[#95271D]/10 text-[#95271D]"
                              : "bg-gray-100 text-gray-400"
                          )}
                        >
                          {u.name
                            .split(" ")
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.role && (
                        <Badge
                          variant={ROLE_VARIANT[u.role] ?? "neutral"}
                          className="text-[10px]"
                        >
                          {ROLE_LABEL[u.role] ?? u.role}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.branch_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.is_active ? "success" : "danger"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(u.created_at).toLocaleDateString("en-AE")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <ActionBtn onClick={() => openEdit(u)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </ActionBtn>
                        <ActionBtn
                          onClick={() => toggleActive.mutate(u)}
                          title={u.is_active ? "Deactivate" : "Activate"}
                          variant={u.is_active ? "warn" : "ok"}
                        >
                          {u.is_active ? (
                            <PowerOff className="h-3.5 w-3.5" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                        </ActionBtn>
                        <ActionBtn
                          onClick={() => {
                            if (window.confirm(`Delete user "${u.name}"?`))
                              remove.mutate(u.id);
                          }}
                          title="Delete"
                          variant="danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {modal.open && (
        <UserModal
          user={modal.user}
          branches={branches}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}
    </>
  );
}

// ─── Branch Modal ──────────────────────────────────────────────────────────────

type BranchForm = {
  name: string;
  code: string;
  address: string;
  phone: string;
  is_active: boolean;
};

function BranchModal({
  branch,
  onClose,
  onSaved,
}: {
  branch: AdminBranch | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = branch !== null;
  const [form, setForm] = useState<BranchForm>({
    name:      branch?.name ?? "",
    code:      branch?.code ?? "",
    address:   branch?.address ?? "",
    phone:     branch?.phone ?? "",
    is_active: branch?.is_active ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setStr =
    (key: keyof BranchForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload = { ...form, code: form.code.toUpperCase() };
      if (isEdit) {
        await api.put(`/branches/${branch.id}`, payload);
      } else {
        await api.post("/branches", payload);
      }
      onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msgs = err?.response?.data?.errors;
      if (msgs) {
        setError(Object.values(msgs).flat().join(" "));
      } else {
        setError(err?.response?.data?.message ?? "Something went wrong.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Branch" : "New Branch"} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Branch Name *">
          <input
            value={form.name}
            onChange={setStr("name")}
            className={inputCls}
            placeholder="e.g. Main Branch"
          />
        </Field>
        <Field label="Branch Code *">
          <input
            value={form.code}
            onChange={setStr("code")}
            className={inputCls}
            placeholder="e.g. BR1"
            maxLength={20}
          />
          <p className="mt-1 text-xs text-gray-400">Unique identifier, will be uppercased.</p>
        </Field>
        <Field label="Phone">
          <input
            value={form.phone}
            onChange={setStr("phone")}
            className={inputCls}
            placeholder="+971 2 000 0000"
          />
        </Field>
        <Field label="Address">
          <textarea
            value={form.address}
            onChange={setStr("address")}
            className={cn(inputCls, "resize-none")}
            rows={2}
            placeholder="Street, city, emirate..."
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            className="rounded border-gray-300"
          />
          Active
        </label>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-lg bg-[#95271D] px-4 py-2 text-sm font-medium text-white hover:bg-[#7a1f16] disabled:opacity-60"
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Branch"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── User Modal ────────────────────────────────────────────────────────────────

type UserForm = {
  name: string;
  email: string;
  phone: string;
  branch_id: string;
  role: string;
  password: string;
  is_active: boolean;
};

function UserModal({
  user,
  branches,
  onClose,
  onSaved,
}: {
  user: AdminUser | null;
  branches: AdminBranch[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = user !== null;
  const [form, setForm] = useState<UserForm>({
    name:      user?.name ?? "",
    email:     user?.email ?? "",
    phone:     user?.phone ?? "",
    branch_id: user?.branch_id?.toString() ?? "",
    role:      user?.role ?? "",
    password:  "",
    is_active: user?.is_active ?? true,
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showPerms, setShowPerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setStr =
    (key: keyof UserForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name:      form.name,
        email:     form.email,
        phone:     form.phone || null,
        branch_id: form.branch_id ? parseInt(form.branch_id) : null,
        role:      form.role,
        is_active: form.is_active,
      };
      if (form.password) payload.password = form.password;

      if (isEdit) {
        await api.put(`/users/${user.id}`, payload);
      } else {
        await api.post("/users", payload);
      }
      onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msgs = err?.response?.data?.errors;
      if (msgs) {
        setError(Object.values(msgs).flat().join(" "));
      } else {
        setError(err?.response?.data?.message ?? "Something went wrong.");
      }
    } finally {
      setSaving(false);
    }
  };

  const permSet = new Set<string>(user?.permissions ?? []);
  const grantedCount = user?.permissions.length ?? 0;

  return (
    <Modal title={isEdit ? "Edit User" : "New User"} onClose={onClose} wide>
      <div className="space-y-4">
        {/* Basic info */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name *">
            <input
              value={form.name}
              onChange={setStr("name")}
              className={inputCls}
              placeholder="John Doe"
            />
          </Field>
          <Field label="Email *">
            <input
              type="email"
              value={form.email}
              onChange={setStr("email")}
              className={inputCls}
              placeholder="john@example.com"
            />
          </Field>
          <Field label="Phone">
            <input
              value={form.phone}
              onChange={setStr("phone")}
              className={inputCls}
              placeholder="+971 50 000 0000"
            />
          </Field>
          <Field label="Branch">
            <select
              value={form.branch_id}
              onChange={setStr("branch_id")}
              className={inputCls}
            >
              <option value="">No branch (global)</option>
              {branches
                .filter((b) => b.is_active)
                .map((b) => (
                  <option key={b.id} value={b.id.toString()}>
                    {b.name} ({b.code})
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Role *">
            <select value={form.role} onChange={setStr("role")} className={inputCls}>
              <option value="">Select a role</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={isEdit ? "New Password" : "Password *"}>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={form.password}
                onChange={setStr("password")}
                className={cn(inputCls, "pr-9")}
                placeholder={isEdit ? "Leave blank to keep current" : "Min 8 characters"}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            className="rounded border-gray-300"
          />
          Active — inactive users cannot log in
        </label>

        {/* Permissions panel (edit only) */}
        {isEdit && (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => setShowPerms((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-400" />
                Permissions
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                  {grantedCount} granted
                </span>
              </span>
              <ChevronRight
                className={cn(
                  "h-4 w-4 text-gray-400 transition-transform",
                  showPerms && "rotate-90"
                )}
              />
            </button>

            {showPerms && (
              <div className="border-t border-gray-100 px-4 py-4">
                <p className="mb-3 text-xs text-gray-400">
                  Permissions are inherited from the assigned role. Green = granted.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {MODULE_PERMISSIONS.map(([module, actions]) => (
                    <div key={module} className="rounded-lg border border-gray-100 p-3">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        {module.replace(/_/g, " ")}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {actions.map((action) => {
                          const granted = permSet.has(`${module}.${action}`);
                          return (
                            <span
                              key={action}
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                granted
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-50 text-gray-300"
                              )}
                            >
                              {action}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-lg bg-[#95271D] px-4 py-2 text-sm font-medium text-white hover:bg-[#7a1f16] disabled:opacity-60"
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Shared components ─────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={cn(
          "relative w-full rounded-xl bg-white shadow-xl",
          wide ? "max-w-2xl" : "max-w-md"
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
        active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "brand" | "green" | "red";
}) {
  const textColor = {
    brand: "text-[#95271D]",
    green: "text-green-700",
    red:   "text-red-700",
  };
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={cn("mt-1 text-2xl font-bold", textColor[color])}>{value}</p>
      </CardContent>
    </Card>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </th>
  );
}

function ActionBtn({
  onClick,
  title,
  children,
  variant = "default",
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  variant?: "default" | "danger" | "warn" | "ok";
}) {
  const styles = {
    default: "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
    danger:  "text-red-400 hover:text-red-600 hover:bg-red-50",
    warn:    "text-amber-400 hover:text-amber-600 hover:bg-amber-50",
    ok:      "text-green-500 hover:text-green-700 hover:bg-green-50",
  };
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn("rounded p-1.5 transition-colors", styles[variant])}
    >
      {children}
    </button>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]";
