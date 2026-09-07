<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Matches erp-context/db-schemas/schema.sql "suppliers" (CRM-owned per
        // module boundaries — global, not branch-scoped).
        Schema::create('suppliers', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 200);
            $table->string('trade_name', 200)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('email', 180)->nullable();
            $table->string('trn', 20)->nullable();
            $table->text('address')->nullable();
            $table->unsignedInteger('payment_terms_days')->default(30);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('suppliers');
    }
};
