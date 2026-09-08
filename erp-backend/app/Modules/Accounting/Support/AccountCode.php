<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Support;

/**
 * Chart-of-accounts codes referenced by automatic journal posting
 * (LedgerPostingService), matching the codes seeded by ChartOfAccountsSeeder.
 */
final class AccountCode
{
    public const CASH = '1000';
    public const BANK = '1020';
    public const CHEQUES_RECEIVABLE = '1040';
    public const ACCOUNTS_RECEIVABLE = '1100';
    public const INVENTORY = '1200';
    public const VAT_INPUT = '1310';
    public const ACCOUNTS_PAYABLE = '2000';
    public const CHEQUES_PAYABLE = '2050';
    public const VAT_OUTPUT = '2100';
    public const SALES_RETAIL = '4000';
    public const SALES_B2B = '4010';
    public const SALES_ONLINE = '4020';
    public const COGS = '5000';
    public const SALARIES_PAYABLE = '2210';
    public const SALARIES_EXPENSE = '6000';
}
