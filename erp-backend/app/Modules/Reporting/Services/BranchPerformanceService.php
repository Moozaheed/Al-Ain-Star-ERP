<?php

declare(strict_types=1);

namespace App\Modules\Reporting\Services;

use App\Modules\Admin\Models\Branch;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class BranchPerformanceService
{
    /**
     * Branch performance comparison — reporting/business-rules.md's
     * "Multi-Branch Consolidation" section (sum-across-branches semantics),
     * not the still-open Q3 branch-vs-consolidated P&L question: this report
     * only surfaces sales/stock/AR KPIs already computed elsewhere, not a
     * full Profit & Loss statement.
     *
     * @param  int|null  $onlyBranchId  When set (Branch Manager), restrict to this one branch.
     */
    public function compare(string $from, string $to, ?int $onlyBranchId): array
    {
        $branches = Branch::query()
            ->where('is_active', true)
            ->when($onlyBranchId, fn ($q) => $q->where('id', $onlyBranchId))
            ->orderBy('name')
            ->get(['id', 'name']);

        $branchIds = $branches->pluck('id');
        $today = Carbon::today()->toDateString();

        $sales = DB::table('invoices')
            ->whereIn('branch_id', $branchIds)
            ->where('status', '!=', 'void')
            ->whereBetween('invoice_date', [$from, $to])
            ->groupBy('branch_id')
            ->selectRaw('branch_id, COUNT(*) as invoice_count, SUM(subtotal) as revenue')
            ->get()
            ->keyBy('branch_id');

        $profit = DB::table('invoice_items')
            ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
            ->whereIn('invoices.branch_id', $branchIds)
            ->where('invoices.status', '!=', 'void')
            ->whereBetween('invoices.invoice_date', [$from, $to])
            ->groupBy('invoices.branch_id')
            ->selectRaw('invoices.branch_id, SUM(invoice_items.line_subtotal - invoice_items.qty * invoice_items.unit_cost) as gross_profit')
            ->get()
            ->keyBy('branch_id');

        $arOverdue = DB::table('invoices')
            ->whereIn('branch_id', $branchIds)
            ->where('status', '!=', 'void')
            ->where('amount_due', '>', 0)
            ->whereNotNull('due_date')
            ->where('due_date', '<', $today)
            ->groupBy('branch_id')
            ->selectRaw('branch_id, SUM(amount_due) as ar_overdue')
            ->get()
            ->keyBy('branch_id');

        $lowStock = DB::table('stock_entries')
            ->join('parts', 'parts.id', '=', 'stock_entries.part_id')
            ->whereIn('stock_entries.branch_id', $branchIds)
            ->groupBy('stock_entries.branch_id', 'parts.id', 'parts.min_stock_qty')
            ->havingRaw('SUM(stock_entries.remaining_qty) < parts.min_stock_qty')
            ->selectRaw('stock_entries.branch_id, parts.id as part_id')
            ->get()
            ->groupBy('branch_id')
            ->map(fn ($rows) => $rows->count());

        return $branches->map(function ($branch) use ($sales, $profit, $arOverdue, $lowStock) {
            return [
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
                'invoice_count' => (int) ($sales[$branch->id]->invoice_count ?? 0),
                'revenue_ex_vat' => round((float) ($sales[$branch->id]->revenue ?? 0), 2),
                'gross_profit' => round((float) ($profit[$branch->id]->gross_profit ?? 0), 2),
                'ar_overdue' => round((float) ($arOverdue[$branch->id]->ar_overdue ?? 0), 2),
                'low_stock_count' => (int) ($lowStock[$branch->id] ?? 0),
            ];
        })->values()->all();
    }
}
