<?php

declare(strict_types=1);

namespace App\Modules\Reporting\Http\Controllers;

use App\Modules\Reporting\Services\BranchPerformanceService;
use App\Modules\Reporting\Services\InventoryReportService;
use App\Modules\Reporting\Services\SalesReportService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controller;
use Illuminate\Support\Carbon;

class ReportingController extends Controller
{
    /**
     * reporting/business-rules.md — Access Control. Sales reports are
     * company/branch aggregates, not "own performance" (that's the
     * still-backlog TASK-053), so Sales Staff is deliberately excluded here.
     * Narrowed on explicit user request to Branch Manager and above only —
     * Accountant and Viewer no longer see Sales Reports (they still see
     * Stock reports, gated separately below).
     */
    private const SALES_REPORT_ROLES = ['super_admin', 'manager', 'branch_manager'];

    private const STOCK_REPORT_ROLES = ['super_admin', 'manager', 'branch_manager', 'warehouse_staff', 'viewer'];

    private const BRANCH_PERFORMANCE_ROLES = ['super_admin', 'manager', 'branch_manager'];

    public function __construct(
        private readonly SalesReportService $salesReports,
        private readonly InventoryReportService $inventoryReports,
        private readonly BranchPerformanceService $branchPerformance,
    ) {
    }

    public function salesDaily(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnlessRole($request, self::SALES_REPORT_ROLES)) {
            return $denied;
        }

        $date = $request->date('date')?->toDateString() ?? Carbon::today()->toDateString();
        $branchId = $this->resolveBranchScope($request);

        return ApiResponse::success($this->salesReports->dailySummary($date, $branchId));
    }

    public function salesByPart(Request $request): JsonResponse|Response
    {
        if ($denied = $this->denyUnlessRole($request, self::SALES_REPORT_ROLES)) {
            return $denied;
        }

        $rows = $this->salesReports->byPart(
            $request->date('from')?->toDateString(),
            $request->date('to')?->toDateString(),
            $this->resolveBranchScope($request),
            $request->integer('category_id') ?: null,
            (string) ($request->string('sort') ?: 'total_revenue_ex_vat'),
            (string) ($request->string('direction') ?: 'desc'),
            min(max($request->integer('top', 50), 1), 500),
        );

        if ($request->query('format') === 'csv') {
            return $this->toCsv($rows, ['part_id', 'part_number', 'part_name', 'qty_sold', 'total_revenue_ex_vat', 'total_cogs', 'gross_profit', 'gross_margin_pct'], 'sales-by-part');
        }

        return ApiResponse::success(['rows' => $rows]);
    }

    public function stockBalance(Request $request): JsonResponse|Response
    {
        if ($denied = $this->denyUnlessRole($request, self::STOCK_REPORT_ROLES)) {
            return $denied;
        }

        $result = $this->inventoryReports->stockBalance(
            $this->resolveBranchScope($request),
            $request->integer('category_id') ?: null,
            $request->string('search')->toString() ?: null,
        );

        if ($request->query('format') === 'csv') {
            return $this->toCsv($result['rows'], ['part_id', 'part_number', 'part_name', 'category_name', 'branch_id', 'branch_name', 'qty', 'avg_cost', 'value', 'min_stock_qty', 'is_zero_stock', 'is_low_stock'], 'stock-balance');
        }

        return ApiResponse::success($result);
    }

    public function stockAgeing(Request $request): JsonResponse|Response
    {
        if ($denied = $this->denyUnlessRole($request, self::STOCK_REPORT_ROLES)) {
            return $denied;
        }

        $result = $this->inventoryReports->stockAgeing(
            $this->resolveBranchScope($request),
            $request->integer('category_id') ?: null,
            $request->integer('min_age_days', 0),
        );

        if ($request->query('format') === 'csv') {
            return $this->toCsv($result['rows'], ['stock_entry_id', 'part_id', 'part_number', 'part_name', 'branch_id', 'branch_name', 'lot_date', 'age_days', 'age_bucket', 'remaining_qty', 'cost_value'], 'stock-ageing');
        }

        return ApiResponse::success($result);
    }

    public function branchPerformance(Request $request): JsonResponse|Response
    {
        if ($denied = $this->denyUnlessRole($request, self::BRANCH_PERFORMANCE_ROLES)) {
            return $denied;
        }

        $from = $request->date('from')?->toDateString() ?? Carbon::today()->startOfMonth()->toDateString();
        $to = $request->date('to')?->toDateString() ?? Carbon::today()->toDateString();

        $onlyBranchId = $request->user()->hasAnyRole(['super_admin', 'manager']) ? null : $request->user()->branch_id;

        $rows = $this->branchPerformance->compare($from, $to, $onlyBranchId);

        if ($request->query('format') === 'csv') {
            return $this->toCsv($rows, ['branch_id', 'branch_name', 'invoice_count', 'revenue_ex_vat', 'gross_profit', 'ar_overdue', 'low_stock_count'], 'branch-performance');
        }

        return ApiResponse::success(['from' => $from, 'to' => $to, 'rows' => $rows]);
    }

    private function denyUnlessRole(Request $request, array $roles): ?JsonResponse
    {
        if (! $request->user()->hasAnyRole($roles)) {
            return ApiResponse::error('You are not authorised to view this report.', 403);
        }

        if ($request->query('format') === 'csv' && ! $request->user()->hasPermissionTo('reporting.export')) {
            return ApiResponse::error('You are not authorised to export reports.', 403);
        }

        return null;
    }

    /**
     * Branch Manager is always forced to their own branch, regardless of a
     * client-supplied branch_id — mirrors JournalService::bypassesBranchScope().
     * Super Admin / Manager may pass branch_id, or omit it for the
     * consolidated (all active branches) view.
     */
    private function resolveBranchScope(Request $request): ?int
    {
        $user = $request->user();

        if ($user->hasAnyRole(['super_admin', 'manager'])) {
            return $request->integer('branch_id') ?: null;
        }

        return $user->branch_id;
    }

    private function toCsv(array $rows, array $columns, string $filename): Response
    {
        $lines = [implode(',', $columns)];

        foreach ($rows as $row) {
            $lines[] = implode(',', array_map(
                fn ($col) => $this->csvEscape($row[$col] ?? ''),
                $columns
            ));
        }

        return response(implode("\n", $lines), 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}.csv\"",
        ]);
    }

    private function csvEscape(mixed $value): string
    {
        $value = is_bool($value) ? ($value ? '1' : '0') : (string) $value;

        return str_contains($value, ',') || str_contains($value, '"') || str_contains($value, "\n")
            ? '"'.str_replace('"', '""', $value).'"'
            : $value;
    }
}
