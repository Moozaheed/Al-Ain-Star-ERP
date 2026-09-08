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
            'bank_name'       => $this->bank_name,
            'bank_iban'       => $this->bank_iban,
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
            'salary_components' => $this->whenLoaded('salaryComponents', fn () =>
                $this->salaryComponents->map(fn ($c) => [
                    'id'           => $c->id,
                    'type'         => $c->type,
                    'name'         => $c->name,
                    'amount'       => (float) $c->amount,
                    'is_recurring' => (bool) $c->is_recurring,
                    'is_active'    => (bool) $c->is_active,
                ])
            ),
            'payslips'        => $this->whenLoaded('payslips', fn () =>
                $this->payslips->map(fn ($p) => [
                    'id'                => $p->id,
                    'pay_run_id'        => $p->pay_run_id,
                    'period_month'      => $p->payRun?->period_month,
                    'period_year'       => $p->payRun?->period_year,
                    'status'            => $p->payRun?->status,
                    'basic_salary'      => (float) $p->basic_salary,
                    'total_allowances'  => (float) $p->total_allowances,
                    'total_deductions'  => (float) $p->total_deductions,
                    'commission_amount' => (float) $p->commission_amount,
                    'gross_pay'         => (float) $p->gross_pay,
                    'net_pay'           => (float) $p->net_pay,
                    'created_at'        => $p->created_at?->toIso8601String(),
                    'lines'             => $p->relationLoaded('lines') ? $p->lines->map(fn ($l) => [
                        'type'   => $l->type,
                        'label'  => $l->label,
                        'amount' => (float) $l->amount,
                    ]) : [],
                ])
            ),
        ];
    }
}
