<?php

declare(strict_types=1);

namespace App\Modules\Hr\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PayslipResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'pay_run_id' => $this->pay_run_id,
            'employee_id' => $this->employee_id,
            'employee_name' => $this->employee?->name,
            'period_month' => $this->payRun?->period_month,
            'period_year' => $this->payRun?->period_year,
            'status' => $this->payRun?->status,
            'basic_salary' => (float) $this->basic_salary,
            'total_allowances' => (float) $this->total_allowances,
            'total_deductions' => (float) $this->total_deductions,
            'commission_amount' => (float) $this->commission_amount,
            'gross_pay' => (float) $this->gross_pay,
            'net_pay' => (float) $this->net_pay,
            'created_at' => $this->created_at?->toIso8601String(),
            'lines' => $this->whenLoaded('lines', fn () => $this->lines->map(fn ($l) => [
                'type' => $l->type,
                'label' => $l->label,
                'amount' => (float) $l->amount,
            ])),
        ];
    }
}
