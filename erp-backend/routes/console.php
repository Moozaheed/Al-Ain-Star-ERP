<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// TASK-080 — low stock is checked hourly, not daily, since stock changes
// throughout the day and warehouse staff should hear about it same-shift.
Schedule::command('notifications:scan-low-stock')->hourly();

// TASK-078 — business-rules.md: "Daily job: find cheques ... due within 3 days".
Schedule::command('notifications:scan-cheques-due')->dailyAt('08:00');
