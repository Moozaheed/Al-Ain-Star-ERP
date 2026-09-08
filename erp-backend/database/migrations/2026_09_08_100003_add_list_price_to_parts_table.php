<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // erp-context/decisions/ADR-008 — additive, nullable: safe against a
    // production database that already has rows in `parts`.
    public function up(): void
    {
        Schema::table('parts', function (Blueprint $table): void {
            $table->decimal('list_price', 12, 2)->nullable()->after('min_stock_qty');
        });
    }

    public function down(): void
    {
        Schema::table('parts', function (Blueprint $table): void {
            $table->dropColumn('list_price');
        });
    }
};
