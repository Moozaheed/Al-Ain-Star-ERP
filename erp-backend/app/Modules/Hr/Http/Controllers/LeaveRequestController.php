<?php

declare(strict_types=1);

namespace App\Modules\Hr\Http\Controllers;

use App\Modules\Hr\Http\Resources\LeaveRequestResource;
use App\Modules\Hr\Models\Employee;
use App\Modules\Hr\Models\LeaveRequest;
use App\Modules\Notifications\Services\NotificationService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * erp-context/decisions/ADR-007 — same two-stage chain as ExpenseClaim
 * (Branch Manager, then Manager/Super Admin), no financial posting.
 */
class LeaveRequestController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    // GET /hr/leave — approvals queue + general list.
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $branchScope = $user->hasAnyRole(['super_admin', 'manager']) ? $request->integer('branch_id') ?: null : $user->branch_id;

        $requests = LeaveRequest::with(['employee', 'branch', 'branchApprovedBy', 'approvedBy'])
            ->when($branchScope, fn ($q) => $q->where('branch_id', $branchScope))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->orderByDesc('created_at')
            ->paginate((int) ($request->per_page ?? 25));

        return ApiResponse::paginated($requests, LeaveRequestResource::class);
    }

    // POST /hr/leave — self-service: an employee applies for their own leave.
    public function store(Request $request): JsonResponse
    {
        $employee = Employee::where('user_id', $request->user()->id)->first();
        if ($employee === null) {
            return ApiResponse::error('No employee record is linked to your account.', 422);
        }

        $data = $request->validate([
            'leave_type' => 'required|in:annual,sick,unpaid',
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after_or_equal:start_date',
            'reason'     => 'nullable|string|max:1000',
        ]);

        $leave = LeaveRequest::create([
            ...$data,
            'employee_id' => $employee->id,
            'branch_id'   => $employee->branch_id,
            'status'      => 'pending',
        ]);

        $this->notifications->notifyRoles(
            ['branch_manager'],
            $employee->branch_id,
            'APPROVAL_REQUEST',
            "Leave request from {$employee->name}",
            ucfirst($leave->leave_type)." leave, {$leave->start_date->toDateString()} to {$leave->end_date->toDateString()}",
            '/hr',
        );

        return ApiResponse::success(new LeaveRequestResource($leave->load(['employee', 'branch'])), 'Leave request submitted.', 201);
    }

    // POST /hr/leave/{id}/branch-approve — stage 1.
    public function branchApprove(Request $request, int $id): JsonResponse
    {
        $leave = LeaveRequest::with('employee')->findOrFail($id);
        if ($leave->status !== 'pending') {
            return ApiResponse::error('Only pending leave requests can be branch-approved.', 422);
        }

        $user = $request->user();
        if ($user->hasRole('branch_manager') && $user->branch_id !== $leave->branch_id) {
            return ApiResponse::error('You can only act on leave requests from your own branch.', 403);
        }

        $data = $request->validate(['action' => 'required|in:approve,reject']);

        if ($data['action'] === 'approve') {
            $leave->update([
                'status' => 'branch_approved',
                'branch_approved_by' => $user->id,
                'branch_approved_at' => now(),
            ]);

            $this->notifications->notifyRoles(
                ['manager', 'super_admin'],
                null,
                'APPROVAL_REQUEST',
                "Leave request awaiting admin approval — {$leave->employee?->name}",
                ucfirst($leave->leave_type)." leave, {$leave->start_date->toDateString()} to {$leave->end_date->toDateString()}",
                '/hr',
            );
        } else {
            $leave->update(['status' => 'rejected']);
        }

        if ($leave->employee?->user_id !== null) {
            $this->notifications->notify(
                $leave->employee->user_id,
                'APPROVAL_REQUEST',
                $leave->status === 'branch_approved' ? 'Leave request approved by your branch manager' : 'Leave request rejected',
                ucfirst($leave->leave_type)." leave, {$leave->start_date->toDateString()} to {$leave->end_date->toDateString()}",
                '/hr',
            );
        }

        return ApiResponse::success(['status' => $leave->status], 'Leave request updated.');
    }

    // POST /hr/leave/{id}/approve — stage 2 (Admin).
    public function approve(Request $request, int $id): JsonResponse
    {
        $leave = LeaveRequest::with('employee')->findOrFail($id);
        if ($leave->status !== 'branch_approved') {
            return ApiResponse::error('Only leave requests already approved by a Branch Manager can receive admin approval.', 422);
        }

        $data = $request->validate(['action' => 'required|in:approve,reject']);

        $leave->update([
            'status'      => $data['action'] === 'approve' ? 'approved' : 'rejected',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        if ($leave->employee?->user_id !== null) {
            $this->notifications->notify(
                $leave->employee->user_id,
                'APPROVAL_REQUEST',
                'Leave request '.$leave->status,
                ucfirst($leave->leave_type)." leave, {$leave->start_date->toDateString()} to {$leave->end_date->toDateString()}",
                '/hr',
            );
        }

        return ApiResponse::success(['status' => $leave->status], 'Leave request updated.');
    }
}
