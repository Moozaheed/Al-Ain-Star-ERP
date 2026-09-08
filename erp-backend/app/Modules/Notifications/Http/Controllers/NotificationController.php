<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Http\Controllers;

use App\Modules\Notifications\Http\Resources\NotificationResource;
use App\Modules\Notifications\Models\InSystemNotification;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class NotificationController extends Controller
{
    /**
     * notifications/business-rules.md — Access Control: "Staff can view and
     * mark own in-system notifications." Recipients are already resolved at
     * creation time (one row per targeted user_id), so scoping to the
     * requesting user is the whole access rule — no branch/role filter
     * needed here.
     */
    public function index(Request $request): JsonResponse
    {
        $notifications = InSystemNotification::query()
            ->where('user_id', $request->user()->id)
            ->when($request->boolean('unread'), fn ($q) => $q->where('is_read', false))
            ->when($request->query('event_type'), fn ($q) => $q->where('event_type', $request->query('event_type')))
            ->orderByDesc('created_at')
            ->paginate((int) ($request->per_page ?? 20));

        return ApiResponse::paginated($notifications, NotificationResource::class);
    }

    public function markRead(Request $request, int $id): JsonResponse
    {
        $notification = InSystemNotification::where('user_id', $request->user()->id)->findOrFail($id);

        if (! $notification->is_read) {
            $notification->update(['is_read' => true, 'read_at' => now()]);
        }

        return ApiResponse::success(new NotificationResource($notification));
    }

    public function markAllRead(Request $request): JsonResponse
    {
        InSystemNotification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return ApiResponse::success(null, 'All notifications marked as read.');
    }
}
