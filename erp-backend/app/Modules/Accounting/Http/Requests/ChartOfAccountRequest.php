<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Http\Requests;

use App\Enums\AccountType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChartOfAccountRequest extends FormRequest
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
        $accountId = $this->route('account') ?? $this->route('id');
        $isCreate = $this->isMethod('POST');

        return [
            'code' => [
                $isCreate ? 'required' : 'sometimes',
                'string',
                'max:20',
                Rule::unique('chart_of_accounts', 'code')->ignore($accountId),
            ],
            'name' => [$isCreate ? 'required' : 'sometimes', 'string', 'max:200'],
            'type' => [
                $isCreate ? 'required' : 'sometimes',
                'string',
                Rule::in(AccountType::values()),
            ],
            'subtype' => ['nullable', 'string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
            'parent_id' => ['nullable', 'integer', 'exists:chart_of_accounts,id'],
        ];
    }
}
