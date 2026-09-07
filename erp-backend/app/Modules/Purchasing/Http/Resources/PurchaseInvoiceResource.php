<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseInvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'invoice_number'       => $this->invoice_number,
            'supplier_invoice_ref' => $this->supplier_invoice_ref,
            'branch_id'            => $this->branch_id,
            'supplier_id'          => $this->supplier_id,
            'supplier_name'        => $this->supplier?->name,
            'payment_mode'         => $this->payment_mode,
            'status'               => $this->status,
            'invoice_date'         => $this->invoice_date?->toDateString(),
            'due_date'             => $this->due_date?->toDateString(),
            'subtotal'             => (float) $this->subtotal,
            'vat_amount'           => (float) $this->vat_amount,
            'total'                => (float) $this->total,
            'amount_paid'          => (float) $this->amount_paid,
            'amount_due'           => (float) $this->amount_due,
            'notes'                => $this->notes,
            'created_by_name'      => $this->createdBy?->name,
            'items'                => $this->whenLoaded('items', fn () => $this->items->map(fn ($i) => [
                'id'            => $i->id,
                'part_id'       => $i->part_id,
                'part_number'   => $i->part?->part_number,
                'description'   => $i->description ?? $i->part?->description,
                'qty'           => $i->qty,
                'unit_cost'     => (float) $i->unit_cost,
                'vat_rate'      => (float) $i->vat_rate,
                'line_subtotal' => (float) $i->line_subtotal,
                'line_vat'      => (float) $i->line_vat,
                'line_total'    => (float) $i->line_total,
            ])),
        ];
    }
}
