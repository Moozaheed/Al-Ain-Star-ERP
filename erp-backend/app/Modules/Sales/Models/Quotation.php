<?php

declare(strict_types=1);

namespace App\Modules\Sales\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quotation extends Model
{
    protected $fillable = [
        'branch_id', 'customer_id', 'customer_name', 'quotation_number',
        'lpo_number', 'ref_number', 'channel', 'status', 'expires_at',
        'subtotal', 'discount_amount', 'vat_amount', 'total', 'notes', 'created_by',
    ];

    protected $casts = ['expires_at' => 'date'];

    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function items(): HasMany { return $this->hasMany(QuotationItem::class)->orderBy('sort_order'); }
    public function createdBy(): BelongsTo { return $this->belongsTo(\App\Modules\Admin\Models\User::class, 'created_by'); }
}
