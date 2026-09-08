<?php

declare(strict_types=1);

namespace App\Modules\Sales\Services;

use App\Modules\Accounting\Models\Cheque;
use App\Modules\Accounting\Services\LedgerPostingService;
use App\Modules\Sales\Models\CreditLimit;
use App\Modules\Sales\Models\Invoice;
use App\Modules\Sales\Models\InvoicePayment;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CustomerPaymentService
{
    public function __construct(private readonly LedgerPostingService $ledger) {}

    public function create(array $data, int $userId): InvoicePayment
    {
        return DB::transaction(function () use ($data, $userId): InvoicePayment {
            $invoice = Invoice::where('id', $data['invoice_id'])->lockForUpdate()->firstOrFail();

            if ($invoice->status === 'void') {
                throw new InvalidArgumentException('Cannot record a payment against a voided invoice.');
            }

            $amount = (string) $data['amount'];

            if (bccomp($amount, '0', 2) <= 0) {
                throw new InvalidArgumentException('Payment amount must be greater than 0.');
            }

            if (bccomp($amount, (string) $invoice->amount_due, 2) > 0) {
                throw new InvalidArgumentException(sprintf(
                    'Payment of %s exceeds the outstanding balance of %s on invoice %s.',
                    number_format((float) $amount, 2),
                    number_format((float) $invoice->amount_due, 2),
                    $invoice->invoice_number,
                ));
            }

            $payment = InvoicePayment::create([
                'invoice_id'   => $invoice->id,
                'amount'       => $amount,
                'payment_mode' => $data['payment_mode'],
                'payment_date' => $data['payment_date'],
                'reference'    => $data['reference'] ?? null,
                'received_by'  => $userId,
                'notes'        => $data['notes'] ?? null,
            ]);

            $newPaid = bcadd((string) $invoice->amount_paid, $amount, 2);
            $newDue = bcsub((string) $invoice->total, $newPaid, 2);

            $invoice->update([
                'amount_paid' => $newPaid,
                'amount_due'  => $newDue,
                'status'      => bccomp($newDue, '0', 2) <= 0 ? 'paid' : 'partially_paid',
            ]);

            // Paying down a credit-sale invoice frees up that much of the
            // customer's credit limit for future purchases.
            if ($invoice->payment_mode === 'credit' && $invoice->customer_id !== null) {
                CreditLimit::where('branch_id', $invoice->branch_id)
                    ->where('customer_id', $invoice->customer_id)
                    ->lockForUpdate()
                    ->first()
                    ?->decrement('credit_used', (float) $amount);
            }

            AuditLogger::log('invoice_payment.created', $payment, [], $payment->toArray());

            if ($data['payment_mode'] === 'cheque') {
                Cheque::create([
                    'branch_id'      => $invoice->branch_id,
                    'direction'      => 'received',
                    'cheque_number'  => $data['cheque_number'],
                    'bank_name'      => $data['cheque_bank_name'] ?? null,
                    'amount'         => $amount,
                    'due_date'       => $data['cheque_due_date'],
                    'status'         => 'pending',
                    'linked_to_type' => 'invoice',
                    'linked_to_id'   => $invoice->id,
                    'customer_id'    => $invoice->customer_id,
                    'notes'          => $data['notes'] ?? null,
                    'created_by'     => $userId,
                ]);
            }

            $this->ledger->postCustomerPayment($invoice, $payment);

            return $payment->load('invoice');
        });
    }
}
