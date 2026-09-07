<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Matches erp-context/db-schemas/schema.sql "purchase_invoices" /
        // "purchase_invoice_items" / "supplier_price_history".
        Schema::create('purchase_invoices', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')->constrained();
            $table->foreignId('supplier_id')->constrained();
            $table->string('invoice_number', 50);
            $table->string('supplier_invoice_ref', 100)->nullable();
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->enum('payment_mode', ['cash', 'bank_transfer', 'credit', 'cheque']);
            $table->enum('status', ['draft', 'received', 'paid', 'partially_paid'])->default('draft');
            $table->decimal('subtotal', 12, 2);
            $table->decimal('vat_amount', 12, 2);
            $table->decimal('total', 12, 2);
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->decimal('amount_due', 12, 2);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->unique(['branch_id', 'invoice_number']);
            $table->index('invoice_date');
        });

        Schema::create('purchase_invoice_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('purchase_invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('part_id')->constrained();
            $table->string('description', 500)->nullable();
            $table->unsignedInteger('qty');
            $table->decimal('unit_cost', 12, 4);
            $table->decimal('vat_rate', 5, 2)->default(5.00);
            $table->decimal('line_subtotal', 12, 2);
            $table->decimal('line_vat', 12, 2);
            $table->decimal('line_total', 12, 2);
            // Created FIFO lot reference.
            $table->foreignId('stock_entry_id')->nullable()->constrained('stock_entries')->nullOnDelete();

            $table->index('purchase_invoice_id');
        });

        Schema::create('supplier_price_history', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('supplier_id')->constrained();
            $table->foreignId('part_id')->constrained();
            $table->decimal('unit_cost', 12, 4);
            $table->string('currency', 3)->default('AED');
            $table->date('effective_date');
            $table->foreignId('source_invoice_id')->nullable()->constrained('purchase_invoices')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['supplier_id', 'part_id']);
            $table->index('effective_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_price_history');
        Schema::dropIfExists('purchase_invoice_items');
        Schema::dropIfExists('purchase_invoices');
    }
};
