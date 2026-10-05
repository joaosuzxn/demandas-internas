<?php

namespace App\Http\Requests;

use App\Enums\DemandStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// Listagem (GET /api/demands). Título, categoria e período são da busca (SearchDemandsRequest): aqui não entram.
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
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
