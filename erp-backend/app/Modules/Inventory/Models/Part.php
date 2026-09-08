<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Models;

use App\Modules\Admin\Models\Branch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Part extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'part_number',
        'description',
        'barcode',
        'image_path',
        'category_id',
        'brand_id',
        'unit_id',
        'min_stock_qty',
        'list_price',
        'is_active',
        'is_flagged',
        'flag_reason',
    ];

    protected $casts = [
        'is_active'     => 'boolean',
        'is_flagged'    => 'boolean',
        'min_stock_qty' => 'integer',
        'list_price'    => 'float',
    ];

    protected $appends = ['image_url'];

    public function branchStock(): HasMany
    {
        return $this->hasMany(BranchStock::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function imageUrl(): ?string
    {
        return $this->image_path !== null ? Storage::disk('public')->url($this->image_path) : null;
    }

    protected function getImageUrlAttribute(): ?string
    {
        return $this->imageUrl();
    }
}
