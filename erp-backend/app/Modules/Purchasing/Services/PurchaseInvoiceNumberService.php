<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Services;

use App\Modules\Purchasing\Models\PurchaseInvoice;

class PurchaseInvoiceNumberService
{
    /**
     * Format per erp-context/modules/purchasing/business-rules.md:
     * PI-{BRANCH_CODE}-{YYYY}-{NNNNNN}, sequential per branch per year.
     */
    public function next(string $branchCode, int $branchId): string
    {
        $prefix = sprintf('PI-%s-%d-', $branchCode, now()->year);

        $last = PurchaseInvoice::where('branch_id', $branchId)
            ->where('invoice_number', 'like', $prefix.'%')
            ->lockForUpdate()
            ->orderByDesc('invoice_number')
            ->value('invoice_number');

        $nextSeq = $last !== null ? ((int) substr($last, strlen($prefix)) + 1) : 1;

        return $prefix.str_pad((string) $nextSeq, 6, '0', STR_PAD_LEFT);
    }
}
