<?php
declare(strict_types=1);
namespace App\Modules\Hr\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesTarget extends Model
{
    protected $fillable = [
        'employee_id', 'branch_id', 'period_month', 'period_year',
        'target_amount', 'achieved_amount', 'created_by',
    ];

    protected $casts = [
        'target_amount'   => 'float',
        'achieved_amount' => 'float',
    ];

    public function employee(): BelongsTo { return $this->belongsTo(Employee::class); }

    public function getAchievementPctAttribute(): float
    {
        if ($this->target_amount <= 0) return 0;
        return round(($this->achieved_amount / $this->target_amount) * 100, 1);
    }
}
