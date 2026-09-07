<?php

declare(strict_types=1);

namespace App\Modules\Crm\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SupplierResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'name'               => $this->name,
            'trade_name'         => $this->trade_name,
            'phone'              => $this->phone,
            'email'              => $this->email,
            'trn'                => $this->trn,
            'address'            => $this->address,
            'payment_terms_days' => $this->payment_terms_days,
            'is_active'          => $this->is_active,
        ];
    }
}
