"use client";

import { useState } from "react";
import AsyncSelect from "react-select/async";
import { Package, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import type { Part } from "@/types/inventory";

interface PartOption {
  value: number;
  label: string;
  part: Part;
}

async function loadPartOptions(input: string): Promise<PartOption[]> {
  if (input.trim().length < 2) return [];
  const res = await api.get("/inventory/parts", { params: { search: input, per_page: 20 } });
  const parts: Part[] = res.data.data;
  return parts.map((p) => ({ value: p.id, label: p.part_number, part: p }));
}

export function PartThumb({ url, size = "h-10 w-10" }: { url?: string | null; size?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- remote catalog images, not a static asset
    return <img src={url} alt="" className={cn(size, "flex-shrink-0 rounded-md border border-gray-100 object-cover")} />;
  }
  return (
    <div className={cn(size, "flex flex-shrink-0 items-center justify-center rounded-md border border-gray-100 bg-gray-50 text-gray-300")}>
      <Package className="h-4 w-4" />
    </div>
  );
}

interface PartSearchAddProps {
  onAdd: (part: Part) => void;
  placeholder?: string;
}

/**
 * Primary "add item" control for invoice/quotation line items: search the
 * parts catalog, see a thumbnail + description for each match, click one to
 * append it as a new line. Replaces the old "Add Row then pick a part in
 * that row" flow — there is no blank row waiting to be filled in anymore.
 */
export function PartSearchAdd({ onAdd, placeholder = "Search parts by number, name, or barcode to add..." }: PartSearchAddProps) {
  const [inputValue, setInputValue] = useState("");

  return (
    <AsyncSelect<PartOption, false>
      instanceId="part-search-add"
      cacheOptions
      defaultOptions={false}
      loadOptions={loadPartOptions}
      inputValue={inputValue}
      onInputChange={(val, meta) => {
        // Guard against react-select clearing inputValue on blur/menu-close.
        if (meta.action === "input-change") setInputValue(val);
      }}
      value={null}
      onChange={(opt) => {
        if (!opt) return;
        onAdd(opt.part);
        setInputValue("");
      }}
      placeholder={placeholder}
      noOptionsMessage={({ inputValue: q }) =>
        q.trim().length < 2 ? "Type at least 2 characters to search..." : "No parts found."
      }
      loadingMessage={() => "Searching..."}
      formatOptionLabel={(opt) => (
        <div className="flex items-center gap-3 py-0.5">
          <PartThumb url={opt.part.image_url} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-mono text-xs font-semibold text-gray-900">{opt.part.part_number}</span>
              {opt.part.is_low_stock && (
                <span className="flex-shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                  Low stock
                </span>
              )}
            </div>
            <p className="truncate text-xs text-gray-500">{opt.part.description}</p>
          </div>
          <span className="flex-shrink-0 text-[10px] text-gray-400">{opt.part.total_stock} in stock</span>
        </div>
      )}
      components={{ DropdownIndicator: () => <Search className="mr-3 h-4 w-4 text-gray-400" /> }}
      unstyled
      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      menuPosition="fixed"
      classNames={{
        container: () => "w-full",
        control: ({ isFocused }) =>
          cn(
            "!min-h-0 w-full rounded-lg border bg-white px-3 py-2.5 transition-colors",
            isFocused ? "border-[#95271D] ring-1 ring-[#95271D]" : "border-gray-300 hover:border-gray-400"
          ),
        valueContainer: () => "gap-1 py-0",
        placeholder: () => "truncate text-sm text-gray-400",
        input: () => "text-sm text-gray-900",
        indicatorsContainer: () => "gap-0.5",
        indicatorSeparator: () => "hidden",
        menuPortal: () => "z-50",
        menu: () => "mt-1 w-[420px] max-w-[90vw] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl",
        menuList: () => "max-h-80 overflow-y-auto py-1",
        option: ({ isFocused }) => cn("cursor-pointer px-3 py-2", isFocused ? "bg-gray-50" : "bg-white"),
        noOptionsMessage: () => "px-3 py-3 text-xs text-gray-400",
        loadingMessage: () => "px-3 py-3 text-xs text-gray-400",
      }}
    />
  );
}
