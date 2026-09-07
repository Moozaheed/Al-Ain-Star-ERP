<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('type', ['retail', 'b2b', 'online'])->default('retail');
            $table->string('name', 200);
            $table->string('trade_name', 200)->nullable();
            $table->string('phone', 30)->nullable()->index();
            $table->string('email', 180)->nullable();
            $table->string('trn', 20)->nullable();
            $table->text('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->enum('created_from', ['manual', 'online_api'])->default('manual');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('credit_limits', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->decimal('credit_limit', 12, 2)->default(0);
            $table->decimal('credit_used', 12, 2)->default(0);
            $table->foreignId('set_by')->constrained('users');
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->unique(['customer_id', 'branch_id']);
        });

        Schema::create('quotations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')->constrained();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->string('customer_name', 200)->nullable();
            $table->string('quotation_number', 30)->unique();
            $table->string('lpo_number', 100)->nullable();
            $table->string('ref_number', 100)->nullable();
            $table->enum('channel', ['retail', 'b2b', 'online'])->default('retail');
            $table->enum('status', ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'])->default('draft');
            $table->date('expires_at');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('vat_amount', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('quotation_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('quotation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('part_id')->constrained();
            $table->string('description', 500)->nullable();
            $table->unsignedInteger('qty');
            $table->decimal('unit_price', 12, 4);
            $table->decimal('discount_pct', 5, 2)->default(0);
            $table->decimal('line_total', 12, 2);
            $table->unsignedInteger('sort_order')->default(0);
        });

        Schema::create('invoices', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')->constrained();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->string('customer_name', 200)->nullable();
            $table->foreignId('quotation_id')->nullable()->constrained()->nullOnDelete();
            $table->string('invoice_number', 30);
            $table->string('lpo_number', 100)->nullable();
            $table->string('ref_number', 100)->nullable();
            $table->enum('channel', ['retail', 'b2b', 'online']);
            $table->enum('payment_mode', ['cash', 'card', 'bank_transfer', 'credit', 'cheque']);
            $table->enum('status', ['draft', 'confirmed', 'paid', 'partially_paid', 'void'])->default('confirmed');
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->decimal('subtotal', 12, 2);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('vat_amount', 12, 2);
            $table->decimal('total', 12, 2);
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->decimal('amount_due', 12, 2);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('voided_by')->nullable()->constrained('users');
            $table->timestamp('voided_at')->nullable();
            $table->string('void_reason', 500)->nullable();
            $table->timestamps();
            $table->unique(['branch_id', 'invoice_number']);
            $table->index('invoice_date');
            $table->index('status');
        });

        Schema::create('invoice_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('part_id')->constrained();
            $table->string('description', 500)->nullable();
            $table->unsignedInteger('qty');
            $table->decimal('unit_price', 12, 4);
            $table->decimal('unit_cost', 12, 4)->default(0);
            $table->decimal('discount_pct', 5, 2)->default(0);
            $table->decimal('vat_rate', 5, 2)->default(5.00);
            $table->decimal('line_subtotal', 12, 2);
            $table->decimal('line_vat', 12, 2);
            $table->decimal('line_total', 12, 2);
            $table->unsignedInteger('sort_order')->default(0);
        });

        Schema::create('sales_returns', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')->constrained();
            $table->foreignId('invoice_id')->constrained();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->string('return_number', 30)->unique();
            $table->date('return_date');
            $table->text('reason')->nullable();
            $table->decimal('subtotal', 12, 2);
            $table->decimal('vat_amount', 12, 2);
            $table->decimal('total', 12, 2);
            $table->enum('refund_mode', ['cash', 'credit_note', 'bank_transfer']);
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamps();
        });

        Schema::create('sales_return_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('return_id')->references('id')->on('sales_returns')->cascadeOnDelete();
            $table->foreignId('part_id')->constrained();
            $table->unsignedInteger('qty');
            $table->decimal('unit_price', 12, 4);
            $table->decimal('line_total', 12, 2);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_return_items');
        Schema::dropIfExists('sales_returns');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('quotation_items');
        Schema::dropIfExists('quotations');
        Schema::dropIfExists('credit_limits');
        Schema::dropIfExists('customers');
    }
};
