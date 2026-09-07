<?php

declare(strict_types=1);

namespace App\Modules\Sales\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuotationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'quotation_number' => $this->quotation_number,
            'lpo_number'       => $this->lpo_number,
            'ref_number'       => $this->ref_number,
            'branch_id'        => $this->branch_id,
            'customer_id'      => $this->customer_id,
            'customer_name'    => $this->customer?->name ?? $this->customer_name,
            'channel'          => $this->channel,
            'status'           => $this->status,
            'expires_at'       => $this->expires_at?->toDateString(),
            'subtotal'         => (float) $this->subtotal,
            'discount_amount'  => (float) $this->discount_amount,
            'vat_amount'       => (float) $this->vat_amount,
            'total'            => (float) $this->total,
            'notes'            => $this->notes,
            'created_at'       => $this->created_at?->toDateString(),
            'items'            => $this->whenLoaded('items', fn () =>
                $this->items->map(fn ($i) => [
                    'id'          => $i->id,
                    'part_id'     => $i->part_id,
                    'part_number' => $i->part?->part_number,
                    'description' => $i->description ?? $i->part?->description,
                    'qty'         => $i->qty,
                    'unit_price'  => (float) $i->unit_price,
                    'discount_pct'=> (float) $i->discount_pct,
                    'line_total'  => (float) $i->line_total,
                ])
            ),
        ];
    }
}
