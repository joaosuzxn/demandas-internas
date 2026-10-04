<?php

namespace App\Http\Requests;

use App\Enums\DemandCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// Filtros do dashboard (item 0030), os mesmos nas três rotas: categoria e período pela data de criação, em dias
// inteiros no fuso do negócio; cada ponta vale sozinha.
class DashboardFiltersRequest extends FormRequest
{
    public const EARLIEST_DAY = '2000-01-01';

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
            'category' => ['nullable', Rule::enum(DemandCategory::class)],
            // Piso em 2000: digitar o ano no campo de data passa por 0002, 0020, 0202 — séculos de pontos no gráfico.
            'created_from' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:'.self::EARLIEST_DAY],
            'created_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:'.self::EARLIEST_DAY, 'after_or_equal:created_from'],
        ];
    }
}
