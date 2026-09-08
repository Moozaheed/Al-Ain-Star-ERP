<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Services;

use App\Modules\Accounting\Models\BankAccount;
use App\Modules\Accounting\Models\BankReconciliation;
use App\Modules\Accounting\Models\BankStatementLine;
use App\Support\AuditLogger;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * See ADR-004. CSV import assumes a normalised
 * "date,description,reference,amount" shape — one signed amount column,
 * positive = money in.
 */
class BankReconciliationService
{
    public function create(array $data, int $userId): BankReconciliation
    {
        $reconciliation = BankReconciliation::create([
            'bank_account_id'          => $data['bank_account_id'],
            'period_start'             => $data['period_start'],
            'period_end'               => $data['period_end'],
            'statement_ending_balance' => $data['statement_ending_balance'],
            'status'                   => 'in_progress',
            'created_by'               => $userId,
        ]);

        AuditLogger::log('bank_reconciliation.created', $reconciliation, [], $reconciliation->toArray());

        return $reconciliation;
    }

    /**
     * @return array{imported: int, skipped: int}
     */
    public function importCsv(BankReconciliation $reconciliation, UploadedFile $file): array
    {
        $this->assertInProgress($reconciliation);

        $handle = fopen($file->getRealPath(), 'r');

        if ($handle === false) {
            throw new InvalidArgumentException('Could not read the uploaded file.');
        }

        $header = fgetcsv($handle);

        if ($header === false) {
            fclose($handle);

            throw new InvalidArgumentException('CSV file is empty.');
        }

        $header = array_map(fn ($h) => strtolower(trim((string) $h)), $header);
        $required = ['date', 'amount'];

        foreach ($required as $col) {
            if (! in_array($col, $header, true)) {
                fclose($handle);

                throw new InvalidArgumentException("CSV must have a '{$col}' column. Expected: date,description,reference,amount.");
            }
        }

        $imported = 0;
        $skipped = 0;

        DB::transaction(function () use ($handle, $header, $reconciliation, &$imported, &$skipped): void {
            while (($row = fgetcsv($handle)) !== false) {
                if (count(array_filter($row, fn ($v) => trim((string) $v) !== '')) === 0) {
                    continue; // blank line
                }

                $assoc = array_combine($header, array_pad($row, count($header), null));
                $date = trim((string) ($assoc['date'] ?? ''));
                $amount = trim((string) ($assoc['amount'] ?? ''));

                if ($date === '' || $amount === '' || ! is_numeric($amount)) {
                    $skipped++;

                    continue;
                }

                BankStatementLine::create([
                    'bank_reconciliation_id' => $reconciliation->id,
                    'transaction_date'       => $date,
                    'description'            => $assoc['description'] ?? null,
                    'reference'              => $assoc['reference'] ?? null,
                    'amount'                 => $amount,
                    'is_matched'             => false,
                ]);

                $imported++;
            }
        });

        fclose($handle);

        AuditLogger::log('bank_reconciliation.imported', $reconciliation, [], ['imported' => $imported, 'skipped' => $skipped]);

        return ['imported' => $imported, 'skipped' => $skipped];
    }

    /**
     * Exact-match only: same date, same absolute amount, correct direction.
     * Near-miss matches still need a manual match() call.
     *
     * @return int number of lines auto-matched
     */
    public function autoMatch(BankReconciliation $reconciliation): int
    {
        $this->assertInProgress($reconciliation);

        $bankAccount = BankAccount::findOrFail($reconciliation->bank_account_id);
        $matched = 0;

        $unmatchedLines = BankStatementLine::where('bank_reconciliation_id', $reconciliation->id)
            ->where('is_matched', false)
            ->get();

        foreach ($unmatchedLines as $line) {
            $isDebit = bccomp((string) $line->amount, '0', 2) > 0;

            $candidate = DB::table('journal_lines')
                ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
                ->where('journal_lines.account_id', $bankAccount->coa_account_id)
                ->where('journal_entries.entry_date', $line->transaction_date->toDateString())
                ->where($isDebit ? 'journal_lines.debit' : 'journal_lines.credit', abs((float) $line->amount))
                ->whereNotIn('journal_lines.id', function ($q): void {
                    $q->select('matched_journal_line_id')
                        ->from('bank_statement_lines')
                        ->whereNotNull('matched_journal_line_id');
                })
                ->select('journal_lines.id')
                ->first();

            if ($candidate !== null) {
                $line->update(['is_matched' => true, 'matched_journal_line_id' => $candidate->id]);
                $matched++;
            }
        }

        AuditLogger::log('bank_reconciliation.auto_matched', $reconciliation, [], ['matched' => $matched]);

        return $matched;
    }

    public function match(BankReconciliation $reconciliation, int $statementLineId, int $journalLineId): BankStatementLine
    {
        $this->assertInProgress($reconciliation);

        $line = BankStatementLine::where('bank_reconciliation_id', $reconciliation->id)
            ->where('id', $statementLineId)
            ->firstOrFail();

        if ($line->is_matched) {
            throw new InvalidArgumentException('This statement line is already matched.');
        }

        $alreadyUsed = BankStatementLine::where('matched_journal_line_id', $journalLineId)->exists();

        if ($alreadyUsed) {
            throw new InvalidArgumentException('That journal line is already matched to another statement line.');
        }

        $journalLine = DB::table('journal_lines')->where('id', $journalLineId)->first();

        if ($journalLine === null) {
            throw new InvalidArgumentException('Journal line not found.');
        }

        $isDebit = bccomp((string) $line->amount, '0', 2) > 0;
        $expectedAmount = $isDebit ? (float) $journalLine->debit : (float) $journalLine->credit;

        if (abs(abs((float) $line->amount) - $expectedAmount) > 0.01) {
            throw new InvalidArgumentException('Amounts do not match between the statement line and the journal line.');
        }

        $line->update(['is_matched' => true, 'matched_journal_line_id' => $journalLineId]);

        return $line;
    }

    public function unmatch(BankReconciliation $reconciliation, int $statementLineId): BankStatementLine
    {
        $this->assertInProgress($reconciliation);

        $line = BankStatementLine::where('bank_reconciliation_id', $reconciliation->id)
            ->where('id', $statementLineId)
            ->firstOrFail();

        $line->update(['is_matched' => false, 'matched_journal_line_id' => null]);

        return $line;
    }

    public function lock(BankReconciliation $reconciliation, int $userId): BankReconciliation
    {
        $this->assertInProgress($reconciliation);

        $unmatchedCount = BankStatementLine::where('bank_reconciliation_id', $reconciliation->id)
            ->where('is_matched', false)
            ->count();

        if ($unmatchedCount > 0) {
            throw new InvalidArgumentException("Cannot lock — {$unmatchedCount} statement line(s) are still unmatched.");
        }

        $reconciliation->update([
            'status'    => 'locked',
            'locked_by' => $userId,
            'locked_at' => now(),
        ]);

        AuditLogger::log('bank_reconciliation.locked', $reconciliation, ['status' => 'in_progress'], ['status' => 'locked']);

        return $reconciliation;
    }

    private function assertInProgress(BankReconciliation $reconciliation): void
    {
        if ($reconciliation->status === 'locked') {
            throw new InvalidArgumentException('This reconciliation is locked and can no longer be changed.');
        }
    }
}
