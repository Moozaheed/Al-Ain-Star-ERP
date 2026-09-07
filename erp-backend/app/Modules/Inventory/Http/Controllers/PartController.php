<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Http\Controllers;

use App\Modules\Inventory\Http\Requests\PartRequest;
use App\Modules\Inventory\Http\Resources\PartResource;
use App\Modules\Inventory\Models\Part;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Storage;

class PartController extends Controller
{
    private const WITH = ['branchStock.branch', 'category', 'brand', 'unit'];

    public function index(Request $request): JsonResponse
    {
        $query = Part::with(self::WITH)
            ->when($request->search, fn ($q) => $q->where(function ($q) use ($request) {
                $q->where('part_number', 'like', "%{$request->search}%")
                  ->orWhere('description', 'like', "%{$request->search}%")
                  ->orWhere('barcode', 'like', "%{$request->search}%");
            }))
            ->when($request->category_id, fn ($q) => $q->where('category_id', $request->category_id))
            ->when($request->brand_id, fn ($q) => $q->where('brand_id', $request->brand_id))
            ->when($request->is_active !== null, fn ($q) => $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)))
            ->when($request->low_stock === 'true', fn ($q) => $q->whereHas('branchStock', function ($q) {
                $q->whereRaw('(SELECT SUM(qty_on_hand) FROM branch_stock WHERE part_id = parts.id) < parts.min_stock_qty AND parts.min_stock_qty > 0');
            }))
            ->orderBy('part_number');

        $parts = $query->paginate((int) ($request->per_page ?? 25));

        return ApiResponse::paginated($parts, PartResource::class);
    }

    public function store(PartRequest $request): JsonResponse
    {
        $part = Part::create($request->validated());

        AuditLogger::log('part.created', $part, [], $part->toArray());

        return ApiResponse::success(new PartResource($part->load(self::WITH)), 'Part created.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $part = Part::with(self::WITH)->findOrFail($id);

        return ApiResponse::success(new PartResource($part));
    }

    public function update(PartRequest $request, int $id): JsonResponse
    {
        $part = Part::findOrFail($id);
        $old = $part->toArray();
        $part->update($request->validated());

        AuditLogger::log('part.updated', $part, $old, $part->fresh()->toArray());

        return ApiResponse::success(new PartResource($part->load(self::WITH)), 'Part updated.');
    }

    public function destroy(int $id): JsonResponse
    {
        $part = Part::findOrFail($id);
        $old = $part->toArray();
        $part->delete();

        AuditLogger::log('part.deleted', $part, $old, []);

        return ApiResponse::success(null, 'Part deleted.');
    }

    public function uploadImage(Request $request, int $id): JsonResponse
    {
        $part = Part::with(self::WITH)->findOrFail($id);

        $data = $request->validate([
            'image' => ['required', 'image', 'max:4096'],
        ]);

        $oldPath = $part->image_path;
        $path = $data['image']->store('parts', 'public');
        $part->update(['image_path' => $path]);

        if ($oldPath !== null) {
            Storage::disk('public')->delete($oldPath);
        }

        AuditLogger::log('part.image_uploaded', $part, ['image_path' => $oldPath], ['image_path' => $path]);

        return ApiResponse::success(new PartResource($part->fresh(self::WITH)), 'Image uploaded.');
    }

    public function lowStock(): JsonResponse
    {
        $parts = Part::with(self::WITH)
            ->where('is_active', true)
            ->where('min_stock_qty', '>', 0)
            ->get()
            ->filter(fn ($p) => $p->branchStock->sum('qty_on_hand') < $p->min_stock_qty)
            ->values();

        return ApiResponse::success(PartResource::collection($parts));
    }
}
