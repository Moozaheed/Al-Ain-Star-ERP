<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Admin\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'admin@alainstar.ae'],
            [
                'name'      => 'Super Admin',
                'password'  => Hash::make('Admin@1234'),
                'branch_id' => null,
                'phone'     => null,
                'is_active' => true,
            ]
        );

        $user->syncRoles(['super_admin']);

        $this->command->info('Super Admin created — email: admin@alainstar.ae / password: Admin@1234');
    }
}
