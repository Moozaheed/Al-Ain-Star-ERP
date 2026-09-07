<?php

declare(strict_types=1);

namespace App\Modules\Sales\Services;

use App\Modules\Sales\Models\Invoice;
use App\Modules\Sales\Models\Quotation;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class QuotationService
{
    public function __construct(
        private readonly InvoiceNumberService $numbers,
        private readonly InvoiceService $invoiceService,
    ) {}

    public function create(array $data, int $userId): Quotation
    {
        return DB::transaction(function () use ($data, $userId): Quotation {
            $vatRate    = 5.00;
            $items      = $data['items'] ?? [];

            if (empty($items)) {
                throw new InvalidArgumentException('Quotation must have at least one item.');
            }

            $subtotal       = '0';
            $discountAmount = '0';
            $vatAmount      = '0';
            $builtItems     = [];

            foreach ($items as $idx => $item) {
                $qty       = (int) $item['qty'];
                $unitPrice = (string) $item['unit_price'];
                $discPct   = (string) ($item['discount_pct'] ?? 0);

                $lineBeforeDisc = bcmul($unitPrice, (string) $qty, 4);
                $discValue      = bcdiv(bcmul($lineBeforeDisc, $discPct, 4), '100', 4);
                $lineSubtotal   = bcsub($lineBeforeDisc, $discValue, 2);
                $lineVat        = bcdiv(bcmul($lineSubtotal, (string) $vatRate, 4), '100', 2);
                $lineTotal      = bcadd($lineSubtotal, $lineVat, 2);

                $subtotal       = bcadd($subtotal, $lineSubtotal, 2);
                $discountAmount = bcadd($discountAmount, $discValue, 2);
                $vatAmount      = bcadd($vatAmount, $lineVat, 2);

                $builtItems[] = [
                    'part_id'     => $item['part_id'],
                    'description' => $item['description'] ?? null,
                    'qty'         => $qty,
                    'unit_price'  => $unitPrice,
                    'discount_pct'=> $discPct,
                    'line_total'  => $lineTotal,
                    'sort_order'  => $idx,
                ];
            }

            $total = bcadd($subtotal, $vatAmount, 2);

            $quotation = Quotation::create([
                'branch_id'       => $data['branch_id'],
                'customer_id'     => $data['customer_id'] ?? null,
                'customer_name'   => $data['customer_name'] ?? null,
                'quotation_number'=> $this->numbers->nextQuotationNumber(),
                'lpo_number'      => $data['lpo_number'] ?? null,
                'ref_number'      => $data['ref_number'] ?? null,
                'channel'         => $data['channel'],
                'status'          => 'draft',
                'expires_at'      => $data['expires_at'],
                'subtotal'        => $subtotal,
                'discount_amount' => $discountAmount,
                'vat_amount'      => $vatAmount,
                'total'           => $total,
                'notes'           => $data['notes'] ?? null,
                'created_by'      => $userId,
            ]);

            foreach ($builtItems as $item) {
                $quotation->items()->create($item);
            }

            AuditLogger::log('quotation.created', $quotation, [], [
                'quotation_number' => $quotation->quotation_number,
            ]);

            return $quotation->load('items.part', 'customer');
        });
    }

    public function convertToInvoice(Quotation $quotation, array $extra, int $userId, bool $canOverrideCreditLimit = false): Invoice
    {
        if (!in_array($quotation->status, ['draft', 'sent', 'accepted'], true)) {
            throw new InvalidArgumentException('Only draft, sent, or accepted quotations can be converted.');
        }

        $items = $quotation->items->map(fn ($i) => [
            'part_id'     => $i->part_id,
            'description' => $i->description,
            'qty'         => $i->qty,
            'unit_price'  => $i->unit_price,
            'discount_pct'=> $i->discount_pct,
        ])->all();

        $invoice = $this->invoiceService->create(array_merge([
            'branch_id'    => $quotation->branch_id,
            'customer_id'  => $quotation->customer_id,
            'customer_name'=> $quotation->customer_name,
            'quotation_id' => $quotation->id,
            'lpo_number'   => $quotation->lpo_number,
            'ref_number'   => $quotation->ref_number,
            'channel'      => $quotation->channel,
            'invoice_date' => now()->toDateString(),
            'items'        => $items,
        ], $extra), $userId, $canOverrideCreditLimit);

        $quotation->update(['status' => 'converted']);

        return $invoice;
    }
}
