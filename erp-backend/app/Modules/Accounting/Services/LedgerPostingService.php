<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Services;

use App\Enums\JournalSourceType;
use App\Modules\Accounting\Models\ChartOfAccount;
use App\Modules\Accounting\Models\Cheque;
use App\Modules\Accounting\Models\JournalEntry;
use App\Modules\Accounting\Support\AccountCode;
use App\Modules\Hr\Models\ExpenseClaim;
use App\Modules\Hr\Models\PayRun;
use App\Modules\Purchasing\Models\PurchaseInvoice;
use App\Modules\Purchasing\Models\PurchasePayment;
use App\Modules\Purchasing\Models\PurchaseReturn;
use App\Modules\Sales\Models\Invoice;
use App\Modules\Sales\Models\InvoicePayment;
use InvalidArgumentException;

/**
 * Auto-posts the journal entries specified in
 * erp-context/modules/accounting/business-rules.md's "Standard Journal
 * Entries" table. This is Accounting's public interface for other modules —
 * Sales/Purchasing services call these rather than building journal_lines
 * themselves.
 */
class LedgerPostingService
{
    /** @var array<string, int> */
    private array $accountIdCache = [];

    public function __construct(private readonly JournalService $journal) {}

    public function postSalesInvoice(Invoice $invoice): void
    {
        $invoice->loadMissing('items');

        $revenueCode = match ($invoice->channel) {
            'retail' => AccountCode::SALES_RETAIL,
            'b2b' => AccountCode::SALES_B2B,
            'online' => AccountCode::SALES_ONLINE,
            default => throw new InvalidArgumentException("Unknown sales channel: {$invoice->channel}"),
        };

        $settledNow = in_array($invoice->payment_mode, ['cash', 'card', 'bank_transfer'], true);
        $debitCode = match (true) {
            $invoice->payment_mode === 'bank_transfer' => AccountCode::BANK,
            $settledNow => AccountCode::CASH,
            // credit or cheque — not yet collected.
            default => AccountCode::ACCOUNTS_RECEIVABLE,
        };

        $this->journal->post([
            'branch_id' => $invoice->branch_id,
            'entry_date' => $invoice->invoice_date->toDateString(),
            'description' => "Sales invoice {$invoice->invoice_number}",
            'source_type' => JournalSourceType::Invoice,
            'source_id' => $invoice->id,
            'posted_by' => $invoice->created_by,
            'lines' => [
                ['account_id' => $this->accountId($debitCode), 'debit' => $invoice->total, 'credit' => 0],
                ['account_id' => $this->accountId($revenueCode), 'debit' => 0, 'credit' => $invoice->subtotal],
                ['account_id' => $this->accountId(AccountCode::VAT_OUTPUT), 'debit' => 0, 'credit' => $invoice->vat_amount],
            ],
        ]);

        // Cost of Goods Sold — a second, independently-balanced entry, matching
        // the business-rules table listing it as a separate transaction line.
        $cogs = $invoice->items->sum(fn ($i) => $i->qty * $i->unit_cost);

        if (bccomp((string) $cogs, '0', 2) > 0) {
            $this->journal->post([
                'branch_id' => $invoice->branch_id,
                'entry_date' => $invoice->invoice_date->toDateString(),
                'description' => "COGS for invoice {$invoice->invoice_number}",
                'source_type' => JournalSourceType::Invoice,
                'source_id' => $invoice->id,
                'posted_by' => $invoice->created_by,
                'lines' => [
                    ['account_id' => $this->accountId(AccountCode::COGS), 'debit' => $cogs, 'credit' => 0],
                    ['account_id' => $this->accountId(AccountCode::INVENTORY), 'debit' => 0, 'credit' => $cogs],
                ],
            ]);
        }
    }

    /**
     * Reverses every not-yet-reversed journal entry posted for this invoice
     * (the revenue entry and, if it exists, the COGS entry).
     */
    public function reverseSalesInvoice(Invoice $invoice, string $reason, int $userId): void
    {
        $entries = JournalEntry::where('source_type', JournalSourceType::Invoice->value)
            ->where('source_id', $invoice->id)
            ->where('is_reversed', false)
            ->get();

        foreach ($entries as $entry) {
            $this->journal->reverse($entry, $reason, $userId);
        }
    }

    public function postPurchaseInvoice(PurchaseInvoice $invoice): void
    {
        $settledNow = in_array($invoice->payment_mode, ['cash', 'bank_transfer'], true);
        $creditCode = match (true) {
            $invoice->payment_mode === 'bank_transfer' => AccountCode::BANK,
            $settledNow => AccountCode::CASH,
            // credit or cheque — owed to the supplier.
            default => AccountCode::ACCOUNTS_PAYABLE,
        };

        $this->journal->post([
            'branch_id' => $invoice->branch_id,
            'entry_date' => $invoice->invoice_date->toDateString(),
            'description' => "Purchase invoice {$invoice->invoice_number}",
            'source_type' => JournalSourceType::Purchase,
            'source_id' => $invoice->id,
            'posted_by' => $invoice->created_by,
            'lines' => [
                ['account_id' => $this->accountId(AccountCode::INVENTORY), 'debit' => $invoice->subtotal, 'credit' => 0],
                ['account_id' => $this->accountId(AccountCode::VAT_INPUT), 'debit' => $invoice->vat_amount, 'credit' => 0],
                ['account_id' => $this->accountId($creditCode), 'debit' => 0, 'credit' => $invoice->total],
            ],
        ]);
    }

    public function postPurchaseReturn(PurchaseReturn $return): void
    {
        $this->journal->post([
            'branch_id' => $return->branch_id,
            'entry_date' => $return->return_date->toDateString(),
            'description' => "Purchase return {$return->debit_note_number}",
            'source_type' => JournalSourceType::Return_,
            'source_id' => $return->id,
            'posted_by' => $return->created_by,
            'lines' => [
                ['account_id' => $this->accountId(AccountCode::ACCOUNTS_PAYABLE), 'debit' => $return->total, 'credit' => 0],
                ['account_id' => $this->accountId(AccountCode::INVENTORY), 'debit' => 0, 'credit' => $return->subtotal],
                ['account_id' => $this->accountId(AccountCode::VAT_INPUT), 'debit' => 0, 'credit' => $return->vat_amount],
            ],
        ]);
    }

    public function postCustomerPayment(Invoice $invoice, InvoicePayment $payment): void
    {
        // Cheques aren't cash until they clear — see ADR-004.
        $debitCode = $payment->payment_mode === 'cheque'
            ? AccountCode::CHEQUES_RECEIVABLE
            : $this->settlementAccountCode($payment->payment_mode);

        $this->journal->post([
            'branch_id' => $invoice->branch_id,
            'entry_date' => $payment->payment_date->toDateString(),
            'description' => "Payment received for invoice {$invoice->invoice_number}",
            'source_type' => JournalSourceType::Payment,
            'source_id' => $payment->id,
            'posted_by' => $payment->received_by,
            'lines' => [
                ['account_id' => $this->accountId($debitCode), 'debit' => $payment->amount, 'credit' => 0],
                ['account_id' => $this->accountId(AccountCode::ACCOUNTS_RECEIVABLE), 'debit' => 0, 'credit' => $payment->amount],
            ],
        ]);
    }

    public function postSupplierPayment(PurchaseInvoice $invoice, PurchasePayment $payment): void
    {
        $creditCode = $payment->payment_mode === 'cheque'
            ? AccountCode::CHEQUES_PAYABLE
            : $this->settlementAccountCode($payment->payment_mode);

        $this->journal->post([
            'branch_id' => $invoice->branch_id,
            'entry_date' => $payment->payment_date->toDateString(),
            'description' => "Payment made for purchase invoice {$invoice->invoice_number}",
            'source_type' => JournalSourceType::Payment,
            'source_id' => $payment->id,
            'posted_by' => $payment->paid_by,
            'lines' => [
                ['account_id' => $this->accountId(AccountCode::ACCOUNTS_PAYABLE), 'debit' => $payment->amount, 'credit' => 0],
                ['account_id' => $this->accountId($creditCode), 'debit' => 0, 'credit' => $payment->amount],
            ],
        ]);
    }

    /**
     * A received cheque clears: Dr Cash, Cr Cheques Receivable.
     */
    public function postChequeCleared(Cheque $cheque, int $userId): void
    {
        $clearingCode = $cheque->direction === 'received' ? AccountCode::CHEQUES_RECEIVABLE : AccountCode::CHEQUES_PAYABLE;
        $lines = $cheque->direction === 'received'
            ? [
                ['account_id' => $this->accountId(AccountCode::CASH), 'debit' => $cheque->amount, 'credit' => 0],
                ['account_id' => $this->accountId($clearingCode), 'debit' => 0, 'credit' => $cheque->amount],
            ]
            : [
                ['account_id' => $this->accountId($clearingCode), 'debit' => $cheque->amount, 'credit' => 0],
                ['account_id' => $this->accountId(AccountCode::CASH), 'debit' => 0, 'credit' => $cheque->amount],
            ];

        $this->journal->post([
            'branch_id' => $cheque->branch_id,
            'entry_date' => now()->toDateString(),
            'description' => "Cheque {$cheque->cheque_number} cleared",
            'source_type' => JournalSourceType::Payment,
            'source_id' => $cheque->id,
            'posted_by' => $userId,
            'lines' => $lines,
        ]);
    }

    /**
     * A cheque bounces: the clearing account empties back out and the
     * receivable/payable it had settled comes back.
     */
    public function postChequeBounced(Cheque $cheque, int $userId): void
    {
        $clearingCode = $cheque->direction === 'received' ? AccountCode::CHEQUES_RECEIVABLE : AccountCode::CHEQUES_PAYABLE;
        $lines = $cheque->direction === 'received'
            ? [
                ['account_id' => $this->accountId(AccountCode::ACCOUNTS_RECEIVABLE), 'debit' => $cheque->amount, 'credit' => 0],
                ['account_id' => $this->accountId($clearingCode), 'debit' => 0, 'credit' => $cheque->amount],
            ]
            : [
                ['account_id' => $this->accountId($clearingCode), 'debit' => $cheque->amount, 'credit' => 0],
                ['account_id' => $this->accountId(AccountCode::ACCOUNTS_PAYABLE), 'debit' => 0, 'credit' => $cheque->amount],
            ];

        $this->journal->post([
            'branch_id' => $cheque->branch_id,
            'entry_date' => now()->toDateString(),
            'description' => "Cheque {$cheque->cheque_number} bounced",
            'source_type' => JournalSourceType::Payment,
            'source_id' => $cheque->id,
            'posted_by' => $userId,
            'lines' => $lines,
        ]);
    }

    /**
     * erp-context/decisions/ADR-006 — approving a pay run recognises the
     * salary expense and the liability to pay it, for the run's total net
     * pay (basic + allowances − deductions across every payslip; commission
     * is always 0 today, see the ADR).
     */
    public function postPayrollApproval(PayRun $payRun, int $userId): void
    {
        $this->journal->post([
            'branch_id' => $payRun->branch_id,
            'entry_date' => now()->toDateString(),
            'description' => "Payroll {$payRun->period_month}/{$payRun->period_year} approved",
            'source_type' => JournalSourceType::Payroll,
            'source_id' => $payRun->id,
            'posted_by' => $userId,
            'lines' => [
                ['account_id' => $this->accountId(AccountCode::SALARIES_EXPENSE), 'debit' => $payRun->total_net_pay, 'credit' => 0],
                ['account_id' => $this->accountId(AccountCode::SALARIES_PAYABLE), 'debit' => 0, 'credit' => $payRun->total_net_pay],
            ],
        ]);
    }

    /**
     * Settles the liability once salaries are actually paid out.
     */
    public function postPayrollPayment(PayRun $payRun, int $userId): void
    {
        $this->journal->post([
            'branch_id' => $payRun->branch_id,
            'entry_date' => now()->toDateString(),
            'description' => "Payroll {$payRun->period_month}/{$payRun->period_year} paid",
            'source_type' => JournalSourceType::Payroll,
            'source_id' => $payRun->id,
            'posted_by' => $userId,
            'lines' => [
                ['account_id' => $this->accountId(AccountCode::SALARIES_PAYABLE), 'debit' => $payRun->total_net_pay, 'credit' => 0],
                ['account_id' => $this->accountId(AccountCode::BANK), 'debit' => 0, 'credit' => $payRun->total_net_pay],
            ],
        ]);
    }

    /**
     * erp-context/decisions/ADR-007 — posted on final (Admin) approval, not
     * on submission or branch approval. No "paid" settlement entry exists
     * yet for expense claims (unlike payroll's approve/pay pair).
     */
    public function postExpenseClaimApproval(ExpenseClaim $claim, int $userId): void
    {
        $this->journal->post([
            'branch_id' => $claim->branch_id,
            'entry_date' => now()->toDateString(),
            'description' => "Expense claim #{$claim->id} approved — {$claim->description}",
            'source_type' => JournalSourceType::Expense,
            'source_id' => $claim->id,
            'posted_by' => $userId,
            'lines' => [
                ['account_id' => $this->accountId(AccountCode::STAFF_EXPENSE_REIMBURSEMENTS), 'debit' => $claim->amount, 'credit' => 0],
                ['account_id' => $this->accountId(AccountCode::ACCRUED_EXPENSES), 'debit' => 0, 'credit' => $claim->amount],
            ],
        ]);
    }

    private function settlementAccountCode(string $paymentMode): string
    {
        return $paymentMode === 'bank_transfer' ? AccountCode::BANK : AccountCode::CASH;
    }

    private function accountId(string $code): int
    {
        if (! isset($this->accountIdCache[$code])) {
            $account = ChartOfAccount::where('code', $code)->first();

            if ($account === null) {
                throw new InvalidArgumentException("Chart of accounts is missing required account {$code}.");
            }

            $this->accountIdCache[$code] = $account->id;
        }

        return $this->accountIdCache[$code];
    }
}
