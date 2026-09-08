<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // erp-context/decisions/ADR-006 — WPS-ready IBAN capture, no bank
        // transmission built.
        Schema::table('employees', function (Blueprint $table): void {
            $table->string('bank_name', 100)->nullable()->after('basic_salary');
            $table->string('bank_iban', 34)->nullable()->after('bank_name');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            $table->dropColumn(['bank_name', 'bank_iban']);
        });
    }
};
