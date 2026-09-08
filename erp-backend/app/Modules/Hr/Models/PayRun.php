<?php

declare(strict_types=1);

namespace App\Modules\Hr\Models;

use App\Modules\Admin\Models\Branch;
use App\Modules\Admin\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayRun extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'branch_id', 'period_month', 'period_year', 'status', 'total_net_pay',
        'created_by', 'approved_by', 'approved_at', 'paid_at',
    ];

    protected $casts = [
        'total_net_pay' => 'float',
        'approved_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
