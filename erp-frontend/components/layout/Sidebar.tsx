"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  Receipt,
  ShoppingCart,
  BookOpen,
  BarChart3,
  Users,
  UserCog,
  Bell,
  Globe,
  Settings,
  Sliders,
  ChevronLeft,
  Package,
  CircleUserRound,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/store/authStore";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard",     href: "/dashboard",    icon: LayoutDashboard },
  { label: "My Profile",    href: "/profile",      icon: CircleUserRound },
  { label: "Inventory",     href: "/inventory",    icon: Boxes,          permission: "inventory.read" },
  { label: "Sales",         href: "/sales",        icon: Receipt,        permission: "sales.read" },
  { label: "Purchasing",    href: "/purchasing",   icon: ShoppingCart,   permission: "purchasing.read" },
  { label: "Accounting",    href: "/accounting",   icon: BookOpen,       permission: "accounting.read" },
  { label: "Reports",       href: "/reports",      icon: BarChart3,      permission: "reporting.read" },
  { label: "CRM",           href: "/crm",          icon: Users,          permission: "crm.read" },
  { label: "HR",            href: "/hr",           icon: UserCog,        permission: "hr.read" },
  { label: "Notifications", href: "/notifications",icon: Bell,           permission: "notifications.read" },
  { label: "E-Commerce API",href: "/ecommerce",    icon: Globe,          permission: "ecommerce_api.read" },
  { label: "Settings",      href: "/settings",     icon: Sliders,        permission: "inventory.create" },
  { label: "Admin",         href: "/admin",        icon: Settings,       permission: "admin.read" },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
}

export function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const visible = navItems.filter((item) =>
    item.permission ? hasPermission(item.permission) : true
  );

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-gray-200 bg-white transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn("flex h-20 items-center border-b border-gray-100", collapsed ? "justify-center px-3" : "px-4")}>
        {collapsed ? (
          /* Collapsed: small icon-only fallback */
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#95271D]">
            <Package className="h-4 w-4 text-white" />
          </div>
        ) : (
          <Image
            src="/logo.png"
            alt="Al Ain Star"
            width={180}
            height={56}
            priority
            className="h-14 w-auto object-contain"
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {visible.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-[#95271D]/10 text-[#95271D]"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className={cn("h-4 w-4 flex-shrink-0", active && "text-[#95271D]")} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => onCollapse(!collapsed)}
        className="flex h-12 items-center justify-center border-t border-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
      </button>
    </aside>
  );
}
