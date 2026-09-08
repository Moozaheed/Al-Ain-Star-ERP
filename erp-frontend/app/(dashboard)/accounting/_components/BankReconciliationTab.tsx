"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Upload, CheckCircle2, Lock, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { BankAccount, BankReconciliation, ChartOfAccount } from "@/types/accounting";

interface Paginated<T> { data: T[]; meta: { total: number } }

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2 }).format(v);
}

export function BankReconciliationTab() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (selectedId !== null) {
    return <ReconciliationDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return <ReconciliationList onOpen={setSelectedId} />;
}

function ReconciliationList({ onOpen }: { onOpen: (id: number) => void }) {
  const qc = useQueryClient();
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showNewRec, setShowNewRec] = useState(false);

  const { data: accounts } = useQuery<BankAccount[]>({
    queryKey: ["bank-accounts"],
    queryFn: async () => (await api.get("/accounting/bank-accounts?per_page=100")).data.data,
  });

  const { data: recs, isLoading } = useQuery<Paginated<BankReconciliation>>({
    queryKey: ["bank-reconciliations"],
    queryFn: async () => (await api.get("/accounting/bank-reconciliations?per_page=50")).data,
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Bank Accounts</p>
            <p className="text-xs text-gray-500">
              {accounts && accounts.length > 0 ? accounts.map((a) => a.account_name).join(", ") : "No bank accounts yet."}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowNewAccount(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Bank Account
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowNewRec(true)} disabled={!accounts?.length}>
          <Plus className="mr-1.5 h-4 w-4" /> New Reconciliation
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Bank Account</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Period</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Statement Balance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : !recs || recs.data.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">No reconciliations yet.</td></tr>
              ) : recs.data.map((r) => (
                <tr key={r.id} onClick={() => onOpen(r.id)} className="cursor-pointer hover:bg-gray-50/50">
                  <td className="px-6 py-3 font-medium text-gray-900">{r.bank_account_name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.period_start} → {r.period_end}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatAed(r.statement_ending_balance)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.status === "locked" ? "success" : "warning"} className="capitalize">
                      {r.status === "locked" ? "Locked" : "In Progress"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showNewAccount && (
        <NewBankAccountModal onClose={() => setShowNewAccount(false)} onSaved={() => { setShowNewAccount(false); qc.invalidateQueries({ queryKey: ["bank-accounts"] }); }} />
      )}
      {showNewRec && accounts && (
        <NewReconciliationModal
          accounts={accounts}
          onClose={() => setShowNewRec(false)}
          onSaved={(id) => { setShowNewRec(false); qc.invalidateQueries({ queryKey: ["bank-reconciliations"] }); onOpen(id); }}
        />
      )}
    </div>
  );
}

function NewBankAccountModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const user = useAuthStore((s) => s.user);
  const { data: coaAccounts } = useQuery<ChartOfAccount[]>({
    queryKey: ["chart-of-accounts", "bank-subtype"],
    queryFn: async () => (await api.get("/accounting/accounts?per_page=200")).data.data,
  });
  const bankLikeAccounts = (coaAccounts ?? []).filter((a) => a.subtype === "bank" || a.subtype === "cheque_clearing" || a.code === "1000");

  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");
  const [coaAccountId, setCoaAccountId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.post("/accounting/bank-accounts", {
      branch_id: user?.branch?.id ?? 1,
      account_name: accountName,
      bank_name: bankName,
      iban: iban || null,
      coa_account_id: coaAccountId,
    }),
    onSuccess: onSaved,
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? "Failed to create bank account.");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">New Bank Account</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          <Field label="Account Name *">
            <input value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inputCls} placeholder="e.g. Main Current Account" />
          </Field>
          <Field label="Bank Name *">
            <input value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputCls} placeholder="e.g. Emirates NBD" />
          </Field>
          <Field label="IBAN">
            <input value={iban} onChange={(e) => setIban(e.target.value)} className={inputCls} placeholder="AE..." />
          </Field>
          <Field label="Linked GL Account *">
            <select value={coaAccountId ?? ""} onChange={(e) => setCoaAccountId(e.target.value ? Number(e.target.value) : null)} className={inputCls}>
              <option value="">Select account...</option>
              {bankLikeAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
            </select>
            <p className="mt-1 text-xs text-gray-400">Which ledger account this bank account represents (matching auto-matches journal lines posted here).</p>
          </Field>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} disabled={!accountName || !bankName || !coaAccountId} onClick={() => mutation.mutate()}>Add</Button>
        </div>
      </div>
    </div>
  );
}

function NewReconciliationModal({ accounts, onClose, onSaved }: { accounts: BankAccount[]; onClose: () => void; onSaved: (id: number) => void }) {
  const [bankAccountId, setBankAccountId] = useState<number | null>(accounts[0]?.id ?? null);
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 8) + "01");
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [balance, setBalance] = useState("0");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.post("/accounting/bank-reconciliations", {
      bank_account_id: bankAccountId,
      period_start: periodStart,
      period_end: periodEnd,
      statement_ending_balance: Number(balance),
    }),
    onSuccess: (res) => onSaved(res.data.data.id),
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? "Failed to start reconciliation.");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">New Reconciliation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          <Field label="Bank Account *">
            <select value={bankAccountId ?? ""} onChange={(e) => setBankAccountId(Number(e.target.value))} className={inputCls}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_name} — {a.bank_name}</option>)}
            </select>
          </Field>
          <Field label="Period Start *">
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Period End *">
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Statement Ending Balance *">
            <input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} className={inputCls} />
          </Field>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} disabled={!bankAccountId} onClick={() => mutation.mutate()}>Start</Button>
        </div>
      </div>
    </div>
  );
}

interface CandidateLine { id: number; debit: string; credit: string; line_description: string | null; entry_number: string; entry_date: string; entry_description: string }

function ReconciliationDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [matchingLine, setMatchingLine] = useState<number | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const { data: rec, isLoading } = useQuery<BankReconciliation>({
    queryKey: ["bank-reconciliation", id],
    queryFn: async () => (await api.get(`/accounting/bank-reconciliations/${id}`)).data.data,
  });

  const { data: candidates } = useQuery<CandidateLine[]>({
    queryKey: ["bank-reconciliation-candidates", id],
    queryFn: async () => (await api.get(`/accounting/bank-reconciliations/${id}/candidate-journal-lines`)).data.data,
    enabled: rec?.status === "in_progress",
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["bank-reconciliation", id] });
    qc.invalidateQueries({ queryKey: ["bank-reconciliation-candidates", id] });
    qc.invalidateQueries({ queryKey: ["bank-reconciliations"] });
  };

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.post(`/accounting/bank-reconciliations/${id}/import`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: (res) => { setImportMsg(res.data.message); invalidateAll(); },
  });

  const autoMatchMutation = useMutation({
    mutationFn: () => api.post(`/accounting/bank-reconciliations/${id}/auto-match`),
    onSuccess: (res) => { setImportMsg(res.data.message); invalidateAll(); },
  });

  const matchMutation = useMutation({
    mutationFn: (journalLineId: number) => api.post(`/accounting/bank-reconciliations/${id}/match`, { statement_line_id: matchingLine, journal_line_id: journalLineId }),
    onSuccess: () => { setMatchingLine(null); invalidateAll(); },
  });

  const unmatchMutation = useMutation({
    mutationFn: (lineId: number) => api.post(`/accounting/bank-reconciliations/${id}/lines/${lineId}/unmatch`),
    onSuccess: invalidateAll,
  });

  const lockMutation = useMutation({
    mutationFn: () => api.post(`/accounting/bank-reconciliations/${id}/lock`),
    onSuccess: invalidateAll,
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setImportMsg(e?.response?.data?.message ?? "Failed to lock.");
    },
  });

  if (isLoading || !rec) {
    return <p className="py-12 text-center text-sm text-gray-400">Loading...</p>;
  }

  const locked = rec.status === "locked";
  const lines = rec.lines ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-gray-900">{rec.bank_account_name}</h2>
          <p className="text-xs text-gray-500">{rec.period_start} → {rec.period_end} · Statement balance {formatAed(rec.statement_ending_balance)}</p>
        </div>
        <Badge variant={locked ? "success" : "warning"} className="capitalize">{locked ? "Locked" : "In Progress"}</Badge>
      </div>

      {!locked && (
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importMutation.mutate(f); e.target.value = ""; }} />
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} loading={importMutation.isPending}>
            <Upload className="mr-1.5 h-4 w-4" /> Import CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => autoMatchMutation.mutate()} loading={autoMatchMutation.isPending}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> Auto-Match
          </Button>
          <Button size="sm" onClick={() => lockMutation.mutate()} loading={lockMutation.isPending}>
            <Lock className="mr-1.5 h-4 w-4" /> Lock
          </Button>
        </div>
      )}
      {importMsg && <p className="text-xs text-gray-500">{importMsg}</p>}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reference</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lines.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">No statement lines imported yet.</td></tr>
              ) : lines.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3 text-gray-600">{l.transaction_date}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-gray-900">{l.description ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{l.reference ?? "—"}</td>
                  <td className={cn("px-4 py-3 text-right font-mono", l.amount >= 0 ? "text-green-700" : "text-red-700")}>{formatAed(l.amount)}</td>
                  <td className="px-4 py-3">
                    {l.is_matched ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Matched</Badge>
                        {!locked && (
                          <button onClick={() => unmatchMutation.mutate(l.id)} className="text-xs text-gray-400 hover:text-red-500">Undo</button>
                        )}
                      </div>
                    ) : locked ? (
                      <Badge variant="danger">Unmatched</Badge>
                    ) : (
                      <button onClick={() => setMatchingLine(l.id)} className="text-xs font-medium text-[#95271D] hover:underline">
                        Match manually
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {matchingLine !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">Match to a Journal Line</h2>
              <button onClick={() => setMatchingLine(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto px-6 py-4">
              {!candidates || candidates.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No unmatched journal lines on this account for this period.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {candidates.map((c) => (
                    <button key={c.id} onClick={() => matchMutation.mutate(c.id)}
                      className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-left text-sm hover:border-[#95271D]/40 hover:bg-gray-50">
                      <div>
                        <p className="font-mono text-xs font-semibold text-[#95271D]">{c.entry_number}</p>
                        <p className="text-xs text-gray-500">{c.entry_date} · {c.line_description ?? c.entry_description}</p>
                      </div>
                      <span className="font-mono font-semibold text-gray-900">
                        {Number(c.debit) > 0 ? formatAed(Number(c.debit)) : `(${formatAed(Number(c.credit))})`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end border-t border-gray-100 px-6 py-4">
              <Button variant="ghost" onClick={() => setMatchingLine(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
