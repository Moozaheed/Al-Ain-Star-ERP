<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Http\Controllers;

use App\Modules\Purchasing\Http\Resources\PurchasePaymentResource;
use App\Modules\Purchasing\Models\PurchasePayment;
use App\Modules\Purchasing\Services\SupplierPaymentService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PurchasePaymentController extends Controller
{
    public function __construct(private readonly SupplierPaymentService $service) {}

    public function index(Request $request): JsonResponse
    {
        $payments = PurchasePayment::with(['purchaseInvoice', 'paidBy'])
            ->when($request->purchase_invoice_id, fn ($q) => $q->where('purchase_invoice_id', $request->purchase_invoice_id))
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->paginate((int) ($request->per_page ?? 25));

        return ApiResponse::paginated($payments, PurchasePaymentResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'purchase_invoice_id' => 'required|integer|exists:purchase_invoices,id',
            'amount'              => 'required|numeric|min:0.01',
            'payment_mode'        => 'required|in:cash,bank_transfer,cheque',
            'payment_date'        => 'required|date',
            'reference'           => 'nullable|string|max:100',
            'cheque_number'       => 'required_if:payment_mode,cheque|nullable|string|max:50',
            'cheque_bank_name'    => 'nullable|string|max:200',
            'cheque_due_date'     => 'required_if:payment_mode,cheque|nullable|date',
        ]);

        $payment = $this->service->create($data, $request->user()->id);

        return ApiResponse::success(new PurchasePaymentResource($payment), 'Payment recorded.', 201);
    }
}
