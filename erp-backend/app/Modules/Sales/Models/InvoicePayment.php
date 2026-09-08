<?php

declare(strict_types=1);

namespace App\Modules\Sales\Models;

use App\Modules\Admin\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoicePayment extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'invoice_id',
        'amount',
        'payment_mode',
        'payment_date',
        'reference',
        'received_by',
        'notes',
    ];

    protected $casts = [
        'payment_date' => 'date',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }
}
