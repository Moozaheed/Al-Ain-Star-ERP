<?php

declare(strict_types=1);

namespace App\Modules\Sales\Services;

use App\Modules\Sales\Models\Invoice;
use App\Modules\Sales\Models\Quotation;
use Illuminate\Support\Facades\DB;

class InvoiceNumberService
{
    public function nextInvoiceNumber(): string
    {
        // Invoice has no SoftDeletes trait (invoices table has no deleted_at),
        // so this must not call withTrashed().
        $max = Invoice::where('invoice_number', 'like', 'S%')
            ->lockForUpdate()
            ->max(DB::raw("CAST(SUBSTRING(invoice_number, 2) AS UNSIGNED)"));

        return 'S' . str_pad((string) (($max ?? 106263) + 1), 6, '0', STR_PAD_LEFT);
    }

    public function nextQuotationNumber(): string
    {
        $max = Quotation::where('quotation_number', 'like', 'Q%')
            ->lockForUpdate()
            ->max(DB::raw("CAST(SUBSTRING(quotation_number, 2) AS UNSIGNED)"));

        return 'Q' . str_pad((string) (($max ?? 23204) + 1), 5, '0', STR_PAD_LEFT);
    }
}
