<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Modules\Accounting\Models\Cheque;
use App\Modules\Notifications\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class ScanChequesDueNotifications extends Command
{
    protected $signature = 'notifications:scan-cheques-due';

    protected $description = 'TASK-078 — notify Accountant and Manager of pending cheques due within 3 days';

    public function handle(NotificationService $notifications): int
    {
        $today = Carbon::today();
        $windowEnd = $today->copy()->addDays(3);

        $cheques = Cheque::query()
            ->where('status', 'pending')
            ->whereBetween('due_date', [$today, $windowEnd])
            ->get();

        $created = 0;

        foreach ($cheques as $cheque) {
            $direction = $cheque->direction === 'received' ? 'Received' : 'Issued';

            $created += $notifications->notifyRoles(
                ['accountant', 'manager'],
                null,
                'CHEQUE_DUE_SOON',
                "Cheque due soon: {$cheque->cheque_number}",
                "{$direction} cheque {$cheque->cheque_number} ({$cheque->bank_name}) for AED ".number_format((float) $cheque->amount, 2)." is due on {$cheque->due_date->toDateString()}.",
                '/accounting',
                dedupMinutes: 24 * 60,
            );
        }

        $this->info("Cheque due scan complete: {$cheques->count()} cheque(s) due within 3 days, {$created} notification(s) created.");

        return self::SUCCESS;
    }
}
