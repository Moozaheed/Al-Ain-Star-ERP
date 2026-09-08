<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Services;

use App\Modules\Admin\Models\User;
use App\Modules\Notifications\Models\InSystemNotification;
use Illuminate\Support\Carbon;

class NotificationService
{
    /**
     * Create an in-system notification for one user. Deduplicates: the same
     * event_type + link for the same user within $dedupMinutes is skipped —
     * notifications/business-rules.md's Anti-Spam rule ("same event + same
     * recipient within 1 hour is deduplicated"), with a wider window
     * available to callers whose own event cadence calls for it (e.g. a
     * daily low-stock or cheque-due scan uses 24h, not 60 minutes).
     */
    public function notify(int $userId, string $eventType, string $title, ?string $body = null, ?string $link = null, int $dedupMinutes = 60): ?InSystemNotification
    {
        $isDuplicate = InSystemNotification::query()
            ->where('user_id', $userId)
            ->where('event_type', $eventType)
            ->where('link', $link)
            ->where('created_at', '>=', Carbon::now()->subMinutes($dedupMinutes))
            ->exists();

        if ($isDuplicate) {
            return null;
        }

        return InSystemNotification::create([
            'user_id' => $userId,
            'event_type' => $eventType,
            'title' => $title,
            'body' => $body,
            'link' => $link,
        ]);
    }

    /**
     * Roles that operate across all branches (mirrors
     * JournalService::bypassesBranchScope() / ReportingController's
     * resolveBranchScope()) — never excluded by a $branchId filter below,
     * since these users typically have branch_id = null on their own record.
     */
    private const GLOBAL_ROLES = ['super_admin', 'manager'];

    /**
     * Notify every active user holding one of $roleSlugs. When $branchId is
     * given, a role in GLOBAL_ROLES still matches regardless of branch (e.g.
     * "notify Manager and Branch Manager" should reach every Manager, not
     * just one whose own branch_id happens to equal $branchId — Manager
     * rows typically have branch_id = null precisely because they're global);
     * every other role requires the user's branch_id to match.
     *
     * @param  array<int, string>  $roleSlugs
     * @return int  Number of notifications actually created (post-dedup).
     */
    public function notifyRoles(array $roleSlugs, ?int $branchId, string $eventType, string $title, ?string $body = null, ?string $link = null, int $dedupMinutes = 60): int
    {
        $globalRoles = array_values(array_intersect($roleSlugs, self::GLOBAL_ROLES));
        $branchScopedRoles = array_values(array_diff($roleSlugs, self::GLOBAL_ROLES));

        $userIds = User::query()
            ->where('is_active', true)
            ->where(function ($q) use ($globalRoles, $branchScopedRoles, $branchId) {
                if ($globalRoles !== []) {
                    $q->orWhereHas('roles', fn ($r) => $r->whereIn('name', $globalRoles));
                }
                if ($branchScopedRoles !== []) {
                    $q->orWhere(function ($q) use ($branchScopedRoles, $branchId) {
                        $q->whereHas('roles', fn ($r) => $r->whereIn('name', $branchScopedRoles));
                        if ($branchId !== null) {
                            $q->where('branch_id', $branchId);
                        }
                    });
                }
            })
            ->pluck('id');

        $created = 0;
        foreach ($userIds as $userId) {
            if ($this->notify($userId, $eventType, $title, $body, $link, $dedupMinutes) !== null) {
                $created++;
            }
        }

        return $created;
    }
}
