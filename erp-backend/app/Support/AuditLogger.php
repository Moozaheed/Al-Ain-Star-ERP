<?php

declare(strict_types=1);

namespace App\Support;

use App\Modules\Admin\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditLogger
{
    /**
     * Append an audit event. Never updates or deletes.
     *
     * @param  array<string, mixed>  $old
     * @param  array<string, mixed>  $new
     */
    public static function log(string $event, ?Model $auditable = null, array $old = [], array $new = []): AuditLog
    {
        $user = Auth::user();
        $request = request();

        return AuditLog::create([
            'user_id' => $user?->getAuthIdentifier(),
            'branch_id' => $user?->branch_id ?? null,
            'event' => $event,
            'auditable_type' => $auditable !== null ? $auditable::class : null,
            'auditable_id' => $auditable?->getKey(),
            'old_values' => $old !== [] ? $old : null,
            'new_values' => $new !== [] ? $new : null,
            'ip_address' => $request?->ip(),
            'user_agent' => $request !== null
                ? substr((string) $request->userAgent(), 0, 500)
                : null,
        ]);
    }
}
