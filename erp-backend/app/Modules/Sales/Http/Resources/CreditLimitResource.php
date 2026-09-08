<?php

declare(strict_types=1);

namespace App\Modules\Sales\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CreditLimitResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'customer_id'   => $this->customer_id,
            'branch_id'     => $this->branch_id,
            'branch_name'   => $this->branch?->name,
            'credit_limit'  => (float) $this->credit_limit,
            'credit_used'   => (float) $this->credit_used,
            'credit_available' => (float) $this->credit_limit - (float) $this->credit_used,
            'set_by_name'   => $this->setBy?->name,
        ];
    }
}
