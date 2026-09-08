<?php

declare(strict_types=1);

namespace App\Modules\Hr\Models;

use App\Modules\Admin\Models\Branch;
use App\Modules\Admin\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveRequest extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'employee_id', 'branch_id', 'leave_type', 'start_date', 'end_date', 'reason',
        'status', 'branch_approved_by', 'branch_approved_at', 'approved_by', 'approved_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'branch_approved_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    public function employee(): BelongsTo { return $this->belongsTo(Employee::class); }
    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
    public function branchApprovedBy(): BelongsTo { return $this->belongsTo(User::class, 'branch_approved_by'); }
    public function approvedBy(): BelongsTo { return $this->belongsTo(User::class, 'approved_by'); }

    public function getDaysAttribute(): int
    {
        return (int) $this->start_date->diffInDays($this->end_date) + 1;
    }
}
