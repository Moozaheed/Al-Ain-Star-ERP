"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { CustomerNote } from "@/types/crm";

export function NotesTab({ customerId }: { customerId: number }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canCreate = useAuthStore((s) => s.hasPermission("crm.create"));
  const qc = useQueryClient();

  const { data: notes, isLoading } = useQuery<CustomerNote[]>({
    queryKey: ["crm-notes", customerId],
    queryFn: async () => (await api.get(`/sales/customers/${customerId}/notes`)).data.data,
  });

  const mutation = useMutation({
    mutationFn: () => api.post(`/sales/customers/${customerId}/notes`, { note: text.trim() }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["crm-notes", customerId] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? "Failed to add note.");
    },
  });

  return (
    <div className="flex flex-col gap-4">
      {canCreate && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Add an internal note about this customer..."
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
            />
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-400">Notes cannot be edited or deleted after creation.</p>
              <Button size="sm" loading={mutation.isPending} disabled={!text.trim()} onClick={() => mutation.mutate()}>Add Note</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <p className="px-2 text-sm text-gray-400">Loading...</p>
        ) : !notes || notes.length === 0 ? (
          <p className="px-2 text-sm text-gray-400">No notes yet.</p>
        ) : notes.map((n) => (
          <Card key={n.id}>
            <CardContent className="py-3">
              <p className="whitespace-pre-wrap text-sm text-gray-900">{n.note}</p>
              <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                {n.created_by_name ?? "Unknown"} · {new Date(n.created_at).toLocaleString("en-AE")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
