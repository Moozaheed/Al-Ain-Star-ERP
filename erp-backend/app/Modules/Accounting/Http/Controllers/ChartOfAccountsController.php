<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Accounting\Http\Requests\ChartOfAccountRequest;
use App\Modules\Accounting\Http\Resources\ChartOfAccountResource;
use App\Modules\Accounting\Services\ChartOfAccountsService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChartOfAccountsController extends Controller
{
    public function __construct(private readonly ChartOfAccountsService $accounts) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 50);
        $paginator = $this->accounts->list($perPage);

        return ApiResponse::paginated($paginator, ChartOfAccountResource::class);
    }

    public function store(ChartOfAccountRequest $request): JsonResponse
    {
        $account = $this->accounts->create($request->validated());

        return ApiResponse::success(new ChartOfAccountResource($account), 'Account created.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $account = $this->accounts->find($id);

        if ($account === null) {
            return ApiResponse::error('Account not found.', 404);
        }

        return ApiResponse::success(new ChartOfAccountResource($account));
    }

    public function update(ChartOfAccountRequest $request, int $id): JsonResponse
    {
        $account = $this->accounts->find($id);

        if ($account === null) {
            return ApiResponse::error('Account not found.', 404);
        }

        $account = $this->accounts->update($account, $request->validated());

        return ApiResponse::success(new ChartOfAccountResource($account), 'Account updated.');
    }
}
