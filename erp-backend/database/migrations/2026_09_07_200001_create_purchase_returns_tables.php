<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Matches erp-context/db-schemas/schema.sql "purchase_returns". Note:
        // schema.sql's Purchasing module header lists "purchase_return_items"
        // as owned by this module but never defines it (a gap in that file,
        // not a deliberate omission — "Partial returns allowed (by line item,
        // partial quantity)" in erp-context/modules/purchasing/business-rules.md
        // requires per-line data, so it's added here shaped like
        // purchase_invoice_items).
        Schema::create('purchase_returns', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')->constrained();
            $table->foreignId('purchase_invoice_id')->constrained();
            $table->foreignId('supplier_id')->constrained();
            $table->string('debit_note_number', 30);
            $table->date('return_date');
            $table->text('reason')->nullable();
            $table->decimal('subtotal', 12, 2);
            $table->decimal('vat_amount', 12, 2);
            $table->decimal('total', 12, 2);
            $table->enum('status', ['pending', 'approved', 'settled'])->default('pending');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['branch_id', 'debit_note_number']);
            $table->index('purchase_invoice_id');
        });

        Schema::create('purchase_return_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('return_id')->constrained('purchase_returns')->cascadeOnDelete();
            $table->foreignId('purchase_invoice_item_id')->constrained();
            $table->foreignId('part_id')->constrained();
            $table->unsignedInteger('qty');
            $table->decimal('unit_cost', 12, 4);
            $table->decimal('line_subtotal', 12, 2);
            $table->decimal('line_vat', 12, 2);
            $table->decimal('line_total', 12, 2);

            $table->index('return_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_return_items');
        Schema::dropIfExists('purchase_returns');
    }
};
