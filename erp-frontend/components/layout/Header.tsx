"use client";

import { useRouter } from "next/navigation";
import { LogOut, Building2, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useState } from "react";

export function Header() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await api.post("/auth/logout");
    } catch {
      // token may already be invalid — proceed anyway
    } finally {
      clearAuth();
      router.replace("/login");
    }
  }

  const roleLabel: Record<string, string> = {
    super_admin:      "Super Admin",
    manager:          "Manager",
    branch_manager:   "Branch Manager",
    sales_staff:      "Sales Staff",
    warehouse_staff:  "Warehouse Staff",
    accountant:       "Accountant",
    viewer:           "Viewer",
  };

  return (
    <header className="flex h-20 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Branch indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Building2 className="h-4 w-4 text-gray-400" />
        <span>{user?.branch?.name ?? "All Branches"}</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <NotificationBell />

        {/* User menu */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#95271D]/10 text-xs font-semibold text-[#95271D]">
            {user?.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="hidden sm:flex sm:flex-col sm:justify-center">
            <p className="text-sm font-medium leading-none text-gray-900">{user?.name}</p>
            <Badge variant="neutral" className="mt-1 w-fit text-[10px] px-1.5 py-0">
              {roleLabel[user?.role_slug ?? user?.role ?? ""] ?? user?.role_slug ?? user?.role}
            </Badge>
          </div>
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={signingOut}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
