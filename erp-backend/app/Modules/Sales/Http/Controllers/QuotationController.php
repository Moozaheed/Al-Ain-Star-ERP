<?php

declare(strict_types=1);

namespace App\Modules\Sales\Http\Controllers;

use App\Modules\Sales\Http\Resources\InvoiceResource;
use App\Modules\Sales\Http\Resources\QuotationResource;
use App\Modules\Sales\Models\Quotation;
use App\Modules\Sales\Services\QuotationService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class QuotationController extends Controller
{
    public function __construct(private readonly QuotationService $service) {}

    public function index(Request $request): JsonResponse
    {
        $quotations = Quotation::with(['customer'])
            ->when($request->search, fn ($q) => $q->where(function ($q) use ($request) {
                $q->where('quotation_number', 'like', "%{$request->search}%")
                  ->orWhere('customer_name', 'like', "%{$request->search}%");
            }))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->orderByDesc('created_at')
            ->paginate((int) ($request->per_page ?? 25));

        return ApiResponse::paginated($quotations, QuotationResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'branch_id'           => 'required|integer|exists:branches,id',
            'customer_id'         => 'nullable|integer|exists:customers,id',
            'customer_name'       => 'nullable|string|max:200',
            'channel'             => 'required|in:retail,b2b,online',
            'expires_at'          => 'required|date|after:today',
            'lpo_number'          => 'nullable|string|max:100',
            'ref_number'          => 'nullable|string|max:100',
            'notes'               => 'nullable|string',
            'items'               => 'required|array|min:1',
            'items.*.part_id'     => 'required|integer|exists:parts,id',
            'items.*.qty'         => 'required|integer|min:1',
            'items.*.unit_price'  => 'required|numeric|min:0',
            'items.*.discount_pct'=> 'nullable|numeric|min:0|max:100',
            'items.*.description' => 'nullable|string|max:500',
        ]);

        $quotation = $this->service->create($data, $request->user()->id);

        return ApiResponse::success(new QuotationResource($quotation), 'Quotation created.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $quotation = Quotation::with(['items.part', 'customer'])->findOrFail($id);

        return ApiResponse::success(new QuotationResource($quotation));
    }

    public function convert(Request $request, int $id): JsonResponse
    {
        $quotation = Quotation::with('items')->findOrFail($id);
        $data = $request->validate([
            'payment_mode' => 'required|in:cash,card,bank_transfer,credit,cheque',
            'due_date'     => 'nullable|date',
            'notes'        => 'nullable|string',
        ]);

        // Same credit-limit rule as direct invoice creation applies on conversion.
        $canOverrideCreditLimit = $request->user()->hasPermissionTo('sales.approve');

        $invoice = $this->service->convertToInvoice($quotation, $data, $request->user()->id, $canOverrideCreditLimit);

        return ApiResponse::success(new InvoiceResource($invoice), 'Quotation converted to invoice.');
    }
}
