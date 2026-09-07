<?php
declare(strict_types=1);
namespace App\Modules\Hr\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExpenseClaim extends Model
{
    protected $fillable = [
        'employee_id', 'branch_id', 'description',
        'amount', 'claim_date', 'status', 'receipt_path', 'approved_by',
    ];

    protected $casts = [
        'claim_date' => 'date',
        'amount'     => 'float',
    ];

    public function employee(): BelongsTo { return $this->belongsTo(Employee::class); }
    public function approvedBy(): BelongsTo { return $this->belongsTo(\App\Modules\Admin\Models\User::class, 'approved_by'); }
}
