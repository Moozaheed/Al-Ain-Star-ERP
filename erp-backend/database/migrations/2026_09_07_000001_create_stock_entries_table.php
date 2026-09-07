<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Matches erp-context/db-schemas/schema.sql "stock_entries" — FIFO lots,
        // immutable after creation (no updated_at, never edited or deleted).
        Schema::create('stock_entries', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')->constrained();
            $table->foreignId('part_id')->constrained();
            $table->enum('source_type', ['purchase', 'transfer_in', 'return', 'adjustment']);
            $table->unsignedBigInteger('source_id')->nullable();
            $table->timestamp('received_at')->useCurrent();
            $table->unsignedInteger('qty');
            $table->unsignedInteger('remaining_qty');
            $table->decimal('unit_cost', 12, 4);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['branch_id', 'part_id', 'remaining_qty']);
            $table->index('received_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_entries');
    }
};
