<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchasePaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'purchase_invoice_id'  => $this->purchase_invoice_id,
            'invoice_number'       => $this->purchaseInvoice?->invoice_number,
            'amount'               => (float) $this->amount,
            'payment_mode'         => $this->payment_mode,
            'payment_date'         => $this->payment_date?->toDateString(),
            'reference'            => $this->reference,
            'paid_by_name'         => $this->paidBy?->name,
            'invoice_amount_due'   => $this->purchaseInvoice ? (float) $this->purchaseInvoice->amount_due : null,
        ];
    }
}
