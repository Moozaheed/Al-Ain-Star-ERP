<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parts', function (Blueprint $table): void {
            $table->dropColumn(['category', 'brand', 'unit']);

            $table->foreignId('category_id')->nullable()->after('description')->constrained()->nullOnDelete();
            $table->foreignId('brand_id')->nullable()->after('category_id')->constrained()->nullOnDelete();
            $table->foreignId('unit_id')->nullable()->after('brand_id')->constrained()->nullOnDelete();
            $table->string('image_path', 255)->nullable()->after('barcode');
        });
    }

    public function down(): void
    {
        Schema::table('parts', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('category_id');
            $table->dropConstrainedForeignId('brand_id');
            $table->dropConstrainedForeignId('unit_id');
            $table->dropColumn('image_path');

            $table->string('category', 100)->nullable()->index();
            $table->string('brand', 100)->nullable()->index();
            $table->string('unit', 20)->default('piece');
        });
    }
};
