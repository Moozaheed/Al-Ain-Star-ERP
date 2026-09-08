<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Matches erp-context/db-schemas/schema.sql "invoice_payments" / "purchase_payments".
        Schema::create('invoice_payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('invoice_id')->constrained();
            $table->decimal('amount', 12, 2);
            $table->enum('payment_mode', ['cash', 'card', 'bank_transfer', 'cheque']);
            $table->date('payment_date');
            $table->string('reference', 100)->nullable();
            $table->foreignId('received_by')->constrained('users');
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('invoice_id');
        });

        Schema::create('purchase_payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('purchase_invoice_id')->constrained();
            $table->decimal('amount', 12, 2);
            $table->enum('payment_mode', ['cash', 'bank_transfer', 'cheque']);
            $table->date('payment_date');
            $table->string('reference', 100)->nullable();
            $table->foreignId('paid_by')->constrained('users');
            $table->timestamp('created_at')->useCurrent();

            $table->index('purchase_invoice_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_payments');
        Schema::dropIfExists('invoice_payments');
    }
};
