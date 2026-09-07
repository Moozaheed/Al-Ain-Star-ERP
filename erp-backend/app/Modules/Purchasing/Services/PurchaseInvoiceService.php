<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Services;

use App\Modules\Admin\Models\Branch;
use App\Modules\Inventory\Models\BranchStock;
use App\Modules\Inventory\Models\Part;
use App\Modules\Inventory\Models\StockEntry;
use App\Modules\Purchasing\Models\PurchaseInvoice;
use App\Modules\Purchasing\Models\SupplierPriceHistory;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PurchaseInvoiceService
{
    public function __construct(private readonly PurchaseInvoiceNumberService $numbers) {}

    public function create(array $data, int $userId): PurchaseInvoice
    {
        return DB::transaction(function () use ($data, $userId): PurchaseInvoice {
            $branch = Branch::findOrFail($data['branch_id']);
            $items  = $data['items'] ?? [];

            if (empty($items)) {
                throw new InvalidArgumentException('Purchase invoice must have at least one item.');
            }

            $vatRate    = 5.00;
            $subtotal   = '0';
            $vatAmount  = '0';
            $builtItems = [];

            foreach ($items as $idx => $item) {
                $qty      = (int) $item['qty'];
                $unitCost = (string) $item['unit_cost'];

                $lineSubtotal = bcmul($unitCost, (string) $qty, 2);
                $lineVat      = bcdiv(bcmul($lineSubtotal, (string) $vatRate, 4), '100', 2);
                $lineTotal    = bcadd($lineSubtotal, $lineVat, 2);

                $subtotal  = bcadd($subtotal, $lineSubtotal, 2);
                $vatAmount = bcadd($vatAmount, $lineVat, 2);

                $builtItems[] = [
                    'part_id'       => $item['part_id'],
                    'description'   => $item['description'] ?? null,
                    'qty'           => $qty,
                    'unit_cost'     => $unitCost,
                    'vat_rate'      => $vatRate,
                    'line_subtotal' => $lineSubtotal,
                    'line_vat'      => $lineVat,
                    'line_total'    => $lineTotal,
                ];
            }

            $total  = bcadd($subtotal, $vatAmount, 2);
            $isPaid = in_array($data['payment_mode'], ['cash', 'bank_transfer'], true);

            $invoice = PurchaseInvoice::create([
                'branch_id'            => $branch->id,
                'supplier_id'          => $data['supplier_id'],
                'invoice_number'       => $this->numbers->next($branch->code, $branch->id),
                'supplier_invoice_ref' => $data['supplier_invoice_ref'] ?? null,
                'invoice_date'         => $data['invoice_date'],
                'due_date'             => $data['due_date'] ?? null,
                'payment_mode'         => $data['payment_mode'],
                'status'               => $isPaid ? 'paid' : 'received',
                'subtotal'             => $subtotal,
                'vat_amount'           => $vatAmount,
                'total'                => $total,
                'amount_paid'          => $isPaid ? $total : '0',
                'amount_due'           => $isPaid ? '0' : $total,
                'notes'                => $data['notes'] ?? null,
                'created_by'           => $userId,
            ]);

            foreach ($builtItems as $item) {
                $invoiceItem = $invoice->items()->create($item);

                $this->maybeUpdatePartDescription($item['part_id'], $item['description'], $invoice->id);

                // Stock Receipt (purchasing business rules): each line creates one
                // FIFO lot. There is no separate goods-receipt step yet, so the lot
                // is received on the invoice date.
                $stockEntry = StockEntry::create([
                    'branch_id'     => $branch->id,
                    'part_id'       => $item['part_id'],
                    'source_type'   => 'purchase',
                    'source_id'     => $invoiceItem->id,
                    'received_at'   => $data['invoice_date'],
                    'qty'           => $item['qty'],
                    'remaining_qty' => $item['qty'],
                    'unit_cost'     => $item['unit_cost'],
                ]);

                $invoiceItem->update(['stock_entry_id' => $stockEntry->id]);

                BranchStock::updateOrCreate(
                    ['branch_id' => $branch->id, 'part_id' => $item['part_id']],
                    []
                );
                DB::table('branch_stock')
                    ->where('branch_id', $branch->id)
                    ->where('part_id', $item['part_id'])
                    ->increment('qty_on_hand', $item['qty']);

                // Supplier Price History: every purchase line automatically logs
                // unit_cost — feeds the pricing benchmark and stock ageing reports.
                SupplierPriceHistory::create([
                    'supplier_id'       => $data['supplier_id'],
                    'part_id'           => $item['part_id'],
                    'unit_cost'         => $item['unit_cost'],
                    'currency'          => 'AED',
                    'effective_date'    => $data['invoice_date'],
                    'source_invoice_id' => $invoice->id,
                ]);
            }

            AuditLogger::log('purchase_invoice.created', $invoice, [], [
                'invoice_number' => $invoice->invoice_number,
                'total'          => $total,
            ]);

            return $invoice->load('items.part', 'supplier');
        });
    }

    /**
     * Inventory business rules: "Part description can be updated on each
     * purchase invoice line — change is logged with source=purchase_invoice
     * and timestamp." Only acts when the line actually supplied a different,
     * non-empty description — a blank or matching line never overwrites the
     * catalog description.
     */
    private function maybeUpdatePartDescription(int $partId, ?string $lineDescription, int $invoiceId): void
    {
        if ($lineDescription === null || trim($lineDescription) === '') {
            return;
        }

        $part = Part::find($partId);

        if ($part === null || $part->description === $lineDescription) {
            return;
        }

        $old = $part->description;
        $part->update(['description' => $lineDescription]);

        AuditLogger::log('part.description_updated', $part, ['description' => $old], [
            'description' => $lineDescription,
            'source'      => 'purchase_invoice',
            'source_id'   => $invoiceId,
        ]);
    }
}
