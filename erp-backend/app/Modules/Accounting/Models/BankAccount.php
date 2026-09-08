<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Models;

use App\Modules\Admin\Models\Branch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BankAccount extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'branch_id',
        'account_name',
        'bank_name',
        'iban',
        'currency',
        'coa_account_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function coaAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'coa_account_id');
    }

    public function reconciliations(): HasMany
    {
        return $this->hasMany(BankReconciliation::class);
    }
}
