<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Models;

use App\Modules\Admin\Models\Branch;
use App\Modules\Admin\Models\User;
use App\Modules\Crm\Models\Supplier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseInvoice extends Model
{
    protected $fillable = [
        'branch_id',
        'supplier_id',
        'invoice_number',
        'supplier_invoice_ref',
        'invoice_date',
        'due_date',
        'payment_mode',
        'status',
        'subtotal',
        'vat_amount',
        'total',
        'amount_paid',
        'amount_due',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date'     => 'date',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseInvoiceItem::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
