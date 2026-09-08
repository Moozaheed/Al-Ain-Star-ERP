<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Models;

use App\Modules\Admin\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchasePayment extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'purchase_invoice_id',
        'amount',
        'payment_mode',
        'payment_date',
        'reference',
        'paid_by',
    ];

    protected $casts = [
        'payment_date' => 'date',
    ];

    public function purchaseInvoice(): BelongsTo
    {
        return $this->belongsTo(PurchaseInvoice::class);
    }

    public function paidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }
}
