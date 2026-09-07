"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search, X, Tag, Award, Ruler } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import api from "@/lib/api";

type Entity = "categories" | "brands" | "units";

interface Row {
  id: number;
  name: string;
  abbreviation?: string | null;
  is_active: boolean;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number };
}

const TABS: { key: Entity; label: string; icon: React.ElementType; hasAbbreviation: boolean }[] = [
  { key: "categories", label: "Categories", icon: Tag, hasAbbreviation: false },
  { key: "brands", label: "Brands", icon: Award, hasAbbreviation: false },
  { key: "units", label: "Units", icon: Ruler, hasAbbreviation: true },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Entity>("categories");
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="mt-0.5 text-sm text-gray-500">Manage the parts catalog&apos;s categories, brands, and units</p>
      </div>

      <div className="flex w-fit gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {TABS.map((t) => (
          <TabBtn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)} icon={t.icon} label={t.label} />
        ))}
      </div>

      {/* key resets local state (search, modal) when switching tabs */}
      <MasterDataManager key={active.key} entity={active.key} label={active.label} hasAbbreviation={active.hasAbbreviation} />
    </div>
  );
}

function MasterDataManager({ entity, label, hasAbbreviation }: { entity: Entity; label: string; hasAbbreviation: boolean }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; row: Row | null }>({ open: false, row: null });

  const { data, isLoading } = useQuery<Paginated<Row>>({
    queryKey: [entity],
    queryFn: async () => (await api.get(`/inventory/${entity}?per_page=200`)).data,
  });

  const rows = (data?.data ?? []).filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()));

  const invalidate = () => qc.invalidateQueries({ queryKey: [entity] });

  const toggle = useMutation({
    mutationFn: (row: Row) => api.put(`/inventory/${entity}/${row.id}`, { is_active: !row.is_active }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/inventory/${entity}/${id}`),
    onSuccess: invalidate,
  });

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}...`}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
          />
        </div>
        <Button onClick={() => setModal({ open: true, row: null })} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add {label.replace(/s$/, "")}
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
                {hasAbbreviation && (
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Abbreviation</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">Loading...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">
                    No {label.toLowerCase()} yet. Add the first one to make it selectable when adding parts.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">{row.name}</td>
                    {hasAbbreviation && <td className="px-4 py-3 text-gray-500">{row.abbreviation ?? "—"}</td>}
                    <td className="px-4 py-3">
                      <button onClick={() => toggle.mutate(row)}>
                        <Badge variant={row.is_active ? "success" : "neutral"}>
                          {row.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setModal({ open: true, row })} className="text-gray-400 hover:text-[#95271D]">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete "${row.name}"? Parts using it will just lose this tag.`)) remove.mutate(row.id); }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {modal.open && (
        <RowModal
          entity={entity}
          label={label}
          hasAbbreviation={hasAbbreviation}
          row={modal.row}
          onClose={() => setModal({ open: false, row: null })}
          onSaved={() => { setModal({ open: false, row: null }); invalidate(); }}
        />
      )}
    </>
  );
}

function RowModal({
  entity,
  label,
  hasAbbreviation,
  row,
  onClose,
  onSaved,
}: {
  entity: Entity;
  label: string;
  hasAbbreviation: boolean;
  row: Row | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = row !== null;
  const [name, setName] = useState(row?.name ?? "");
  const [abbreviation, setAbbreviation] = useState(row?.abbreviation ?? "");
  const [isActive, setIsActive] = useState(row?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name,
        is_active: isActive,
        ...(hasAbbreviation && { abbreviation: abbreviation || null }),
      };
      if (isEdit) {
        await api.put(`/inventory/${entity}/${row.id}`, payload);
      } else {
        await api.post(`/inventory/${entity}`, payload);
      }
      onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msgs = err?.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(" ") : err?.response?.data?.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? `Edit ${label.replace(/s$/, "")}` : `New ${label.replace(/s$/, "")}`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
              placeholder={`e.g. ${entity === "units" ? "Piece" : entity === "brands" ? "Bosch" : "Brakes"}`}
            />
          </div>

          {hasAbbreviation && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Abbreviation</label>
              <input
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value)}
                maxLength={10}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
                placeholder="e.g. pc"
              />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#95271D] focus:ring-[#95271D]"
            />
            Active — selectable when adding a part
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={saving} disabled={!name.trim()} onClick={submit}>
            {isEdit ? "Save Changes" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
        active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
