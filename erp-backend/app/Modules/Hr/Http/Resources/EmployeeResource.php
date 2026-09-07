<?php
declare(strict_types=1);
namespace App\Modules\Hr\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'employee_number' => $this->employee_number,
            'name'            => $this->name,
            'designation'     => $this->designation,
            'phone'           => $this->phone,
            'email'           => $this->email,
            'nationality'     => $this->nationality,
            'join_date'       => $this->join_date?->toDateString(),
            'end_date'        => $this->end_date?->toDateString(),
            'basic_salary'    => $this->basic_salary,
            'is_active'       => $this->is_active,
            'branch_id'       => $this->branch_id,
            'branch_name'     => $this->branch?->name,
            'user_id'         => $this->user_id,
            'user'            => $this->whenLoaded('user', fn () => [
                'id'        => $this->user->id,
                'name'      => $this->user->name,
                'email'     => $this->user->email,
                'phone'     => $this->user->phone,
                'is_active' => $this->user->is_active,
                'role'      => $this->user->primaryRoleSlug(),
                'branch'    => $this->user->branch?->name,
            ]),
            'documents'       => $this->whenLoaded('documents', fn () =>
                $this->documents->map(fn ($d) => [
                    'id'                => $d->id,
                    'doc_type'          => $d->doc_type,
                    'document_number'   => $d->document_number,
                    'issue_date'        => $d->issue_date?->toDateString(),
                    'expiry_date'       => $d->expiry_date->toDateString(),
                    'expiry_status'     => $d->expiry_status,
                    'days_until_expiry' => $d->days_until_expiry,
                    'is_active'         => $d->is_active,
                ])
            ),
            'expense_claims'  => $this->whenLoaded('expenseClaims', fn () =>
                $this->expenseClaims->map(fn ($e) => [
                    'id'          => $e->id,
                    'description' => $e->description,
                    'amount'      => $e->amount,
                    'claim_date'  => $e->claim_date->toDateString(),
                    'status'      => $e->status,
                ])
            ),
            'sales_targets'   => $this->whenLoaded('salesTargets', fn () =>
                $this->salesTargets->map(fn ($t) => [
                    'id'              => $t->id,
                    'period_month'    => $t->period_month,
                    'period_year'     => $t->period_year,
                    'target_amount'   => $t->target_amount,
                    'achieved_amount' => $t->achieved_amount,
                    'achievement_pct' => $t->achievement_pct,
                ])
            ),
        ];
    }
}
