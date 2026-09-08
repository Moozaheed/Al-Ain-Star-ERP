<?php

declare(strict_types=1);

namespace App\Modules\Hr\Http\Controllers;

use App\Modules\Hr\Http\Resources\PayRunResource;
use App\Modules\Hr\Models\PayRun;
use App\Modules\Hr\Services\PayrollService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use InvalidArgumentException;

class PayRunController extends Controller
{
    public function __construct(private readonly PayrollService $payroll) {}

    public function index(Request $request): JsonResponse
    {
        $payRuns = PayRun::with(['branch', 'createdBy', 'approvedBy'])
            ->withCount('payslips')
            ->when($this->resolveBranchScope($request), fn ($q, $branchId) => $q->where('branch_id', $branchId))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->orderByDesc('period_year')
            ->orderByDesc('period_month')
            ->paginate((int) ($request->per_page ?? 25));

        return ApiResponse::paginated($payRuns, PayRunResource::class);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $payRun = PayRun::with(['branch', 'createdBy', 'approvedBy', 'payslips.employee', 'payslips.lines'])->findOrFail($id);

        if ($branchScope = $this->resolveBranchScope($request)) {
            if ($payRun->branch_id !== $branchScope) {
                return ApiResponse::error('You are not authorised to view this pay run.', 403);
            }
        }

        return ApiResponse::success(new PayRunResource($payRun));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'period_month' => 'required|integer|min:1|max:12',
            'period_year' => 'required|integer|min:2020|max:2100',
        ]);

        try {
            $payRun = $this->payroll->generatePayRun($data['branch_id'], $data['period_month'], $data['period_year'], $request->user()->id);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success(new PayRunResource($payRun->load(['branch', 'createdBy'])), 'Pay run generated.', 201);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $payRun = PayRun::findOrFail($id);

        try {
            $this->payroll->approvePayRun($payRun, $request->user()->id);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success(new PayRunResource($payRun->fresh(['branch', 'createdBy', 'approvedBy'])), 'Pay run approved.');
    }

    public function pay(Request $request, int $id): JsonResponse
    {
        $payRun = PayRun::findOrFail($id);

        try {
            $this->payroll->markPaid($payRun, $request->user()->id);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success(new PayRunResource($payRun->fresh(['branch', 'createdBy', 'approvedBy'])), 'Pay run marked as paid.');
    }

    /**
     * hr/business-rules.md: "Branch Manager: view and manage their branch's
     * employees only." Manager/Super Admin see every branch.
     */
    private function resolveBranchScope(Request $request): ?int
    {
        $user = $request->user();

        if ($user->hasAnyRole(['super_admin', 'manager'])) {
            return $request->integer('branch_id') ?: null;
        }

        return $user->branch_id;
    }
}
