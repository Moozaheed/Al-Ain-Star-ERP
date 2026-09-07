<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\RoleSlug;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    /**
     * Modules and the actions supported per module.
     * The seeder generates permissions in the form "<module>.<action>".
     *
     * @var array<string, array<int, string>>
     */
    private array $modulePermissions = [
        'admin' => ['read', 'create', 'update', 'delete'],
        'branches' => ['read', 'create', 'update', 'delete', 'activate'],
        'users' => ['read', 'create', 'update', 'delete', 'assign_role'],
        'audit_logs' => ['read'],

        'inventory' => ['read', 'create', 'update', 'delete', 'adjust', 'transfer'],
        'sales' => ['read', 'create', 'update', 'delete', 'approve', 'override_price', 'refund'],
        'purchasing' => ['read', 'create', 'update', 'delete', 'approve'],
        'accounting' => ['read', 'create', 'update', 'delete', 'approve', 'post_journal', 'reverse_journal'],
        'crm' => ['read', 'create', 'update', 'delete'],
        'hr' => ['read', 'create', 'update', 'delete', 'approve'],
        'reporting' => ['read', 'export'],
        'notifications' => ['read', 'create', 'update', 'delete'],
        'ecommerce_api' => ['read', 'create', 'update', 'delete'],
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // Ensure guard is 'web' for spatie/permission (Sanctum tokens still use web guard mapping).
        $guard = 'web';

        // Create permissions.
        $allPermissions = [];
        foreach ($this->modulePermissions as $module => $actions) {
            foreach ($actions as $action) {
                $name = $module.'.'.$action;
                Permission::firstOrCreate(['name' => $name, 'guard_name' => $guard]);
                $allPermissions[] = $name;
            }
        }

        // Create roles.
        foreach (RoleSlug::cases() as $roleCase) {
            Role::firstOrCreate(['name' => $roleCase->value, 'guard_name' => $guard]);
        }

        // Attach permissions per role.
        $superAdmin = Role::where('name', RoleSlug::SuperAdmin->value)->firstOrFail();
        $superAdmin->syncPermissions(Permission::where('guard_name', $guard)->get());

        $viewerPermissions = array_values(array_filter(
            $allPermissions,
            static fn (string $name): bool => str_ends_with($name, '.read')
        ));
        $viewer = Role::where('name', RoleSlug::Viewer->value)->firstOrFail();
        $viewer->syncPermissions(
            Permission::where('guard_name', $guard)
                ->whereIn('name', $viewerPermissions)
                ->get()
        );

        $manager = Role::where('name', RoleSlug::Manager->value)->firstOrFail();
        $managerPermissions = array_values(array_filter(
            $allPermissions,
            static fn (string $name): bool => ! in_array($name, [
                'admin.delete',
                'branches.delete',
                'users.delete',
                'accounting.delete',
            ], true)
        ));
        $manager->syncPermissions(
            Permission::where('guard_name', $guard)->whereIn('name', $managerPermissions)->get()
        );

        $branchManager = Role::where('name', RoleSlug::BranchManager->value)->firstOrFail();
        $branchManagerPermissions = [
            'branches.read',
            'users.read', 'users.create', 'users.update', 'users.assign_role',
            'audit_logs.read',
            'inventory.read', 'inventory.create', 'inventory.update', 'inventory.adjust', 'inventory.transfer',
            'sales.read', 'sales.create', 'sales.update', 'sales.approve', 'sales.refund',
            'purchasing.read', 'purchasing.create', 'purchasing.update', 'purchasing.approve',
            'accounting.read',
            'crm.read', 'crm.create', 'crm.update',
            'hr.read',
            'reporting.read', 'reporting.export',
            'notifications.read', 'notifications.create',
            'ecommerce_api.read',
        ];
        $branchManager->syncPermissions(
            Permission::where('guard_name', $guard)->whereIn('name', $branchManagerPermissions)->get()
        );

        $sales = Role::where('name', RoleSlug::SalesStaff->value)->firstOrFail();
        $salesPermissions = [
            'inventory.read',
            'sales.read', 'sales.create', 'sales.update',
            // erp-context/modules/purchasing/business-rules.md — Access Control:
            // "Sales Staff, Viewer: read-only" on purchasing.
            'purchasing.read',
            'crm.read', 'crm.create', 'crm.update',
            'reporting.read',
            'notifications.read',
        ];
        $sales->syncPermissions(
            Permission::where('guard_name', $guard)->whereIn('name', $salesPermissions)->get()
        );

        $warehouse = Role::where('name', RoleSlug::WarehouseStaff->value)->firstOrFail();
        $warehousePermissions = [
            'inventory.read', 'inventory.create', 'inventory.update', 'inventory.adjust', 'inventory.transfer',
            'purchasing.read', 'purchasing.create', 'purchasing.update',
            'reporting.read',
            'notifications.read',
        ];
        $warehouse->syncPermissions(
            Permission::where('guard_name', $guard)->whereIn('name', $warehousePermissions)->get()
        );

        $accountant = Role::where('name', RoleSlug::Accountant->value)->firstOrFail();
        $accountantPermissions = [
            'accounting.read', 'accounting.create', 'accounting.update',
            'accounting.approve', 'accounting.post_journal', 'accounting.reverse_journal',
            'sales.read',
            'purchasing.read', 'purchasing.approve',
            'reporting.read', 'reporting.export',
            'audit_logs.read',
            'notifications.read',
        ];
        $accountant->syncPermissions(
            Permission::where('guard_name', $guard)->whereIn('name', $accountantPermissions)->get()
        );

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->command?->info('Seeded '.count($allPermissions).' permissions and '.count(RoleSlug::cases()).' roles.');
    }
}
