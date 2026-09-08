"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import type { TooltipValueType } from "recharts";
import { cn } from "@/lib/cn";
import { Card, CardContent } from "@/components/ui/Card";
import api from "@/lib/api";
import { CHART_COLORS, CHART_GRID, CHART_TEXT } from "@/lib/chartColors";
import type {
  ProfitAndLossReport, BalanceSheetReport, VatReturnReport, GeneralLedgerReport, ChartOfAccount,
} from "@/types/accounting";

type ReportKey = "pl" | "bs" | "vat" | "gl";

const REPORTS: { key: ReportKey; label: string }[] = [
  { key: "pl", label: "Profit & Loss" },
  { key: "bs", label: "Balance Sheet" },
  { key: "vat", label: "VAT Return" },
  { key: "gl", label: "General Ledger" },
];

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2 }).format(v);
}

function firstOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ReportsTab() {
  const [report, setReport] = useState<ReportKey>("pl");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-fit gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {REPORTS.map((r) => (
          <button key={r.key} onClick={() => setReport(r.key)}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
              report === r.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            {r.label}
          </button>
        ))}
      </div>

      {report === "pl" && <ProfitAndLossView />}
      {report === "bs" && <BalanceSheetView />}
      {report === "vat" && <VatReturnView />}
      {report === "gl" && <GeneralLedgerView />}
    </div>
  );
}

function DateRangeBar({ from, to, onFrom, onTo }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">From</label>
        <input type="date" value={from} onChange={(e) => onFrom(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">To</label>
        <input type="date" value={to} onChange={(e) => onTo(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
      </div>
    </div>
  );
}

function SummaryBarChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <Card>
      <CardContent>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 0, right: 8 }}>
              <CartesianGrid vertical={false} stroke={CHART_GRID} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_TEXT }} interval={0} angle={-15} textAnchor="end" height={45} />
              <YAxis tick={{ fontSize: 11, fill: CHART_TEXT }} tickFormatter={(v) => formatAed(v)} width={75} />
              <Tooltip formatter={(v: TooltipValueType | undefined) => formatAed(Number(v))} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((d, i) => <Cell key={i} fill={d.value < 0 ? "#DC2626" : CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function LineRow({ label, amount, bold }: { label: string; amount: number; bold?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between py-1.5 text-sm", bold && "font-semibold text-gray-900")}>
      <span className={bold ? "" : "text-gray-600"}>{label}</span>
      <span className={bold ? "" : "text-gray-900"}>{formatAed(amount)}</span>
    </div>
  );
}

export function ProfitAndLossView() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());

  const { data, isLoading } = useQuery<ProfitAndLossReport>({
    queryKey: ["report-pl", from, to],
    queryFn: async () => (await api.get(`/accounting/profit-and-loss?date_from=${from}&date_to=${to}`)).data.data,
  });

  return (
    <div className="flex flex-col gap-4">
      <DateRangeBar from={from} to={to} onFrom={setFrom} onTo={setTo} />

      {data && (
        <SummaryBarChart data={[
          { label: "Revenue", value: data.total_revenue },
          { label: "COGS", value: data.total_cost_of_goods_sold },
          { label: "Gross Profit", value: data.gross_profit },
          { label: "OpEx", value: data.total_operating_expenses },
          { label: "Net Income", value: data.net_income },
        ]} />
      )}

      <Card>
        <CardContent>
          {isLoading || !data ? (
            <p className="py-8 text-center text-sm text-gray-400">Loading...</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-50">
              <div className="pb-2">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Revenue</p>
                {data.revenue.length === 0 && <p className="text-sm text-gray-400">No revenue posted in this period.</p>}
                {data.revenue.map((r) => <LineRow key={r.code} label={r.name} amount={r.amount} />)}
                <LineRow label="Total Revenue" amount={data.total_revenue} bold />
              </div>
              <div className="py-2">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Cost of Goods Sold</p>
                {data.cost_of_goods_sold.map((r) => <LineRow key={r.code} label={r.name} amount={r.amount} />)}
                <LineRow label="Total COGS" amount={data.total_cost_of_goods_sold} bold />
              </div>
              <div className="py-2">
                <LineRow label="Gross Profit" amount={data.gross_profit} bold />
              </div>
              <div className="py-2">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Operating Expenses</p>
                {data.operating_expenses.length === 0 && <p className="text-sm text-gray-400">No operating expenses posted in this period.</p>}
                {data.operating_expenses.map((r) => <LineRow key={r.code} label={r.name} amount={r.amount} />)}
                <LineRow label="Total Operating Expenses" amount={data.total_operating_expenses} bold />
              </div>
              <div className="pt-3">
                <div className="flex items-center justify-between rounded-lg bg-[#95271D]/5 px-3 py-2.5">
                  <span className="text-base font-bold text-gray-900">Net Income</span>
                  <span className={cn("text-lg font-bold", data.net_income >= 0 ? "text-green-700" : "text-red-700")}>
                    {formatAed(data.net_income)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BalanceSheetView() {
  const [asOf, setAsOf] = useState(today());

  const { data, isLoading } = useQuery<BalanceSheetReport>({
    queryKey: ["report-bs", asOf],
    queryFn: async () => (await api.get(`/accounting/balance-sheet?as_of=${asOf}`)).data.data,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">As Of</label>
        <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
      </div>
      {isLoading || !data ? (
        <Card><CardContent><p className="py-8 text-center text-sm text-gray-400">Loading...</p></CardContent></Card>
      ) : (
        <>
        <SummaryBarChart data={[
          { label: "Assets", value: data.total_assets },
          { label: "Liabilities", value: data.total_liabilities },
          { label: "Equity", value: data.total_equity },
        ]} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardContent>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Assets</p>
              {data.assets.map((a, i) => <LineRow key={i} label={a.name} amount={a.amount} />)}
              <div className="mt-2 border-t border-gray-100 pt-2">
                <LineRow label="Total Assets" amount={data.total_assets} bold />
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Liabilities</p>
                {data.liabilities.map((a, i) => <LineRow key={i} label={a.name} amount={a.amount} />)}
                <div className="mt-2 border-t border-gray-100 pt-2">
                  <LineRow label="Total Liabilities" amount={data.total_liabilities} bold />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Equity</p>
                {data.equity.map((a, i) => <LineRow key={i} label={a.name} amount={a.amount} />)}
                <div className="mt-2 border-t border-gray-100 pt-2">
                  <LineRow label="Total Equity" amount={data.total_equity} bold />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <div className={cn(
              "flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold",
              data.balanced ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            )}>
              <span>Assets {formatAed(data.total_assets)} {data.balanced ? "=" : "≠"} Liabilities + Equity {formatAed(data.total_liabilities_and_equity)}</span>
              <span>{data.balanced ? "Balanced" : "Out of balance"}</span>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}

export function VatReturnView() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());

  const { data, isLoading } = useQuery<VatReturnReport>({
    queryKey: ["report-vat", from, to],
    queryFn: async () => (await api.get(`/accounting/vat-return?date_from=${from}&date_to=${to}`)).data.data,
  });

  return (
    <div className="flex flex-col gap-4">
      <DateRangeBar from={from} to={to} onFrom={setFrom} onTo={setTo} />

      {data && (
        <SummaryBarChart data={[
          { label: "Output VAT", value: data.output_vat },
          { label: "Input VAT Recoverable", value: data.input_vat_recoverable },
          { label: "Net VAT Payable", value: data.net_vat_payable },
        ]} />
      )}

      <Card>
        <CardContent>
          {isLoading || !data ? (
            <p className="py-8 text-center text-sm text-gray-400">Loading...</p>
          ) : (
            <div className="flex flex-col gap-1 divide-y divide-gray-50">
              <LineRow label="Standard-rated supplies VAT" amount={data.standard_rated_supplies_vat} />
              <LineRow label="Zero-rated supplies VAT" amount={data.zero_rated_supplies_vat} />
              <LineRow label="Exempt supplies VAT" amount={data.exempt_supplies_vat} />
              <LineRow label="Imports VAT" amount={data.imports_vat} />
              <div className="pt-2">
                <LineRow label="Output VAT" amount={data.output_vat} bold />
                <LineRow label="Input VAT Recoverable" amount={data.input_vat_recoverable} bold />
              </div>
              <div className="pt-3">
                <div className="flex items-center justify-between rounded-lg bg-[#95271D]/5 px-3 py-2.5">
                  <span className="text-base font-bold text-gray-900">Net VAT Payable</span>
                  <span className="text-lg font-bold text-[#95271D]">{formatAed(data.net_vat_payable)}</span>
                </div>
              </div>
              <p className="pt-3 text-xs text-gray-400">{data.note}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GeneralLedgerView() {
  const [accountId, setAccountId] = useState<number | null>(null);
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());

  const { data: accounts } = useQuery<ChartOfAccount[]>({
    queryKey: ["chart-of-accounts"],
    queryFn: async () => (await api.get("/accounting/accounts?per_page=200")).data.data,
  });

  const { data, isLoading } = useQuery<GeneralLedgerReport>({
    queryKey: ["report-gl", accountId, from, to],
    queryFn: async () => (await api.get(`/accounting/ledger?account_id=${accountId}&date_from=${from}&date_to=${to}`)).data.data,
    enabled: accountId !== null,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px]">
          <label className="mb-1 block text-xs font-medium text-gray-700">Account</label>
          <select value={accountId ?? ""} onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]">
            <option value="">Select an account...</option>
            {accounts?.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
          </select>
        </div>
        <DateRangeBar from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </div>

      {accountId === null ? (
        <Card><CardContent><p className="py-8 text-center text-sm text-gray-400">Select an account to view its ledger.</p></CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Entry</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Debit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Credit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Loading...</td></tr>
                ) : !data || data.lines.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">No activity in this period.</td></tr>
                ) : data.lines.map((l, i) => (
                  <tr key={i} className={cn("hover:bg-gray-50/50", l.is_reversed && "opacity-50")}>
                    <td className="px-6 py-3 font-mono text-xs font-semibold text-[#95271D]">{l.entry_number}</td>
                    <td className="px-4 py-3 text-gray-600">{l.entry_date}</td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-gray-900">{l.description}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900">{l.debit > 0 ? formatAed(l.debit) : "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900">{l.credit > 0 ? formatAed(l.credit) : "—"}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">{formatAed(l.running_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && (
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
              <span className="text-xs text-gray-500">{data.account.code} · {data.account.name}</span>
              <span className="text-sm font-semibold text-gray-900">Closing Balance: {formatAed(data.closing_balance)}</span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
