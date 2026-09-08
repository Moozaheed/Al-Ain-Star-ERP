<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // journal_entries.source_type is a MySQL ENUM (erp-context/db-schemas/schema.sql)
    // with no room for 'payroll' — erp-context/decisions/ADR-006.
    public function up(): void
    {
        DB::statement("ALTER TABLE journal_entries MODIFY source_type ENUM('invoice','purchase','payment','transfer','return','expense','manual','reversal','payroll') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE journal_entries MODIFY source_type ENUM('invoice','purchase','payment','transfer','return','expense','manual','reversal') NOT NULL");
    }
};
