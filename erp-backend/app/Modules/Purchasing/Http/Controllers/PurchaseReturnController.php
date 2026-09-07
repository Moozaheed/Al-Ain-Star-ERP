<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Http\Controllers;

use App\Modules\Purchasing\Http\Resources\PurchaseReturnResource;
use App\Modules\Purchasing\Models\PurchaseReturn;
use App\Modules\Purchasing\Services\PurchaseReturnService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PurchaseReturnController extends Controller
{
    public function __construct(private readonly PurchaseReturnService $service) {}

    public function index(Request $request): JsonResponse
    {
        $returns = PurchaseReturn::with(['supplier', 'purchaseInvoice', 'createdBy'])
            ->when($request->purchase_invoice_id, fn ($q) => $q->where('purchase_invoice_id', $request->purchase_invoice_id))
            ->when($request->supplier_id, fn ($q) => $q->where('supplier_id', $request->supplier_id))
            ->orderByDesc('return_date')
            ->orderByDesc('id')
            ->paginate((int) ($request->per_page ?? 25));

        return ApiResponse::paginated($returns, PurchaseReturnResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'purchase_invoice_id'                => 'required|integer|exists:purchase_invoices,id',
            'return_date'                        => 'required|date',
            'reason'                              => 'nullable|string',
            'items'                               => 'required|array|min:1',
            'items.*.purchase_invoice_item_id'    => 'required|integer|exists:purchase_invoice_items,id',
            'items.*.qty'                         => 'required|integer|min:1',
        ]);

        $return = $this->service->create($data, $request->user()->id);

        return ApiResponse::success(new PurchaseReturnResource($return), 'Purchase return created.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $return = PurchaseReturn::with(['items.part', 'supplier', 'purchaseInvoice', 'createdBy'])->findOrFail($id);

        return ApiResponse::success(new PurchaseReturnResource($return));
    }
}
