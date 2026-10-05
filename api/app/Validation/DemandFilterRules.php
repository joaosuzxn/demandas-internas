<?php

namespace App\Validation;

use App\Enums\DemandCategory;
use Illuminate\Validation\Rule;

// Filtros de categoria e período (pela data de criação, dias inteiros no fuso do negócio; cada ponta vale sozinha),
// os mesmos na busca do quadro (SearchDemandsRequest) e no dashboard (DashboardFiltersRequest).
final class DemandFilterRules
{
    /** Piso das datas: digitar o ano no campo de data passa por 0002, 0020, 0202 (séculos de pontos no gráfico). */
    public const EARLIEST_DAY = '2000-01-01';

    /**
     * @return array<string, array<int, mixed>>
     */
    public static function rules(): array
    {
        return [
            'category' => ['nullable', Rule::enum(DemandCategory::class)],
            'created_from' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:'.self::EARLIEST_DAY],
            'created_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:'.self::EARLIEST_DAY, 'after_or_equal:created_from'],
        ];
    }
}
