<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BankStatementLine extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'bank_reconciliation_id',
        'transaction_date',
        'description',
        'reference',
        'amount',
        'is_matched',
        'matched_journal_line_id',
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'is_matched' => 'boolean',
    ];

    public function reconciliation(): BelongsTo
    {
        return $this->belongsTo(BankReconciliation::class, 'bank_reconciliation_id');
    }

    public function matchedJournalLine(): BelongsTo
    {
        return $this->belongsTo(JournalLine::class, 'matched_journal_line_id');
    }
}
