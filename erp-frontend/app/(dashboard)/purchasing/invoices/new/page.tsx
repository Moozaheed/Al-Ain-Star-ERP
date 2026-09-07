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
import type { PurchasePaymentMode, PurchaseLineItemDraft, Supplier } from "@/types/purchasing";
import type { Part } from "@/types/inventory";

const VAT_RATE = 5;

function calcLine(item: PurchaseLineItemDraft) {
  const subtotal = item.unit_cost * item.qty;
  const vat = (subtotal * VAT_RATE) / 100;
  return { subtotal: +subtotal.toFixed(2), vat: +vat.toFixed(2), total: +(subtotal + vat).toFixed(2) };
}

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2 }).format(v);
}

export default function NewPurchaseInvoicePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [paymentMode, setPaymentMode] = useState<PurchasePaymentMode>("cash");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [supplierRef, setSupplierRef] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Supplier
  const [supplierSearch, setSupplierSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["suppliers-search", supplierSearch],
    queryFn: async () => {
      if (supplierSearch.length < 2) return [];
      const res = await api.get(`/crm/suppliers?search=${encodeURIComponent(supplierSearch)}&per_page=10`);
      return res.data.data;
    },
    enabled: supplierSearch.length >= 2,
  });

  // Line items — added via the part search bar; no blank row to fill in.
  const [items, setItems] = useState<PurchaseLineItemDraft[]>([]);

  function addPart(part: Part) {
    setItems((prev) => [
      ...prev,
      { part_id: part.id, part_number: part.part_number, description: part.description, qty: 1, unit_cost: 0 },
    ]);
  }

  function updateItem(idx: number, field: keyof PurchaseLineItemDraft, value: string | number) {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value } as PurchaseLineItemDraft;
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
    mutationFn: (payload: object) => api.post("/purchasing/invoices", payload),
    onSuccess: () => router.push("/purchasing"),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Failed to create purchase invoice.");
    },
  });

  function handleSubmit() {
    setError(null);
    if (!selectedSupplier) { setError("Select a supplier."); return; }
    if (items.length === 0) { setError("Search and add at least one part."); return; }
    if (items.some((i) => i.unit_cost <= 0)) { setError("Every item needs a unit cost greater than 0."); return; }

    createMutation.mutate({
      branch_id:             user?.branch?.id ?? 1,
      supplier_id:           selectedSupplier.id,
      supplier_invoice_ref:  supplierRef || null,
      invoice_date:          invoiceDate,
      due_date:              dueDate || null,
      payment_mode:          paymentMode,
      notes:                 notes || null,
      items: items.map((item) => ({
        part_id:     item.part_id,
        description: item.description,
        qty:         item.qty,
        unit_cost:   item.unit_cost,
      })),
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Purchase Invoice</h1>
          <p className="mt-0.5 text-sm text-gray-500">Receive stock from a supplier with input VAT</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Invoice details */}
          <Card>
            <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Payment Mode</label>
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PurchasePaymentMode)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]">
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit">Credit</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <Input label="Invoice Date" type="date" value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)} />
                {paymentMode === "credit" && (
                  <Input label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                )}
              </div>
              <Input label="Supplier Invoice Ref" value={supplierRef} onChange={(e) => setSupplierRef(e.target.value)} placeholder="Supplier's own invoice number" />
            </CardContent>
          </Card>

          {/* Supplier */}
          <Card>
            <CardHeader><CardTitle>Supplier</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {selectedSupplier ? (
                <div className="flex items-start justify-between rounded-lg border border-gray-200 px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{selectedSupplier.name}</p>
                    {selectedSupplier.trn && <p className="text-xs text-gray-500">TRN: {selectedSupplier.trn}</p>}
                    {selectedSupplier.phone && <p className="text-xs text-gray-500">{selectedSupplier.phone}</p>}
                    <Badge variant="neutral" className="mt-1">Net {selectedSupplier.payment_terms_days} days</Badge>
                  </div>
                  <button onClick={() => setSelectedSupplier(null)} className="text-sm text-gray-400 hover:text-gray-600">Change</button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={supplierSearch}
                    onChange={(e) => { setSupplierSearch(e.target.value); setShowSupplierDrop(true); }}
                    onFocus={() => setShowSupplierDrop(true)}
                    placeholder="Search supplier by name, TRN..."
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
                  />
                  {showSupplierDrop && suppliers && suppliers.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg">
                      {suppliers.map((s) => (
                        <button key={s.id} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
                          onClick={() => { setSelectedSupplier(s); setSupplierSearch(""); setShowSupplierDrop(false); }}>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{s.name}</p>
                            <p className="text-xs text-gray-500">{s.phone} {s.trn ? `· TRN ${s.trn}` : ""}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {supplierSearch.length >= 2 && suppliers?.length === 0 && (
                    <p className="mt-1 text-xs text-gray-400">
                      No matches. New suppliers can be added under Settings once Supplier management ships there.
                    </p>
                  )}
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
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-gray-500 w-28">Unit Cost</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-gray-500 w-28">Total</th>
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
                            <input value={item.description}
                              onChange={(e) => updateItem(idx, "description", e.target.value)}
                              className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
                              placeholder="Description" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" min={1} value={item.qty}
                              onChange={(e) => updateItem(idx, "qty", Number(e.target.value))}
                              className="w-full rounded border border-gray-200 px-2 py-1.5 text-right text-xs focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" min={0} step="0.01" value={item.unit_cost}
                              onChange={(e) => updateItem(idx, "unit_cost", Number(e.target.value))}
                              className="w-full rounded border border-gray-200 px-2 py-1.5 text-right text-xs focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
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
                rows={2} placeholder="Notes / remarks (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
            </CardContent>
          </Card>
        </div>

        {/* Right column — totals + submit */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <SummaryRow label="Subtotal" value={formatAed(subtotal)} />
              <SummaryRow label={`Input VAT (${VAT_RATE}%)`} value={formatAed(vatAmount)} />
              <div className="my-1 border-t border-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-gray-900">Total</span>
                <span className="text-lg font-bold text-[#95271D]">{formatAed(total)}</span>
              </div>

              <div className="mt-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                <p className="font-medium text-gray-700">Payment mode: {paymentMode.replace("_", " ")}</p>
                {["cash", "bank_transfer"].includes(paymentMode) && (
                  <p className="mt-0.5 text-green-700">Invoice will be marked as Paid</p>
                )}
                {["credit", "cheque"].includes(paymentMode) && (
                  <p className="mt-0.5 text-amber-700">Invoice will be marked as Received (payment pending)</p>
                )}
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button className="w-full mt-1" loading={createMutation.isPending} onClick={handleSubmit}>
                Create Purchase Invoice
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => router.back()}>
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
