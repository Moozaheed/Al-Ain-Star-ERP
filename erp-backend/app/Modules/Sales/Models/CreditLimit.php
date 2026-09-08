<?php

declare(strict_types=1);

namespace App\Modules\Sales\Models;

use App\Modules\Admin\Models\Branch;
use App\Modules\Admin\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CreditLimit extends Model
{
    public $timestamps = false;

    protected $fillable = ['customer_id', 'branch_id', 'credit_limit', 'credit_used', 'set_by'];

    protected $casts = ['credit_limit' => 'float', 'credit_used' => 'float'];

    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
    public function setBy(): BelongsTo { return $this->belongsTo(User::class, 'set_by'); }
}
