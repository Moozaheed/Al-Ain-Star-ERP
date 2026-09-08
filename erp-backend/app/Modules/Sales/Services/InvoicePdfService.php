<?php

declare(strict_types=1);

namespace App\Modules\Sales\Services;

use App\Modules\Sales\Models\Invoice;
use App\Support\AmountToWords;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as PdfDocument;

class InvoicePdfService
{
    public function render(Invoice $invoice): PdfDocument
    {
        $invoice->loadMissing(['items.part', 'customer', 'branch', 'createdBy']);

        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice,
            'company' => config('company'),
            'amountInWords' => AmountToWords::aed((float) $invoice->total),
        ])->setPaper('a4', 'portrait');

        // mergeWithDefaults preserves the package's default "chroot" (the
        // paths dompdf is allowed to read local files from) — a plain
        // setOptions() replaces the whole Options object and silently
        // breaks local image embedding (e.g. the company logo).
        $pdf->setOptions([
            'isRemoteEnabled' => false,
            'isFontSubsettingEnabled' => true,
            'defaultFont' => 'DejaVu Sans',
        ], true);

        return $pdf;
    }
}
