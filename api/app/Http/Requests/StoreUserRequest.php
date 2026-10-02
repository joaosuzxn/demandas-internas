<?php

namespace App\Http\Requests;

use App\Validation\UserRules;
use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
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
        return UserRules::rules();
    }

    protected function prepareForValidation(): void
    {
        $this->replace(UserRules::normalize($this->all()));
    }
}
