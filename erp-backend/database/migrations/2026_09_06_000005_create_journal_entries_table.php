<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journal_entries', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')
                ->nullable()
                ->constrained('branches')
                ->nullOnDelete();
            $table->string('entry_number', 30)->unique();
            $table->date('entry_date');
            $table->string('description', 500);
            $table->enum('source_type', [
                'invoice', 'purchase', 'payment', 'transfer',
                'return', 'expense', 'manual', 'reversal',
            ]);
            $table->unsignedBigInteger('source_id')->nullable();
            $table->tinyInteger('is_reversed')->default(0);
            $table->unsignedBigInteger('reversed_by_id')->nullable();
            $table->foreignId('posted_by')->constrained('users');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('reversed_by_id')
                ->references('id')
                ->on('journal_entries')
                ->nullOnDelete();

            $table->index('entry_date');
            $table->index('source_type');
            $table->index(['source_type', 'source_id']);
            $table->index('is_reversed');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_entries');
    }
};
