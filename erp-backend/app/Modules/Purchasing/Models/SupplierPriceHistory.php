<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Models;

use App\Modules\Crm\Models\Supplier;
use App\Modules\Inventory\Models\Part;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierPriceHistory extends Model
{
    const UPDATED_AT = null;

    protected $table = 'supplier_price_history';

    protected $fillable = [
        'supplier_id',
        'part_id',
        'unit_cost',
        'currency',
        'effective_date',
        'source_invoice_id',
    ];

    protected $casts = [
        'effective_date' => 'date',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }
}
