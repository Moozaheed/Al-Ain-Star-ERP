<?php

declare(strict_types=1);

namespace App\Modules\Crm\Http\Controllers;

use App\Modules\Crm\Http\Resources\SupplierResource;
use App\Modules\Crm\Models\Supplier;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class SupplierController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $suppliers = Supplier::query()
            ->when($request->search, fn ($q) => $q->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('trn', 'like', "%{$request->search}%");
            }))
            ->when($request->is_active !== null, fn ($q) => $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('name')
            ->paginate((int) ($request->per_page ?? 25));

        return ApiResponse::paginated($suppliers, SupplierResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'               => 'required|string|max:200',
            'trade_name'         => 'nullable|string|max:200',
            'phone'              => 'nullable|string|max:30',
            'email'              => 'nullable|email|max:180',
            'trn'                => 'nullable|string|max:20',
            'address'            => 'nullable|string',
            'payment_terms_days' => 'nullable|integer|min:0',
            'is_active'          => 'boolean',
        ]);

        $supplier = Supplier::create($data);

        return ApiResponse::success(new SupplierResource($supplier), 'Supplier created.', 201);
    }

    public function show(int $id): JsonResponse
    {
        return ApiResponse::success(new SupplierResource(Supplier::findOrFail($id)));
    }
}
