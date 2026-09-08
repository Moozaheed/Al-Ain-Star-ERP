"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import { notificationIcon, relativeTime, NOTIFICATION_TYPE_ICON } from "@/lib/notificationDisplay";
import type { AppNotification } from "@/types/notifications";

const EVENT_TYPES = Object.keys(NOTIFICATION_TYPE_ICON);

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [eventType, setEventType] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ data: AppNotification[]; meta: { total: number; last_page: number; current_page: number } }>({
    queryKey: ["notifications-list", eventType, page],
    queryFn: async () => (await api.get("/notifications", { params: { event_type: eventType || undefined, page, per_page: 20 } })).data,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      qc.invalidateQueries({ queryKey: ["notifications-recent"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      qc.invalidateQueries({ queryKey: ["notifications-recent"] });
    },
  });

  function handleClick(n: AppNotification) {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.link) router.push(n.link);
  }

  const rows = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            System alerts, low stock notifications, cheque due reminders, and approval requests
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} loading={markAllRead.isPending}>
          Mark all as read
        </Button>
      </div>

      <div>
        <select
          value={eventType}
          onChange={(e) => { setEventType(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
        >
          <option value="">All types</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{t.replaceAll("_", " ")}</option>
          ))}
        </select>
      </div>

      <Card>
        {isLoading ? (
          <p className="px-6 py-12 text-center text-sm text-gray-400">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-gray-400">No notifications found.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {rows.map((n) => {
              const Icon = notificationIcon(n.event_type);
              return (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={cn(
                      "flex w-full items-start gap-3 px-6 py-4 text-left transition-colors hover:bg-gray-50",
                      !n.is_read && "bg-[#95271D]/5"
                    )}
                  >
                    <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-sm text-gray-500">{n.body}</p>}
                      <p className="mt-1 text-xs text-gray-400">{relativeTime(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#95271D]" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {data && data.meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-gray-500">Page {data.meta.current_page} of {data.meta.last_page}</span>
          <Button variant="outline" size="sm" disabled={page >= data.meta.last_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
