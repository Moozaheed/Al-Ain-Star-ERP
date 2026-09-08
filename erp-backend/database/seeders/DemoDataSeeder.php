<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Admin\Models\Branch;
use App\Modules\Admin\Models\User;
use App\Modules\Inventory\Models\Brand;
use App\Modules\Inventory\Models\Category;
use App\Modules\Inventory\Models\Part;
use App\Modules\Inventory\Models\Unit;
use App\Modules\Sales\Models\Customer;
use App\Modules\Sales\Models\Invoice;
use App\Modules\Sales\Models\Quotation;
use App\Modules\Sales\Services\InvoiceService;
use App\Modules\Sales\Services\QuotationService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * TEMPORARY demo data for a client walkthrough — based on real product and
 * transaction data from the client's own previous system
 * (`old_system_data/`, see `erp-context/documents/legacy-system-gap-analysis.md`).
 *
 * Not called from DatabaseSeeder on purpose — it's not part of normal app
 * bootstrap, run it explicitly: `php artisan db:seed --class=DemoDataSeeder --force`.
 *
 * Safe to run more than once: every row is created via firstOrCreate/an
 * explicit existence check keyed on a unique field, so re-running never
 * duplicates anything or touches unrelated data.
 *
 * TO REMOVE AFTER THE DEMO: `php artisan demo:cleanup` (app/Console/Commands/
 * CleanupDemoData.php) deletes exactly what this seeder created — the
 * "Demo Branch" (code DEMO) and every part/customer/invoice/quotation this
 * file names below — nothing else.
 */
class DemoDataSeeder extends Seeder
{
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

    public function run(): void
    {
        $branch = Branch::firstOrCreate(
            ['code' => 'DEMO'],
            ['name' => 'Demo Branch', 'address' => 'Sanaiya, Al Ain, UAE', 'is_active' => true],
        );

        $category = Category::firstOrCreate(['name' => 'Engine Oil & Fluids'], ['is_active' => true]);
        $categoryBrakes = Category::firstOrCreate(['name' => 'Brake & Chassis'], ['is_active' => true]);
        $categoryGeneral = Category::firstOrCreate(['name' => 'General Hardware'], ['is_active' => true]);
        $brand = Brand::firstOrCreate(['name' => 'Toyota / Lexus'], ['is_active' => true]);
        $unitPiece = Unit::firstOrCreate(['name' => 'Piece'], ['abbreviation' => 'pc']);
        $unitLiter = Unit::firstOrCreate(['name' => 'Liter'], ['abbreviation' => 'L']);

        $parts = $this->seedParts($category, $categoryBrakes, $categoryGeneral, $brand, $unitPiece, $unitLiter);
        $this->seedStock($branch, $parts);
        $customers = $this->seedCustomers($branch);
        $this->seedQuotation($branch, $customers, $parts);
        $this->seedInvoices($branch, $customers, $parts);

        $this->command?->info('Demo data seeded — branch "Demo Branch" (DEMO), '.count($parts).' parts, '.count($customers).' customers.');
    }

    /**
     * @return array<string, Part>  keyed by part_number
     */
    private function seedParts(Category $engineOil, Category $brakes, Category $general, Brand $brand, Unit $piece, Unit $liter): array
    {
        // [part_number, description, category, unit, min_stock_qty, list_price]
        $rows = [
            ['4612303W1A', 'Pin Clevis', $general, $piece, 5, 8.00],
            ['0081380019', 'Injector Cleaner', $general, $piece, 5, 95.00],
            ['0122500203', 'Nut', $general, $piece, 20, 3.00],
            ['0155800511', 'Clamp Hose', $general, $piece, 10, 8.50],
            ['0211707023', 'Fan Belt', $general, $piece, 10, 32.00],
            ['044650K090', 'Brake Pad FR', $brakes, $piece, 4, 260.00],
            ['0446530500', 'Pad Kit, Disc Brake', $brakes, $piece, 3, 420.00],
            ['0446533480', 'Pad Kit, Disc Brake', $brakes, $piece, 5, 250.00],
            ['0446533490', 'Pad Kit, Disc Brake', $brakes, $piece, 10, 280.00],
            ['0446560320', 'Pad Kit, Brake', $brakes, $piece, 5, 265.00],
            ['0882380250', 'Brake Fluid', $brakes, $liter, 30, 24.00],
            ['0888083223', 'Engine Oil SL/CF 1L', $engineOil, $liter, 20, 19.00],
            ['0888083224', 'Engine Oil SL/CF 4L', $engineOil, $liter, 20, 72.00],
            ['ATF-MATIC-D', 'ATF Matic D', $engineOil, $liter, 20, 165.00],
        ];

        $parts = [];
        foreach ($rows as [$number, $description, $category, $unit, $minQty, $listPrice]) {
            $parts[$number] = Part::firstOrCreate(
                ['part_number' => $number],
                [
                    'description' => $description,
                    'category_id' => $category->id,
                    'brand_id' => $brand->id,
                    'unit_id' => $unit->id,
                    'min_stock_qty' => $minQty,
                    'list_price' => $listPrice,
                    'is_active' => true,
                ],
            );
        }

        return $parts;
    }

    /**
     * @param  array<string, Part>  $parts
     */
    private function seedStock(Branch $branch, array $parts): void
    {
        // [part_number, qty, unit_cost, bin_location]
        $stock = [
            ['4612303W1A', 30, 5.10, null],
            ['0081380019', 15, 72.18, '721'],
            ['0122500203', 200, 1.62, null],
            ['0155800511', 60, 5.54, null],
            ['0211707023', 66, 23.58, 'ROOF'],
            ['044650K090', 12, 195.91, 'A-44'],
            ['0446530500', 8, 320.00, null],
            ['0446533480', 20, 190.00, 'A-3'],
            ['0446533490', 30, 212.36, 'A-1'],
            ['0446560320', 15, 199.60, 'A-4'],
            ['0882380250', 200, 17.75, 'FLOOR'],
            ['0888083223', 72, 13.50, 'FLOOR'],
            ['0888083224', 100, 54.00, 'FLOOR'],
            ['ATF-MATIC-D', 100, 125.00, 'FLOOR'],
        ];

        foreach ($stock as [$number, $qty, $unitCost, $binLocation]) {
            $part = $parts[$number];

            $alreadyStocked = DB::table('stock_entries')
                ->where('branch_id', $branch->id)->where('part_id', $part->id)->exists();

            if ($alreadyStocked) {
                continue;
            }

            DB::table('stock_entries')->insert([
                'branch_id' => $branch->id,
                'part_id' => $part->id,
                'source_type' => 'adjustment',
                'received_at' => now()->subDays(30),
                'qty' => $qty,
                'remaining_qty' => $qty,
                'unit_cost' => $unitCost,
                'created_at' => now()->subDays(30),
            ]);

            $existingBranchStock = DB::table('branch_stock')
                ->where('branch_id', $branch->id)->where('part_id', $part->id)->exists();

            if ($existingBranchStock) {
                DB::table('branch_stock')->where('branch_id', $branch->id)->where('part_id', $part->id)
                    ->update(['qty_on_hand' => $qty, 'bin_location' => $binLocation, 'updated_at' => now()]);
            } else {
                DB::table('branch_stock')->insert([
                    'branch_id' => $branch->id,
                    'part_id' => $part->id,
                    'qty_on_hand' => $qty,
                    'bin_location' => $binLocation,
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * @return array<string, Customer>  keyed by name
     */
    private function seedCustomers(Branch $branch): array
    {
        $rows = [
            ['Saleh Al Hamadi Garage', 'b2b'],
            ['Super Alain Auto New Spare Parts Trading LLC', 'b2b'],
            ['Al Aksa Auto Parts Trading LLC', 'b2b'],
            ['Hasan Vai', 'retail'],
        ];

        $customers = [];
        foreach ($rows as [$name, $type]) {
            $customers[$name] = Customer::firstOrCreate(
                ['name' => $name],
                ['type' => $type, 'branch_id' => $branch->id, 'is_active' => true, 'created_from' => 'manual'],
            );
        }

        $customers['CASH CUSTOMER'] = Customer::firstOrCreate(
            ['name' => 'CASH CUSTOMER'],
            ['type' => 'retail', 'is_active' => true, 'created_from' => 'manual'],
        );

        return $customers;
    }

    /**
     * @param  array<string, Customer>  $customers
     * @param  array<string, Part>  $parts
     */
    private function seedQuotation(Branch $branch, array $customers, array $parts): void
    {
        if (Quotation::where('ref_number', self::QUOTATION_REF)->exists()) {
            return;
        }

        $admin = User::where('email', 'admin@alainstar.ae')->first();
        if ($admin === null) {
            return;
        }

        // Matches the real quotation in old_system_data/DY.pdf (Q23204).
        app(QuotationService::class)->create([
            'branch_id' => $branch->id,
            'customer_id' => $customers['CASH CUSTOMER']->id,
            'customer_name' => 'CASH CUSTOMER',
            'channel' => 'retail',
            'expires_at' => now()->addDays(14)->toDateString(),
            'ref_number' => self::QUOTATION_REF,
            'notes' => 'Demo data',
            'items' => [
                ['part_id' => $parts['ATF-MATIC-D']->id, 'qty' => 42, 'unit_price' => 125.00, 'discount_pct' => 0],
            ],
        ], $admin->id);
    }

    /**
     * @param  array<string, Customer>  $customers
     * @param  array<string, Part>  $parts
     */
    private function seedInvoices(Branch $branch, array $customers, array $parts): void
    {
        $admin = User::where('email', 'admin@alainstar.ae')->first();
        if ($admin === null) {
            return;
        }

        $invoices = [
            [self::INVOICE_REFS[0], 'CASH CUSTOMER', 'retail', 'cash', [
                ['4612303W1A', 2, 12.00], ['0122500203', 10, 4.50],
            ]],
            [self::INVOICE_REFS[1], 'Saleh Al Hamadi Garage', 'b2b', 'cash', [
                ['044650K090', 1, 260.00], ['0446533480', 1, 250.00],
            ]],
            [self::INVOICE_REFS[2], 'Super Alain Auto New Spare Parts Trading LLC', 'b2b', 'credit', [
                ['0888083223', 24, 19.00], ['0888083224', 6, 72.00],
            ]],
            [self::INVOICE_REFS[3], 'Al Aksa Auto Parts Trading LLC', 'b2b', 'card', [
                ['0882380250', 10, 24.00], ['0211707023', 3, 32.00],
            ]],
            [self::INVOICE_REFS[4], 'CASH CUSTOMER', 'retail', 'cash', [
                ['ATF-MATIC-D', 4, 165.00],
            ]],
        ];

        foreach ($invoices as [$ref, $customerName, $channel, $paymentMode, $items]) {
            if (Invoice::where('ref_number', $ref)->exists()) {
                continue;
            }

            $customer = $customers[$customerName];

            try {
                app(InvoiceService::class)->create([
                    'branch_id' => $branch->id,
                    'customer_id' => $paymentMode === 'cash' && $customerName === 'CASH CUSTOMER' ? null : $customer->id,
                    'customer_name' => $customerName,
                    'channel' => $channel,
                    'payment_mode' => $paymentMode,
                    'invoice_date' => now()->subDays(random_int(1, 10))->toDateString(),
                    'ref_number' => $ref,
                    'items' => array_map(fn ($i) => [
                        'part_id' => $parts[$i[0]]->id,
                        'qty' => $i[1],
                        'unit_price' => $i[2],
                        'discount_pct' => 0,
                    ], $items),
                ], $admin->id, true);
            } catch (\Throwable $e) {
                $this->command?->warn("Skipped demo invoice {$ref}: {$e->getMessage()}");
            }
        }
    }
}
