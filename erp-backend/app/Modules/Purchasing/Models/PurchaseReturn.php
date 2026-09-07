<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Models;

use App\Modules\Admin\Models\Branch;
use App\Modules\Admin\Models\User;
use App\Modules\Crm\Models\Supplier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseReturn extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'branch_id',
        'purchase_invoice_id',
        'supplier_id',
        'debit_note_number',
        'return_date',
        'reason',
        'subtotal',
        'vat_amount',
        'total',
        'status',
        'created_by',
    ];

    protected $casts = [
        'return_date' => 'date',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function purchaseInvoice(): BelongsTo
    {
        return $this->belongsTo(PurchaseInvoice::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseReturnItem::class, 'return_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
