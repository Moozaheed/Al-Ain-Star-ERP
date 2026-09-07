<?php

declare(strict_types=1);

namespace App\Modules\Sales\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CreditLimit extends Model
{
    public $timestamps = false;

    protected $fillable = ['customer_id', 'branch_id', 'credit_limit', 'credit_used', 'set_by'];

    protected $casts = ['credit_limit' => 'float', 'credit_used' => 'float'];

    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
}
