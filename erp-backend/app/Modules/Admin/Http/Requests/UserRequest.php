<?php

declare(strict_types=1);

namespace App\Modules\Admin\Http\Requests;

use App\Enums\RoleSlug;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $userId = $this->route('user') ?? $this->route('id');
        $isCreate = $this->isMethod('POST');

        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => [
                'required',
                'email',
                'max:180',
                Rule::unique('users', 'email')
                    ->ignore($userId)
                    ->whereNull('deleted_at'),
            ],
            'password' => [
                $isCreate ? 'required' : 'sometimes',
                'string',
                Password::min(8),
            ],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'phone' => ['nullable', 'string', 'max:30'],
            'is_active' => ['sometimes', 'boolean'],
            'role' => [
                $isCreate ? 'required' : 'sometimes',
                'string',
                Rule::in(RoleSlug::values()),
            ],
        ];
    }
}
