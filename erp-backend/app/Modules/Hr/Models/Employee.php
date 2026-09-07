<?php
declare(strict_types=1);
namespace App\Modules\Hr\Models;

use App\Modules\Admin\Models\Branch;
use App\Modules\Admin\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'branch_id', 'name', 'employee_number', 'designation',
        'phone', 'email', 'nationality', 'join_date', 'end_date',
        'basic_salary', 'is_active',
    ];

    protected $casts = [
        'join_date'    => 'date',
        'end_date'     => 'date',
        'is_active'    => 'boolean',
        'basic_salary' => 'float',
    ];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
    public function documents(): HasMany { return $this->hasMany(EmployeeDocument::class)->orderBy('expiry_date'); }
    public function expenseClaims(): HasMany { return $this->hasMany(ExpenseClaim::class)->orderByDesc('claim_date'); }
    public function salesTargets(): HasMany { return $this->hasMany(SalesTarget::class)->orderByDesc('period_year')->orderByDesc('period_month'); }
}
