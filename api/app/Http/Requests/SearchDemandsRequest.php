<?php

namespace App\Http\Requests;

use App\Enums\DemandCategory;
use App\Enums\DemandStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// Busca do quadro (GET /api/demands/search, item 0027): título, categoria e período, mais a situação e a página,
// porque o quadro pede uma coluna por vez e rola página a página.
class SearchDemandsRequest extends FormRequest
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
            'search' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', Rule::enum(DemandCategory::class)],
            // Período pela data de criação, dias inteiros no fuso do negócio; cada ponta vale sozinha.
            'created_from' => ['nullable', 'date_format:Y-m-d'],
            'created_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:created_from'],
            'status' => ['nullable', Rule::enum(DemandStatus::class)],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
