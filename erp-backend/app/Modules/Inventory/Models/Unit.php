<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Unit extends Model
{
    use SoftDeletes;

    protected $fillable = ['name', 'abbreviation', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function parts(): HasMany
    {
        return $this->hasMany(Part::class);
    }
}
