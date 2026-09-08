<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // New tables — not in schema.sql, see ADR-004.
        Schema::create('bank_reconciliations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('bank_account_id')->constrained();
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('statement_ending_balance', 12, 2);
            $table->enum('status', ['in_progress', 'locked'])->default('in_progress');
            $table->foreignId('locked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('locked_at')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index('bank_account_id');
            $table->index('status');
        });

        Schema::create('bank_statement_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('bank_reconciliation_id')->constrained()->cascadeOnDelete();
            $table->date('transaction_date');
            $table->string('description', 500)->nullable();
            $table->string('reference', 100)->nullable();
            // Signed: positive = money in, negative = money out.
            $table->decimal('amount', 12, 2);
            $table->boolean('is_matched')->default(false);
            $table->foreignId('matched_journal_line_id')->nullable()->constrained('journal_lines')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index('bank_reconciliation_id');
            $table->index('is_matched');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_statement_lines');
        Schema::dropIfExists('bank_reconciliations');
    }
};
