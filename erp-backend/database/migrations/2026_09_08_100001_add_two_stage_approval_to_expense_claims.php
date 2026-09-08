<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // erp-context/decisions/ADR-007 — Branch Manager, then Admin.
    public function up(): void
    {
        DB::statement("ALTER TABLE expense_claims MODIFY status ENUM('pending','branch_approved','approved','rejected','paid') NOT NULL DEFAULT 'pending'");

        Schema::table('expense_claims', function (Blueprint $table): void {
            $table->foreignId('branch_approved_by')->nullable()->after('status')->constrained('users');
            $table->timestamp('branch_approved_at')->nullable()->after('branch_approved_by');
            $table->timestamp('approved_at')->nullable()->after('approved_by');
        });
    }

    public function down(): void
    {
        Schema::table('expense_claims', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('branch_approved_by');
            $table->dropColumn(['branch_approved_at', 'approved_at']);
        });

        DB::statement("ALTER TABLE expense_claims MODIFY status ENUM('pending','approved','rejected','paid') NOT NULL DEFAULT 'pending'");
    }
};
