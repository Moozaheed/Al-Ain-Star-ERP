<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Modules\Notifications\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ScanLowStockNotifications extends Command
{
    protected $signature = 'notifications:scan-low-stock';

    protected $description = 'TASK-080 — notify Warehouse Staff and Branch Manager when a part drops below its branch min_stock_qty';

    public function handle(NotificationService $notifications): int
    {
        $rows = DB::table('branch_stock')
            ->join('parts', 'parts.id', '=', 'branch_stock.part_id')
            ->join('branches', 'branches.id', '=', 'branch_stock.branch_id')
            ->where('parts.is_active', true)
            ->where('parts.min_stock_qty', '>', 0)
            ->whereColumn('branch_stock.qty_on_hand', '<', 'parts.min_stock_qty')
            ->select([
                'branch_stock.branch_id', 'branches.name as branch_name',
                'parts.id as part_id', 'parts.part_number', 'parts.description as part_name',
                'branch_stock.qty_on_hand', 'parts.min_stock_qty',
            ])
            ->get();

        $created = 0;

        foreach ($rows as $row) {
            $created += $notifications->notifyRoles(
                ['warehouse_staff', 'branch_manager'],
                $row->branch_id,
                'LOW_STOCK_ALERT',
                "Low stock: {$row->part_number}",
                "{$row->part_name} at {$row->branch_name} is at {$row->qty_on_hand} units (minimum {$row->min_stock_qty}).",
                '/inventory',
                dedupMinutes: 24 * 60,
            );
        }

        $this->info("Low stock scan complete: {$rows->count()} part(s) below threshold, {$created} notification(s) created.");

        return self::SUCCESS;
    }
}
