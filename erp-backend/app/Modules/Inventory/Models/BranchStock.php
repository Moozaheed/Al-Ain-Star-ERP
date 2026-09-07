<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Models;

use App\Modules\Admin\Models\Branch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BranchStock extends Model
{
    public $timestamps = false;

    protected $table = 'branch_stock';

    protected $fillable = ['branch_id', 'part_id', 'qty_on_hand'];

    protected $casts = ['qty_on_hand' => 'integer'];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }
}
