<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parts', function (Blueprint $table): void {
            $table->id();
            $table->string('part_number', 100)->unique();
            $table->string('description', 500);
            $table->string('barcode', 100)->nullable()->index();
            $table->string('category', 100)->nullable()->index();
            $table->string('brand', 100)->nullable()->index();
            $table->string('unit', 20)->default('piece');
            $table->unsignedInteger('min_stock_qty')->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_flagged')->default(false);
            $table->string('flag_reason', 500)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('branch_stock', function (Blueprint $table): void {
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('part_id')->constrained()->cascadeOnDelete();
            $table->integer('qty_on_hand')->default(0);
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->primary(['branch_id', 'part_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_stock');
        Schema::dropIfExists('parts');
    }
};
