<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Sales\Models\Customer;
use Illuminate\Database\Seeder;

class CashCustomerSeeder extends Seeder
{
    public function run(): void
    {
        Customer::updateOrCreate(
            ['name' => 'CASH CUSTOMER'],
            ['type' => 'retail', 'is_active' => true, 'created_from' => 'manual']
        );

        $this->command->info('Cash Customer seeded.');
    }
}
