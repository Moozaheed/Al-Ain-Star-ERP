<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PartRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $partId = $this->route('id');

        return [
            'part_number'   => ['required', 'string', 'max:100', Rule::unique('parts', 'part_number')->ignore($partId)->whereNull('deleted_at')],
            'description'   => ['required', 'string', 'max:500'],
            'barcode'       => ['nullable', 'string', 'max:100'],
            'category_id'   => ['nullable', 'integer', 'exists:categories,id'],
            'brand_id'      => ['nullable', 'integer', 'exists:brands,id'],
            'unit_id'       => ['required', 'integer', 'exists:units,id'],
            'min_stock_qty' => ['required', 'integer', 'min:0'],
            'list_price'    => ['nullable', 'numeric', 'min:0'],
            'is_active'     => ['boolean'],
        ];
    }
}
