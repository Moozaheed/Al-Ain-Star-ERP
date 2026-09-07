<?php

declare(strict_types=1);

namespace App\Modules\Sales\Models;

use App\Modules\Inventory\Models\Part;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuotationItem extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'quotation_id', 'part_id', 'description', 'qty',
        'unit_price', 'discount_pct', 'line_total', 'sort_order',
    ];

    protected $casts = [
        'unit_price'  => 'float',
        'discount_pct'=> 'float',
        'line_total'  => 'float',
    ];

    public function part(): BelongsTo { return $this->belongsTo(Part::class); }
}
