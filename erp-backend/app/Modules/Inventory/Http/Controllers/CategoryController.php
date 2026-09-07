<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Http\Controllers;

use App\Modules\Inventory\Http\Resources\CategoryResource;
use App\Modules\Inventory\Models\Category;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $categories = Category::query()
            ->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->is_active !== null, fn ($q) => $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('name')
            ->paginate((int) ($request->per_page ?? 100));

        return ApiResponse::paginated($categories, CategoryResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'      => ['required', 'string', 'max:100', Rule::unique('categories', 'name')],
            'is_active' => ['boolean'],
        ]);

        $category = Category::create($data);
        AuditLogger::log('category.created', $category, [], $category->toArray());

        return ApiResponse::success(new CategoryResource($category), 'Category created.', 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $category = Category::findOrFail($id);
        $data = $request->validate([
            'name'      => ['sometimes', 'required', 'string', 'max:100', Rule::unique('categories', 'name')->ignore($id)],
            'is_active' => ['boolean'],
        ]);

        $old = $category->toArray();
        $category->update($data);
        AuditLogger::log('category.updated', $category, $old, $category->fresh()->toArray());

        return ApiResponse::success(new CategoryResource($category), 'Category updated.');
    }

    public function destroy(int $id): JsonResponse
    {
        $category = Category::findOrFail($id);
        $category->delete();
        AuditLogger::log('category.deleted', $category, $category->toArray(), []);

        return ApiResponse::success(null, 'Category deleted.');
    }
}
