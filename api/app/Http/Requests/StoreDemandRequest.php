<?php

namespace App\Http\Requests;

use App\Validation\DemandRules;
use Illuminate\Foundation\Http\FormRequest;

class StoreDemandRequest extends FormRequest
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
        return DemandRules::rules();
    }
}
