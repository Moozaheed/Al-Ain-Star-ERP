<?php

declare(strict_types=1);

namespace App\Modules\Hr\Services;

use App\Modules\Accounting\Services\LedgerPostingService;
use App\Modules\Hr\Models\Employee;
use App\Modules\Hr\Models\PayRun;
use App\Modules\Hr\Models\Payslip;
use App\Modules\Hr\Models\PayslipLine;
use App\Modules\Hr\Models\SalaryComponent;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * erp-context/decisions/ADR-006. Generates, approves, and settles monthly
 * pay runs. A pay run's payslips are point-in-time snapshots — regenerating
 * never happens; editing an employee's salary_components after a pay run
 * exists only affects the *next* run.
 */
class PayrollService
{
    public function __construct(private readonly LedgerPostingService $ledger) {}

    public function generatePayRun(int $branchId, int $periodMonth, int $periodYear, int $createdBy): PayRun
    {
        if (PayRun::where('branch_id', $branchId)->where('period_month', $periodMonth)->where('period_year', $periodYear)->exists()) {
            throw new InvalidArgumentException('A pay run for this branch and period already exists.');
        }

        return DB::transaction(function () use ($branchId, $periodMonth, $periodYear, $createdBy) {
            $payRun = PayRun::create([
                'branch_id' => $branchId,
                'period_month' => $periodMonth,
                'period_year' => $periodYear,
                'status' => 'draft',
                'created_by' => $createdBy,
            ]);

            $employees = Employee::where('branch_id', $branchId)
                ->where('is_active', true)
                ->with(['salaryComponents' => fn ($q) => $q->where('is_active', true)->where('is_recurring', true)])
                ->get();

            $totalNetPay = 0.0;

            foreach ($employees as $employee) {
                $allowances = $employee->salaryComponents->where('type', 'allowance');
                $deductions = $employee->salaryComponents->where('type', 'deduction');
                $totalAllowances = (float) $allowances->sum('amount');
                $totalDeductions = (float) $deductions->sum('amount');
                $basicSalary = (float) $employee->basic_salary;
                $grossPay = $basicSalary + $totalAllowances;
                $netPay = $grossPay - $totalDeductions;

                $payslip = Payslip::create([
                    'pay_run_id' => $payRun->id,
                    'employee_id' => $employee->id,
                    'basic_salary' => $basicSalary,
                    'total_allowances' => $totalAllowances,
                    'total_deductions' => $totalDeductions,
                    'commission_amount' => 0,
                    'gross_pay' => $grossPay,
                    'net_pay' => $netPay,
                    'bank_iban_snapshot' => $employee->bank_iban,
                ]);

                $lines = [['payslip_id' => $payslip->id, 'type' => 'basic', 'label' => 'Basic Salary', 'amount' => $basicSalary]];
                foreach ($allowances as $a) {
                    $lines[] = ['payslip_id' => $payslip->id, 'type' => 'allowance', 'label' => $a->name, 'amount' => $a->amount];
                }
                foreach ($deductions as $d) {
                    $lines[] = ['payslip_id' => $payslip->id, 'type' => 'deduction', 'label' => $d->name, 'amount' => $d->amount];
                }
                PayslipLine::insert($lines);

                $totalNetPay += $netPay;
            }

            $payRun->update(['total_net_pay' => $totalNetPay]);

            return $payRun->fresh(['payslips.lines']);
        });
    }

    public function approvePayRun(PayRun $payRun, int $approvedBy): PayRun
    {
        if ($payRun->status !== 'draft') {
            throw new InvalidArgumentException('Only a draft pay run can be approved.');
        }

        if ($payRun->payslips()->count() === 0) {
            throw new InvalidArgumentException('This pay run has no payslips — nothing to approve.');
        }

        $payRun->update([
            'status' => 'approved',
            'approved_by' => $approvedBy,
            'approved_at' => now(),
        ]);

        $this->ledger->postPayrollApproval($payRun, $approvedBy);

        return $payRun;
    }

    public function markPaid(PayRun $payRun, int $userId): PayRun
    {
        if ($payRun->status !== 'approved') {
            throw new InvalidArgumentException('Only an approved pay run can be marked as paid.');
        }

        $payRun->update(['status' => 'paid', 'paid_at' => now()]);

        $this->ledger->postPayrollPayment($payRun, $userId);

        return $payRun;
    }
}
