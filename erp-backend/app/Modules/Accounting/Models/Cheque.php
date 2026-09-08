<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Models;

use App\Modules\Admin\Models\Branch;
use App\Modules\Admin\Models\User;
use App\Modules\Crm\Models\Supplier;
use App\Modules\Sales\Models\Customer;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Cheque extends Model
{
    protected $fillable = [
        'branch_id',
        'direction',
        'cheque_number',
        'bank_name',
        'amount',
        'due_date',
        'status',
        'linked_to_type',
        'linked_to_id',
        'customer_id',
        'supplier_id',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'due_date' => 'date',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
