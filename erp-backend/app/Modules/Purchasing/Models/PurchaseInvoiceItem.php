<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Models;

use App\Modules\Inventory\Models\Part;
use App\Modules\Inventory\Models\StockEntry;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseInvoiceItem extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'purchase_invoice_id',
        'part_id',
        'description',
        'qty',
        'unit_cost',
        'vat_rate',
        'line_subtotal',
        'line_vat',
        'line_total',
        'stock_entry_id',
    ];

    public function purchaseInvoice(): BelongsTo
    {
        return $this->belongsTo(PurchaseInvoice::class);
    }

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }

    public function stockEntry(): BelongsTo
    {
        return $this->belongsTo(StockEntry::class);
    }
}
