<?php

declare(strict_types=1);

namespace App\Modules\Sales\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'type'       => $this->type,
            'name'       => $this->name,
            'trade_name' => $this->trade_name,
            'phone'      => $this->phone,
            'email'      => $this->email,
            'trn'        => $this->trn,
            'address'    => $this->address,
            'is_active'  => $this->is_active,
        ];
    }
}
