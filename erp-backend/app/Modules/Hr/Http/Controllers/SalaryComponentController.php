<?php

declare(strict_types=1);

namespace App\Modules\Hr\Http\Controllers;

use App\Modules\Hr\Http\Resources\SalaryComponentResource;
use App\Modules\Hr\Models\Employee;
use App\Modules\Hr\Models\SalaryComponent;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class SalaryComponentController extends Controller
{
    public function index(int $employeeId): JsonResponse
    {
        $employee = Employee::findOrFail($employeeId);

        $components = $employee->salaryComponents()->with('createdBy')->orderBy('type')->orderBy('name')->get();

        return ApiResponse::success(SalaryComponentResource::collection($components));
    }

    public function store(Request $request, int $employeeId): JsonResponse
    {
        $employee = Employee::findOrFail($employeeId);

        $data = $request->validate([
            'type' => 'required|in:allowance,deduction',
            'name' => 'required|string|max:100',
            'amount' => 'required|numeric|min:0.01',
            'is_recurring' => 'boolean',
        ]);

        $component = SalaryComponent::create([
            ...$data,
            'employee_id' => $employee->id,
            'is_recurring' => $data['is_recurring'] ?? true,
            'is_active' => true,
            'created_by' => $request->user()->id,
        ]);

        return ApiResponse::success(new SalaryComponentResource($component->load('createdBy')), 'Salary component added.', 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $component = SalaryComponent::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'amount' => 'sometimes|required|numeric|min:0.01',
            'is_recurring' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $component->update($data);

        return ApiResponse::success(new SalaryComponentResource($component->load('createdBy')), 'Salary component updated.');
    }

    public function destroy(int $id): JsonResponse
    {
        SalaryComponent::findOrFail($id)->delete();

        return ApiResponse::success(null, 'Salary component removed.');
    }
}
