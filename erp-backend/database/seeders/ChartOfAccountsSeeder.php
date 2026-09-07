<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AccountType;
use App\Modules\Accounting\Models\ChartOfAccount;
use Illuminate\Database\Seeder;

class ChartOfAccountsSeeder extends Seeder
{
    /**
     * UAE-appropriate chart of accounts (~30 accounts).
     *
     * @var array<int, array<string, mixed>>
     */
    private array $accounts = [
        // Current Assets (1000-1499)
        ['code' => '1000', 'name' => 'Cash on Hand', 'type' => AccountType::Asset, 'subtype' => 'current_asset', 'is_system' => true],
        ['code' => '1010', 'name' => 'Petty Cash', 'type' => AccountType::Asset, 'subtype' => 'current_asset', 'is_system' => true],
        ['code' => '1020', 'name' => 'Bank - Current Account (AED)', 'type' => AccountType::Asset, 'subtype' => 'bank', 'is_system' => true],
        ['code' => '1030', 'name' => 'Bank - Savings Account (AED)', 'type' => AccountType::Asset, 'subtype' => 'bank', 'is_system' => false],
        ['code' => '1100', 'name' => 'Accounts Receivable', 'type' => AccountType::Asset, 'subtype' => 'receivable', 'is_system' => true],
        ['code' => '1110', 'name' => 'Allowance for Doubtful Accounts', 'type' => AccountType::Asset, 'subtype' => 'receivable', 'is_system' => false],
        ['code' => '1200', 'name' => 'Inventory - Auto Parts', 'type' => AccountType::Asset, 'subtype' => 'inventory', 'is_system' => true],
        ['code' => '1210', 'name' => 'Inventory - Goods in Transit', 'type' => AccountType::Asset, 'subtype' => 'inventory', 'is_system' => false],
        ['code' => '1300', 'name' => 'Prepaid Expenses', 'type' => AccountType::Asset, 'subtype' => 'prepaid', 'is_system' => false],
        ['code' => '1310', 'name' => 'VAT Input (Recoverable)', 'type' => AccountType::Asset, 'subtype' => 'tax', 'is_system' => true],

        // Fixed Assets (1500-1999)
        ['code' => '1500', 'name' => 'Furniture and Fixtures', 'type' => AccountType::Asset, 'subtype' => 'fixed_asset', 'is_system' => false],
        ['code' => '1510', 'name' => 'Office Equipment', 'type' => AccountType::Asset, 'subtype' => 'fixed_asset', 'is_system' => false],
        ['code' => '1520', 'name' => 'Vehicles', 'type' => AccountType::Asset, 'subtype' => 'fixed_asset', 'is_system' => false],
        ['code' => '1590', 'name' => 'Accumulated Depreciation', 'type' => AccountType::Asset, 'subtype' => 'fixed_asset', 'is_system' => false],

        // Current Liabilities (2000-2499)
        ['code' => '2000', 'name' => 'Accounts Payable', 'type' => AccountType::Liability, 'subtype' => 'payable', 'is_system' => true],
        ['code' => '2100', 'name' => 'VAT Output (Payable)', 'type' => AccountType::Liability, 'subtype' => 'tax', 'is_system' => true],
        ['code' => '2110', 'name' => 'VAT Payable to FTA', 'type' => AccountType::Liability, 'subtype' => 'tax', 'is_system' => true],
        ['code' => '2200', 'name' => 'Accrued Expenses', 'type' => AccountType::Liability, 'subtype' => 'accrued', 'is_system' => false],
        ['code' => '2210', 'name' => 'Salaries Payable', 'type' => AccountType::Liability, 'subtype' => 'accrued', 'is_system' => false],
        ['code' => '2300', 'name' => 'Corporate Tax Payable', 'type' => AccountType::Liability, 'subtype' => 'tax', 'is_system' => true],

        // Equity (3000-3999)
        ['code' => '3000', 'name' => 'Share Capital', 'type' => AccountType::Equity, 'subtype' => 'capital', 'is_system' => true],
        ['code' => '3100', 'name' => 'Retained Earnings', 'type' => AccountType::Equity, 'subtype' => 'retained', 'is_system' => true],
        ['code' => '3200', 'name' => 'Current Year Earnings', 'type' => AccountType::Equity, 'subtype' => 'retained', 'is_system' => true],

        // Revenue (4000-4999)
        ['code' => '4000', 'name' => 'Sales Revenue - Retail', 'type' => AccountType::Revenue, 'subtype' => 'operating_revenue', 'is_system' => true],
        ['code' => '4010', 'name' => 'Sales Revenue - B2B', 'type' => AccountType::Revenue, 'subtype' => 'operating_revenue', 'is_system' => true],
        ['code' => '4020', 'name' => 'Sales Revenue - Online', 'type' => AccountType::Revenue, 'subtype' => 'operating_revenue', 'is_system' => true],
        ['code' => '4100', 'name' => 'Sales Returns and Allowances', 'type' => AccountType::Revenue, 'subtype' => 'contra_revenue', 'is_system' => true],
        ['code' => '4200', 'name' => 'Sales Discounts', 'type' => AccountType::Revenue, 'subtype' => 'contra_revenue', 'is_system' => false],

        // COGS (5000-5499)
        ['code' => '5000', 'name' => 'Cost of Goods Sold', 'type' => AccountType::Expense, 'subtype' => 'cogs', 'is_system' => true],
        ['code' => '5100', 'name' => 'Inventory Adjustments', 'type' => AccountType::Expense, 'subtype' => 'cogs', 'is_system' => false],

        // Operating Expenses (6000-6999)
        ['code' => '6000', 'name' => 'Salaries and Wages', 'type' => AccountType::Expense, 'subtype' => 'operating_expense', 'is_system' => false],
        ['code' => '6100', 'name' => 'Rent Expense', 'type' => AccountType::Expense, 'subtype' => 'operating_expense', 'is_system' => false],
        ['code' => '6200', 'name' => 'Utilities Expense', 'type' => AccountType::Expense, 'subtype' => 'operating_expense', 'is_system' => false],
        ['code' => '6300', 'name' => 'Office Supplies', 'type' => AccountType::Expense, 'subtype' => 'operating_expense', 'is_system' => false],
        ['code' => '6400', 'name' => 'Marketing and Advertising', 'type' => AccountType::Expense, 'subtype' => 'operating_expense', 'is_system' => false],
        ['code' => '6500', 'name' => 'Bank Charges', 'type' => AccountType::Expense, 'subtype' => 'operating_expense', 'is_system' => false],
        ['code' => '6600', 'name' => 'Depreciation Expense', 'type' => AccountType::Expense, 'subtype' => 'operating_expense', 'is_system' => false],
    ];

    public function run(): void
    {
        foreach ($this->accounts as $account) {
            ChartOfAccount::updateOrCreate(
                ['code' => $account['code']],
                [
                    'name' => $account['name'],
                    'type' => $account['type']->value,
                    'subtype' => $account['subtype'] ?? null,
                    'is_system' => $account['is_system'] ?? false,
                    'is_active' => true,
                    'parent_id' => null,
                ]
            );
        }

        $this->command?->info('Seeded '.count($this->accounts).' chart of accounts.');
    }
}
