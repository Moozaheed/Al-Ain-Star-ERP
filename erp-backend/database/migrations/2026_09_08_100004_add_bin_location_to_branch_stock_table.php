<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // erp-context/decisions/ADR-008 — additive, nullable: safe against a
    // production database that already has rows in `branch_stock`.
    public function up(): void
    {
        Schema::table('branch_stock', function (Blueprint $table): void {
            $table->string('bin_location', 50)->nullable()->after('qty_on_hand');
        });
    }

    public function down(): void
    {
        Schema::table('branch_stock', function (Blueprint $table): void {
            $table->dropColumn('bin_location');
        });
    }
};
