<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Http\Resources;

use App\Modules\Accounting\Models\JournalEntry;
use App\Modules\Accounting\Models\JournalLine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin JournalEntry
 */
class JournalEntryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'branch_id' => $this->branch_id,
            'entry_number' => $this->entry_number,
            'entry_date' => $this->entry_date?->toDateString(),
            'description' => $this->description,
            'source_type' => $this->source_type?->value,
            'source_id' => $this->source_id,
            'is_reversed' => (bool) $this->is_reversed,
            'reversed_by_id' => $this->reversed_by_id,
            'posted_by' => $this->posted_by,
            'created_at' => $this->created_at?->toIso8601String(),
            'lines' => $this->whenLoaded('lines', function () {
                return $this->lines->map(fn (JournalLine $line): array => [
                    'id' => $line->id,
                    'account_id' => $line->account_id,
                    'debit' => (string) $line->debit,
                    'credit' => (string) $line->credit,
                    'description' => $line->description,
                ])->all();
            }),
        ];
    }
}
