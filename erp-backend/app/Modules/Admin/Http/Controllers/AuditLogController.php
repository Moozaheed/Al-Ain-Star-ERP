<?php

declare(strict_types=1);

namespace App\Modules\Admin\Http\Controllers;

use App\Enums\RoleSlug;
use App\Http\Controllers\Controller;
use App\Modules\Admin\Models\AuditLog;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user === null || ! $user->hasRole(RoleSlug::SuperAdmin->value)) {
            return ApiResponse::error('Forbidden.', 403);
        }

        $perPage = (int) $request->query('per_page', 25);

        $query = AuditLog::query();

        if ($request->filled('event')) {
            $query->where('event', $request->query('event'));
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', (int) $request->query('user_id'));
        }
        if ($request->filled('auditable_type')) {
            $query->where('auditable_type', $request->query('auditable_type'));
        }

        $logs = $query->orderByDesc('id')->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => null,
            'data' => $logs->items(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
                'last_page' => $logs->lastPage(),
            ],
        ]);
    }
}
