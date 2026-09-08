<?php

declare(strict_types=1);

namespace App\Modules\Hr\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseClaimResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'employee_id' => $this->employee_id,
            'employee_name' => $this->employee?->name,
            'branch_id' => $this->branch_id,
            'branch_name' => $this->branch?->name,
            'description' => $this->description,
            'amount' => (float) $this->amount,
            'claim_date' => $this->claim_date?->toDateString(),
            'status' => $this->status,
            'receipt_path' => $this->receipt_path,
            'branch_approved_by_name' => $this->branchApprovedBy?->name,
            'branch_approved_at' => $this->branch_approved_at?->toIso8601String(),
            'approved_by_name' => $this->approvedBy?->name,
            'approved_at' => $this->approved_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
