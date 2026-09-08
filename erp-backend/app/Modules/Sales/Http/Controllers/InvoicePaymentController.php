<?php

declare(strict_types=1);

namespace App\Modules\Sales\Http\Controllers;

use App\Modules\Sales\Http\Resources\InvoicePaymentResource;
use App\Modules\Sales\Models\InvoicePayment;
use App\Modules\Sales\Services\CustomerPaymentService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class InvoicePaymentController extends Controller
{
    public function __construct(private readonly CustomerPaymentService $service) {}

    public function index(Request $request): JsonResponse
    {
        $payments = InvoicePayment::with(['invoice', 'receivedBy'])
            ->when($request->invoice_id, fn ($q) => $q->where('invoice_id', $request->invoice_id))
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->paginate((int) ($request->per_page ?? 25));

        return ApiResponse::paginated($payments, InvoicePaymentResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'invoice_id'       => 'required|integer|exists:invoices,id',
            'amount'           => 'required|numeric|min:0.01',
            'payment_mode'     => 'required|in:cash,card,bank_transfer,cheque',
            'payment_date'     => 'required|date',
            'reference'        => 'nullable|string|max:100',
            'notes'            => 'nullable|string',
            'cheque_number'    => 'required_if:payment_mode,cheque|nullable|string|max:50',
            'cheque_bank_name' => 'nullable|string|max:200',
            'cheque_due_date'  => 'required_if:payment_mode,cheque|nullable|date',
        ]);

        $payment = $this->service->create($data, $request->user()->id);

        return ApiResponse::success(new InvoicePaymentResource($payment), 'Payment recorded.', 201);
    }
}
