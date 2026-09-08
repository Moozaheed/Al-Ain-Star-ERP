<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Models;

use App\Modules\Admin\Models\Branch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Composite primary key (branch_id, part_id) — no `id` column. Eloquent
 * assumes a single `id` key, so ->save()/->update() on an instance builds a
 * broken "WHERE id = null" query. Read through this model freely (the
 * branchStock relation, etc.); every write in this codebase goes through
 * DB::table('branch_stock') instead (InvoiceService, PurchaseInvoiceService,
 * PurchaseReturnService, PartController::updateBinLocation).
 */
class BranchStock extends Model
{
    public $timestamps = false;

    protected $table = 'branch_stock';

    protected $fillable = ['branch_id', 'part_id', 'qty_on_hand', 'bin_location'];

    protected $casts = ['qty_on_hand' => 'integer'];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }
}
