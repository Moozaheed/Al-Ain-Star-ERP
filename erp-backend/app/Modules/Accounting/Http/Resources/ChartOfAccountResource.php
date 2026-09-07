<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Http\Resources;

use App\Modules\Accounting\Models\ChartOfAccount;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ChartOfAccount
 */
class ChartOfAccountResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'type' => $this->type?->value,
            'subtype' => $this->subtype,
            'is_system' => (bool) $this->is_system,
            'is_active' => (bool) $this->is_active,
            'parent_id' => $this->parent_id,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
