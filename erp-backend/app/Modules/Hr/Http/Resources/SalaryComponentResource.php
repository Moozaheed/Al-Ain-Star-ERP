<?php

declare(strict_types=1);

namespace App\Modules\Hr\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SalaryComponentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'employee_id' => $this->employee_id,
            'type' => $this->type,
            'name' => $this->name,
            'amount' => (float) $this->amount,
            'is_recurring' => (bool) $this->is_recurring,
            'is_active' => (bool) $this->is_active,
            'created_by_name' => $this->createdBy?->name,
        ];
    }
}
