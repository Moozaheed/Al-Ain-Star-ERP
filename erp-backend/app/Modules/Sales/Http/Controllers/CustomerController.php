<?php

declare(strict_types=1);

namespace App\Modules\Sales\Http\Controllers;

use App\Modules\Sales\Http\Resources\CreditLimitResource;
use App\Modules\Sales\Http\Resources\CustomerNoteResource;
use App\Modules\Sales\Http\Resources\CustomerResource;
use App\Modules\Sales\Models\CreditLimit;
use App\Modules\Sales\Models\Customer;
use App\Modules\Sales\Models\CustomerNote;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $customers = Customer::query()
            ->when($request->search, fn ($q) => $q->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('phone', 'like', "%{$request->search}%")
                  ->orWhere('trn', 'like', "%{$request->search}%");
            }))
            ->when($request->type, fn ($q) => $q->where('type', $request->type))
            ->when($request->is_active !== null, fn ($q) => $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('name')
            ->paginate((int) ($request->per_page ?? 25));

        return ApiResponse::paginated($customers, CustomerResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type'       => 'required|in:retail,b2b,online',
            'name'       => 'required|string|max:200',
            'trade_name' => 'nullable|string|max:200',
            'phone'      => 'nullable|string|max:30',
            'email'      => 'nullable|email|max:180',
            'trn'        => 'nullable|string|max:20',
            'address'    => 'nullable|string',
            'is_active'  => 'boolean',
        ]);

        $customer = Customer::create($data);

        return ApiResponse::success(new CustomerResource($customer), 'Customer created.', 201);
    }

    public function show(int $id): JsonResponse
    {
        return ApiResponse::success(new CustomerResource(Customer::findOrFail($id)));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $customer = Customer::findOrFail($id);
        $data = $request->validate([
            'type'       => 'sometimes|in:retail,b2b,online',
            'name'       => 'sometimes|required|string|max:200',
            'trade_name' => 'nullable|string|max:200',
            'phone'      => 'nullable|string|max:30',
            'email'      => 'nullable|email|max:180',
            'trn'        => 'nullable|string|max:20',
            'address'    => 'nullable|string',
            'is_active'  => 'boolean',
        ]);

        $customer->update($data);

        return ApiResponse::success(new CustomerResource($customer), 'Customer updated.');
    }

    public function creditLimits(int $id): JsonResponse
    {
        $customer = Customer::findOrFail($id);

        $limits = $customer->creditLimits()->with(['branch', 'setBy'])->orderBy('branch_id')->get();

        return ApiResponse::success(CreditLimitResource::collection($limits));
    }

    public function setCreditLimit(Request $request, int $id): JsonResponse
    {
        $customer = Customer::findOrFail($id);

        $data = $request->validate([
            'branch_id'    => 'required|exists:branches,id',
            'credit_limit' => 'required|numeric|min:0',
        ]);

        $limit = DB::transaction(function () use ($customer, $data, $request) {
            $limit = CreditLimit::firstOrNew([
                'customer_id' => $customer->id,
                'branch_id'   => $data['branch_id'],
            ]);
            $limit->credit_limit = $data['credit_limit'];
            $limit->credit_used = $limit->credit_used ?? 0;
            $limit->set_by = $request->user()->id;
            $limit->save();

            return $limit;
        });

        AuditLogger::log('credit_limit.set', $limit, [
            'customer_id' => $customer->id,
            'branch_id'   => $data['branch_id'],
            'credit_limit' => $data['credit_limit'],
        ]);

        return ApiResponse::success(new CreditLimitResource($limit->fresh(['branch', 'setBy'])), 'Credit limit updated.');
    }

    public function notes(int $id): JsonResponse
    {
        $customer = Customer::findOrFail($id);

        $notes = $customer->notes()->with('createdBy')->latest('created_at')->get();

        return ApiResponse::success(CustomerNoteResource::collection($notes));
    }

    public function addNote(Request $request, int $id): JsonResponse
    {
        $customer = Customer::findOrFail($id);

        $data = $request->validate([
            'note' => 'required|string|max:2000',
        ]);

        $note = CustomerNote::create([
            'customer_id' => $customer->id,
            'created_by'  => $request->user()->id,
            'note'        => $data['note'],
        ]);

        AuditLogger::log('customer_note.created', $note, ['customer_id' => $customer->id]);

        return ApiResponse::success(new CustomerNoteResource($note->fresh('createdBy')), 'Note added.', 201);
    }

    public function statement(Request $request, int $id): JsonResponse
    {
        $customer = Customer::findOrFail($id);

        if (! $request->user()->hasAnyRole(['super_admin', 'manager', 'branch_manager', 'accountant'])) {
            return ApiResponse::error('You are not authorised to view customer statements.', 403);
        }

        $from = $request->date('from') ?? now()->subMonths(3)->startOfDay();
        $to = $request->date('to') ?? now()->endOfDay();

        $invoices = $customer->invoices()
            ->whereBetween('invoice_date', [$from, $to])
            ->where('status', '!=', 'void')
            ->orderBy('invoice_date')
            ->get(['id', 'invoice_number', 'invoice_date', 'total', 'amount_paid', 'status']);

        $payments = DB::table('invoice_payments')
            ->join('invoices', 'invoices.id', '=', 'invoice_payments.invoice_id')
            ->where('invoices.customer_id', $customer->id)
            ->whereBetween('invoice_payments.payment_date', [$from, $to])
            ->orderBy('invoice_payments.payment_date')
            ->get(['invoice_payments.id', 'invoice_payments.invoice_id', 'invoices.invoice_number', 'invoice_payments.amount', 'invoice_payments.payment_mode', 'invoice_payments.payment_date']);

        $returns = DB::table('sales_returns')
            ->join('invoices', 'invoices.id', '=', 'sales_returns.invoice_id')
            ->where('invoices.customer_id', $customer->id)
            ->where('sales_returns.status', 'approved')
            ->whereBetween('sales_returns.return_date', [$from, $to])
            ->orderBy('sales_returns.return_date')
            ->get(['sales_returns.id', 'sales_returns.invoice_id', 'invoices.invoice_number', 'sales_returns.total', 'sales_returns.return_date']);

        $entries = collect()
            ->concat($invoices->map(fn ($i) => [
                'type' => 'invoice',
                'date' => $i->invoice_date,
                'reference' => $i->invoice_number,
                'debit' => (float) $i->total,
                'credit' => 0.0,
            ]))
            ->concat($payments->map(fn ($p) => [
                'type' => 'payment',
                'date' => $p->payment_date,
                'reference' => $p->invoice_number,
                'debit' => 0.0,
                'credit' => (float) $p->amount,
            ]))
            ->concat($returns->map(fn ($r) => [
                'type' => 'return',
                'date' => $r->return_date,
                'reference' => $r->invoice_number,
                'debit' => 0.0,
                'credit' => (float) $r->total,
            ]))
            ->sortBy('date')
            ->values();

        $balance = 0.0;
        $entries = $entries->map(function ($e) use (&$balance) {
            $balance += $e['debit'] - $e['credit'];
            $e['running_balance'] = round($balance, 2);

            return $e;
        });

        return ApiResponse::success([
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'entries' => $entries,
            'closing_balance' => round($balance, 2),
        ]);
    }
}
