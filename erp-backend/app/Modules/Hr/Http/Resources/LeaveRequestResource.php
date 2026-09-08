<?php

declare(strict_types=1);

namespace App\Modules\Hr\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeaveRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'employee_id' => $this->employee_id,
            'employee_name' => $this->employee?->name,
            'branch_id' => $this->branch_id,
            'branch_name' => $this->branch?->name,
            'leave_type' => $this->leave_type,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'days' => $this->days,
            'reason' => $this->reason,
            'status' => $this->status,
            'branch_approved_by_name' => $this->branchApprovedBy?->name,
            'branch_approved_at' => $this->branch_approved_at?->toIso8601String(),
            'approved_by_name' => $this->approvedBy?->name,
            'approved_at' => $this->approved_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
