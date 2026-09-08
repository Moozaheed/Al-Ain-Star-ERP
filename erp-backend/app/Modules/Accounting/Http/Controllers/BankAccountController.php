<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Accounting\Http\Resources\BankAccountResource;
use App\Modules\Accounting\Models\BankAccount;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BankAccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $accounts = BankAccount::with('coaAccount')
            ->when($request->branch_id, fn ($q) => $q->where('branch_id', $request->branch_id))
            ->when($request->is_active !== null, fn ($q) => $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('account_name')
            ->paginate((int) ($request->per_page ?? 50));

        return ApiResponse::paginated($accounts, BankAccountResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'branch_id'      => 'required|integer|exists:branches,id',
            'account_name'   => 'required|string|max:200',
            'bank_name'      => 'required|string|max:200',
            'iban'           => 'nullable|string|max:34',
            'currency'       => 'nullable|string|max:3',
            'coa_account_id' => 'required|integer|exists:chart_of_accounts,id',
            'is_active'      => 'boolean',
        ]);

        $account = BankAccount::create($data + ['currency' => $data['currency'] ?? 'AED']);
        AuditLogger::log('bank_account.created', $account, [], $account->toArray());

        return ApiResponse::success(new BankAccountResource($account->load('coaAccount')), 'Bank account created.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $account = BankAccount::with('coaAccount')->findOrFail($id);

        return ApiResponse::success(new BankAccountResource($account));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $account = BankAccount::findOrFail($id);

        $data = $request->validate([
            'account_name' => 'sometimes|required|string|max:200',
            'bank_name'    => 'sometimes|required|string|max:200',
            'iban'         => 'nullable|string|max:34',
            'is_active'    => 'boolean',
        ]);

        $old = $account->toArray();
        $account->update($data);
        AuditLogger::log('bank_account.updated', $account, $old, $account->fresh()->toArray());

        return ApiResponse::success(new BankAccountResource($account->load('coaAccount')), 'Bank account updated.');
    }
}
