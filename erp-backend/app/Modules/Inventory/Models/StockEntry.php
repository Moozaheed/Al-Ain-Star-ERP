<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Models;

use App\Modules\Admin\Models\Branch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockEntry extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'branch_id',
        'part_id',
        'source_type',
        'source_id',
        'received_at',
        'qty',
        'remaining_qty',
        'unit_cost',
    ];

    protected $casts = [
        'received_at' => 'datetime',
        'unit_cost'   => 'decimal:4',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }
}
