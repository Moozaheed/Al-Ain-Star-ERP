<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChequeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'branch_id'      => $this->branch_id,
            'direction'      => $this->direction,
            'cheque_number'  => $this->cheque_number,
            'bank_name'      => $this->bank_name,
            'amount'         => (float) $this->amount,
            'due_date'       => $this->due_date?->toDateString(),
            'status'         => $this->status,
            'linked_to_type' => $this->linked_to_type,
            'linked_to_id'   => $this->linked_to_id,
            'customer_id'    => $this->customer_id,
            'customer_name'  => $this->customer?->name,
            'supplier_id'    => $this->supplier_id,
            'supplier_name'  => $this->supplier?->name,
            'notes'          => $this->notes,
            'created_by_name'=> $this->createdBy?->name,
            'created_at'     => $this->created_at?->toDateString(),
        ];
    }
}
