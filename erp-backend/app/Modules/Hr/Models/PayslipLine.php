<?php

declare(strict_types=1);

namespace App\Modules\Hr\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayslipLine extends Model
{
    public $timestamps = false;

    protected $fillable = ['payslip_id', 'type', 'label', 'amount'];

    protected $casts = ['amount' => 'float'];

    public function payslip(): BelongsTo
    {
        return $this->belongsTo(Payslip::class);
    }
}
