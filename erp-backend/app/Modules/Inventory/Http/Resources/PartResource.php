<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PartResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'part_number'   => $this->part_number,
            'description'   => $this->description,
            'barcode'       => $this->barcode,
            'image_url'     => $this->imageUrl(),
            'category_id'   => $this->category_id,
            'category_name' => $this->category?->name,
            'brand_id'      => $this->brand_id,
            'brand_name'    => $this->brand?->name,
            'unit_id'       => $this->unit_id,
            'unit_name'     => $this->unit?->name,
            'unit_abbreviation' => $this->unit?->abbreviation,
            'min_stock_qty' => $this->min_stock_qty,
            'is_active'     => $this->is_active,
            'is_flagged'    => $this->is_flagged,
            'flag_reason'   => $this->flag_reason,
            'total_stock'   => $this->whenLoaded('branchStock',
                fn () => $this->branchStock->sum('qty_on_hand')
            ),
            'stock_by_branch' => $this->whenLoaded('branchStock', function () {
                return $this->branchStock->map(fn ($s) => [
                    'branch_id'   => $s->branch_id,
                    'branch_name' => $s->branch?->name,
                    'qty_on_hand' => $s->qty_on_hand,
                ]);
            }),
            'is_low_stock' => $this->whenLoaded('branchStock',
                fn () => $this->branchStock->sum('qty_on_hand') < $this->min_stock_qty
            ),
            'created_at' => $this->created_at?->toDateString(),
        ];
    }
}
