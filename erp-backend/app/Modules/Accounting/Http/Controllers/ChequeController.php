<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Accounting\Http\Resources\ChequeResource;
use App\Modules\Accounting\Models\Cheque;
use App\Modules\Accounting\Services\ChequeService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class ChequeController extends Controller
{
    public function __construct(private readonly ChequeService $service) {}

    public function index(Request $request): JsonResponse
    {
        $cheques = Cheque::with(['customer', 'supplier', 'createdBy'])
            ->when($request->direction, fn ($q) => $q->where('direction', $request->direction))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->branch_id, fn ($q) => $q->where('branch_id', $request->branch_id))
            ->orderBy('due_date')
            ->paginate((int) ($request->per_page ?? 25));

        return ApiResponse::paginated($cheques, ChequeResource::class);
    }

    public function show(int $id): JsonResponse
    {
        $cheque = Cheque::with(['customer', 'supplier', 'createdBy'])->findOrFail($id);

        return ApiResponse::success(new ChequeResource($cheque));
    }

    public function clear(Request $request, int $id): JsonResponse
    {
        $cheque = Cheque::findOrFail($id);

        try {
            $cheque = $this->service->clear($cheque, $request->user()->id);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success(new ChequeResource($cheque), 'Cheque marked cleared.');
    }

    public function bounce(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|max:500']);
        $cheque = Cheque::findOrFail($id);

        try {
            $cheque = $this->service->bounce($cheque, $data['reason'], $request->user()->id);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success(new ChequeResource($cheque), 'Cheque marked bounced.');
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $cheque = Cheque::findOrFail($id);

        try {
            $cheque = $this->service->cancel($cheque, $request->user()->id);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success(new ChequeResource($cheque), 'Cheque cancelled.');
    }
}
