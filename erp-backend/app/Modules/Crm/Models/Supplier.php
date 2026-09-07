<?php

declare(strict_types=1);

namespace App\Modules\Crm\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'trade_name',
        'phone',
        'email',
        'trn',
        'address',
        'payment_terms_days',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
