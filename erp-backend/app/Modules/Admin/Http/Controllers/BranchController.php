<?php

declare(strict_types=1);

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Admin\Http\Requests\BranchRequest;
use App\Modules\Admin\Http\Resources\BranchResource;
use App\Modules\Admin\Services\BranchService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    public function __construct(private readonly BranchService $branches) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 20);
        $paginator = $this->branches->list($perPage);

        return ApiResponse::paginated($paginator, BranchResource::class);
    }

    public function store(BranchRequest $request): JsonResponse
    {
        $branch = $this->branches->create($request->validated());

        return ApiResponse::success(new BranchResource($branch), 'Branch created.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $branch = $this->branches->find($id);

        if ($branch === null) {
            return ApiResponse::error('Branch not found.', 404);
        }

        return ApiResponse::success(new BranchResource($branch));
    }

    public function update(BranchRequest $request, int $id): JsonResponse
    {
        $branch = $this->branches->find($id);

        if ($branch === null) {
            return ApiResponse::error('Branch not found.', 404);
        }

        $branch = $this->branches->update($branch, $request->validated());

        return ApiResponse::success(new BranchResource($branch), 'Branch updated.');
    }

    public function destroy(int $id): JsonResponse
    {
        $branch = $this->branches->find($id);

        if ($branch === null) {
            return ApiResponse::error('Branch not found.', 404);
        }

        $this->branches->delete($branch);

        return ApiResponse::success(null, 'Branch deleted.');
    }

    public function activate(int $id): JsonResponse
    {
        $branch = $this->branches->find($id);

        if ($branch === null) {
            return ApiResponse::error('Branch not found.', 404);
        }

        $branch = $this->branches->activate($branch);

        return ApiResponse::success(new BranchResource($branch), 'Branch activated.');
    }

    public function deactivate(int $id): JsonResponse
    {
        $branch = $this->branches->find($id);

        if ($branch === null) {
            return ApiResponse::error('Branch not found.', 404);
        }

        $branch = $this->branches->deactivate($branch);

        return ApiResponse::success(new BranchResource($branch), 'Branch deactivated.');
    }
}
