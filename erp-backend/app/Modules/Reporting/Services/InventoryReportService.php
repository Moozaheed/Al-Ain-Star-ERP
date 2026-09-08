<?php

declare(strict_types=1);

namespace App\Modules\Reporting\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class InventoryReportService
{
    /**
     * TASK-051 — Stock Balance. Current on-hand quantity and cost value per
     * part per branch, sourced from stock_entries (the FIFO lot ledger) —
     * matches erp-context/modules/reporting/tasks/inventory-reports/TASK-051.
     */
    public function stockBalance(?int $branchId, ?int $categoryId, ?string $search): array
    {
        $rows = DB::table('stock_entries')
            ->join('parts', 'parts.id', '=', 'stock_entries.part_id')
            ->join('branches', 'branches.id', '=', 'stock_entries.branch_id')
            ->leftJoin('categories', 'categories.id', '=', 'parts.category_id')
            ->when($branchId, fn ($q) => $q->where('stock_entries.branch_id', $branchId))
            ->when($categoryId, fn ($q) => $q->where('parts.category_id', $categoryId))
            ->when($search, fn ($q) => $q->where(function ($q) use ($search) {
                $q->where('parts.part_number', 'like', "%{$search}%")
                  ->orWhere('parts.description', 'like', "%{$search}%");
            }))
            ->groupBy('parts.id', 'parts.part_number', 'parts.description', 'parts.min_stock_qty', 'categories.name', 'branches.id', 'branches.name')
            ->selectRaw('
                parts.id as part_id,
                parts.part_number,
                parts.description as part_name,
                parts.min_stock_qty,
                categories.name as category_name,
                branches.id as branch_id,
                branches.name as branch_name,
                SUM(stock_entries.remaining_qty) as qty,
                SUM(stock_entries.remaining_qty * stock_entries.unit_cost) as value
            ')
            ->orderBy('parts.part_number')
            ->get()
            ->map(function ($r) {
                $qty = (int) $r->qty;
                $value = (float) $r->value;

                return [
                    'part_id' => $r->part_id,
                    'part_number' => $r->part_number,
                    'part_name' => $r->part_name,
                    'category_name' => $r->category_name,
                    'branch_id' => $r->branch_id,
                    'branch_name' => $r->branch_name,
                    'qty' => $qty,
                    'avg_cost' => $qty > 0 ? round($value / $qty, 4) : 0.0,
                    'value' => round($value, 2),
                    'min_stock_qty' => (int) $r->min_stock_qty,
                    'is_zero_stock' => $qty === 0,
                    'is_low_stock' => $qty > 0 && $qty < (int) $r->min_stock_qty,
                ];
            });

        return [
            'rows' => $rows->values()->all(),
            'total_value' => round($rows->sum('value'), 2),
        ];
    }

    /**
     * TASK-052 — Stock Ageing. Age is measured from the FIFO lot's
     * stock_entries.received_at to today.
     */
    public function stockAgeing(?int $branchId, ?int $categoryId, int $minAgeDays): array
    {
        $today = Carbon::today();

        $lots = DB::table('stock_entries')
            ->join('parts', 'parts.id', '=', 'stock_entries.part_id')
            ->join('branches', 'branches.id', '=', 'stock_entries.branch_id')
            ->where('stock_entries.remaining_qty', '>', 0)
            ->when($branchId, fn ($q) => $q->where('stock_entries.branch_id', $branchId))
            ->when($categoryId, fn ($q) => $q->where('parts.category_id', $categoryId))
            ->orderBy('stock_entries.received_at')
            ->select([
                'stock_entries.id', 'stock_entries.part_id', 'parts.part_number', 'parts.description as part_name',
                'stock_entries.branch_id', 'branches.name as branch_name',
                'stock_entries.received_at', 'stock_entries.remaining_qty', 'stock_entries.unit_cost',
            ])
            ->get();

        $bucketFor = function (int $ageDays): string {
            return match (true) {
                $ageDays <= 30 => 'days_0_30',
                $ageDays <= 60 => 'days_31_60',
                $ageDays <= 90 => 'days_61_90',
                $ageDays <= 180 => 'days_91_180',
                default => 'days_180_plus',
            };
        };

        $bucketTotals = ['days_0_30' => 0.0, 'days_31_60' => 0.0, 'days_61_90' => 0.0, 'days_91_180' => 0.0, 'days_180_plus' => 0.0];

        $rows = $lots->map(function ($lot) use ($today, $bucketFor, &$bucketTotals) {
            $ageDays = (int) Carbon::parse($lot->received_at)->diffInDays($today);
            $costValue = round((float) $lot->remaining_qty * (float) $lot->unit_cost, 2);
            $bucket = $bucketFor($ageDays);
            $bucketTotals[$bucket] += $costValue;

            return [
                'stock_entry_id' => $lot->id,
                'part_id' => $lot->part_id,
                'part_number' => $lot->part_number,
                'part_name' => $lot->part_name,
                'branch_id' => $lot->branch_id,
                'branch_name' => $lot->branch_name,
                'lot_date' => Carbon::parse($lot->received_at)->toDateString(),
                'age_days' => $ageDays,
                'age_bucket' => $bucket,
                'remaining_qty' => (int) $lot->remaining_qty,
                'cost_value' => $costValue,
            ];
        })->filter(fn ($r) => $r['age_days'] >= $minAgeDays)->values();

        return [
            'rows' => $rows->all(),
            'bucket_totals' => array_map(fn ($v) => round($v, 2), $bucketTotals),
        ];
    }
}
