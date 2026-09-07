<?php

declare(strict_types=1);

namespace App\Modules\Admin\Services;

use App\Enums\RoleSlug;
use App\Modules\Admin\Models\Branch;
use App\Modules\Admin\Models\User;
use App\Support\AuditLogger;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BranchService
{
    public function list(int $perPage = 20): LengthAwarePaginator
    {
        return $this->scopeBranch(Branch::query())
            ->orderBy('name')
            ->paginate($perPage);
    }

    public function find(int $id): ?Branch
    {
        return $this->scopeBranch(Branch::query())->find($id);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Branch
    {
        return DB::transaction(function () use ($data): Branch {
            $branch = Branch::create([
                'name' => $data['name'],
                'code' => $data['code'],
                'address' => $data['address'] ?? null,
                'phone' => $data['phone'] ?? null,
                'is_active' => $data['is_active'] ?? true,
            ]);

            AuditLogger::log('branch.created', $branch, [], $branch->toArray());

            return $branch;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Branch $branch, array $data): Branch
    {
        return DB::transaction(function () use ($branch, $data): Branch {
            $old = $branch->toArray();

            $branch->fill([
                'name' => $data['name'] ?? $branch->name,
                'code' => $data['code'] ?? $branch->code,
                'address' => $data['address'] ?? $branch->address,
                'phone' => $data['phone'] ?? $branch->phone,
                'is_active' => $data['is_active'] ?? $branch->is_active,
            ]);
            $branch->save();

            AuditLogger::log('branch.updated', $branch, $old, $branch->fresh()->toArray());

            return $branch;
        });
    }

    public function delete(Branch $branch): bool
    {
        return DB::transaction(function () use ($branch): bool {
            $old = $branch->toArray();
            $deleted = (bool) $branch->delete();

            AuditLogger::log('branch.deleted', $branch, $old, []);

            return $deleted;
        });
    }

    public function activate(Branch $branch): Branch
    {
        return DB::transaction(function () use ($branch): Branch {
            $old = $branch->toArray();
            $branch->is_active = true;
            $branch->save();

            AuditLogger::log('branch.activated', $branch, $old, $branch->fresh()->toArray());

            return $branch;
        });
    }

    public function deactivate(Branch $branch): Branch
    {
        return DB::transaction(function () use ($branch): Branch {
            $old = $branch->toArray();
            $branch->is_active = false;
            $branch->save();

            AuditLogger::log('branch.deactivated', $branch, $old, $branch->fresh()->toArray());

            return $branch;
        });
    }

    /**
     * Apply branch_id scoping to a query unless the user bypasses it.
     *
     * @param  Builder<Branch>  $query
     * @return Builder<Branch>
     */
    protected function scopeBranch(Builder $query): Builder
    {
        $user = Auth::user();

        if ($this->bypassesBranchScope($user)) {
            return $query;
        }

        if ($user instanceof User && $user->branch_id !== null) {
            return $query->where('id', $user->branch_id);
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
