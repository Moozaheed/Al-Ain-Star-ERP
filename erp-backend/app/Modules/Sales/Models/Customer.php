<?php

declare(strict_types=1);

namespace App\Modules\Sales\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'branch_id', 'type', 'name', 'trade_name', 'phone',
        'email', 'trn', 'address', 'is_active', 'created_from',
    ];

    protected $casts = ['is_active' => 'boolean'];

    public function invoices(): HasMany { return $this->hasMany(Invoice::class); }
    public function quotations(): HasMany { return $this->hasMany(Quotation::class); }
    public function creditLimits(): HasMany { return $this->hasMany(CreditLimit::class); }
    public function notes(): HasMany { return $this->hasMany(CustomerNote::class); }
}
