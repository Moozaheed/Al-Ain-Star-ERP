<?php

declare(strict_types=1);

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Admin\Http\Requests\UserRequest;
use App\Modules\Admin\Http\Resources\UserResource;
use App\Modules\Admin\Services\UserService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(private readonly UserService $users) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 20);
        $paginator = $this->users->list($perPage);

        return ApiResponse::paginated($paginator, UserResource::class);
    }

    public function store(UserRequest $request): JsonResponse
    {
        $user = $this->users->create($request->validated());

        return ApiResponse::success(new UserResource($user), 'User created.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $user = $this->users->find($id);

        if ($user === null) {
            return ApiResponse::error('User not found.', 404);
        }

        return ApiResponse::success(new UserResource($user));
    }

    public function update(UserRequest $request, int $id): JsonResponse
    {
        $user = $this->users->find($id);

        if ($user === null) {
            return ApiResponse::error('User not found.', 404);
        }

        $user = $this->users->update($user, $request->validated());

        return ApiResponse::success(new UserResource($user), 'User updated.');
    }

    public function destroy(int $id): JsonResponse
    {
        $user = $this->users->find($id);

        if ($user === null) {
            return ApiResponse::error('User not found.', 404);
        }

        $this->users->delete($user);

        return ApiResponse::success(null, 'User deleted.');
    }
}
