<?php

namespace App\Http\Requests;

use App\Validation\DemandFilterRules;
use Illuminate\Foundation\Http\FormRequest;

// Filtros do dashboard (item 0030), os mesmos nas três rotas: categoria e período pela data de criação, em dias
// inteiros no fuso do negócio; cada ponta vale sozinha.
class DashboardFiltersRequest extends FormRequest
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
        return DemandFilterRules::rules();
    }
}
