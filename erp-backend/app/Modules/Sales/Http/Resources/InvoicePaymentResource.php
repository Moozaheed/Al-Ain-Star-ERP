<?php

declare(strict_types=1);

namespace App\Modules\Sales\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoicePaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'invoice_id'        => $this->invoice_id,
            'invoice_number'    => $this->invoice?->invoice_number,
            'amount'            => (float) $this->amount,
            'payment_mode'      => $this->payment_mode,
            'payment_date'      => $this->payment_date?->toDateString(),
            'reference'         => $this->reference,
            'received_by_name'  => $this->receivedBy?->name,
            'notes'             => $this->notes,
            'invoice_amount_due'=> $this->invoice ? (float) $this->invoice->amount_due : null,
        ];
    }
}
