<?php
declare(strict_types=1);
namespace App\Modules\Hr\Http\Controllers;

use App\Modules\Admin\Models\User;
use App\Modules\Hr\Http\Resources\EmployeeResource;
use App\Modules\Hr\Models\Employee;
use App\Modules\Hr\Models\ExpenseClaim;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class EmployeeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $employees = Employee::with(['user', 'branch'])
            ->when($request->search, fn ($q) => $q->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('employee_number', 'like', "%{$request->search}%")
                  ->orWhere('designation', 'like', "%{$request->search}%");
            }))
            ->when($request->branch_id, fn ($q) => $q->where('branch_id', $request->branch_id))
            ->when($request->is_active !== null, fn ($q) => $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('name')
            ->paginate((int) ($request->per_page ?? 25));

        return ApiResponse::paginated($employees, EmployeeResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id'         => 'nullable|integer|exists:users,id',
            'branch_id'       => 'required|integer|exists:branches,id',
            'name'            => 'required|string|max:150',
            'employee_number' => 'nullable|string|max:30|unique:employees,employee_number',
            'designation'     => 'nullable|string|max:100',
            'phone'           => 'nullable|string|max:30',
            'email'           => 'nullable|email|max:180',
            'nationality'     => 'nullable|string|max:60',
            'join_date'       => 'required|date',
            'basic_salary'    => 'nullable|numeric|min:0',
            'is_active'       => 'boolean',
        ]);

        $employee = Employee::create($data);
        AuditLogger::log('employee.created', $employee, [], $employee->toArray());

        return ApiResponse::success(new EmployeeResource($employee->load('user', 'branch')), 'Employee created.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $employee = Employee::with([
            'user.roles',
            'branch',
            'documents',
            'expenseClaims',
            'salesTargets',
        ])->findOrFail($id);

        // Attach invoice stats if linked to a user
        $invoiceStats   = null;
        $recentInvoices = [];
        if ($employee->user_id) {
            $invoiceStats = DB::table('invoices')
                ->where('created_by', $employee->user_id)
                ->where('status', '!=', 'void')
                ->selectRaw('COUNT(*) as total_invoices, SUM(total) as total_sales, MAX(invoice_date) as last_sale_date')
                ->first();

            $recentInvoices = DB::table('invoices')
                ->where('created_by', $employee->user_id)
                ->where('status', '!=', 'void')
                ->orderByDesc('invoice_date')
                ->orderByDesc('id')
                ->limit(10)
                ->get(['id', 'invoice_number', 'customer_name', 'total', 'status', 'invoice_date', 'payment_mode']);
        }

        $resource = (new EmployeeResource($employee))->toArray(request());
        $resource['invoice_stats']   = $invoiceStats;
        $resource['recent_invoices'] = $recentInvoices;

        return ApiResponse::success($resource);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $employee = Employee::findOrFail($id);
        $data = $request->validate([
            'user_id'      => 'nullable|integer|exists:users,id',
            'branch_id'    => 'sometimes|integer|exists:branches,id',
            'name'         => 'sometimes|required|string|max:150',
            'designation'  => 'nullable|string|max:100',
            'phone'        => 'nullable|string|max:30',
            'email'        => 'nullable|email|max:180',
            'nationality'  => 'nullable|string|max:60',
            'join_date'    => 'sometimes|date',
            'end_date'     => 'nullable|date',
            'basic_salary' => 'nullable|numeric|min:0',
            'is_active'    => 'boolean',
        ]);

        $old = $employee->toArray();
        $employee->update($data);
        AuditLogger::log('employee.updated', $employee, $old, $employee->fresh()->toArray());

        return ApiResponse::success(new EmployeeResource($employee->load('user', 'branch')), 'Employee updated.');
    }

    // GET /hr/users — list all system users with their linked employee record
    public function users(Request $request): JsonResponse
    {
        $users = User::with(['branch', 'roles'])
            ->when($request->search, fn ($q) => $q->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%");
            }))
            ->when($request->is_active !== null, fn ($q) => $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('name')
            ->paginate((int) ($request->per_page ?? 25));

        $userIds   = $users->pluck('id');
        $employees = Employee::whereIn('user_id', $userIds)->get()->keyBy('user_id');

        // Invoice stats per user
        $stats = DB::table('invoices')
            ->whereIn('created_by', $userIds)
            ->where('status', '!=', 'void')
            ->groupBy('created_by')
            ->selectRaw('created_by, COUNT(*) as invoice_count, SUM(total) as total_sales')
            ->get()
            ->keyBy('created_by');

        $result = $users->through(function ($user) use ($employees, $stats) {
            $emp  = $employees->get($user->id);
            $stat = $stats->get($user->id);
            return [
                'id'            => $user->id,
                'name'          => $user->name,
                'email'         => $user->email,
                'phone'         => $user->phone,
                'is_active'     => $user->is_active,
                'role'          => $user->primaryRoleSlug(),
                'branch_id'     => $user->branch_id,
                'branch_name'   => $user->branch?->name,
                'employee_id'   => $emp?->id,
                'designation'   => $emp?->designation,
                'join_date'     => $emp?->join_date?->toDateString(),
                'invoice_count' => $stat?->invoice_count ?? 0,
                'total_sales'   => $stat?->total_sales ?? 0,
            ];
        });

        return ApiResponse::paginatedRaw($result);
    }

    // GET /hr/users/{id} — single user detail with all related data
    public function userDetail(int $userId): JsonResponse
    {
        $user = User::with(['branch', 'roles', 'permissions'])->findOrFail($userId);

        $employee = Employee::with(['documents', 'expenseClaims', 'salesTargets'])
            ->where('user_id', $userId)
            ->first();

        $invoiceStats = DB::table('invoices')
            ->where('created_by', $userId)
            ->where('status', '!=', 'void')
            ->selectRaw('COUNT(*) as total_invoices, COALESCE(SUM(total), 0) as total_sales, MAX(invoice_date) as last_sale_date')
            ->first();

        $recentInvoices = DB::table('invoices')
            ->where('created_by', $userId)
            ->where('status', '!=', 'void')
            ->orderByDesc('invoice_date')
            ->orderByDesc('id')
            ->limit(15)
            ->get(['id', 'invoice_number', 'customer_name', 'total', 'status', 'invoice_date', 'payment_mode', 'channel']);

        $monthlyStats = DB::table('invoices')
            ->where('created_by', $userId)
            ->where('status', '!=', 'void')
            ->whereYear('invoice_date', now()->year)
            ->selectRaw('MONTH(invoice_date) as month, COUNT(*) as invoices, SUM(total) as sales')
            ->groupByRaw('MONTH(invoice_date)')
            ->orderBy('month')
            ->get();

        return ApiResponse::success([
            'user' => [
                'id'          => $user->id,
                'name'        => $user->name,
                'email'       => $user->email,
                'phone'       => $user->phone,
                'is_active'   => $user->is_active,
                'role'        => $user->primaryRoleSlug(),
                'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
                'branch_id'   => $user->branch_id,
                'branch_name' => $user->branch?->name,
                'created_at'  => $user->created_at?->toDateString(),
            ],
            'employee'        => $employee ? (new EmployeeResource($employee->loadMissing('documents', 'expenseClaims', 'salesTargets')))->toArray(request()) : null,
            'invoice_stats'   => $invoiceStats,
            'recent_invoices' => $recentInvoices,
            'monthly_stats'   => $monthlyStats,
        ]);
    }

    // POST /hr/expenses/{id}/approve
    public function approveExpense(Request $request, int $id): JsonResponse
    {
        $claim = ExpenseClaim::findOrFail($id);
        if ($claim->status !== 'pending') {
            return ApiResponse::error('Only pending claims can be approved.', 422);
        }

        $data = $request->validate(['action' => 'required|in:approve,reject']);

        $claim->update([
            'status'      => $data['action'] === 'approve' ? 'approved' : 'rejected',
            'approved_by' => $request->user()->id,
        ]);

        return ApiResponse::success(['status' => $claim->status], 'Expense claim updated.');
    }
}
