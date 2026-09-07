<?php

declare(strict_types=1);

namespace App\Modules\Sales\Services;

use App\Modules\Inventory\Models\BranchStock;
use App\Modules\Sales\Models\CreditLimit;
use App\Modules\Sales\Models\Invoice;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class InvoiceService
{
    public function __construct(private readonly InvoiceNumberService $numbers) {}

    public function create(array $data, int $userId, bool $canOverrideCreditLimit = false): Invoice
    {
        return DB::transaction(function () use ($data, $userId, $canOverrideCreditLimit): Invoice {
            $branchId = $data['branch_id'];
            $vatRate  = 5.00;
            $items    = $data['items'] ?? [];

            if (empty($items)) {
                throw new InvalidArgumentException('Invoice must have at least one item.');
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

                // FIFO unit cost — best-effort; 0 if no stock entry
                $fifoEntry = DB::table('stock_entries')
                    ->where('branch_id', $branchId)
                    ->where('part_id', $item['part_id'])
                    ->where('remaining_qty', '>', 0)
                    ->orderBy('received_at')
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->first();

                $unitCost = $fifoEntry ? (string) $fifoEntry->unit_cost : '0';

                $builtItems[] = [
                    'part_id'      => $item['part_id'],
                    'description'  => $item['description'] ?? null,
                    'qty'          => $qty,
                    'unit_price'   => $unitPrice,
                    'unit_cost'    => $unitCost,
                    'discount_pct' => $discPct,
                    'vat_rate'     => $vatRate,
                    'line_subtotal'=> $lineSubtotal,
                    'line_vat'     => $lineVat,
                    'line_total'   => $lineTotal,
                    'sort_order'   => $idx,
                ];

                // Deduct from branch_stock
                BranchStock::updateOrCreate(
                    ['branch_id' => $branchId, 'part_id' => $item['part_id']],
                    []
                );
                DB::table('branch_stock')
                    ->where('branch_id', $branchId)
                    ->where('part_id', $item['part_id'])
                    ->decrement('qty_on_hand', $qty);

                // Consume FIFO entries
                $remaining = $qty;
                while ($remaining > 0) {
                    $entry = DB::table('stock_entries')
                        ->where('branch_id', $branchId)
                        ->where('part_id', $item['part_id'])
                        ->where('remaining_qty', '>', 0)
                        ->orderBy('received_at')
                        ->orderBy('id')
                        ->lockForUpdate()
                        ->first();

                    if ($entry === null) {
                        break;
                    }

                    $consume = min($remaining, $entry->remaining_qty);
                    DB::table('stock_entries')
                        ->where('id', $entry->id)
                        ->decrement('remaining_qty', $consume);

                    $remaining -= $consume;
                }
            }

            $total  = bcadd($subtotal, $vatAmount, 2);
            $isPaid = in_array($data['payment_mode'], ['cash', 'card', 'bank_transfer'], true);

            $creditLimit = null;
            if ($data['payment_mode'] === 'credit') {
                $creditLimit = $this->assertWithinCreditLimit(
                    $branchId,
                    (int) $data['customer_id'],
                    $total,
                    $userId,
                    $canOverrideCreditLimit,
                );
            }

            $invoice = Invoice::create([
                'branch_id'      => $branchId,
                'customer_id'    => $data['customer_id'] ?? null,
                'customer_name'  => $data['customer_name'] ?? null,
                'quotation_id'   => $data['quotation_id'] ?? null,
                'invoice_number' => $this->numbers->nextInvoiceNumber(),
                'lpo_number'     => $data['lpo_number'] ?? null,
                'ref_number'     => $data['ref_number'] ?? null,
                'channel'        => $data['channel'],
                'payment_mode'   => $data['payment_mode'],
                'status'         => $isPaid ? 'paid' : 'confirmed',
                'invoice_date'   => $data['invoice_date'],
                'due_date'       => $data['due_date'] ?? null,
                'subtotal'       => $subtotal,
                'discount_amount'=> $discountAmount,
                'vat_amount'     => $vatAmount,
                'total'          => $total,
                'amount_paid'    => $isPaid ? $total : '0',
                'amount_due'     => $isPaid ? '0' : $total,
                'notes'          => $data['notes'] ?? null,
                'created_by'     => $userId,
            ]);

            foreach ($builtItems as $item) {
                $invoice->items()->create($item);
            }

            if ($creditLimit !== null) {
                $creditLimit->increment('credit_used', (float) $total);
            }

            AuditLogger::log('invoice.created', $invoice, [], [
                'invoice_number' => $invoice->invoice_number,
                'total'          => $total,
            ]);

            return $invoice->load('items.part', 'customer');
        });
    }

    /**
     * Enforce the credit-sale rule from erp-context/modules/sales/business-rules.md:
     * a new invoice must not push the customer's outstanding balance above their
     * credit limit unless the acting user has Manager/Super Admin approval
     * authority. Returns the (row-locked) CreditLimit so the caller can post the
     * usage increment once the invoice itself is persisted.
     */
    private function assertWithinCreditLimit(
        int $branchId,
        int $customerId,
        string $total,
        int $userId,
        bool $canOverride,
    ): CreditLimit {
        $creditLimit = CreditLimit::where('branch_id', $branchId)
            ->where('customer_id', $customerId)
            ->lockForUpdate()
            ->first();

        if ($creditLimit === null) {
            // No credit terms configured for this customer at this branch yet
            // (TASK-059). Treat as a zero credit limit — any credit sale needs
            // approval — but still create the row so usage is tracked from here.
            $creditLimit = CreditLimit::create([
                'customer_id'  => $customerId,
                'branch_id'    => $branchId,
                'credit_limit' => 0,
                'credit_used'  => 0,
                'set_by'       => $userId,
            ]);
        }

        $prospectiveUsed = bcadd((string) $creditLimit->credit_used, $total, 2);

        if (bccomp($prospectiveUsed, (string) $creditLimit->credit_limit, 2) > 0 && ! $canOverride) {
            throw new InvalidArgumentException(sprintf(
                "This invoice would exceed the customer's credit limit (limit: %s, outstanding: %s, invoice: %s). Manager or Super Admin approval is required to proceed.",
                number_format((float) $creditLimit->credit_limit, 2),
                number_format((float) $creditLimit->credit_used, 2),
                number_format((float) $total, 2),
            ));
        }

        return $creditLimit;
    }

    public function void(Invoice $invoice, string $reason, int $userId): Invoice
    {
        if ($invoice->status === 'void') {
            throw new InvalidArgumentException('Invoice is already voided.');
        }

        return DB::transaction(function () use ($invoice, $reason, $userId): Invoice {
            // Restore stock
            foreach ($invoice->items as $item) {
                DB::table('branch_stock')
                    ->where('branch_id', $invoice->branch_id)
                    ->where('part_id', $item->part_id)
                    ->increment('qty_on_hand', $item->qty);
            }

            // Restore credit if this was a credit sale.
            if ($invoice->payment_mode === 'credit' && $invoice->customer_id !== null) {
                CreditLimit::where('branch_id', $invoice->branch_id)
                    ->where('customer_id', $invoice->customer_id)
                    ->lockForUpdate()
                    ->first()
                    ?->decrement('credit_used', (float) $invoice->total);
            }

            $invoice->update([
                'status'      => 'void',
                'voided_by'   => $userId,
                'voided_at'   => now(),
                'void_reason' => $reason,
            ]);

            AuditLogger::log('invoice.voided', $invoice, [], ['reason' => $reason]);

            return $invoice;
        });
    }
}
