<?php

declare(strict_types=1);

namespace App\Enums;

enum RoleSlug: string
{
    case SuperAdmin = 'super_admin';
    case Manager = 'manager';
    case BranchManager = 'branch_manager';
    case SalesStaff = 'sales_staff';
    case WarehouseStaff = 'warehouse_staff';
    case Accountant = 'accountant';
    case Viewer = 'viewer';

    /**
     * All role slugs as a flat list.
     *
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $case): string => $case->value, self::cases());
    }

    /**
     * Human-readable label for the role.
     */
    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Super Admin',
            self::Manager => 'Manager',
            self::BranchManager => 'Branch Manager',
            self::SalesStaff => 'Sales Staff',
            self::WarehouseStaff => 'Warehouse Staff',
            self::Accountant => 'Accountant',
            self::Viewer => 'Viewer',
        };
    }

    /**
     * True when the role bypasses branch scoping.
     */
    public function bypassesBranchScope(): bool
    {
        return match ($this) {
            self::SuperAdmin, self::Manager => true,
            default => false,
        };
    }
}
