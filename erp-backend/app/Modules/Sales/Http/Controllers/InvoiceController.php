<?php

declare(strict_types=1);

namespace App\Modules\Sales\Http\Controllers;

use App\Modules\Sales\Http\Resources\InvoiceResource;
use App\Modules\Sales\Models\Invoice;
use App\Modules\Sales\Services\InvoicePdfService;
use App\Modules\Sales\Services\InvoiceService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Symfony\Component\HttpFoundation\Response;

class InvoiceController extends Controller
{
    public function __construct(
        private readonly InvoiceService $service,
        private readonly InvoicePdfService $pdfService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $invoices = Invoice::with(['customer', 'createdBy'])
            ->when($request->search, fn ($q) => $q->where(function ($q) use ($request) {
                $q->where('invoice_number', 'like', "%{$request->search}%")
                  ->orWhere('customer_name', 'like', "%{$request->search}%")
                  ->orWhereHas('customer', fn ($q) => $q->where('name', 'like', "%{$request->search}%"));
            }))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->payment_mode, fn ($q) => $q->where('payment_mode', $request->payment_mode))
            ->when($request->channel, fn ($q) => $q->where('channel', $request->channel))
            ->when($request->date_from, fn ($q) => $q->whereDate('invoice_date', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('invoice_date', '<=', $request->date_to))
            ->orderByDesc('invoice_date')
            ->orderByDesc('id')
            ->paginate((int) ($request->per_page ?? 25));

        return ApiResponse::paginated($invoices, InvoiceResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'branch_id'           => 'required|integer|exists:branches,id',
            // Credit sales are posted to customer AR and checked against the
            // customer's credit limit, so a customer is mandatory for them.
            'customer_id'         => 'required_if:payment_mode,credit|nullable|integer|exists:customers,id',
            'customer_name'       => 'nullable|string|max:200',
            'channel'             => 'required|in:retail,b2b,online',
            'payment_mode'        => 'required|in:cash,card,bank_transfer,credit,cheque',
            'invoice_date'        => 'required|date',
            'due_date'            => 'nullable|date',
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

        // Business rule (erp-context/modules/sales/business-rules.md): a credit
        // sale that would exceed the customer's credit limit is blocked unless
        // the acting user has Manager/Super Admin-tier approval authority.
        $canOverrideCreditLimit = $request->user()->hasPermissionTo('sales.approve');

        $invoice = $this->service->create($data, $request->user()->id, $canOverrideCreditLimit);

        return ApiResponse::success(new InvoiceResource($invoice), 'Invoice created.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $invoice = Invoice::with(['items.part', 'customer', 'createdBy'])->findOrFail($id);

        return ApiResponse::success(new InvoiceResource($invoice));
    }

    public function pdf(int $id): Response
    {
        $invoice = Invoice::findOrFail($id);
        $pdf     = $this->pdfService->render($invoice);

        return $pdf->download("Invoice-{$invoice->invoice_number}.pdf");
    }

    public function void(Request $request, int $id): JsonResponse
    {
        $data    = $request->validate(['reason' => 'required|string|max:500']);
        $invoice = Invoice::with('items')->findOrFail($id);
        $invoice = $this->service->void($invoice, $data['reason'], $request->user()->id);

        return ApiResponse::success(new InvoiceResource($invoice), 'Invoice voided.');
    }
}
