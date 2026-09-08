<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Accounting\Models\ChartOfAccount;
use App\Modules\Purchasing\Models\PurchaseInvoice;
use App\Modules\Sales\Models\Invoice;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AccountingReportController extends Controller
{
    /**
     * Accounts Receivable aging — erp-context/modules/accounting/business-rules.md:
     * "Aging buckets: Current, 1-30, 31-60, 61-90, 90+ days".
     */
    public function receivables(Request $request): JsonResponse
    {
        $invoices = Invoice::with('customer')
            ->where('amount_due', '>', 0)
            ->where('status', '!=', 'void')
            ->when($request->branch_id, fn ($q) => $q->where('branch_id', $request->branch_id))
            ->when($request->customer_id, fn ($q) => $q->where('customer_id', $request->customer_id))
            ->orderBy('due_date')
            ->get();

        return ApiResponse::success($this->buildAgingReport($invoices, 'invoice_number', 'customer_name', 'customer'));
    }

    /**
     * Accounts Payable aging — same bucket shape, applied to purchase invoices.
     */
    public function payables(Request $request): JsonResponse
    {
        $invoices = PurchaseInvoice::with('supplier')
            ->where('amount_due', '>', 0)
            ->when($request->branch_id, fn ($q) => $q->where('branch_id', $request->branch_id))
            ->when($request->supplier_id, fn ($q) => $q->where('supplier_id', $request->supplier_id))
            ->orderBy('due_date')
            ->get();

        return ApiResponse::success($this->buildAgingReport($invoices, 'invoice_number', null, 'supplier'));
    }

    /**
     * General Ledger view (TASK-048): journal_lines for one account, in date
     * order, with a running balance on the account's normal-balance side.
     */
    public function ledger(Request $request): JsonResponse
    {
        $request->validate([
            'account_id' => 'required|integer|exists:chart_of_accounts,id',
            'date_from'  => 'nullable|date',
            'date_to'    => 'nullable|date',
        ]);

        $account = ChartOfAccount::findOrFail($request->account_id);

        $lines = DB::table('journal_lines')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->where('journal_lines.account_id', $account->id)
            ->when($request->branch_id, fn ($q) => $q->where('journal_entries.branch_id', $request->branch_id))
            ->when($request->date_from, fn ($q) => $q->whereDate('journal_entries.entry_date', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('journal_entries.entry_date', '<=', $request->date_to))
            ->orderBy('journal_entries.entry_date')
            ->orderBy('journal_entries.id')
            ->orderBy('journal_lines.id')
            ->select([
                'journal_lines.id', 'journal_lines.debit', 'journal_lines.credit', 'journal_lines.description as line_description',
                'journal_entries.id as entry_id', 'journal_entries.entry_number', 'journal_entries.entry_date',
                'journal_entries.description as entry_description', 'journal_entries.source_type', 'journal_entries.source_id',
                'journal_entries.is_reversed',
            ])
            ->get();

        $debitNormal = $account->type->normalBalance() === 'debit';
        $running = 0.0;

        $rows = $lines->map(function ($line) use (&$running, $debitNormal) {
            $debit = (float) $line->debit;
            $credit = (float) $line->credit;
            $running += $debitNormal ? ($debit - $credit) : ($credit - $debit);

            return [
                'entry_id'          => $line->entry_id,
                'entry_number'      => $line->entry_number,
                'entry_date'        => $line->entry_date,
                'description'       => $line->line_description ?? $line->entry_description,
                'source_type'       => $line->source_type,
                'source_id'         => $line->source_id,
                'is_reversed'       => (bool) $line->is_reversed,
                'debit'             => $debit,
                'credit'            => $credit,
                'running_balance'   => round($running, 2),
            ];
        });

        return ApiResponse::success([
            'account'         => ['id' => $account->id, 'code' => $account->code, 'name' => $account->name, 'type' => $account->type->value],
            'closing_balance' => round($running, 2),
            'lines'           => $rows,
        ]);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Invoice|PurchaseInvoice>  $invoices
     */
    private function buildAgingReport($invoices, string $numberField, ?string $nameFallbackField, string $partyRelation): array
    {
        $buckets = ['current' => 0.0, 'days_1_30' => 0.0, 'days_31_60' => 0.0, 'days_61_90' => 0.0, 'days_90_plus' => 0.0];
        $today = Carbon::today();
        $rows = [];

        foreach ($invoices as $invoice) {
            $amountDue = (float) $invoice->amount_due;
            $daysOverdue = $invoice->due_date !== null ? $today->diffInDays($invoice->due_date, false) * -1 : -1;
            $bucket = match (true) {
                $daysOverdue <= 0 => 'current',
                $daysOverdue <= 30 => 'days_1_30',
                $daysOverdue <= 60 => 'days_31_60',
                $daysOverdue <= 90 => 'days_61_90',
                default => 'days_90_plus',
            };

            $buckets[$bucket] += $amountDue;

            $party = $invoice->{$partyRelation};

            $rows[] = [
                'id'            => $invoice->id,
                'number'        => $invoice->{$numberField},
                'party_id'      => $party?->id,
                'party_name'    => $party?->name ?? ($nameFallbackField ? $invoice->{$nameFallbackField} : null),
                'due_date'      => $invoice->due_date,
                'amount_due'    => $amountDue,
                'days_overdue'  => max($daysOverdue, 0),
                'aging_bucket'  => $bucket,
            ];
        }

        return [
            'summary' => array_merge($buckets, ['total' => array_sum($buckets)]),
            'invoices' => $rows,
        ];
    }
}
