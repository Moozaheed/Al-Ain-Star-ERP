"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/cn";
import { notificationIcon, relativeTime } from "@/lib/notificationDisplay";
import type { AppNotification } from "@/types/notifications";

const POLL_MS = 30_000;

export function NotificationBell() {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: unreadTotal } = useQuery<number>({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => (await api.get("/notifications", { params: { unread: 1, per_page: 1 } })).data.meta.total,
    refetchInterval: POLL_MS,
  });

  const { data: recent } = useQuery<AppNotification[]>({
    queryKey: ["notifications-recent"],
    queryFn: async () => (await api.get("/notifications", { params: { per_page: 10 } })).data.data,
    refetchInterval: POLL_MS,
    enabled: open,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      qc.invalidateQueries({ queryKey: ["notifications-recent"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      qc.invalidateQueries({ queryKey: ["notifications-recent"] });
    },
  });

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function handleClickNotification(n: AppNotification) {
    if (!n.is_read) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  const badgeLabel = unreadTotal && unreadTotal > 99 ? "99+" : String(unreadTotal ?? 0);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <Bell className="h-4 w-4" />
        {!!unreadTotal && unreadTotal > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            {!!unreadTotal && unreadTotal > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs font-medium text-[#95271D] hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {!recent || recent.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recent.map((n) => {
                const Icon = notificationIcon(n.event_type);
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClickNotification(n)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50",
                        !n.is_read && "bg-[#95271D]/5"
                      )}
                    >
                      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{n.title}</p>
                        {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{n.body}</p>}
                        <p className="mt-1 text-[10px] text-gray-400">{relativeTime(n.created_at)}</p>
                      </div>
                      {!n.is_read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#95271D]" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-gray-100 px-4 py-2.5 text-center">
            <button
              onClick={() => { setOpen(false); router.push("/notifications"); }}
              className="text-xs font-medium text-[#95271D] hover:underline"
            >
              View all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
