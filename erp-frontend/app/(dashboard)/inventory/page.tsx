"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Plus, AlertTriangle, Package,
  CheckCircle, Flag, ChevronLeft, ChevronRight, X, Camera,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PartThumb } from "@/components/ui/PartSearchAdd";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import type { Part, PartFormData, Category, Brand, Unit } from "@/types/inventory";

const DEFAULT_FORM: PartFormData = {
  part_number: "",
  description: "",
  barcode: "",
  category_id: null,
  brand_id: null,
  unit_id: null,
  min_stock_qty: 0,
  is_active: true,
};

interface PaginatedResponse<T> {
  data: T[];
  meta: { current_page: number; last_page: number; total: number; per_page: number };
}

export default function InventoryPage() {
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [brandId, setBrandId] = useState<string>("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);
  const [form, setForm] = useState<PartFormData>(DEFAULT_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<Part>>({
    queryKey: ["parts", search, categoryId, brandId, lowStockOnly, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        per_page: "20",
        ...(search && { search }),
        ...(categoryId && { category_id: categoryId }),
        ...(brandId && { brand_id: brandId }),
        ...(lowStockOnly && { low_stock: "true" }),
      });
      const res = await api.get(`/inventory/parts?${params}`);
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ["categories", "active"],
    queryFn: async () => (await api.get("/inventory/categories?is_active=true&per_page=200")).data.data,
  });

  const { data: brandsData } = useQuery<Brand[]>({
    queryKey: ["brands", "active"],
    queryFn: async () => (await api.get("/inventory/brands?is_active=true&per_page=200")).data.data,
  });

  const { data: unitsData } = useQuery<Unit[]>({
    queryKey: ["units", "active"],
    queryFn: async () => (await api.get("/inventory/units?is_active=true&per_page=200")).data.data,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: PartFormData) => {
      const res = editing
        ? await api.put(`/inventory/parts/${editing.id}`, payload)
        : await api.post("/inventory/parts", payload);
      const partId: number = res.data.data.id;

      if (imageFile) {
        const fd = new FormData();
        fd.append("image", imageFile);
        await api.post(`/inventory/parts/${partId}/image`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parts"] });
      closeModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? "Failed to save part.");
    },
  });

  function openAdd() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setImageFile(null);
    setImagePreview(null);
    setFormError(null);
    setShowModal(true);
  }

  function openEdit(part: Part) {
    setEditing(part);
    setForm({
      part_number: part.part_number,
      description: part.description,
      barcode: part.barcode ?? "",
      category_id: part.category_id,
      brand_id: part.brand_id,
      unit_id: part.unit_id,
      min_stock_qty: part.min_stock_qty,
      is_active: part.is_active,
    });
    setImageFile(null);
    setImagePreview(part.image_url);
    setFormError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setForm(DEFAULT_FORM);
    setImageFile(null);
    setImagePreview(null);
    setFormError(null);
  }

  function pickImage(file: File | undefined) {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  const parts = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
          <p className="mt-0.5 text-sm text-gray-500">Parts catalog and stock levels</p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Part
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiChip label="Total Parts" value={meta?.total ?? 0} icon={Package} color="brand" />
        <KpiChip label="Low Stock" value={parts.filter((p) => p.is_low_stock).length} icon={AlertTriangle} color="amber" />
        <KpiChip label="Active" value={parts.filter((p) => p.is_active).length} icon={CheckCircle} color="green" />
        <KpiChip label="Flagged" value={parts.filter((p) => p.is_flagged).length} icon={Flag} color="red" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search part number, description..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
            />
          </div>

          <select
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
          >
            <option value="">All Categories</option>
            {categoriesData?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select
            value={brandId}
            onChange={(e) => { setBrandId(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
          >
            <option value="">All Brands</option>
            {brandsData?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <button
            onClick={() => { setLowStockOnly((v) => !v); setPage(1); }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              lowStockOnly
                ? "border-amber-400 bg-amber-50 text-amber-700"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Low Stock
          </button>

          {(search || categoryId || brandId || lowStockOnly) && (
            <button
              onClick={() => { setSearch(""); setCategoryId(""); setBrandId(""); setLowStockOnly(false); setPage(1); }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </CardContent>
      </Card>

      {/* Parts table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Parts Catalog
            {meta && <span className="ml-2 font-normal text-gray-400">{meta.total} parts</span>}
          </CardTitle>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-14" />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Part No</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Brand</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Unit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Stock</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Min</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : parts.length === 0
                  ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-16 text-center text-sm text-gray-400">
                        No parts found. Add your first part to get started.
                      </td>
                    </tr>
                  )
                  : parts.map((part) => (
                    <tr key={part.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <PartThumb url={part.image_url} size="h-9 w-9" />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">
                        {part.part_number}
                      </td>
                      <td className="max-w-[240px] px-6 py-3">
                        <p className="truncate text-gray-900">{part.description}</p>
                        {part.barcode && (
                          <p className="text-[11px] text-gray-400">{part.barcode}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{part.category_name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{part.brand_name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{part.unit_abbreviation ?? part.unit_name ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          "font-semibold",
                          part.is_low_stock ? "text-red-600" : "text-gray-900"
                        )}>
                          {part.total_stock ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{part.min_stock_qty}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {part.is_low_stock && (
                            <Badge variant="warning">Low Stock</Badge>
                          )}
                          {part.is_flagged && (
                            <Badge variant="danger">Flagged</Badge>
                          )}
                          {!part.is_active && (
                            <Badge variant="neutral">Inactive</Badge>
                          )}
                          {part.is_active && !part.is_low_stock && !part.is_flagged && (
                            <Badge variant="success">OK</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openEdit(part)}
                            className="text-xs font-medium text-[#95271D] hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <p className="text-xs text-gray-500">
              Page {meta.current_page} of {meta.last_page} — {meta.total} parts
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={meta.current_page === 1}
                className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={meta.current_page === meta.last_page}
                className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                {editing ? "Edit Part" : "Add New Part"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              {/* Image */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200"
                >
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local/preview image, not a static asset
                    <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-300">
                      <Package className="h-6 w-6" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent transition-colors group-hover:bg-black/40 group-hover:text-white">
                    <Camera className="h-5 w-5" />
                  </div>
                </button>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-gray-700">Product photo</p>
                  <p className="text-xs text-gray-400">Helps staff pick the right part when searching. JPG/PNG, up to 4MB.</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pickImage(e.target.files?.[0])}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Part Number"
                  value={form.part_number}
                  onChange={(e) => setForm((f) => ({ ...f, part_number: e.target.value }))}
                  required
                  placeholder="e.g. 0811380019"
                />
                <Input
                  label="Barcode"
                  value={form.barcode}
                  onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                  placeholder="Optional"
                />
              </div>

              <Input
                label="Description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
                placeholder="Full part description"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={form.category_id ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value ? Number(e.target.value) : null }))}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
                  >
                    <option value="">Uncategorized</option>
                    {categoriesData?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Brand</label>
                  <select
                    value={form.brand_id ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, brand_id: e.target.value ? Number(e.target.value) : null }))}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
                  >
                    <option value="">No brand</option>
                    {brandsData?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <p className="-mt-2 text-xs text-gray-400">
                Don&apos;t see the category or brand you need? Add it under Settings.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Unit *</label>
                  <select
                    value={form.unit_id ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, unit_id: e.target.value ? Number(e.target.value) : null }))}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
                  >
                    <option value="">Select unit...</option>
                    {unitsData?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <Input
                  label="Min Stock Qty"
                  type="number"
                  min={0}
                  value={String(form.min_stock_qty)}
                  onChange={(e) => setForm((f) => ({ ...f, min_stock_qty: Number(e.target.value) }))}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-[#95271D] focus:ring-[#95271D]"
                />
                Active — available for sales and purchasing
              </label>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <Button variant="ghost" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                loading={saveMutation.isPending}
                disabled={!form.unit_id}
                onClick={() => saveMutation.mutate(form)}
              >
                {editing ? "Save Changes" : "Add Part"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiChip({
  label, value, icon: Icon, color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: "brand" | "amber" | "green" | "red";
}) {
  const styles = {
    brand: "bg-[#95271D]/10 text-[#95271D]",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg", styles[color])}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50">
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 animate-pulse rounded bg-gray-100" />
        </td>
      ))}
    </tr>
  );
}
