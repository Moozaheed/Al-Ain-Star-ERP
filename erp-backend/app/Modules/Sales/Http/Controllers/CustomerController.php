<?php

declare(strict_types=1);

namespace App\Modules\Sales\Http\Controllers;

use App\Modules\Sales\Http\Resources\CustomerResource;
use App\Modules\Sales\Models\Customer;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

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
}
