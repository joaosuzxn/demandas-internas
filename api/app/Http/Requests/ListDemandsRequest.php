<?php

namespace App\Http\Requests;

use App\Enums\DemandCategory;
use App\Enums\DemandStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListDemandsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // a policy é chamada na rota
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', Rule::enum(DemandStatus::class)],
            'category' => ['nullable', Rule::enum(DemandCategory::class)],
            'search' => ['nullable', 'string', 'max:100'],
            'mine' => ['nullable', 'boolean'],
            // Período pela data de criação, dias inteiros no fuso do negócio; cada ponta vale sozinha.
            'created_from' => ['nullable', 'date_format:Y-m-d'],
            'created_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:created_from'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    // Na query string o booleano chega como texto; a regra boolean do Laravel recusa "true" e "false".
    protected function prepareForValidation(): void
    {
        $mine = $this->query('mine');

        if (is_string($mine)) {
            $parsed = filter_var($mine, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

            if ($parsed !== null) {
                $this->merge(['mine' => $parsed]);
            }
        }
    }
}
