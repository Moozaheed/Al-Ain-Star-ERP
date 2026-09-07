<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Http\Controllers;

use App\Modules\Purchasing\Http\Resources\PurchaseInvoiceResource;
use App\Modules\Purchasing\Models\PurchaseInvoice;
use App\Modules\Purchasing\Services\PurchaseInvoiceService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PurchaseInvoiceController extends Controller
{
    public function __construct(private readonly PurchaseInvoiceService $service) {}

    public function index(Request $request): JsonResponse
    {
        $invoices = PurchaseInvoice::with(['supplier', 'createdBy'])
            ->when($request->search, fn ($q) => $q->where(function ($q) use ($request) {
                $q->where('invoice_number', 'like', "%{$request->search}%")
                  ->orWhere('supplier_invoice_ref', 'like', "%{$request->search}%")
                  ->orWhereHas('supplier', fn ($q) => $q->where('name', 'like', "%{$request->search}%"));
            }))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->supplier_id, fn ($q) => $q->where('supplier_id', $request->supplier_id))
            ->when($request->date_from, fn ($q) => $q->whereDate('invoice_date', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('invoice_date', '<=', $request->date_to))
            ->orderByDesc('invoice_date')
            ->orderByDesc('id')
            ->paginate((int) ($request->per_page ?? 25));

        return ApiResponse::paginated($invoices, PurchaseInvoiceResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'branch_id'            => 'required|integer|exists:branches,id',
            'supplier_id'          => 'required|integer|exists:suppliers,id',
            'supplier_invoice_ref' => 'nullable|string|max:100',
            'invoice_date'         => 'required|date',
            'due_date'             => 'nullable|date',
            'payment_mode'         => 'required|in:cash,bank_transfer,credit,cheque',
            'notes'                => 'nullable|string',
            'items'                => 'required|array|min:1',
            'items.*.part_id'      => 'required|integer|exists:parts,id',
            'items.*.qty'          => 'required|integer|min:1',
            'items.*.unit_cost'    => 'required|numeric|min:0',
            'items.*.description'  => 'nullable|string|max:500',
        ]);

        $invoice = $this->service->create($data, $request->user()->id);

        return ApiResponse::success(new PurchaseInvoiceResource($invoice), 'Purchase invoice created.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $invoice = PurchaseInvoice::with(['items.part', 'supplier', 'createdBy'])->findOrFail($id);

        return ApiResponse::success(new PurchaseInvoiceResource($invoice));
    }
}
