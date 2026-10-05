<?php

namespace App\Http\Requests;

use App\Enums\DemandStatus;
use App\Validation\DemandFilterRules;
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
            // Categoria e período: os mesmos do dashboard, com o piso de 2000.
            ...DemandFilterRules::rules(),
            'status' => ['nullable', Rule::enum(DemandStatus::class)],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
