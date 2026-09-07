<?php

declare(strict_types=1);

namespace App\Modules\Sales\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'invoice_number' => $this->invoice_number,
            'lpo_number'     => $this->lpo_number,
            'ref_number'     => $this->ref_number,
            'branch_id'      => $this->branch_id,
            'customer_id'    => $this->customer_id,
            'customer_name'  => $this->customer?->name ?? $this->customer_name,
            'customer_trn'   => $this->customer?->trn,
            'channel'        => $this->channel,
            'payment_mode'   => $this->payment_mode,
            'status'         => $this->status,
            'invoice_date'   => $this->invoice_date?->toDateString(),
            'due_date'       => $this->due_date?->toDateString(),
            'subtotal'       => (float) $this->subtotal,
            'discount_amount'=> (float) $this->discount_amount,
            'vat_amount'     => (float) $this->vat_amount,
            'total'          => (float) $this->total,
            'amount_paid'    => (float) $this->amount_paid,
            'amount_due'     => (float) $this->amount_due,
            'notes'          => $this->notes,
            'void_reason'    => $this->void_reason,
            'created_by_name'=> $this->createdBy?->name,
            'items'          => $this->whenLoaded('items', fn () =>
                $this->items->map(fn ($i) => [
                    'id'           => $i->id,
                    'part_id'      => $i->part_id,
                    'part_number'  => $i->part?->part_number,
                    'description'  => $i->description ?? $i->part?->description,
                    'qty'          => $i->qty,
                    'unit_price'   => (float) $i->unit_price,
                    'discount_pct' => (float) $i->discount_pct,
                    'vat_rate'     => (float) $i->vat_rate,
                    'line_subtotal'=> (float) $i->line_subtotal,
                    'line_vat'     => (float) $i->line_vat,
                    'line_total'   => (float) $i->line_total,
                ])
            ),
        ];
    }
}
