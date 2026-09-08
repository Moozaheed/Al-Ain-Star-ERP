<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Accounting\Http\Resources\BankReconciliationResource;
use App\Modules\Accounting\Models\BankAccount;
use App\Modules\Accounting\Models\BankReconciliation;
use App\Modules\Accounting\Services\BankReconciliationService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class BankReconciliationController extends Controller
{
    public function __construct(private readonly BankReconciliationService $service) {}

    public function index(Request $request): JsonResponse
    {
        $reconciliations = BankReconciliation::with('bankAccount')
            ->when($request->bank_account_id, fn ($q) => $q->where('bank_account_id', $request->bank_account_id))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->orderByDesc('period_end')
            ->paginate((int) ($request->per_page ?? 25));

        return ApiResponse::paginated($reconciliations, BankReconciliationResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'bank_account_id'          => 'required|integer|exists:bank_accounts,id',
            'period_start'             => 'required|date',
            'period_end'               => 'required|date|after_or_equal:period_start',
            'statement_ending_balance' => 'required|numeric',
        ]);

        $reconciliation = $this->service->create($data, $request->user()->id);

        return ApiResponse::success(new BankReconciliationResource($reconciliation), 'Reconciliation started.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $reconciliation = BankReconciliation::with(['bankAccount', 'lines', 'lockedBy', 'createdBy'])->findOrFail($id);

        return ApiResponse::success(new BankReconciliationResource($reconciliation));
    }

    public function importCsv(Request $request, int $id): JsonResponse
    {
        $reconciliation = BankReconciliation::findOrFail($id);
        $request->validate(['file' => 'required|file|mimes:csv,txt']);

        try {
            $result = $this->service->importCsv($reconciliation, $request->file('file'));
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success($result, "Imported {$result['imported']} line(s).");
    }

    public function autoMatch(Request $request, int $id): JsonResponse
    {
        $reconciliation = BankReconciliation::findOrFail($id);

        try {
            $matched = $this->service->autoMatch($reconciliation);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success(['matched' => $matched], "Auto-matched {$matched} line(s).");
    }

    public function match(Request $request, int $id): JsonResponse
    {
        $reconciliation = BankReconciliation::findOrFail($id);
        $data = $request->validate([
            'statement_line_id' => 'required|integer',
            'journal_line_id'   => 'required|integer',
        ]);

        try {
            $this->service->match($reconciliation, $data['statement_line_id'], $data['journal_line_id']);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success(null, 'Matched.');
    }

    public function unmatch(Request $request, int $id, int $lineId): JsonResponse
    {
        $reconciliation = BankReconciliation::findOrFail($id);

        try {
            $this->service->unmatch($reconciliation, $lineId);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success(null, 'Unmatched.');
    }

    public function lock(Request $request, int $id): JsonResponse
    {
        $reconciliation = BankReconciliation::findOrFail($id);

        try {
            $reconciliation = $this->service->lock($reconciliation, $request->user()->id);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success(new BankReconciliationResource($reconciliation), 'Reconciliation locked.');
    }

    /**
     * Candidate journal lines for manual matching: entries on the bank
     * account's linked COA account, within the reconciliation period, not
     * already matched to any statement line.
     */
    public function candidateJournalLines(int $id): JsonResponse
    {
        $reconciliation = BankReconciliation::findOrFail($id);
        $bankAccount = BankAccount::findOrFail($reconciliation->bank_account_id);

        $lines = DB::table('journal_lines')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->where('journal_lines.account_id', $bankAccount->coa_account_id)
            ->whereDate('journal_entries.entry_date', '>=', $reconciliation->period_start)
            ->whereDate('journal_entries.entry_date', '<=', $reconciliation->period_end)
            ->whereNotIn('journal_lines.id', function ($q): void {
                $q->select('matched_journal_line_id')
                    ->from('bank_statement_lines')
                    ->whereNotNull('matched_journal_line_id');
            })
            ->select([
                'journal_lines.id', 'journal_lines.debit', 'journal_lines.credit', 'journal_lines.description as line_description',
                'journal_entries.entry_number', 'journal_entries.entry_date', 'journal_entries.description as entry_description',
            ])
            ->orderBy('journal_entries.entry_date')
            ->get();

        return ApiResponse::success($lines);
    }
}
