<?php

declare(strict_types=1);

namespace App\Modules\Admin\Services;

use App\Enums\RoleSlug;
use App\Modules\Admin\Models\User;
use App\Support\AuditLogger;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserService
{
    public function list(int $perPage = 20): LengthAwarePaginator
    {
        return $this->scopeBranch(User::query())
            ->with(['branch', 'roles', 'permissions'])
            ->orderBy('name')
            ->paginate($perPage);
    }

    public function find(int $id): ?User
    {
        return $this->scopeBranch(User::query())
            ->with(['branch', 'roles', 'permissions'])
            ->find($id);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): User
    {
        return DB::transaction(function () use ($data): User {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make((string) $data['password']),
                'branch_id' => $data['branch_id'] ?? null,
                'phone' => $data['phone'] ?? null,
                'is_active' => $data['is_active'] ?? true,
            ]);

            if (! empty($data['role'])) {
                $user->syncRoles([$data['role']]);
            }

            AuditLogger::log('user.created', $user, [], $user->fresh(['roles'])->toArray());

            return $user->load(['branch', 'roles', 'permissions']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(User $user, array $data): User
    {
        return DB::transaction(function () use ($user, $data): User {
            $old = $user->toArray();

            $attributes = [
                'name' => $data['name'] ?? $user->name,
                'email' => $data['email'] ?? $user->email,
                'branch_id' => array_key_exists('branch_id', $data) ? $data['branch_id'] : $user->branch_id,
                'phone' => $data['phone'] ?? $user->phone,
                'is_active' => $data['is_active'] ?? $user->is_active,
            ];

            if (! empty($data['password'])) {
                $attributes['password'] = Hash::make((string) $data['password']);
            }

            $user->fill($attributes);
            $user->save();

            if (! empty($data['role'])) {
                $user->syncRoles([$data['role']]);
            }

            AuditLogger::log('user.updated', $user, $old, $user->fresh(['roles'])->toArray());

            return $user->load(['branch', 'roles', 'permissions']);
        });
    }

    public function assignRole(User $user, string $roleSlug): User
    {
        return DB::transaction(function () use ($user, $roleSlug): User {
            $old = ['role' => $user->primaryRoleSlug()];

            $user->syncRoles([$roleSlug]);

            AuditLogger::log('user.role_assigned', $user, $old, ['role' => $roleSlug]);

            return $user->load(['branch', 'roles', 'permissions']);
        });
    }

    public function deactivate(User $user): User
    {
        return DB::transaction(function () use ($user): User {
            $old = $user->toArray();
            $user->is_active = false;
            $user->save();

            $user->tokens()->delete();

            AuditLogger::log('user.deactivated', $user, $old, $user->fresh()->toArray());

            return $user->load(['branch', 'roles', 'permissions']);
        });
    }

    public function delete(User $user): bool
    {
        return DB::transaction(function () use ($user): bool {
            $old = $user->toArray();
            $user->tokens()->delete();
            $deleted = (bool) $user->delete();

            AuditLogger::log('user.deleted', $user, $old, []);

            return $deleted;
        });
    }

    /**
     * @param  Builder<User>  $query
     * @return Builder<User>
     */
    protected function scopeBranch(Builder $query): Builder
    {
        $user = Auth::user();

        if ($this->bypassesBranchScope($user)) {
            return $query;
        }

        if ($user instanceof User && $user->branch_id !== null) {
            return $query->where('branch_id', $user->branch_id);
        }

        return $query->whereRaw('1 = 0');
    }

    protected function bypassesBranchScope(?Authenticatable $user): bool
    {
        if (! $user instanceof User) {
            return false;
        }

        foreach ([RoleSlug::SuperAdmin->value, RoleSlug::Manager->value] as $slug) {
            if ($user->hasRole($slug)) {
                return true;
            }
        }

        return false;
    }
}
