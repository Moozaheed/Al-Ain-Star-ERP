<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Models;

use App\Enums\JournalSourceType;
use App\Modules\Admin\Models\Branch;
use App\Modules\Admin\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use RuntimeException;

class JournalEntry extends Model
{
    protected $table = 'journal_entries';

    public $timestamps = false;

    protected $fillable = [
        'branch_id',
        'entry_number',
        'entry_date',
        'description',
        'source_type',
        'source_id',
        'is_reversed',
        'reversed_by_id',
        'posted_by',
    ];

    protected function casts(): array
    {
        return [
            'entry_date' => 'date',
            'source_type' => JournalSourceType::class,
            'is_reversed' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (JournalEntry $entry): void {
            $allowed = ['is_reversed', 'reversed_by_id'];
            $dirty = array_keys($entry->getDirty());
            $forbidden = array_diff($dirty, $allowed);

            if ($forbidden !== []) {
                throw new RuntimeException(
                    'Journal entries are immutable after posting; only reversal metadata may change.'
                );
            }
        });

        static::deleting(function (): void {
            throw new RuntimeException('Journal entries cannot be deleted; use reverse().');
        });
    }

    /**
     * @return HasMany<JournalLine>
     */
    public function lines(): HasMany
    {
        return $this->hasMany(JournalLine::class, 'journal_entry_id');
    }

    /**
     * @return BelongsTo<Branch, JournalEntry>
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    /**
     * @return BelongsTo<User, JournalEntry>
     */
    public function poster(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    /**
     * @return BelongsTo<JournalEntry, JournalEntry>
     */
    public function reversal(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reversed_by_id');
    }
}
