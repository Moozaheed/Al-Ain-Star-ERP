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
use Illuminate\Support\Facades\DB;
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
        $this->attachLastCost($parts->getCollection());

        return ApiResponse::paginated($parts, PartResource::class);
    }

    public function store(PartRequest $request): JsonResponse
    {
        $part = Part::create($request->validated());

        AuditLogger::log('part.created', $part, [], $part->toArray());
        $this->attachLastCost(collect([$part]));

        return ApiResponse::success(new PartResource($part->load(self::WITH)), 'Part created.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $part = Part::with(self::WITH)->findOrFail($id);
        $this->attachLastCost(collect([$part]));

        return ApiResponse::success(new PartResource($part));
    }

    public function update(PartRequest $request, int $id): JsonResponse
    {
        $part = Part::findOrFail($id);
        $old = $part->toArray();
        $part->update($request->validated());

        AuditLogger::log('part.updated', $part, $old, $part->fresh()->toArray());
        $this->attachLastCost(collect([$part]));

        return ApiResponse::success(new PartResource($part->load(self::WITH)), 'Part updated.');
    }

    // erp-context/decisions/ADR-008 — the most recent unit_cost across all
    // suppliers for each part, batched (not N+1) via one query keyed by
    // part_id, kept only as a reference value set on the model — not part
    // of PartRequest's fillable set.
    private function attachLastCost(\Illuminate\Support\Collection $parts): void
    {
        $partIds = $parts->pluck('id');
        if ($partIds->isEmpty()) {
            return;
        }

        $latestByPart = DB::table('supplier_price_history')
            ->whereIn('part_id', $partIds)
            ->orderBy('part_id')
            ->orderByDesc('effective_date')
            ->get(['part_id', 'unit_cost'])
            ->unique('part_id')
            ->keyBy('part_id');

        foreach ($parts as $part) {
            // Genuinely unknown (no purchase history yet) must stay null, not
            // 0 — "cost is AED 0" and "we don't know the cost" are different
            // facts and the frontend renders them differently ("—" vs an
            // actual amount).
            $cost = $latestByPart->get($part->id)?->unit_cost;
            $part->last_cost = $cost !== null ? (float) $cost : null;
        }
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
        $freshPart = $part->fresh(self::WITH);
        $this->attachLastCost(collect([$freshPart]));

        return ApiResponse::success(new PartResource($freshPart), 'Image uploaded.');
    }

    // PUT /inventory/parts/{id}/branch-stock/{branchId} — erp-context/decisions/ADR-008.
    // Sets the bin/shelf location for this part at this branch. Does not
    // touch qty_on_hand — that's stock movement, a different concern.
    // branch_stock has a composite primary key (branch_id, part_id) with no
    // `id` column, so — matching every other write to this table in this
    // codebase (InvoiceService, PurchaseInvoiceService, PurchaseReturnService)
    // — this goes through the query builder, not the Eloquent model.
    public function updateBinLocation(Request $request, int $id, int $branchId): JsonResponse
    {
        Part::findOrFail($id);

        if (! DB::table('branches')->where('id', $branchId)->exists()) {
            return ApiResponse::error('Branch not found.', 404);
        }

        $data = $request->validate(['bin_location' => ['nullable', 'string', 'max:50']]);

        $exists = DB::table('branch_stock')->where('part_id', $id)->where('branch_id', $branchId)->exists();

        if ($exists) {
            DB::table('branch_stock')->where('part_id', $id)->where('branch_id', $branchId)
                ->update(['bin_location' => $data['bin_location'] ?? null, 'updated_at' => now()]);
        } else {
            DB::table('branch_stock')->insert([
                'part_id' => $id,
                'branch_id' => $branchId,
                'qty_on_hand' => 0,
                'bin_location' => $data['bin_location'] ?? null,
                'updated_at' => now(),
            ]);
        }

        return ApiResponse::success([
            'part_id' => $id,
            'branch_id' => $branchId,
            'bin_location' => $data['bin_location'] ?? null,
        ], 'Bin location updated.');
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
