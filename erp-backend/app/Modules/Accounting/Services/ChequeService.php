<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Services;

use App\Modules\Accounting\Models\Cheque;
use App\Modules\Purchasing\Models\PurchaseInvoice;
use App\Modules\Sales\Models\Invoice;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Cheque lifecycle: pending -> cleared | bounced | cancelled.
 * See ADR-004 for the clearing-account accounting behind clear()/bounce().
 */
class ChequeService
{
    public function __construct(private readonly LedgerPostingService $ledger) {}

    public function clear(Cheque $cheque, int $userId): Cheque
    {
        return DB::transaction(function () use ($cheque, $userId): Cheque {
            $this->assertPending($cheque);

            $cheque->update(['status' => 'cleared']);
            $this->ledger->postChequeCleared($cheque, $userId);

            AuditLogger::log('cheque.cleared', $cheque, ['status' => 'pending'], ['status' => 'cleared']);

            return $cheque;
        });
    }

    public function bounce(Cheque $cheque, string $reason, int $userId): Cheque
    {
        return DB::transaction(function () use ($cheque, $reason, $userId): Cheque {
            $this->assertPending($cheque);

            $cheque->update([
                'status' => 'bounced',
                'notes'  => trim(($cheque->notes !== null ? $cheque->notes.' | ' : '')."Bounced: {$reason}"),
            ]);

            $this->ledger->postChequeBounced($cheque, $userId);
            $this->restoreLinkedBalance($cheque);

            AuditLogger::log('cheque.bounced', $cheque, ['status' => 'pending'], ['status' => 'bounced', 'reason' => $reason]);

            return $cheque;
        });
    }

    public function cancel(Cheque $cheque, int $userId): Cheque
    {
        $this->assertPending($cheque);

        $cheque->update(['status' => 'cancelled']);

        AuditLogger::log('cheque.cancelled', $cheque, ['status' => 'pending'], ['status' => 'cancelled']);

        return $cheque;
    }

    private function assertPending(Cheque $cheque): void
    {
        if ($cheque->status !== 'pending') {
            throw new InvalidArgumentException("Cheque is already {$cheque->status}; only a pending cheque can change state.");
        }
    }

    /**
     * A bounce means the underlying invoice/purchase invoice is owed again —
     * un-does exactly the amount_paid/amount_due effect the original payment
     * had.
     */
    private function restoreLinkedBalance(Cheque $cheque): void
    {
        if ($cheque->linked_to_type === 'invoice' && $cheque->linked_to_id !== null) {
            $invoice = Invoice::where('id', $cheque->linked_to_id)->lockForUpdate()->first();

            if ($invoice === null) {
                return;
            }

            $newPaid = bcsub((string) $invoice->amount_paid, (string) $cheque->amount, 2);
            $newDue = bcadd((string) $invoice->amount_due, (string) $cheque->amount, 2);

            $invoice->update([
                'amount_paid' => $newPaid,
                'amount_due'  => $newDue,
                'status'      => bccomp($newPaid, '0', 2) > 0 ? 'partially_paid' : 'confirmed',
            ]);
        }

        if ($cheque->linked_to_type === 'purchase_invoice' && $cheque->linked_to_id !== null) {
            $invoice = PurchaseInvoice::where('id', $cheque->linked_to_id)->lockForUpdate()->first();

            if ($invoice === null) {
                return;
            }

            $newPaid = bcsub((string) $invoice->amount_paid, (string) $cheque->amount, 2);
            $newDue = bcadd((string) $invoice->amount_due, (string) $cheque->amount, 2);

            $invoice->update([
                'amount_paid' => $newPaid,
                'amount_due'  => $newDue,
                'status'      => bccomp($newPaid, '0', 2) > 0 ? 'partially_paid' : 'received',
            ]);
        }
    }
}
