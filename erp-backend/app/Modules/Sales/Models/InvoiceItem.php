<?php

declare(strict_types=1);

namespace App\Modules\Sales\Models;

use App\Modules\Inventory\Models\Part;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceItem extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'invoice_id', 'part_id', 'description', 'qty', 'unit_price', 'unit_cost',
        'discount_pct', 'vat_rate', 'line_subtotal', 'line_vat', 'line_total', 'sort_order',
    ];

    protected $casts = [
        'unit_price'   => 'float',
        'unit_cost'    => 'float',
        'discount_pct' => 'float',
        'vat_rate'     => 'float',
        'line_subtotal'=> 'float',
        'line_vat'     => 'float',
        'line_total'   => 'float',
    ];

    public function part(): BelongsTo { return $this->belongsTo(Part::class); }
}
