<?php

declare(strict_types=1);

namespace App\Modules\Hr\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payslip extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'pay_run_id', 'employee_id', 'basic_salary', 'total_allowances',
        'total_deductions', 'commission_amount', 'gross_pay', 'net_pay', 'bank_iban_snapshot',
    ];

    protected $casts = [
        'basic_salary' => 'float',
        'total_allowances' => 'float',
        'total_deductions' => 'float',
        'commission_amount' => 'float',
        'gross_pay' => 'float',
        'net_pay' => 'float',
    ];

    public function payRun(): BelongsTo
    {
        return $this->belongsTo(PayRun::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(PayslipLine::class);
    }
}
