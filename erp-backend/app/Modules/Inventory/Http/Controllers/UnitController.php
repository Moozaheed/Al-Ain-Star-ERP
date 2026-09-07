<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Http\Controllers;

use App\Modules\Inventory\Http\Resources\UnitResource;
use App\Modules\Inventory\Models\Unit;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\Rule;

class UnitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $units = Unit::query()
            ->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->is_active !== null, fn ($q) => $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('name')
            ->paginate((int) ($request->per_page ?? 100));

        return ApiResponse::paginated($units, UnitResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'         => ['required', 'string', 'max:50', Rule::unique('units', 'name')],
            'abbreviation' => ['nullable', 'string', 'max:10'],
            'is_active'    => ['boolean'],
        ]);

        $unit = Unit::create($data);
        AuditLogger::log('unit.created', $unit, [], $unit->toArray());

        return ApiResponse::success(new UnitResource($unit), 'Unit created.', 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $unit = Unit::findOrFail($id);
        $data = $request->validate([
            'name'         => ['sometimes', 'required', 'string', 'max:50', Rule::unique('units', 'name')->ignore($id)],
            'abbreviation' => ['nullable', 'string', 'max:10'],
            'is_active'    => ['boolean'],
        ]);

        $old = $unit->toArray();
        $unit->update($data);
        AuditLogger::log('unit.updated', $unit, $old, $unit->fresh()->toArray());

        return ApiResponse::success(new UnitResource($unit), 'Unit updated.');
    }

    public function destroy(int $id): JsonResponse
    {
        $unit = Unit::findOrFail($id);
        $unit->delete();
        AuditLogger::log('unit.deleted', $unit, $unit->toArray(), []);

        return ApiResponse::success(null, 'Unit deleted.');
    }
}
