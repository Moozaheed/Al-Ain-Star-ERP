<?php

declare(strict_types=1);

namespace App\Modules\Hr\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PayRunResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'branch_id' => $this->branch_id,
            'branch_name' => $this->branch?->name,
            'period_month' => $this->period_month,
            'period_year' => $this->period_year,
            'status' => $this->status,
            'total_net_pay' => (float) $this->total_net_pay,
            'payslip_count' => $this->payslips_count ?? $this->payslips?->count() ?? 0,
            'created_by_name' => $this->createdBy?->name,
            'approved_by_name' => $this->approvedBy?->name,
            'approved_at' => $this->approved_at?->toIso8601String(),
            'paid_at' => $this->paid_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'payslips' => PayslipResource::collection($this->whenLoaded('payslips')),
        ];
    }
}
