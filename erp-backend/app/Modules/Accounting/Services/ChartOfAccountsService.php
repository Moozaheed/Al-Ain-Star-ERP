<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Services;

use App\Enums\RoleSlug;
use App\Modules\Accounting\Models\ChartOfAccount;
use App\Modules\Admin\Models\User;
use App\Support\AuditLogger;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ChartOfAccountsService
{
    public function list(int $perPage = 50): LengthAwarePaginator
    {
        return $this->scopeBranch(ChartOfAccount::query())
            ->orderBy('code')
            ->paginate($perPage);
    }

    public function find(int $id): ?ChartOfAccount
    {
        return $this->scopeBranch(ChartOfAccount::query())->find($id);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): ChartOfAccount
    {
        return DB::transaction(function () use ($data): ChartOfAccount {
            $account = ChartOfAccount::create([
                'code' => $data['code'],
                'name' => $data['name'],
                'type' => $data['type'],
                'subtype' => $data['subtype'] ?? null,
                'is_system' => false,
                'is_active' => $data['is_active'] ?? true,
                'parent_id' => $data['parent_id'] ?? null,
            ]);

            AuditLogger::log('coa.created', $account, [], $account->toArray());

            return $account;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(ChartOfAccount $account, array $data): ChartOfAccount
    {
        if ($account->is_system && array_key_exists('type', $data) && $data['type'] !== $account->type?->value) {
            throw new InvalidArgumentException('System account type cannot be changed.');
        }

        return DB::transaction(function () use ($account, $data): ChartOfAccount {
            $old = $account->toArray();

            $account->fill([
                'code' => $data['code'] ?? $account->code,
                'name' => $data['name'] ?? $account->name,
                'type' => $data['type'] ?? $account->type?->value,
                'subtype' => $data['subtype'] ?? $account->subtype,
                'is_active' => $data['is_active'] ?? $account->is_active,
                'parent_id' => array_key_exists('parent_id', $data) ? $data['parent_id'] : $account->parent_id,
            ]);
            $account->save();

            AuditLogger::log('coa.updated', $account, $old, $account->fresh()->toArray());

            return $account;
        });
    }

    /**
     * @param  Builder<ChartOfAccount>  $query
     * @return Builder<ChartOfAccount>
     */
    protected function scopeBranch(Builder $query): Builder
    {
        // The chart of accounts is shared across branches.
        // Access is still gated by authentication and permissions at the route layer.
        return $query;
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
