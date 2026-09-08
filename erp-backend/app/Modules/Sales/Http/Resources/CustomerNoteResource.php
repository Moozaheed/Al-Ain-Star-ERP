<?php

declare(strict_types=1);

namespace App\Modules\Sales\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerNoteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'customer_id'     => $this->customer_id,
            'note'            => $this->note,
            'created_by_name' => $this->createdBy?->name,
            'created_at'      => $this->created_at?->toIso8601String(),
        ];
    }
}
