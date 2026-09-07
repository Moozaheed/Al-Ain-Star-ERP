<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseReturnResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'debit_note_number'    => $this->debit_note_number,
            'branch_id'            => $this->branch_id,
            'purchase_invoice_id'  => $this->purchase_invoice_id,
            'purchase_invoice_number' => $this->purchaseInvoice?->invoice_number,
            'supplier_id'          => $this->supplier_id,
            'supplier_name'        => $this->supplier?->name,
            'return_date'          => $this->return_date?->toDateString(),
            'reason'               => $this->reason,
            'subtotal'             => (float) $this->subtotal,
            'vat_amount'           => (float) $this->vat_amount,
            'total'                => (float) $this->total,
            'status'               => $this->status,
            'created_by_name'      => $this->createdBy?->name,
            'items'                => $this->whenLoaded('items', fn () => $this->items->map(fn ($i) => [
                'id'                       => $i->id,
                'purchase_invoice_item_id' => $i->purchase_invoice_item_id,
                'part_id'                  => $i->part_id,
                'part_number'              => $i->part?->part_number,
                'description'              => $i->part?->description,
                'qty'                      => $i->qty,
                'unit_cost'                => (float) $i->unit_cost,
                'line_subtotal'            => (float) $i->line_subtotal,
                'line_vat'                 => (float) $i->line_vat,
                'line_total'               => (float) $i->line_total,
            ])),
        ];
    }
}
