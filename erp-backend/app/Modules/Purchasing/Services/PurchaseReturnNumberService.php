<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Services;

use App\Modules\Purchasing\Models\PurchaseReturn;

class PurchaseReturnNumberService
{
    /**
     * Same DN-{BRANCH_CODE}-{YYYY}-{NNNNNN} shape as purchase invoice
     * numbers — purchasing business rules don't specify a debit note format,
     * so this mirrors the one they do specify for consistency.
     */
    public function next(string $branchCode, int $branchId): string
    {
        $prefix = sprintf('DN-%s-%d-', $branchCode, now()->year);

        $last = PurchaseReturn::where('branch_id', $branchId)
            ->where('debit_note_number', 'like', $prefix.'%')
            ->lockForUpdate()
            ->orderByDesc('debit_note_number')
            ->value('debit_note_number');

        $nextSeq = $last !== null ? ((int) substr($last, strlen($prefix)) + 1) : 1;

        return $prefix.str_pad((string) $nextSeq, 6, '0', STR_PAD_LEFT);
    }
}
