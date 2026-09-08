<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Services;

use App\Modules\Accounting\Models\Cheque;
use App\Modules\Accounting\Services\LedgerPostingService;
use App\Modules\Purchasing\Models\PurchaseInvoice;
use App\Modules\Purchasing\Models\PurchasePayment;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class SupplierPaymentService
{
    public function __construct(private readonly LedgerPostingService $ledger) {}

    public function create(array $data, int $userId): PurchasePayment
    {
        return DB::transaction(function () use ($data, $userId): PurchasePayment {
            $invoice = PurchaseInvoice::where('id', $data['purchase_invoice_id'])->lockForUpdate()->firstOrFail();

            $amount = (string) $data['amount'];

            if (bccomp($amount, '0', 2) <= 0) {
                throw new InvalidArgumentException('Payment amount must be greater than 0.');
            }

            if (bccomp($amount, (string) $invoice->amount_due, 2) > 0) {
                throw new InvalidArgumentException(sprintf(
                    'Payment of %s exceeds the outstanding balance of %s on purchase invoice %s.',
                    number_format((float) $amount, 2),
                    number_format((float) $invoice->amount_due, 2),
                    $invoice->invoice_number,
                ));
            }

            $payment = PurchasePayment::create([
                'purchase_invoice_id' => $invoice->id,
                'amount'              => $amount,
                'payment_mode'        => $data['payment_mode'],
                'payment_date'        => $data['payment_date'],
                'reference'           => $data['reference'] ?? null,
                'paid_by'             => $userId,
            ]);

            $newPaid = bcadd((string) $invoice->amount_paid, $amount, 2);
            $newDue = bcsub((string) $invoice->total, $newPaid, 2);

            $invoice->update([
                'amount_paid' => $newPaid,
                'amount_due'  => $newDue,
                'status'      => bccomp($newDue, '0', 2) <= 0 ? 'paid' : 'partially_paid',
            ]);

            AuditLogger::log('purchase_payment.created', $payment, [], $payment->toArray());

            if ($data['payment_mode'] === 'cheque') {
                Cheque::create([
                    'branch_id'      => $invoice->branch_id,
                    'direction'      => 'issued',
                    'cheque_number'  => $data['cheque_number'],
                    'bank_name'      => $data['cheque_bank_name'] ?? null,
                    'amount'         => $amount,
                    'due_date'       => $data['cheque_due_date'],
                    'status'         => 'pending',
                    'linked_to_type' => 'purchase_invoice',
                    'linked_to_id'   => $invoice->id,
                    'supplier_id'    => $invoice->supplier_id,
                    'created_by'     => $userId,
                ]);
            }

            $this->ledger->postSupplierPayment($invoice, $payment);

            return $payment->load('purchaseInvoice');
        });
    }
}
