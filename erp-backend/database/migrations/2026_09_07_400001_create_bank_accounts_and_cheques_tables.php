<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Matches erp-context/db-schemas/schema.sql "bank_accounts" / "cheques".
        Schema::create('bank_accounts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')->constrained();
            $table->string('account_name', 200);
            $table->string('bank_name', 200);
            $table->string('iban', 34)->nullable();
            $table->string('currency', 3)->default('AED');
            $table->foreignId('coa_account_id')->constrained('chart_of_accounts');
            $table->boolean('is_active')->default(true);
            $table->timestamp('created_at')->useCurrent();

            $table->index('branch_id');
        });

        Schema::create('cheques', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')->constrained();
            $table->enum('direction', ['received', 'issued']);
            $table->string('cheque_number', 50);
            $table->string('bank_name', 200)->nullable();
            $table->decimal('amount', 12, 2);
            $table->date('due_date');
            $table->enum('status', ['pending', 'cleared', 'bounced', 'cancelled'])->default('pending');
            $table->enum('linked_to_type', ['invoice', 'purchase_invoice', 'expense'])->nullable();
            $table->unsignedBigInteger('linked_to_id')->nullable();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index('branch_id');
            $table->index('due_date');
            $table->index('status');
            $table->index(['linked_to_type', 'linked_to_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cheques');
        Schema::dropIfExists('bank_accounts');
    }
};
