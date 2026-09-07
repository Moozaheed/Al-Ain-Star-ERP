"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Trash2, Search, ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { PartSearchAdd } from "@/components/ui/PartSearchAdd";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { Customer, LineItemDraft, SalesChannel } from "@/types/sales";
import type { Part } from "@/types/inventory";

const VAT_RATE = 5;

function calcLine(item: LineItemDraft) {
  const lineBeforeDisc = item.unit_price * item.qty;
  const discValue      = (lineBeforeDisc * item.discount_pct) / 100;
  const subtotal       = lineBeforeDisc - discValue;
  const vat            = (subtotal * VAT_RATE) / 100;
  return { subtotal: +subtotal.toFixed(2), vat: +vat.toFixed(2), total: +(subtotal + vat).toFixed(2) };
}

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2 }).format(v);
}

function defaultExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export default function NewQuotationPage() {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);

  const [channel, setChannel]    = useState<SalesChannel>("retail");
  const [expiresAt, setExpiresAt]= useState(defaultExpiry());
  const [lpoNumber, setLpoNumber]= useState("");
  const [refNumber, setRefNumber]= useState("");
  const [notes, setNotes]        = useState("");
  const [error, setError]        = useState<string | null>(null);

  const [customerSearch, setCustomerSearch]     = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [walkInName, setWalkInName]             = useState("");
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["customers-search", customerSearch],
    queryFn: async () => {
      if (customerSearch.length < 2) return [];
      const res = await api.get(`/sales/customers?search=${encodeURIComponent(customerSearch)}&per_page=10`);
      return res.data.data;
    },
    enabled: customerSearch.length >= 2,
  });

  // Line items — added exclusively via the part search bar below (see
  // PartSearchAdd); there is no blank row waiting to be filled in.
  const [items, setItems] = useState<LineItemDraft[]>([]);

  function addPart(part: Part) {
    setItems((prev) => [
      ...prev,
      { part_id: part.id, part_number: part.part_number, description: part.description, qty: 1, unit_price: 0, discount_pct: 0 },
    ]);
  }

  function updateItem(idx: number, field: keyof LineItemDraft, value: string | number) {
    const updated = [...items];
    updated[idx]  = { ...updated[idx], [field]: value } as LineItemDraft;
    setItems(updated);
  }

  function removeRow(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  const lines     = items.map(calcLine);
  const subtotal  = +lines.reduce((s, l) => s + l.subtotal, 0).toFixed(2);
  const vatAmount = +lines.reduce((s, l) => s + l.vat, 0).toFixed(2);
  const total     = +lines.reduce((s, l) => s + l.total, 0).toFixed(2);

  const createMutation = useMutation({
    mutationFn: (payload: object) => api.post("/sales/quotations", payload),
    onSuccess: () => router.push("/sales?tab=quotations"),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Failed to create quotation.");
    },
  });

  function handleSubmit() {
    setError(null);
    if (items.length === 0) { setError("Search and add at least one part."); return; }

    createMutation.mutate({
      branch_id:    user?.branch?.id ?? 1,
      customer_id:  selectedCustomer?.id ?? null,
      customer_name: selectedCustomer?.name ?? (walkInName || null),
      channel,
      expires_at:   expiresAt,
      lpo_number:   lpoNumber || null,
      ref_number:   refNumber || null,
      notes:        notes || null,
      items: items.map((item) => ({
        part_id:      item.part_id,
        description:  item.description,
        qty:          item.qty,
        unit_price:   item.unit_price,
        discount_pct: item.discount_pct,
      })),
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Quotation</h1>
          <p className="mt-0.5 text-sm text-gray-500">Prepare a price quotation for a customer</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Details */}
          <Card>
            <CardHeader><CardTitle>Quotation Details</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Channel</label>
                  <select value={channel} onChange={(e) => setChannel(e.target.value as SalesChannel)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]">
                    <option value="retail">Retail</option>
                    <option value="b2b">B2B</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <Input label="Expires On" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                <Input label="LPO Number" value={lpoNumber} onChange={(e) => setLpoNumber(e.target.value)} placeholder="Customer PO" />
              </div>
              <Input label="Reference No" value={refNumber} onChange={(e) => setRefNumber(e.target.value)} placeholder="Internal reference" />
            </CardContent>
          </Card>

          {/* Customer */}
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {selectedCustomer ? (
                <div className="flex items-start justify-between rounded-lg border border-gray-200 px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                    {selectedCustomer.trn && <p className="text-xs text-gray-500">TRN: {selectedCustomer.trn}</p>}
                    <Badge variant="neutral" className="mt-1">{selectedCustomer.type}</Badge>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="text-sm text-gray-400 hover:text-gray-600">Change</button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input value={customerSearch}
                      onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDrop(true); }}
                      onFocus={() => setShowCustomerDrop(true)}
                      placeholder="Search customer..."
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
                    {showCustomerDrop && customers && customers.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg">
                        {customers.map((c) => (
                          <button key={c.id} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
                            onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); setShowCustomerDrop(false); }}>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{c.name}</p>
                              <p className="text-xs text-gray-500">{c.phone} {c.trn ? `· TRN ${c.trn}` : ""}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input value={walkInName} onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="Or type a name (e.g. CASH CUSTOMER)" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line items */}
          <Card>
            <CardHeader><CardTitle>Items</CardTitle></CardHeader>
            <CardContent className="pt-0 pb-4">
              <PartSearchAdd onAdd={addPart} />
            </CardContent>
            {items.length === 0 ? (
              <CardContent className="pt-0">
                <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
                  No items yet — search above to add parts.
                </div>
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500 w-[160px]">Part</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">Description</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-gray-500 w-16">Qty</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-gray-500 w-24">Price</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-gray-500 w-16">Disc%</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-gray-500 w-28">Total (inc. VAT)</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item, idx) => {
                      const line = calcLine(item);
                      return (
                        <tr key={idx}>
                          <td className="px-4 py-2 font-mono text-xs font-semibold text-gray-900">
                            {item.part_number}
                          </td>
                          <td className="px-4 py-2">
                            <input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)}
                              className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
                              placeholder="Description" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" min={1} value={item.qty}
                              onChange={(e) => updateItem(idx, "qty", Number(e.target.value))}
                              className="w-full rounded border border-gray-200 px-2 py-1.5 text-right text-xs focus:border-[#95271D] focus:outline-none" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" min={0} step="0.01" value={item.unit_price}
                              onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))}
                              className="w-full rounded border border-gray-200 px-2 py-1.5 text-right text-xs focus:border-[#95271D] focus:outline-none" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" min={0} max={100} step="0.1" value={item.discount_pct}
                              onChange={(e) => updateItem(idx, "discount_pct", Number(e.target.value))}
                              className="w-full rounded border border-gray-200 px-2 py-1.5 text-right text-xs focus:border-[#95271D] focus:outline-none" />
                          </td>
                          <td className="px-4 py-2 text-right text-xs font-semibold text-gray-900">
                            {formatAed(line.total)}
                          </td>
                          <td className="px-2 py-2">
                            <button onClick={() => removeRow(idx)} className="text-gray-300 hover:text-red-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <CardContent className="pt-2">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                rows={2} placeholder="Notes / terms (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div>
          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-medium">{formatAed(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">VAT ({VAT_RATE}%)</span><span className="font-medium">{formatAed(vatAmount)}</span></div>
              <div className="my-1 border-t border-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-gray-900">Total</span>
                <span className="text-lg font-bold text-[#95271D]">{formatAed(total)}</span>
              </div>
              <p className="text-xs text-gray-400">Valid for 30 days · VAT @ 5%</p>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}

              <Button className="w-full mt-1" loading={createMutation.isPending} onClick={handleSubmit}>
                Save Quotation
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => router.back()}>Cancel</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
