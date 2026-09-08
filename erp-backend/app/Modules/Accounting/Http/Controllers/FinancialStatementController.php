<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Accounting\Support\AccountCode;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinancialStatementController extends Controller
{
    /**
     * Profit & Loss. erp-context/modules/accounting/business-rules.md,
     * "Branch vs Consolidated": branch_id filters to one branch; omitting it
     * sums across all branches (consolidated) — both supported, per Q3.
     */
    public function profitAndLoss(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to'   => 'required|date|after_or_equal:date_from',
            'branch_id' => 'nullable|integer|exists:branches,id',
        ]);

        $rows = $this->accountActivity($request->date_from, $request->date_to, $request->branch_id, ['revenue', 'expense']);

        $revenue = [];
        $cogs = [];
        $opex = [];

        foreach ($rows as $row) {
            // Revenue is credit-normal, expense is debit-normal.
            $amount = $row->type === 'revenue'
                ? $row->credit - $row->debit
                : $row->debit - $row->credit;

            $line = ['code' => $row->code, 'name' => $row->name, 'amount' => round($amount, 2)];

            if ($row->type === 'revenue') {
                $revenue[] = $line;
            } elseif ($row->subtype === 'cogs') {
                $cogs[] = $line;
            } else {
                $opex[] = $line;
            }
        }

        $totalRevenue = round(array_sum(array_column($revenue, 'amount')), 2);
        $totalCogs = round(array_sum(array_column($cogs, 'amount')), 2);
        $totalOpex = round(array_sum(array_column($opex, 'amount')), 2);
        $grossProfit = round($totalRevenue - $totalCogs, 2);
        $netIncome = round($grossProfit - $totalOpex, 2);

        return ApiResponse::success([
            'period'                  => ['from' => $request->date_from, 'to' => $request->date_to],
            'branch_id'               => $request->branch_id ? (int) $request->branch_id : null,
            'scope'                   => $request->branch_id ? 'branch' : 'consolidated',
            'revenue'                 => $revenue,
            'total_revenue'           => $totalRevenue,
            'cost_of_goods_sold'      => $cogs,
            'total_cost_of_goods_sold'=> $totalCogs,
            'gross_profit'            => $grossProfit,
            'operating_expenses'      => $opex,
            'total_operating_expenses'=> $totalOpex,
            'net_income'              => $netIncome,
        ]);
    }

    /**
     * Balance Sheet as of a point in time. Since there is no year-end
     * closing-entry mechanism yet, accumulated net income to date is shown
     * as a computed "Current Year Earnings" equity line so the statement
     * actually balances (Assets = Liabilities + Equity).
     */
    public function balanceSheet(Request $request): JsonResponse
    {
        $request->validate([
            'as_of'     => 'required|date',
            'branch_id' => 'nullable|integer|exists:branches,id',
        ]);

        $rows = $this->accountActivity(null, $request->as_of, $request->branch_id, ['asset', 'liability', 'equity']);

        $assets = [];
        $liabilities = [];
        $equity = [];

        foreach ($rows as $row) {
            $debitNormal = $row->type === 'asset';
            $amount = $debitNormal ? $row->debit - $row->credit : $row->credit - $row->debit;
            $line = ['code' => $row->code, 'name' => $row->name, 'amount' => round($amount, 2)];

            match ($row->type) {
                'asset' => $assets[] = $line,
                'liability' => $liabilities[] = $line,
                'equity' => $equity[] = $line,
            };
        }

        $incomeRows = $this->accountActivity(null, $request->as_of, $request->branch_id, ['revenue', 'expense']);
        $netIncomeToDate = 0.0;

        foreach ($incomeRows as $row) {
            $netIncomeToDate += $row->type === 'revenue'
                ? $row->credit - $row->debit
                : -1 * ($row->debit - $row->credit);
        }

        $equity[] = ['code' => null, 'name' => 'Current Year Earnings (computed)', 'amount' => round($netIncomeToDate, 2)];

        $totalAssets = round(array_sum(array_column($assets, 'amount')), 2);
        $totalLiabilities = round(array_sum(array_column($liabilities, 'amount')), 2);
        $totalEquity = round(array_sum(array_column($equity, 'amount')), 2);

        return ApiResponse::success([
            'as_of'                  => $request->as_of,
            'branch_id'              => $request->branch_id ? (int) $request->branch_id : null,
            'scope'                  => $request->branch_id ? 'branch' : 'consolidated',
            'assets'                 => $assets,
            'total_assets'           => $totalAssets,
            'liabilities'            => $liabilities,
            'total_liabilities'      => $totalLiabilities,
            'equity'                 => $equity,
            'total_equity'           => $totalEquity,
            'total_liabilities_and_equity' => round($totalLiabilities + $totalEquity, 2),
            'balanced'               => abs($totalAssets - ($totalLiabilities + $totalEquity)) < 0.01,
        ]);
    }

    /**
     * VAT return. erp-context/modules/accounting/business-rules.md says the
     * report "must show: standard-rated supplies, zero-rated, exempt,
     * imports" — this system only ever posts 5% standard-rated UAE VAT
     * (nothing in Sales/Purchasing distinguishes zero-rated, exempt, or
     * import transactions), so only the standard-rated total and net payable
     * are meaningful here; the other categories are reported as zero with an
     * explicit note rather than silently omitted.
     */
    public function vatReturn(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to'   => 'required|date|after_or_equal:date_from',
            'branch_id' => 'nullable|integer|exists:branches,id',
        ]);

        $outputVat = $this->accountNetMovement(AccountCode::VAT_OUTPUT, $request->date_from, $request->date_to, $request->branch_id, debitNormal: false);
        $inputVat = $this->accountNetMovement(AccountCode::VAT_INPUT, $request->date_from, $request->date_to, $request->branch_id, debitNormal: true);

        return ApiResponse::success([
            'period' => ['from' => $request->date_from, 'to' => $request->date_to],
            'branch_id' => $request->branch_id ? (int) $request->branch_id : null,
            'standard_rated_supplies_vat' => round($outputVat, 2),
            'zero_rated_supplies_vat' => 0.0,
            'exempt_supplies_vat' => 0.0,
            'imports_vat' => 0.0,
            'output_vat' => round($outputVat, 2),
            'input_vat_recoverable' => round($inputVat, 2),
            'net_vat_payable' => round($outputVat - $inputVat, 2),
            'note' => 'This system only posts standard-rated 5% UAE VAT — zero-rated, exempt, and import supplies are not distinguished anywhere in Sales/Purchasing yet, so those categories are reported as 0 rather than omitted.',
        ]);
    }

    /**
     * @param  array<int, string>  $types
     * @return \Illuminate\Support\Collection<int, object>
     */
    private function accountActivity(?string $dateFrom, string $dateTo, ?string $branchId, array $types)
    {
        return DB::table('journal_lines')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->join('chart_of_accounts', 'chart_of_accounts.id', '=', 'journal_lines.account_id')
            ->whereIn('chart_of_accounts.type', $types)
            ->when($dateFrom, fn ($q) => $q->whereDate('journal_entries.entry_date', '>=', $dateFrom))
            ->whereDate('journal_entries.entry_date', '<=', $dateTo)
            ->when($branchId, fn ($q) => $q->where('journal_entries.branch_id', $branchId))
            ->selectRaw('chart_of_accounts.id, chart_of_accounts.code, chart_of_accounts.name, chart_of_accounts.type, chart_of_accounts.subtype, SUM(journal_lines.debit) as debit, SUM(journal_lines.credit) as credit')
            ->groupBy('chart_of_accounts.id', 'chart_of_accounts.code', 'chart_of_accounts.name', 'chart_of_accounts.type', 'chart_of_accounts.subtype')
            ->get();
    }

    private function accountNetMovement(string $code, string $dateFrom, string $dateTo, ?string $branchId, bool $debitNormal): float
    {
        $totals = DB::table('journal_lines')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->join('chart_of_accounts', 'chart_of_accounts.id', '=', 'journal_lines.account_id')
            ->where('chart_of_accounts.code', $code)
            ->whereDate('journal_entries.entry_date', '>=', $dateFrom)
            ->whereDate('journal_entries.entry_date', '<=', $dateTo)
            ->when($branchId, fn ($q) => $q->where('journal_entries.branch_id', $branchId))
            ->selectRaw('SUM(journal_lines.debit) as debit, SUM(journal_lines.credit) as credit')
            ->first();

        $debit = (float) ($totals->debit ?? 0);
        $credit = (float) ($totals->credit ?? 0);

        return $debitNormal ? $debit - $credit : $credit - $debit;
    }
}
