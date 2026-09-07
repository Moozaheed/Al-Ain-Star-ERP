<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Services;

use App\Enums\JournalSourceType;
use App\Enums\RoleSlug;
use App\Modules\Accounting\Models\JournalEntry;
use App\Modules\Accounting\Models\JournalLine;
use App\Modules\Admin\Models\User;
use App\Support\AuditLogger;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class JournalService
{
    private const SCALE = 2;

    /**
     * Post a balanced journal entry.
     * Expected shape:
     * [
     *   'branch_id' => ?int,
     *   'entry_date' => 'Y-m-d',
     *   'description' => string,
     *   'source_type' => JournalSourceType|string,
     *   'source_id' => ?int,
     *   'posted_by' => int,
     *   'lines' => [
     *     ['account_id' => int, 'debit' => string|float, 'credit' => string|float, 'description' => ?string],
     *     ...
     *   ],
     * ]
     *
     * @param  array<string, mixed>  $entry
     */
    public function post(array $entry): JournalEntry
    {
        $lines = $entry['lines'] ?? [];
        if (! is_array($lines) || count($lines) < 2) {
            throw new InvalidArgumentException('A journal entry requires at least two lines.');
        }

        $debitTotal = '0';
        $creditTotal = '0';

        foreach ($lines as $line) {
            $debit = $this->normalize($line['debit'] ?? '0');
            $credit = $this->normalize($line['credit'] ?? '0');

            if (bccomp($debit, '0', self::SCALE) < 0 || bccomp($credit, '0', self::SCALE) < 0) {
                throw new InvalidArgumentException('Line amounts must be non-negative.');
            }
            if (bccomp($debit, '0', self::SCALE) > 0 && bccomp($credit, '0', self::SCALE) > 0) {
                throw new InvalidArgumentException('A single line cannot have both debit and credit.');
            }

            $debitTotal = bcadd($debitTotal, $debit, self::SCALE);
            $creditTotal = bcadd($creditTotal, $credit, self::SCALE);
        }

        if (bccomp($debitTotal, $creditTotal, self::SCALE) !== 0) {
            throw new InvalidArgumentException(
                'Journal entry is unbalanced: debits='.$debitTotal.' credits='.$creditTotal
            );
        }

        if (bccomp($debitTotal, '0', self::SCALE) === 0) {
            throw new InvalidArgumentException('Journal entry totals cannot be zero.');
        }

        $sourceType = $entry['source_type'] instanceof JournalSourceType
            ? $entry['source_type']->value
            : (string) ($entry['source_type'] ?? JournalSourceType::Manual->value);

        $postedBy = (int) ($entry['posted_by'] ?? (Auth::id() ?? 0));
        if ($postedBy <= 0) {
            throw new InvalidArgumentException('posted_by is required.');
        }

        return DB::transaction(function () use ($entry, $lines, $sourceType, $postedBy): JournalEntry {
            $journal = JournalEntry::create([
                'branch_id' => $entry['branch_id'] ?? null,
                'entry_number' => $entry['entry_number'] ?? $this->generateEntryNumber(),
                'entry_date' => $entry['entry_date'] ?? Carbon::now()->toDateString(),
                'description' => $entry['description'] ?? '',
                'source_type' => $sourceType,
                'source_id' => $entry['source_id'] ?? null,
                'is_reversed' => false,
                'reversed_by_id' => null,
                'posted_by' => $postedBy,
            ]);

            foreach ($lines as $line) {
                JournalLine::create([
                    'journal_entry_id' => $journal->id,
                    'account_id' => (int) $line['account_id'],
                    'debit' => $this->normalize($line['debit'] ?? '0'),
                    'credit' => $this->normalize($line['credit'] ?? '0'),
                    'description' => $line['description'] ?? null,
                ]);
            }

            $journal->load('lines');

            AuditLogger::log('journal.posted', $journal, [], [
                'entry_number' => $journal->entry_number,
                'lines' => $journal->lines->map(fn (JournalLine $l): array => [
                    'account_id' => $l->account_id,
                    'debit' => (string) $l->debit,
                    'credit' => (string) $l->credit,
                ])->all(),
            ]);

            return $journal;
        });
    }

    public function reverse(JournalEntry $entry, string $reason, int $postedBy): JournalEntry
    {
        if ($entry->is_reversed) {
            throw new InvalidArgumentException('Journal entry is already reversed.');
        }

        return DB::transaction(function () use ($entry, $reason, $postedBy): JournalEntry {
            $entry->load('lines');

            $mirrorLines = $entry->lines->map(function (JournalLine $line): array {
                return [
                    'account_id' => $line->account_id,
                    'debit' => (string) $line->credit,
                    'credit' => (string) $line->debit,
                    'description' => $line->description,
                ];
            })->all();

            $reversal = $this->post([
                'branch_id' => $entry->branch_id,
                'entry_date' => Carbon::now()->toDateString(),
                'description' => 'Reversal of '.$entry->entry_number.': '.$reason,
                'source_type' => JournalSourceType::Reversal->value,
                'source_id' => $entry->id,
                'posted_by' => $postedBy,
                'lines' => $mirrorLines,
            ]);

            $entry->is_reversed = true;
            $entry->reversed_by_id = $reversal->id;
            $entry->save();

            AuditLogger::log('journal.reversed', $entry, [], [
                'reversal_entry_id' => $reversal->id,
                'reversal_entry_number' => $reversal->entry_number,
                'reason' => $reason,
            ]);

            return $reversal;
        });
    }

    /**
     * @param  Builder<JournalEntry>  $query
     * @return Builder<JournalEntry>
     */
    protected function scopeBranch(Builder $query): Builder
    {
        $user = Auth::user();

        if ($this->bypassesBranchScope($user)) {
            return $query;
        }

        if ($user instanceof User && $user->branch_id !== null) {
            return $query->where('branch_id', $user->branch_id);
        }

        return $query->whereRaw('1 = 0');
    }

    protected function bypassesBranchScope(?Authenticatable $user): bool
    {
        if (! $user instanceof User) {
            return false;
        }

        foreach ([RoleSlug::SuperAdmin->value, RoleSlug::Manager->value] as $slug) {
            if ($user->hasRole($slug)) {
                return true;
            }
        }

        return false;
    }

    public function query(): Builder
    {
        return $this->scopeBranch(JournalEntry::query());
    }

    private function normalize(mixed $value): string
    {
        if (is_int($value) || is_float($value)) {
            $value = number_format($value, self::SCALE, '.', '');
        }
        $value = (string) $value;
        if ($value === '') {
            $value = '0';
        }

        return bcadd($value, '0', self::SCALE);
    }

    private function generateEntryNumber(): string
    {
        $prefix = 'JE-'.Carbon::now()->format('Ymd').'-';
        $last = JournalEntry::query()
            ->where('entry_number', 'like', $prefix.'%')
            ->orderByDesc('id')
            ->value('entry_number');

        $sequence = 1;
        if (is_string($last)) {
            $suffix = substr($last, strlen($prefix));
            if (ctype_digit($suffix)) {
                $sequence = (int) $suffix + 1;
            }
        }

        return $prefix.str_pad((string) $sequence, 5, '0', STR_PAD_LEFT);
    }
}
