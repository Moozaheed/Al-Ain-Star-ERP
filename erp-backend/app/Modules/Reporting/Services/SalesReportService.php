<?php

declare(strict_types=1);

namespace App\Modules\Reporting\Services;

use App\Modules\Sales\Models\Invoice;
use Illuminate\Support\Facades\DB;

class SalesReportService
{
    /**
     * TASK-049 — Daily Sales Summary. A null $branchId means consolidated
     * across all active branches (erp-context/modules/reporting/business-rules.md
     * — "Consolidated report: sum across all active branches").
     */
    public function dailySummary(string $date, ?int $branchId): array
    {
        $invoices = Invoice::query()
            ->where('invoice_date', $date)
            ->where('status', '!=', 'void')
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->when(! $branchId, fn ($q) => $q->whereHas('branch', fn ($b) => $b->where('is_active', true)))
            ->get(['id', 'branch_id', 'payment_mode', 'channel', 'subtotal', 'vat_amount', 'total']);

        $invoiceIds = $invoices->pluck('id');

        $cogs = DB::table('invoice_items')
            ->whereIn('invoice_id', $invoiceIds)
            ->selectRaw('COALESCE(SUM(qty * unit_cost), 0) as total_cogs')
            ->value('total_cogs');

        $byPaymentMode = $invoices->groupBy('payment_mode')->map(fn ($rows) => round((float) $rows->sum('total'), 2));
        $byChannel = $invoices->groupBy('channel')->map(fn ($rows) => round((float) $rows->sum('total'), 2));

        $totalExVat = round((float) $invoices->sum('subtotal'), 2);
        $totalVat = round((float) $invoices->sum('vat_amount'), 2);
        $totalIncVat = round((float) $invoices->sum('total'), 2);

        return [
            'date' => $date,
            'branch_id' => $branchId,
            'invoice_count' => $invoices->count(),
            'total_ex_vat' => $totalExVat,
            'total_vat' => $totalVat,
            'total_inc_vat' => $totalIncVat,
            'gross_profit' => round($totalExVat - (float) $cogs, 2),
            'by_payment_mode' => $byPaymentMode,
            'by_channel' => $byChannel,
        ];
    }

    /**
     * TASK-050 — Sales by Part. Gross profit uses invoice_items.unit_cost,
     * the FIFO cost captured at the time of sale, so it's exact rather than
     * a weighted-average approximation.
     */
    public function byPart(?string $from, ?string $to, ?int $branchId, ?int $categoryId, string $sort, string $direction, int $top): array
    {
        $rows = DB::table('invoice_items')
            ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
            ->join('parts', 'parts.id', '=', 'invoice_items.part_id')
            ->where('invoices.status', '!=', 'void')
            ->when($branchId, fn ($q) => $q->where('invoices.branch_id', $branchId))
            ->when($from, fn ($q) => $q->whereDate('invoices.invoice_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('invoices.invoice_date', '<=', $to))
            ->when($categoryId, fn ($q) => $q->where('parts.category_id', $categoryId))
            ->groupBy('parts.id', 'parts.part_number', 'parts.description')
            ->selectRaw('
                parts.id as part_id,
                parts.part_number,
                parts.description as part_name,
                SUM(invoice_items.qty) as qty_sold,
                SUM(invoice_items.line_subtotal) as total_revenue_ex_vat,
                SUM(invoice_items.qty * invoice_items.unit_cost) as total_cogs
            ')
            ->get()
            ->map(function ($r) {
                $revenue = (float) $r->total_revenue_ex_vat;
                $cogs = (float) $r->total_cogs;
                $profit = $revenue - $cogs;

                return [
                    'part_id' => $r->part_id,
                    'part_number' => $r->part_number,
                    'part_name' => $r->part_name,
                    'qty_sold' => (int) $r->qty_sold,
                    'total_revenue_ex_vat' => round($revenue, 2),
                    'total_cogs' => round($cogs, 2),
                    'gross_profit' => round($profit, 2),
                    'gross_margin_pct' => $revenue > 0 ? round($profit / $revenue * 100, 2) : 0.0,
                ];
            });

        $sortKey = in_array($sort, ['qty_sold', 'total_revenue_ex_vat', 'gross_margin_pct'], true) ? $sort : 'total_revenue_ex_vat';
        $sorted = $direction === 'asc' ? $rows->sortBy($sortKey) : $rows->sortByDesc($sortKey);

        return $sorted->values()->take($top)->all();
    }
}
