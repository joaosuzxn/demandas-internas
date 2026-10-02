<?php

namespace App\Validation;

use App\Enums\DemandCategory;
use Illuminate\Validation\Rule;

// Regras de criar e editar solicitação. O trim e o "só espaços vira vazio" são dos middlewares
// globais do Laravel (TrimStrings e ConvertEmptyStringsToNull), cobertos pelo DemandCreateTest.
final class DemandRules
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public static function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'description' => ['required', 'string', 'max:5000'],
            'category' => ['required', Rule::enum(DemandCategory::class)],
            // O status só muda por close e reopen; o solicitante é sempre quem criou.
            'status' => ['prohibited'],
            'requester_id' => ['prohibited'],
        ];
    }
}
