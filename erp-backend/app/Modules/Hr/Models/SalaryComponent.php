<?php

declare(strict_types=1);

namespace App\Modules\Hr\Models;

use App\Modules\Admin\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalaryComponent extends Model
{
    protected $fillable = ['employee_id', 'type', 'name', 'amount', 'is_recurring', 'is_active', 'created_by'];

    protected $casts = [
        'amount' => 'float',
        'is_recurring' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
