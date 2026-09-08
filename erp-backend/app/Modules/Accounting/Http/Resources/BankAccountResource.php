<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BankAccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'branch_id'      => $this->branch_id,
            'account_name'   => $this->account_name,
            'bank_name'      => $this->bank_name,
            'iban'           => $this->iban,
            'currency'       => $this->currency,
            'coa_account_id' => $this->coa_account_id,
            'coa_account_code'=> $this->coaAccount?->code,
            'coa_account_name'=> $this->coaAccount?->name,
            'is_active'      => $this->is_active,
        ];
    }
}
