<?php

declare(strict_types=1);

namespace App\Modules\Sales\Models;

use App\Modules\Admin\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerNote extends Model
{
    const UPDATED_AT = null;

    protected $fillable = ['customer_id', 'created_by', 'note'];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
