<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Inventory\Models\Unit;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    /**
     * Same starter set the frontend previously hardcoded — preserves existing
     * UX while making units editable/extensible via Settings going forward.
     */
    public function run(): void
    {
        $units = [
            ['name' => 'Piece', 'abbreviation' => 'pc'],
            ['name' => 'Set', 'abbreviation' => 'set'],
            ['name' => 'Liter', 'abbreviation' => 'L'],
            ['name' => 'Kilogram', 'abbreviation' => 'kg'],
            ['name' => 'Meter', 'abbreviation' => 'm'],
            ['name' => 'Box', 'abbreviation' => 'box'],
            ['name' => 'Pair', 'abbreviation' => 'pr'],
        ];

        foreach ($units as $unit) {
            Unit::firstOrCreate(['name' => $unit['name']], $unit);
        }

        $this->command?->info('Seeded '.count($units).' units.');
    }
}
