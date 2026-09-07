<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\AuthUserResource;
use App\Modules\Admin\Models\User;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $user = User::query()
            ->with(['branch', 'roles', 'permissions'])
            ->where('email', $credentials['email'])
            ->first();

        if ($user === null || ! Hash::check((string) $credentials['password'], (string) $user->password)) {
            return ApiResponse::error('Invalid credentials.', 401);
        }

        if (! $user->is_active) {
            return ApiResponse::error('Account is inactive.', 403);
        }

        $token = $user->createToken('api-token')->plainTextToken;

        AuditLogger::log('auth.login', $user);

        return ApiResponse::success([
            'user' => (new AuthUserResource($user))->resolve(),
            'token' => $token,
            'token_type' => 'Bearer',
        ], 'Login successful.');
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();
        $token = $user?->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        AuditLogger::log('auth.logout', $user);

        return ApiResponse::success(null, 'Logout successful.');
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if ($user === null) {
            return ApiResponse::error('Unauthenticated.', 401);
        }

        $user->load(['branch', 'roles', 'permissions']);

        return ApiResponse::success((new AuthUserResource($user))->resolve());
    }
}
