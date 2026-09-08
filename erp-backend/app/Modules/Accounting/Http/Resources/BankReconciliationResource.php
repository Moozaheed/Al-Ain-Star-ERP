<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BankReconciliationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                       => $this->id,
            'bank_account_id'          => $this->bank_account_id,
            'bank_account_name'        => $this->bankAccount?->account_name,
            'period_start'             => $this->period_start?->toDateString(),
            'period_end'               => $this->period_end?->toDateString(),
            'statement_ending_balance' => (float) $this->statement_ending_balance,
            'status'                   => $this->status,
            'locked_by_name'           => $this->lockedBy?->name,
            'locked_at'                => $this->locked_at?->toDateString(),
            'created_by_name'          => $this->createdBy?->name,
            'lines'                    => $this->whenLoaded('lines', fn () => $this->lines->map(fn ($l) => [
                'id'                      => $l->id,
                'transaction_date'        => $l->transaction_date?->toDateString(),
                'description'             => $l->description,
                'reference'               => $l->reference,
                'amount'                  => (float) $l->amount,
                'is_matched'              => $l->is_matched,
                'matched_journal_line_id' => $l->matched_journal_line_id,
            ])),
            'unmatched_count' => $this->whenLoaded('lines', fn () => $this->lines->where('is_matched', false)->count()),
        ];
    }
}
