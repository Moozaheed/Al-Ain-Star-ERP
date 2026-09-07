<?php

declare(strict_types=1);

namespace App\Modules\Sales\Models;

use App\Modules\Admin\Models\Branch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    protected $fillable = [
        'branch_id', 'customer_id', 'customer_name', 'quotation_id',
        'invoice_number', 'lpo_number', 'ref_number', 'channel', 'payment_mode', 'status',
        'invoice_date', 'due_date', 'subtotal', 'discount_amount', 'vat_amount',
        'total', 'amount_paid', 'amount_due', 'notes', 'created_by',
        'voided_by', 'voided_at', 'void_reason',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date'     => 'date',
        'voided_at'    => 'datetime',
    ];

    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
    public function items(): HasMany { return $this->hasMany(InvoiceItem::class)->orderBy('sort_order'); }
    public function createdBy(): BelongsTo { return $this->belongsTo(\App\Modules\Admin\Models\User::class, 'created_by'); }
}
