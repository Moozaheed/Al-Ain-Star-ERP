"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import type { ChartOfAccount, JournalEntry } from "@/types/accounting";

interface Paginated<T> { data: T[]; meta: { current_page: number; last_page: number; total: number } }

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2 }).format(v);
}

export function JournalTab() {
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [viewing, setViewing] = useState<JournalEntry | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Paginated<JournalEntry>>({
    queryKey: ["journal-entries", page],
    queryFn: async () => (await api.get(`/accounting/journal-entries?page=${page}&per_page=20`)).data,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New Manual Entry
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Journal Entries {meta && <span className="ml-2 font-normal text-gray-400">{meta.total} total</span>}</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Entry No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Source</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">No journal entries yet.</td></tr>
              ) : rows.map((e) => {
                const total = e.lines?.reduce((s, l) => s + Number(l.debit), 0) ?? 0;
                return (
                  <tr key={e.id} onClick={() => setViewing(e)} className="cursor-pointer hover:bg-gray-50/50">
                    <td className="px-6 py-3 font-mono text-xs font-semibold text-[#95271D]">{e.entry_number}</td>
                    <td className="px-4 py-3 text-gray-600">{e.entry_date}</td>
                    <td className="max-w-[280px] truncate px-4 py-3 text-gray-900">{e.description}</td>
                    <td className="px-4 py-3"><Badge variant="neutral" className="capitalize">{e.source_type}</Badge></td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatAed(total)}</td>
                    <td className="px-4 py-3">
                      {e.is_reversed
                        ? <Badge variant="danger">Reversed</Badge>
                        : e.source_type === "reversal"
                          ? <Badge variant="warning">Reversal</Badge>
                          : <Badge variant="success">Posted</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <p className="text-xs text-gray-500">Page {meta.current_page} of {meta.last_page}</p>
            <div className="flex gap-1">
              <PageBtn onClick={() => setPage((p) => p - 1)} disabled={meta.current_page === 1}><ChevronLeft className="h-3.5 w-3.5" /></PageBtn>
              <PageBtn onClick={() => setPage((p) => p + 1)} disabled={meta.current_page === meta.last_page}><ChevronRight className="h-3.5 w-3.5" /></PageBtn>
            </div>
          </div>
        )}
      </Card>

      {viewing && <EntryViewModal entry={viewing} onClose={() => setViewing(null)} />}
      {showNew && (
        <NewEntryModal
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); qc.invalidateQueries({ queryKey: ["journal-entries"] }); }}
        />
      )}
    </div>
  );
}

function EntryViewModal({ entry, onClose }: { entry: JournalEntry; onClose: () => void }) {
  const { data: accounts } = useQuery<ChartOfAccount[]>({
    queryKey: ["chart-of-accounts"],
    queryFn: async () => (await api.get("/accounting/accounts?per_page=200")).data.data,
  });
  const accountById = new Map((accounts ?? []).map((a) => [a.id, a]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{entry.entry_number}</h2>
            <p className="text-xs text-gray-500">{entry.entry_date} · {entry.description}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-2 text-left text-xs font-semibold uppercase text-gray-500">Account</th>
                <th className="py-2 text-right text-xs font-semibold uppercase text-gray-500">Debit</th>
                <th className="py-2 text-right text-xs font-semibold uppercase text-gray-500">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entry.lines?.map((l) => {
                const acct = accountById.get(l.account_id);
                return (
                  <tr key={l.id}>
                    <td className="py-2 text-gray-900">{acct ? `${acct.code} · ${acct.name}` : `#${l.account_id}`}</td>
                    <td className="py-2 text-right font-mono text-gray-900">{Number(l.debit) > 0 ? formatAed(Number(l.debit)) : "—"}</td>
                    <td className="py-2 text-right font-mono text-gray-900">{Number(l.credit) > 0 ? formatAed(Number(l.credit)) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t border-gray-100 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

interface DraftLine { account_id: number | null; debit: string; credit: string; description: string }

function NewEntryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { data: accounts } = useQuery<ChartOfAccount[]>({
    queryKey: ["chart-of-accounts"],
    queryFn: async () => (await api.get("/accounting/accounts?per_page=200")).data.data,
  });

  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { account_id: null, debit: "", credit: "", description: "" },
    { account_id: null, debit: "", credit: "", description: "" },
  ]);
  const [error, setError] = useState<string | null>(null);

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = lines.length >= 2 && totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.005;

  const createMutation = useMutation({
    mutationFn: () => api.post("/accounting/journal-entries", {
      entry_date: entryDate,
      description,
      source_type: "manual",
      lines: lines
        .filter((l) => l.account_id !== null)
        .map((l) => ({
          account_id: l.account_id,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description || null,
        })),
    }),
    onSuccess: onSaved,
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? "Failed to post entry.");
    },
  });

  function updateLine(idx: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">New Manual Journal Entry</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Date</label>
              <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Description *</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this entry for?"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={line.account_id ?? ""}
                  onChange={(e) => updateLine(idx, { account_id: e.target.value ? Number(e.target.value) : null })}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
                >
                  <option value="">Select account...</option>
                  {accounts?.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
                </select>
                <input type="number" min={0} step="0.01" value={line.debit}
                  onChange={(e) => updateLine(idx, { debit: e.target.value, credit: e.target.value ? "" : line.credit })}
                  placeholder="Debit"
                  className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-right text-xs focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
                <input type="number" min={0} step="0.01" value={line.credit}
                  onChange={(e) => updateLine(idx, { credit: e.target.value, debit: e.target.value ? "" : line.debit })}
                  placeholder="Credit"
                  className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-right text-xs focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
                <button onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))} disabled={lines.length <= 2}
                  className="text-gray-300 hover:text-red-500 disabled:opacity-20">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setLines((prev) => [...prev, { account_id: null, debit: "", credit: "", description: "" }])}
              className="flex w-fit items-center gap-1 text-xs font-medium text-[#95271D] hover:underline"
            >
              <Plus className="h-3 w-3" /> Add line
            </button>
          </div>

          <div className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
            balanced ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
          )}>
            <span>Debit total: {formatAed(totalDebit)} · Credit total: {formatAed(totalCredit)}</span>
            <span className="font-medium">{balanced ? "Balanced" : "Not balanced"}</span>
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={createMutation.isPending} disabled={!balanced || !description.trim()} onClick={() => createMutation.mutate()}>
            Post Entry
          </Button>
        </div>
      </div>
    </div>
  );
}

function PageBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
      {children}
    </button>
  );
}
