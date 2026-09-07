<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Services;

use App\Modules\Purchasing\Models\PurchaseInvoice;
use App\Modules\Purchasing\Models\PurchaseReturn;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PurchaseReturnService
{
    public function __construct(private readonly PurchaseReturnNumberService $numbers) {}

    /**
     * @param  array{purchase_invoice_id:int, reason:?string, return_date:string, items:array<int,array{purchase_invoice_item_id:int,qty:int}>}  $data
     */
    public function create(array $data, int $userId): PurchaseReturn
    {
        return DB::transaction(function () use ($data, $userId): PurchaseReturn {
            $invoice = PurchaseInvoice::with('items')->findOrFail($data['purchase_invoice_id']);
            $items = $data['items'] ?? [];

            if (empty($items)) {
                throw new InvalidArgumentException('Purchase return must have at least one item.');
            }

            $vatRate = 5.00;
            $subtotal = '0';
            $vatAmount = '0';
            $builtItems = [];

            foreach ($items as $item) {
                $invoiceItem = $invoice->items->firstWhere('id', (int) $item['purchase_invoice_item_id']);

                if ($invoiceItem === null) {
                    throw new InvalidArgumentException('One of the return lines does not belong to this purchase invoice.');
                }

                $qty = (int) $item['qty'];

                if ($qty < 1) {
                    throw new InvalidArgumentException('Return quantity must be at least 1.');
                }

                $alreadyReturned = (int) DB::table('purchase_return_items')
                    ->where('purchase_invoice_item_id', $invoiceItem->id)
                    ->sum('qty');

                $returnable = $invoiceItem->qty - $alreadyReturned;

                if ($qty > $returnable) {
                    throw new InvalidArgumentException(sprintf(
                        'Cannot return %d of part #%d — only %d of the %d purchased are still returnable.',
                        $qty,
                        $invoiceItem->part_id,
                        $returnable,
                        $invoiceItem->qty,
                    ));
                }

                // "Stock entries reduced using FIFO reversal (most recent lot
                // first on returns)" — erp-context/modules/purchasing/business-rules.md.
                $available = (int) DB::table('stock_entries')
                    ->where('branch_id', $invoice->branch_id)
                    ->where('part_id', $invoiceItem->part_id)
                    ->sum('remaining_qty');

                if ($qty > $available) {
                    throw new InvalidArgumentException(sprintf(
                        'Cannot return %d of part #%d — only %d units are still in stock at this branch.',
                        $qty,
                        $invoiceItem->part_id,
                        $available,
                    ));
                }

                $unitCost = (string) $invoiceItem->unit_cost;
                $lineSubtotal = bcmul($unitCost, (string) $qty, 2);
                $lineVat = bcdiv(bcmul($lineSubtotal, (string) $vatRate, 4), '100', 2);
                $lineTotal = bcadd($lineSubtotal, $lineVat, 2);

                $subtotal = bcadd($subtotal, $lineSubtotal, 2);
                $vatAmount = bcadd($vatAmount, $lineVat, 2);

                $builtItems[] = [
                    'purchase_invoice_item_id' => $invoiceItem->id,
                    'part_id'                  => $invoiceItem->part_id,
                    'qty'                      => $qty,
                    'unit_cost'                => $unitCost,
                    'line_subtotal'            => $lineSubtotal,
                    'line_vat'                 => $lineVat,
                    'line_total'               => $lineTotal,
                ];
            }

            $total = bcadd($subtotal, $vatAmount, 2);

            $return = PurchaseReturn::create([
                'branch_id'            => $invoice->branch_id,
                'purchase_invoice_id'  => $invoice->id,
                'supplier_id'          => $invoice->supplier_id,
                'debit_note_number'    => $this->numbers->next($invoice->branch->code, $invoice->branch_id),
                'return_date'          => $data['return_date'],
                'reason'               => $data['reason'] ?? null,
                'subtotal'             => $subtotal,
                'vat_amount'           => $vatAmount,
                'total'                => $total,
                'status'               => 'approved',
                'created_by'           => $userId,
            ]);

            foreach ($builtItems as $item) {
                $return->items()->create($item);

                $this->reverseFifo($invoice->branch_id, $item['part_id'], $item['qty']);

                DB::table('branch_stock')
                    ->where('branch_id', $invoice->branch_id)
                    ->where('part_id', $item['part_id'])
                    ->decrement('qty_on_hand', $item['qty']);
            }

            AuditLogger::log('purchase_return.created', $return, [], [
                'debit_note_number' => $return->debit_note_number,
                'total'             => $total,
            ]);

            return $return->load('items.part', 'supplier', 'purchaseInvoice');
        });
    }

    /**
     * Reduce the most-recently-received stock_entries lots first, cascading
     * across lots if one isn't enough. Lots are retained (remaining_qty can
     * go to 0, rows are never deleted) — "immutable after creation".
     */
    private function reverseFifo(int $branchId, int $partId, int $qty): void
    {
        $remaining = $qty;

        while ($remaining > 0) {
            $entry = DB::table('stock_entries')
                ->where('branch_id', $branchId)
                ->where('part_id', $partId)
                ->where('remaining_qty', '>', 0)
                ->orderByDesc('received_at')
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();

            if ($entry === null) {
                // Already validated total availability up front; this would
                // only trip on a concurrent consumer racing the same stock.
                throw new InvalidArgumentException('Stock changed while processing this return — please retry.');
            }

            $consume = min($remaining, $entry->remaining_qty);
            DB::table('stock_entries')->where('id', $entry->id)->decrement('remaining_qty', $consume);
            $remaining -= $consume;
        }
    }
}
