<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Http\Controllers;

use App\Modules\Inventory\Http\Resources\BrandResource;
use App\Modules\Inventory\Models\Brand;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\Rule;

class BrandController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $brands = Brand::query()
            ->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->is_active !== null, fn ($q) => $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('name')
            ->paginate((int) ($request->per_page ?? 100));

        return ApiResponse::paginated($brands, BrandResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'      => ['required', 'string', 'max:100', Rule::unique('brands', 'name')],
            'is_active' => ['boolean'],
        ]);

        $brand = Brand::create($data);
        AuditLogger::log('brand.created', $brand, [], $brand->toArray());

        return ApiResponse::success(new BrandResource($brand), 'Brand created.', 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $brand = Brand::findOrFail($id);
        $data = $request->validate([
            'name'      => ['sometimes', 'required', 'string', 'max:100', Rule::unique('brands', 'name')->ignore($id)],
            'is_active' => ['boolean'],
        ]);

        $old = $brand->toArray();
        $brand->update($data);
        AuditLogger::log('brand.updated', $brand, $old, $brand->fresh()->toArray());

        return ApiResponse::success(new BrandResource($brand), 'Brand updated.');
    }

    public function destroy(int $id): JsonResponse
    {
        $brand = Brand::findOrFail($id);
        $brand->delete();
        AuditLogger::log('brand.deleted', $brand, $brand->toArray(), []);

        return ApiResponse::success(null, 'Brand deleted.');
    }
}
