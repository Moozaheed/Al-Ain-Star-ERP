<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Removes exactly what DemoDataSeeder created — nothing else. Every removal
 * is scoped to the exact identifiers the seeder used (the "Demo Branch",
 * the fixed DEMO-INV and DEMO-QUOT ref numbers, a fixed customer-name list)
 * and the part cleanup step additionally checks the part isn't referenced
 * by any invoice/quotation/purchase outside of what this command itself
 * removes first — since the demo intentionally reused real part numbers
 * from the client's old system for authenticity, this guards against ever
 * deleting a part that's since seen real business use under the same number.
 */
class CleanupDemoData extends Command
{
    protected $signature = 'demo:cleanup {--force : Skip the confirmation prompt}';

    protected $description = 'Remove the temporary demo data added by DemoDataSeeder';

    private const PART_NUMBERS = [
        '4612303W1A', '0081380019', '0122500203', '0155800511', '0211707023',
        '044650K090', '0446530500', '0446533480', '0446533490', '0446560320',
        '0882380250', '0888083223', '0888083224', 'ATF-MATIC-D',
    ];

    private const CUSTOMER_NAMES = [
        'Saleh Al Hamadi Garage',
        'Super Alain Auto New Spare Parts Trading LLC',
        'Al Aksa Auto Parts Trading LLC',
        'Hasan Vai',
    ];

    private const INVOICE_REFS = ['DEMO-INV-1', 'DEMO-INV-2', 'DEMO-INV-3', 'DEMO-INV-4', 'DEMO-INV-5'];

    private const QUOTATION_REF = 'DEMO-QUOT-1';

    public function handle(): int
    {
        if (! $this->option('force') && ! $this->confirm('This removes the demo branch, demo parts/customers/invoices/quotations. Continue?')) {
            return self::SUCCESS;
        }

        $branch = DB::table('branches')->where('code', 'DEMO')->first();

        DB::transaction(function () use ($branch) {
            $this->removeInvoices();
            $this->removeQuotations();

            if ($branch !== null) {
                DB::table('stock_entries')->where('branch_id', $branch->id)->delete();
                DB::table('branch_stock')->where('branch_id', $branch->id)->delete();
            }

            $this->removeCustomers();
            $this->removePartsIfUnreferenced();

            if ($branch !== null) {
                DB::table('branches')->where('id', $branch->id)->delete();
                $this->info("Removed Demo Branch (id {$branch->id}).");
            }
        });

        $this->info('Demo data cleanup complete.');

        return self::SUCCESS;
    }

    private function removeInvoices(): void
    {
        $invoiceIds = DB::table('invoices')->whereIn('ref_number', self::INVOICE_REFS)->pluck('id');

        if ($invoiceIds->isEmpty()) {
            return;
        }

        $journalEntryIds = DB::table('journal_entries')
            ->where('source_type', 'invoice')->whereIn('source_id', $invoiceIds)->pluck('id');
        DB::table('journal_lines')->whereIn('journal_entry_id', $journalEntryIds)->delete();
        DB::table('journal_entries')->whereIn('id', $journalEntryIds)->delete();

        DB::table('invoice_items')->whereIn('invoice_id', $invoiceIds)->delete();
        DB::table('invoices')->whereIn('id', $invoiceIds)->delete();

        $this->info("Removed {$invoiceIds->count()} demo invoice(s) and their ledger entries.");
    }

    private function removeQuotations(): void
    {
        $quotationIds = DB::table('quotations')->where('ref_number', self::QUOTATION_REF)->pluck('id');

        if ($quotationIds->isEmpty()) {
            return;
        }

        DB::table('quotation_items')->whereIn('quotation_id', $quotationIds)->delete();
        DB::table('quotations')->whereIn('id', $quotationIds)->delete();

        $this->info("Removed {$quotationIds->count()} demo quotation(s).");
    }

    private function removeCustomers(): void
    {
        $removed = 0;
        foreach (self::CUSTOMER_NAMES as $name) {
            $customer = DB::table('customers')->where('name', $name)->first();
            if ($customer === null) {
                continue;
            }

            $stillReferenced = DB::table('invoices')->where('customer_id', $customer->id)->exists()
                || DB::table('quotations')->where('customer_id', $customer->id)->exists();

            if ($stillReferenced) {
                $this->warn("Skipped customer \"{$name}\" — still has non-demo invoices/quotations.");
                continue;
            }

            DB::table('customers')->where('id', $customer->id)->delete();
            $removed++;
        }

        // CASH CUSTOMER predates this seeder (CashCustomerSeeder) — never remove it.
        $this->info("Removed {$removed} demo customer(s).");
    }

    private function removePartsIfUnreferenced(): void
    {
        $removed = 0;
        foreach (self::PART_NUMBERS as $number) {
            $part = DB::table('parts')->where('part_number', $number)->first();
            if ($part === null) {
                continue;
            }

            $stillReferenced = DB::table('invoice_items')->where('part_id', $part->id)->exists()
                || DB::table('quotation_items')->where('part_id', $part->id)->exists()
                || DB::table('stock_entries')->where('part_id', $part->id)->exists()
                || DB::table('branch_stock')->where('part_id', $part->id)->exists()
                || DB::table('purchase_invoice_items')->where('part_id', $part->id)->exists();

            if ($stillReferenced) {
                $this->warn("Skipped part \"{$number}\" — still referenced elsewhere (real use since the demo?).");
                continue;
            }

            DB::table('parts')->where('id', $part->id)->delete();
            $removed++;
        }

        $this->info("Removed {$removed} demo part(s).");
    }
}
